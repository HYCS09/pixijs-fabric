import { CENTER, LEFT, TOP } from '../constants';
import { FabricObject } from '../Object/FabricObject';
import { Point, type XY } from '../Point';

type TComplexParsedCommandType =
  | 'M'
  | 'm'
  | 'L'
  | 'l'
  | 'H'
  | 'h'
  | 'V'
  | 'v'
  | 'C'
  | 'c'
  | 'S'
  | 's'
  | 'Q'
  | 'q'
  | 'T'
  | 't'
  | 'A'
  | 'a'
  | 'Z'
  | 'z';

type TComplexParsedCommand = [TComplexParsedCommandType, ...number[]];
type TComplexPathData = TComplexParsedCommand[];
type TSimplePathData =
  | ['M', number, number]
  | ['L', number, number]
  | ['C', number, number, number, number, number, number]
  | ['Q', number, number, number, number]
  | ['Z'];

interface PathDimensions {
  left: number;
  top: number;
  width: number;
  height: number;
  pathOffset: Point;
}

const reNum = String.raw`[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?`;
const commaWsp = String.raw`\s*,?\s*`;
const p = `${commaWsp}(${reNum})`;
const reArcCommandPoints = `${p}${p}${p}${commaWsp}([01])${commaWsp}([01])${p}${p}`;
const rePathCommand = '[mzlhvcsqta][^mzlhvcsqta]*';

const rePathCmdAll = new RegExp(rePathCommand, 'gi');
const regExpArcCommandPoints = new RegExp(reArcCommandPoints, 'g');
const reMyNum = new RegExp(reNum, 'gi');

const repeatedCommands: Record<string, 'l' | 'L'> = {
  m: 'l',
  M: 'L',
};

const commandLengths = {
  m: 2,
  l: 2,
  h: 1,
  v: 1,
  c: 6,
  s: 4,
  q: 4,
  t: 2,
  a: 7,
} as const;

const makeBoundingBoxFromPoints = (points: XY[]) => {
  if (!points.length) {
    return {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    };
  }

  let left = points[0].x;
  let top = points[0].y;
  let right = points[0].x;
  let bottom = points[0].y;

  for (let i = 1; i < points.length; i++) {
    const { x, y } = points[i];
    if (x < left) left = x;
    if (x > right) right = x;
    if (y < top) top = y;
    if (y > bottom) bottom = y;
  }

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
};

const calcVectorAngle = (ux: number, uy: number, vx: number, vy: number) => {
  const ta = Math.atan2(uy, ux);
  const tb = Math.atan2(vy, vx);
  return tb >= ta ? tb - ta : 2 * Math.PI - (ta - tb);
};

const segmentToBezier = (
  theta1: number,
  theta2: number,
  cosTh: number,
  sinTh: number,
  rx: number,
  ry: number,
  cx1: number,
  cy1: number,
  mT: number,
  fromX: number,
  fromY: number,
): ['C', number, number, number, number, number, number] => {
  const costh1 = Math.cos(theta1);
  const sinth1 = Math.sin(theta1);
  const costh2 = Math.cos(theta2);
  const sinth2 = Math.sin(theta2);
  const toX = cosTh * rx * costh2 - sinTh * ry * sinth2 + cx1;
  const toY = sinTh * rx * costh2 + cosTh * ry * sinth2 + cy1;
  const cp1X = fromX + mT * (-cosTh * rx * sinth1 - sinTh * ry * costh1);
  const cp1Y = fromY + mT * (-sinTh * rx * sinth1 + cosTh * ry * costh1);
  const cp2X = toX + mT * (cosTh * rx * sinth2 + sinTh * ry * costh2);
  const cp2Y = toY + mT * (sinTh * rx * sinth2 - cosTh * ry * costh2);
  return ['C', cp1X, cp1Y, cp2X, cp2Y, toX, toY];
};

const arcToSegments = (
  toX: number,
  toY: number,
  rx: number,
  ry: number,
  large: number,
  sweep: number,
  rotateX: number,
) => {
  if (rx === 0 || ry === 0) {
    return [] as ['C', number, number, number, number, number, number][];
  }

  let fromX = 0;
  let fromY = 0;
  let root = 0;

  const theta = (rotateX * Math.PI) / 180;
  const sinTheta = Math.sin(theta);
  const cosTh = Math.cos(theta);
  const px = 0.5 * (-cosTh * toX - sinTheta * toY);
  const py = 0.5 * (-cosTh * toY + sinTheta * toX);
  const rx2 = rx ** 2;
  const ry2 = ry ** 2;
  const py2 = py ** 2;
  const px2 = px ** 2;
  const pl = rx2 * ry2 - rx2 * py2 - ry2 * px2;

  let _rx = Math.abs(rx);
  let _ry = Math.abs(ry);

  if (pl < 0) {
    const s = Math.sqrt(1 - pl / (rx2 * ry2));
    _rx *= s;
    _ry *= s;
  } else {
    root = (large === sweep ? -1 : 1) * Math.sqrt(pl / (rx2 * py2 + ry2 * px2));
  }

  const cx = (root * _rx * py) / _ry;
  const cy = (-root * _ry * px) / _rx;
  const cx1 = cosTh * cx - sinTheta * cy + toX * 0.5;
  const cy1 = sinTheta * cx + cosTh * cy + toY * 0.5;

  let mTheta = calcVectorAngle(1, 0, (px - cx) / _rx, (py - cy) / _ry);
  let dTheta = calcVectorAngle(
    (px - cx) / _rx,
    (py - cy) / _ry,
    (-px - cx) / _rx,
    (-py - cy) / _ry,
  );

  if (sweep === 0 && dTheta > 0) {
    dTheta -= 2 * Math.PI;
  } else if (sweep === 1 && dTheta < 0) {
    dTheta += 2 * Math.PI;
  }

  const segments = Math.ceil(Math.abs((dTheta / Math.PI) * 2));
  const result: ['C', number, number, number, number, number, number][] = [];
  const mDelta = dTheta / segments;
  const mT =
    ((8 / 3) * Math.sin(mDelta / 4) * Math.sin(mDelta / 4)) /
    Math.sin(mDelta / 2);
  let th3 = mTheta + mDelta;

  for (let i = 0; i < segments; i++) {
    result.push(
      segmentToBezier(
        mTheta,
        th3,
        cosTh,
        sinTheta,
        _rx,
        _ry,
        cx1,
        cy1,
        mT,
        fromX,
        fromY,
      ),
    );
    fromX = result[i][5];
    fromY = result[i][6];
    mTheta = th3;
    th3 += mDelta;
  }

  return result;
};

const fromArcToBeziers = (
  fx: number,
  fy: number,
  command: TComplexParsedCommand,
) => {
  const [, rx, ry, rot, large, sweep, tx, ty] = command;
  const segsNorm = arcToSegments(tx - fx, ty - fy, rx, ry, large, sweep, rot);

  for (let i = 0; i < segsNorm.length; i++) {
    segsNorm[i][1] += fx;
    segsNorm[i][2] += fy;
    segsNorm[i][3] += fx;
    segsNorm[i][4] += fy;
    segsNorm[i][5] += fx;
    segsNorm[i][6] += fy;
  }

  return segsNorm;
};

const parsePath = (pathString: string): TComplexPathData => {
  const chain: TComplexPathData = [];
  const all = pathString.match(rePathCmdAll) ?? [];

  for (const matchStr of all) {
    const commandLetter = matchStr[0] as TComplexParsedCommandType;
    if (commandLetter === 'z' || commandLetter === 'Z') {
      chain.push([commandLetter]);
      continue;
    }

    const commandLength =
      commandLengths[
        commandLetter.toLowerCase() as keyof typeof commandLengths
      ];

    let paramArr: string[] = [];
    if (commandLetter === 'a' || commandLetter === 'A') {
      regExpArcCommandPoints.lastIndex = 0;
      for (let out = null; (out = regExpArcCommandPoints.exec(matchStr)); ) {
        paramArr.push(...out.slice(1));
      }
    } else {
      paramArr = matchStr.match(reMyNum) ?? [];
    }

    for (let i = 0; i < paramArr.length; i += commandLength) {
      const newCommand = [commandLetter] as TComplexParsedCommand;
      const transformedCommand = repeatedCommands[commandLetter];
      newCommand[0] =
        i > 0 && transformedCommand ? transformedCommand : commandLetter;
      for (let j = 0; j < commandLength; j++) {
        newCommand[j + 1] = parseFloat(paramArr[i + j]);
      }
      chain.push(newCommand);
    }
  }

  return chain;
};

const makePathSimpler = (path: TComplexPathData): TSimplePathData[] => {
  let x = 0;
  let y = 0;
  let x1 = 0;
  let y1 = 0;
  const destinationPath: TSimplePathData[] = [];
  let previous = '';
  let controlX = 0;
  let controlY = 0;

  for (const parsedCommand of path) {
    const current = [...parsedCommand] as TComplexParsedCommand;
    let converted: TSimplePathData | undefined;

    switch (current[0]) {
      case 'l':
        current[1] += x;
        current[2] += y;
      // falls through
      case 'L':
        x = current[1];
        y = current[2];
        converted = ['L', x, y];
        break;
      case 'h':
        current[1] += x;
      // falls through
      case 'H':
        x = current[1];
        converted = ['L', x, y];
        break;
      case 'v':
        current[1] += y;
      // falls through
      case 'V':
        y = current[1];
        converted = ['L', x, y];
        break;
      case 'm':
        current[1] += x;
        current[2] += y;
      // falls through
      case 'M':
        x = current[1];
        y = current[2];
        x1 = current[1];
        y1 = current[2];
        converted = ['M', x, y];
        break;
      case 'c':
        current[1] += x;
        current[2] += y;
        current[3] += x;
        current[4] += y;
        current[5] += x;
        current[6] += y;
      // falls through
      case 'C':
        controlX = current[3];
        controlY = current[4];
        x = current[5];
        y = current[6];
        converted = ['C', current[1], current[2], controlX, controlY, x, y];
        break;
      case 's':
        current[1] += x;
        current[2] += y;
        current[3] += x;
        current[4] += y;
      // falls through
      case 'S':
        if (previous === 'C') {
          controlX = 2 * x - controlX;
          controlY = 2 * y - controlY;
        } else {
          controlX = x;
          controlY = y;
        }
        x = current[3];
        y = current[4];
        converted = ['C', controlX, controlY, current[1], current[2], x, y];
        controlX = converted[3];
        controlY = converted[4];
        break;
      case 'q':
        current[1] += x;
        current[2] += y;
        current[3] += x;
        current[4] += y;
      // falls through
      case 'Q':
        controlX = current[1];
        controlY = current[2];
        x = current[3];
        y = current[4];
        converted = ['Q', controlX, controlY, x, y];
        break;
      case 't':
        current[1] += x;
        current[2] += y;
      // falls through
      case 'T':
        if (previous === 'Q') {
          controlX = 2 * x - controlX;
          controlY = 2 * y - controlY;
        } else {
          controlX = x;
          controlY = y;
        }
        x = current[1];
        y = current[2];
        converted = ['Q', controlX, controlY, x, y];
        break;
      case 'a':
        current[6] += x;
        current[7] += y;
      // falls through
      case 'A':
        fromArcToBeziers(x, y, current).forEach((b) => destinationPath.push(b));
        x = current[6];
        y = current[7];
        break;
      case 'z':
      case 'Z':
        x = x1;
        y = y1;
        converted = ['Z'];
        break;
      default:
        break;
    }

    if (converted) {
      destinationPath.push(converted);
      previous = converted[0];
    } else {
      previous = '';
    }
  }

  return destinationPath;
};

const cb1 = (t: number) => t ** 3;
const cb2 = (t: number) => 3 * t ** 2 * (1 - t);
const cb3 = (t: number) => 3 * t * (1 - t) ** 2;
const cb4 = (t: number) => (1 - t) ** 3;

const getPointOnCubicBezier = (
  begx: number,
  begy: number,
  cp1x: number,
  cp1y: number,
  cp2x: number,
  cp2y: number,
  endx: number,
  endy: number,
  t: number,
) => {
  const c1 = cb1(t);
  const c2 = cb2(t);
  const c3 = cb3(t);
  const c4 = cb4(t);
  return {
    x: endx * c1 + cp2x * c2 + cp1x * c3 + begx * c4,
    y: endy * c1 + cp2y * c2 + cp1y * c3 + begy * c4,
  };
};

const getBoundsOfCurve = (
  begx: number,
  begy: number,
  cp1x: number,
  cp1y: number,
  cp2x: number,
  cp2y: number,
  endx: number,
  endy: number,
) => {
  const tValues: number[] = [];

  let b = 6 * begx - 12 * cp1x + 6 * cp2x;
  let a = -3 * begx + 9 * cp1x - 9 * cp2x + 3 * endx;
  let c = 3 * cp1x - 3 * begx;

  for (let i = 0; i < 2; ++i) {
    if (i > 0) {
      b = 6 * begy - 12 * cp1y + 6 * cp2y;
      a = -3 * begy + 9 * cp1y - 9 * cp2y + 3 * endy;
      c = 3 * cp1y - 3 * begy;
    }

    if (Math.abs(a) < 1e-12) {
      if (Math.abs(b) < 1e-12) {
        continue;
      }
      const t = -c / b;
      if (t > 0 && t < 1) {
        tValues.push(t);
      }
      continue;
    }

    const b2ac = b * b - 4 * c * a;
    if (b2ac < 0) {
      continue;
    }

    const sqrtB2ac = Math.sqrt(b2ac);
    const t1 = (-b + sqrtB2ac) / (2 * a);
    if (t1 > 0 && t1 < 1) {
      tValues.push(t1);
    }

    const t2 = (-b - sqrtB2ac) / (2 * a);
    if (t2 > 0 && t2 < 1) {
      tValues.push(t2);
    }
  }

  const xs: number[] = [begx, endx];
  const ys: number[] = [begy, endy];
  for (let i = 0; i < tValues.length; i++) {
    const pnt = getPointOnCubicBezier(
      begx,
      begy,
      cp1x,
      cp1y,
      cp2x,
      cp2y,
      endx,
      endy,
      tValues[i],
    );
    xs.push(pnt.x);
    ys.push(pnt.y);
  }

  return [
    new Point(Math.min(...xs), Math.min(...ys)),
    new Point(Math.max(...xs), Math.max(...ys)),
  ];
};

class Path extends FabricObject {
  declare path: TSimplePathData[];
  declare pathOffset: Point;
  declare sourcePath?: string;

  constructor(path: TComplexPathData | string = [], options: any = {}) {
    super();
    Object.assign(this, Path.ownDefaults);

    const { path: _path, left, top, ...otherOptions } = options;
    void _path;

    this.setOptions(otherOptions);
    this._setPath(path, true);

    if (typeof left === 'number') {
      this.set(LEFT, left);
    }
    if (typeof top === 'number') {
      this.set(TOP, top);
    }
  }

  _setPath(path: TComplexPathData | string, adjustPosition = false) {
    const parsed = Array.isArray(path) ? path : parsePath(path);
    this.path = makePathSimpler(parsed);
    this.setBoundingBox(adjustPosition);
  }

  _renderPathCommands(ctx: CanvasRenderingContext2D) {
    const l = -this.pathOffset.x;
    const t = -this.pathOffset.y;

    ctx.beginPath();

    for (const command of this.path) {
      switch (command[0]) {
        case 'L':
          ctx.lineTo(command[1] + l, command[2] + t);
          break;
        case 'M':
          ctx.moveTo(command[1] + l, command[2] + t);
          break;
        case 'C':
          ctx.bezierCurveTo(
            command[1] + l,
            command[2] + t,
            command[3] + l,
            command[4] + t,
            command[5] + l,
            command[6] + t,
          );
          break;
        case 'Q':
          ctx.quadraticCurveTo(
            command[1] + l,
            command[2] + t,
            command[3] + l,
            command[4] + t,
          );
          break;
        case 'Z':
          ctx.closePath();
          break;
      }
    }
  }

  _render(ctx: CanvasRenderingContext2D) {
    this._renderPathCommands(ctx);
    this._renderPaintInOrder(ctx);
  }

  setBoundingBox(adjustPosition = false) {
    const { width, height, pathOffset } = this._calcDimensions();
    this.set({ width, height, pathOffset });

    if (adjustPosition) {
      this.setPositionByOrigin(pathOffset, CENTER, CENTER);
    }
  }

  _calcBoundsFromPath() {
    const bounds: XY[] = [];
    let subpathStartX = 0;
    let subpathStartY = 0;
    let x = 0;
    let y = 0;

    for (const command of this.path) {
      switch (command[0]) {
        case 'L':
          x = command[1];
          y = command[2];
          bounds.push({ x: subpathStartX, y: subpathStartY }, { x, y });
          break;
        case 'M':
          x = command[1];
          y = command[2];
          subpathStartX = x;
          subpathStartY = y;
          bounds.push({ x, y });
          break;
        case 'C':
          bounds.push(
            ...getBoundsOfCurve(
              x,
              y,
              command[1],
              command[2],
              command[3],
              command[4],
              command[5],
              command[6],
            ),
          );
          x = command[5];
          y = command[6];
          break;
        case 'Q':
          bounds.push(
            ...getBoundsOfCurve(
              x,
              y,
              command[1],
              command[2],
              command[1],
              command[2],
              command[3],
              command[4],
            ),
          );
          x = command[3];
          y = command[4];
          break;
        case 'Z':
          x = subpathStartX;
          y = subpathStartY;
          break;
      }
    }

    return makeBoundingBoxFromPoints(bounds);
  }

  _calcDimensions(): PathDimensions {
    const bbox = this._calcBoundsFromPath();
    return {
      ...bbox,
      pathOffset: new Point(
        bbox.left + bbox.width / 2,
        bbox.top + bbox.height / 2,
      ),
    };
  }
}

export { Path };
