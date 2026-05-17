import { Point, type XY } from '../../Point';
import { reNewline } from '../../constants';
import type { TextStyle, TextStyleDeclaration } from './StyledText';

type TextCouplesCache = Map<string, number>;
type FamilyCache = Map<string, TextCouplesCache>;
type SimplePathCommand = any[];

type PathSegmentInfo = {
  x: number;
  y: number;
  length: number;
  command?: string;
  iterator?: (pct: number) => Point;
  angleFinder?: (pct: number) => number;
  destX?: number;
  destY?: number;
};

export type TextStyleArray = {
  start: number;
  end: number;
  style: TextStyleDeclaration;
}[];

export const SHARED_ATTRIBUTES = [
  'display',
  'transform',
  'fill',
  'fill-opacity',
  'fill-rule',
  'opacity',
  'stroke',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-dashoffset',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
  'id',
  'paint-order',
  'vector-effect',
  'instantiated_by_use',
  'clip-path',
];

export const createCanvasElementFor = ({
  width,
  height,
}: {
  width: number;
  height: number;
}) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

let segmenter: Intl.Segmenter | false;

const getSegmenter = () => {
  if (!segmenter) {
    segmenter =
      'Intl' in window &&
      'Segmenter' in Intl &&
      new Intl.Segmenter(undefined, {
        granularity: 'grapheme',
      });
  }
  return segmenter;
};

const getWholeChar = (str: string, index: number): string | false => {
  const code = str.charCodeAt(index);
  if (Number.isNaN(code)) {
    return '';
  }
  if (code < 0xd800 || code > 0xdfff) {
    return str.charAt(index);
  }
  if (0xd800 <= code && code <= 0xdbff) {
    if (str.length <= index + 1) {
      throw new Error('High surrogate without following low surrogate');
    }
    const next = str.charCodeAt(index + 1);
    if (0xdc00 > next || next > 0xdfff) {
      throw new Error('High surrogate without following low surrogate');
    }
    return str.charAt(index) + str.charAt(index + 1);
  }
  if (index === 0) {
    throw new Error('Low surrogate without preceding high surrogate');
  }
  const prev = str.charCodeAt(index - 1);
  if (0xd800 > prev || prev > 0xdbff) {
    throw new Error('Low surrogate without preceding high surrogate');
  }
  return false;
};

export const graphemeSplit = (value: string): string[] => {
  segmenter || getSegmenter();
  if (segmenter) {
    return Array.from(segmenter.segment(value)).map(({ segment }) => segment);
  }
  const graphemes: string[] = [];
  for (let i = 0; i < value.length; i++) {
    const char = getWholeChar(value, i);
    if (char !== false) {
      graphemes.push(char);
    }
  }
  return graphemes;
};

export const pick = <T extends Record<string, any>>(
  source: T,
  keys: (keyof T)[] = [],
) => {
  return keys.reduce((result, key) => {
    if (key in source) {
      result[key] = source[key];
    }
    return result;
  }, {} as Partial<T>);
};

export const pickBy = <T extends Record<string, any>>(
  source: T,
  predicate: <K extends keyof T>(value: T[K], key: K, source: T) => boolean,
) => {
  return (Object.keys(source) as (keyof T)[]).reduce((result, key) => {
    if (predicate(source[key], key, source)) {
      result[key] = source[key];
    }
    return result;
  }, {} as Partial<T>);
};

class Cache {
  charWidthsCache = new Map<string, FamilyCache>();

  getFontCache({
    fontFamily,
    fontStyle,
    fontWeight,
  }: {
    fontFamily: string;
    fontStyle: string;
    fontWeight: string | number;
  }): TextCouplesCache {
    const familyKey = fontFamily.toLowerCase();
    if (!this.charWidthsCache.has(familyKey)) {
      this.charWidthsCache.set(familyKey, new Map());
    }
    const familyCache = this.charWidthsCache.get(familyKey)!;
    const styleKey = `${fontStyle.toLowerCase()}_${String(fontWeight).toLowerCase()}`;
    if (!familyCache.has(styleKey)) {
      familyCache.set(styleKey, new Map());
    }
    return familyCache.get(styleKey)!;
  }
}

export const cache = new Cache();

export const cloneStyles = (styles: TextStyle): TextStyle => {
  const cloned: TextStyle = {};
  Object.keys(styles).forEach((lineKey) => {
    cloned[lineKey] = {};
    Object.keys(styles[lineKey]).forEach((charKey) => {
      cloned[lineKey][charKey] = { ...styles[lineKey][charKey] };
    });
  });
  return cloned;
};

export const hasStyleChanged = (
  prevStyle: TextStyleDeclaration,
  nextStyle: TextStyleDeclaration,
  includeTextDecorations = false,
) =>
  prevStyle.fill !== nextStyle.fill ||
  prevStyle.stroke !== nextStyle.stroke ||
  prevStyle.strokeWidth !== nextStyle.strokeWidth ||
  prevStyle.fontSize !== nextStyle.fontSize ||
  prevStyle.fontFamily !== nextStyle.fontFamily ||
  prevStyle.fontWeight !== nextStyle.fontWeight ||
  prevStyle.fontStyle !== nextStyle.fontStyle ||
  prevStyle.textDecorationThickness !== nextStyle.textDecorationThickness ||
  prevStyle.textBackgroundColor !== nextStyle.textBackgroundColor ||
  prevStyle.deltaY !== nextStyle.deltaY ||
  (includeTextDecorations &&
    (prevStyle.overline !== nextStyle.overline ||
      prevStyle.underline !== nextStyle.underline ||
      prevStyle.linethrough !== nextStyle.linethrough));

export const stylesToArray = (
  styles: TextStyle,
  text: string,
): TextStyleArray => {
  const textLines = text.split('\n');
  const stylesArray: TextStyleArray = [];
  let charIndex = -1;
  let prevStyle: TextStyleDeclaration = {};
  const clonedStyles = cloneStyles(styles);

  for (let i = 0; i < textLines.length; i++) {
    const chars = graphemeSplit(textLines[i]);
    if (!clonedStyles[i]) {
      charIndex += chars.length;
      prevStyle = {};
      continue;
    }
    for (let charPosition = 0; charPosition < chars.length; charPosition++) {
      charIndex++;
      const currentStyle = clonedStyles[i][charPosition];
      if (currentStyle && Object.keys(currentStyle).length > 0) {
        if (hasStyleChanged(prevStyle, currentStyle, true)) {
          stylesArray.push({
            start: charIndex,
            end: charIndex + 1,
            style: currentStyle,
          });
        } else {
          stylesArray[stylesArray.length - 1].end++;
        }
      }
      prevStyle = currentStyle || {};
    }
  }

  return stylesArray;
};

export const stylesFromArray = (
  styles: TextStyleArray | TextStyle,
  text: string,
): TextStyle => {
  if (!Array.isArray(styles)) {
    return cloneStyles(styles);
  }
  const textLines = text.split(reNewline);
  const styleObject: TextStyle = {};
  let charIndex = -1;
  let styleIndex = 0;

  for (let i = 0; i < textLines.length; i++) {
    const chars = graphemeSplit(textLines[i]);
    for (let charPosition = 0; charPosition < chars.length; charPosition++) {
      charIndex++;
      if (
        styles[styleIndex] &&
        styles[styleIndex].start <= charIndex &&
        charIndex < styles[styleIndex].end
      ) {
        styleObject[i] = styleObject[i] || {};
        styleObject[i][charPosition] = { ...styles[styleIndex].style };
        if (charIndex === styles[styleIndex].end - 1) {
          styleIndex++;
        }
      }
    }
  }

  return styleObject;
};

const calcLineLength = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

const cubicPointAt = (
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  p3y: number,
  p4x: number,
  p4y: number,
  t: number,
) => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return new Point(
    p1x * mt2 * mt + 3 * p2x * mt2 * t + 3 * p3x * mt * t2 + p4x * t2 * t,
    p1y * mt2 * mt + 3 * p2y * mt2 * t + 3 * p3y * mt * t2 + p4y * t2 * t,
  );
};

const quadraticPointAt = (
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  p3y: number,
  t: number,
) => {
  const mt = 1 - t;
  return new Point(
    p1x * mt * mt + 2 * p2x * mt * t + p3x * t * t,
    p1y * mt * mt + 2 * p2y * mt * t + p3y * t * t,
  );
};

const cubicAngleAt = (
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  p3y: number,
  p4x: number,
  p4y: number,
  t: number,
) => {
  const mt = 1 - t;
  const dx =
    3 * mt * mt * (p2x - p1x) +
    6 * mt * t * (p3x - p2x) +
    3 * t * t * (p4x - p3x);
  const dy =
    3 * mt * mt * (p2y - p1y) +
    6 * mt * t * (p3y - p2y) +
    3 * t * t * (p4y - p3y);
  return Math.atan2(dy, dx);
};

const quadraticAngleAt = (
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  p3y: number,
  t: number,
) => {
  const mt = 1 - t;
  const dx = 2 * mt * (p2x - p1x) + 2 * t * (p3x - p2x);
  const dy = 2 * mt * (p2y - p1y) + 2 * t * (p3y - p2y);
  return Math.atan2(dy, dx);
};

const estimateCurveLength = (
  iterator: (t: number) => Point,
  fromX: number,
  fromY: number,
) => {
  let prev = new Point(fromX, fromY);
  let length = 0;
  for (let step = 1; step <= 100; step++) {
    const point = iterator(step / 100);
    length += calcLineLength(prev.x, prev.y, point.x, point.y);
    prev = point;
  }
  return length;
};

const findPercentageForDistance = (
  segInfo: Required<Pick<PathSegmentInfo, 'x' | 'y' | 'iterator' | 'angleFinder'>>,
  distance: number,
) => {
  let percentage = 0;
  let accumulatedLength = 0;
  let previousPoint: XY = { x: segInfo.x, y: segInfo.y };
  let point: XY = previousPoint;
  let stepSize = 0.01;
  let lastPercentage = 0;

  while (accumulatedLength < distance && stepSize > 0.0001) {
    point = segInfo.iterator(percentage);
    lastPercentage = percentage;
    const nextLength = calcLineLength(
      previousPoint.x,
      previousPoint.y,
      point.x,
      point.y,
    );
    if (nextLength + accumulatedLength > distance) {
      percentage -= stepSize;
      stepSize /= 2;
    } else {
      previousPoint = point;
      percentage += stepSize;
      accumulatedLength += nextLength;
    }
  }

  return {
    ...point,
    angle: segInfo.angleFinder(lastPercentage),
  };
};

export const getPathSegmentsInfo = (path: SimplePathCommand[]) => {
  let totalLength = 0;
  let currentX = 0;
  let currentY = 0;
  let moveX = 0;
  let moveY = 0;
  const info: PathSegmentInfo[] = [];

  for (const segment of path) {
    const baseInfo: PathSegmentInfo = {
      command: segment[0],
      x: currentX,
      y: currentY,
      length: 0,
    };

    switch (segment[0]) {
      case 'M':
        currentX = moveX = segment[1];
        currentY = moveY = segment[2];
        baseInfo.x = currentX;
        baseInfo.y = currentY;
        break;
      case 'L':
        baseInfo.length = calcLineLength(currentX, currentY, segment[1], segment[2]);
        currentX = segment[1];
        currentY = segment[2];
        break;
      case 'C': {
        const iterator = (t: number) =>
          cubicPointAt(
            currentX,
            currentY,
            segment[1],
            segment[2],
            segment[3],
            segment[4],
            segment[5],
            segment[6],
            t,
          );
        baseInfo.iterator = iterator;
        baseInfo.angleFinder = (t: number) =>
          cubicAngleAt(
            currentX,
            currentY,
            segment[1],
            segment[2],
            segment[3],
            segment[4],
            segment[5],
            segment[6],
            t,
          );
        baseInfo.length = estimateCurveLength(iterator, currentX, currentY);
        currentX = segment[5];
        currentY = segment[6];
        break;
      }
      case 'Q': {
        const iterator = (t: number) =>
          quadraticPointAt(
            currentX,
            currentY,
            segment[1],
            segment[2],
            segment[3],
            segment[4],
            t,
          );
        baseInfo.iterator = iterator;
        baseInfo.angleFinder = (t: number) =>
          quadraticAngleAt(
            currentX,
            currentY,
            segment[1],
            segment[2],
            segment[3],
            segment[4],
            t,
          );
        baseInfo.length = estimateCurveLength(iterator, currentX, currentY);
        currentX = segment[3];
        currentY = segment[4];
        break;
      }
      case 'Z':
        baseInfo.destX = moveX;
        baseInfo.destY = moveY;
        baseInfo.length = calcLineLength(currentX, currentY, moveX, moveY);
        currentX = moveX;
        currentY = moveY;
        break;
      default:
        break;
    }

    totalLength += baseInfo.length;
    info.push(baseInfo);
  }

  info.push({ x: currentX, y: currentY, length: totalLength });
  return info;
};

export const getPointOnPath = (
  path: SimplePathCommand[],
  distance: number,
  infos = getPathSegmentsInfo(path),
) => {
  let index = 0;
  while (distance - infos[index].length > 0 && index < infos.length - 2) {
    distance -= infos[index].length;
    index++;
  }

  const segInfo = infos[index];
  const segPercent = segInfo.length === 0 ? 0 : distance / segInfo.length;
  const segment = path[index];

  switch (segInfo.command) {
    case 'M':
      return { x: segInfo.x, y: segInfo.y, angle: 0 };
    case 'Z':
      return {
        ...new Point(segInfo.x, segInfo.y).lerp(
          new Point(segInfo.destX!, segInfo.destY!),
          segPercent,
        ),
        angle: Math.atan2(segInfo.destY! - segInfo.y, segInfo.destX! - segInfo.x),
      };
    case 'L':
      return {
        ...new Point(segInfo.x, segInfo.y).lerp(
          new Point(segment[1], segment[2]),
          segPercent,
        ),
        angle: Math.atan2(segment[2] - segInfo.y, segment[1] - segInfo.x),
      };
    case 'C':
    case 'Q':
      return findPercentageForDistance(
        segInfo as Required<Pick<PathSegmentInfo, 'x' | 'y' | 'iterator' | 'angleFinder'>>,
        distance,
      );
    default:
      return undefined;
  }
};