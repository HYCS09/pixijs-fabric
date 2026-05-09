import { Container, Graphics, Matrix } from 'pixi.js';
import { Point } from './Point';
import {
  TCornerPoint,
  TDegree,
  TMat2D,
  TOriginX,
  TOriginY,
  TRadian,
} from './typedefs';
import { CommonMethods } from './CommonMethods';
import { sizeAfterTransform } from './objectTransforms';
import { calcDimensionsMatrix, composeMatrix } from './matrix';
import { CENTER } from './constants';
import { FakeCanvasRenderingContext2D } from './FakeCanvasRenderingContext2D';

const originOffset = {
  left: -0.5,
  top: -0.5,
  center: 0,
  bottom: 0.5,
  right: 0.5,
};

const resolveOrigin = (
  originValue: TOriginX | TOriginY | number | undefined,
): number => {
  // Fall back to center when origin is not initialized yet.
  if (originValue == null) {
    return 0;
  }

  return typeof originValue === 'string'
    ? originOffset[originValue]
    : originValue - 0.5;
};

interface ObjectEvents {}

export const PiBy180 = Math.PI / 180;

export const degreesToRadians = (degrees: TDegree): TRadian =>
  (degrees * PiBy180) as TRadian;

declare module 'pixi.js' {
  interface Graphics {
    skipFillOrStroke?: boolean;
    pathDirty?: boolean;
  }
}

type TMatrixCache = {
  key: number[];
  value: TMat2D;
};

const tempMatrix2 = new Matrix();

const tempMatrixCacheKey: number[] = [];

const cacheKeyEqual = (a: number[], b: number[]): boolean => {
  for (let i = 0; i < 14; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

type TACoords = TCornerPoint;

const dimOptions = {
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  skewY: 0,
  width: 1,
  height: 1,
  strokeWidth: 1,
};

const tempOptions = {
  angle: 0,
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  skewY: 0,
  flipX: false,
  flipY: false,
};

const temp1 = new Point();
const temp2 = new Point();
const temp3 = new Point();
const temp9 = new Point();

const tempTCornerPoint: TCornerPoint = {
  tl: new Point(),
  tr: new Point(),
  bl: new Point(),
  br: new Point(),
};

const tempMatrix = new Matrix();

export class ObjectGeometry<
  EventSpec extends ObjectEvents = ObjectEvents,
> extends CommonMethods<EventSpec> {
  declare fill: string;
  declare stroke: string;
  public pixiContent = new Container({ children: [new Graphics()] });
  public drawIdx: number;
  public fillIdx: number;
  public strokeIdx: number;
  declare padding: number;
  declare aCoords: TACoords;
  /** local transform */
  ownMatrixCache: TMatrixCache = {
    key: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    value: [1, 0, 0, 1, 0, 0],
  };
  /** world transform */
  matrixCache: TMatrixCache = {
    key: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    value: [1, 0, 0, 1, 0, 0],
  };
  declare top: number;
  declare left: number;
  declare width: number;
  declare height: number;
  declare flipX: boolean;
  declare flipY: boolean;
  declare scaleX: number;
  declare scaleY: number;
  declare skewX: number;
  declare skewY: number;
  declare originX: TOriginX;
  declare originY: TOriginY;
  declare angle: TDegree; // 角度制
  declare strokeWidth: number;
  declare strokeUniform: boolean;
  constructor() {
    super();
    // 默认值
    this.set({
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      flipX: false,
      flipY: false,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
      originX: CENTER,
      originY: CENTER,
      angle: 0,
      strokeWidth: 1,
      fill: '#000000',
      stroke: '#000000',
    });
    this.resetDrawIdx();
  }
  protected clearPixiContent(): void {
    const children = this.pixiContent.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      child.clear();
      child.skipFillOrStroke = false;
      child.pathDirty = false;
    }

    this.resetDrawIdx();
  }
  drawObject(ctx: CanvasRenderingContext2D) {
    const originalFill = this.fill;
    const originalStroke = this.stroke;
    (ctx as FakeCanvasRenderingContext2D).bindObjectGeometry(this);
    this._render(ctx);
    this.fill = originalFill;
    this.stroke = originalStroke;
  }
  transform(ctx: CanvasRenderingContext2D) {
    this.calcOwnMatrix();
  }
  render(ctx: CanvasRenderingContext2D) {
    this.transform(ctx);
    this.drawObject(ctx);
  }
  _render(ctx: CanvasRenderingContext2D) {}
  public getCurGraphics(): Graphics {
    const children = this.pixiContent.children;
    if (!children[this.drawIdx]) {
      this.pixiContent.addChild(new Graphics());
    }

    return children[this.drawIdx];
  }
  protected resetDrawIdx() {
    this.drawIdx = 0;
    this.fillIdx = 0;
    this.strokeIdx = 0;
  }
  transformMatrixKey(): number[] {
    tempMatrixCacheKey[0] = this.top;
    tempMatrixCacheKey[1] = this.left;
    tempMatrixCacheKey[2] = this.width;
    tempMatrixCacheKey[3] = this.height;
    tempMatrixCacheKey[4] = this.scaleX;
    tempMatrixCacheKey[5] = this.scaleY;
    tempMatrixCacheKey[6] = this.angle;
    tempMatrixCacheKey[7] = this.strokeWidth;
    tempMatrixCacheKey[8] = this.skewX;
    tempMatrixCacheKey[9] = this.skewY;
    tempMatrixCacheKey[10] = +this.flipX;
    tempMatrixCacheKey[11] = +this.flipY;
    tempMatrixCacheKey[12] = resolveOrigin(this.originX);
    tempMatrixCacheKey[13] = resolveOrigin(this.originY);

    return tempMatrixCacheKey;
  }
  /** 获取元素的变换后的宽高 */
  protected _getTransformedDimensions(options?: {
    scaleX?: number;
    scaleY?: number;
    skewX?: number;
    skewY?: number;
    width?: number;
    height?: number;
    strokeWidth?: number;
  }): Point {
    dimOptions.scaleX = this.scaleX;
    dimOptions.scaleY = this.scaleY;
    dimOptions.skewX = this.skewX;
    dimOptions.skewY = this.skewY;
    dimOptions.width = this.width;
    dimOptions.height = this.height;
    dimOptions.strokeWidth = this.strokeWidth;
    if (options) {
      Object.assign(dimOptions, options);
    }

    // stroke is applied before/after transformations are applied according to `strokeUniform`
    const strokeWidth = dimOptions.strokeWidth;
    let preScalingStrokeValue = strokeWidth,
      postScalingStrokeValue = 0;

    if (this.strokeUniform) {
      preScalingStrokeValue = 0;
      postScalingStrokeValue = strokeWidth;
    }
    const dimX = dimOptions.width + preScalingStrokeValue,
      dimY = dimOptions.height + preScalingStrokeValue,
      noSkew = dimOptions.skewX === 0 && dimOptions.skewY === 0;
    if (noSkew) {
      temp1.setXY(dimX * dimOptions.scaleX, dimY * dimOptions.scaleY);
    } else {
      const { x: width, y: height } = sizeAfterTransform(
        dimX,
        dimY,
        calcDimensionsMatrix(dimOptions),
      );
      temp1.setXY(width, height);
    }

    return temp1.scalarAdd(postScalingStrokeValue);
  }
  public translateToGivenOrigin(
    point: Point,
    fromOriginX: TOriginX,
    fromOriginY: TOriginY,
    toOriginX: TOriginX,
    toOriginY: TOriginY,
  ): Point {
    const { x, y } = point;
    const offsetX = resolveOrigin(toOriginX) - resolveOrigin(fromOriginX),
      offsetY = resolveOrigin(toOriginY) - resolveOrigin(fromOriginY);

    if (offsetX || offsetY) {
      const { x: width, y: height } = this._getTransformedDimensions();
      const resX = x + offsetX * width;
      const resY = y + offsetY * height;

      temp2.setXY(resX, resY);

      return temp2;
    } else {
      temp2.copyFrom(point);
      return temp2;
    }
  }
  public translateToCenterPoint(
    point: Point,
    originX: TOriginX,
    originY: TOriginY,
  ): Point {
    temp9.copyFrom(point);

    if (originX === CENTER && originY === CENTER) {
      return temp9;
    }

    const p = this.translateToGivenOrigin(
      temp9,
      originX,
      originY,
      CENTER,
      CENTER,
    );
    if (this.angle) {
      return p.rotate(degreesToRadians(this.angle), temp9);
    }
    return p;
  }
  public getRelativeCenterPoint() {
    temp3.setXY(this.left ?? 0, this.top ?? 0);
    const p = this.translateToCenterPoint(temp3, this.originX, this.originY);
    temp3.copyFrom(p);
    return temp3;
  }
  /** 计算内容区域4个顶点的local坐标 */
  public calcACoords(): TCornerPoint {
    const { x, y } = this.getRelativeCenterPoint();

    const angle = this.angle ?? 0;
    tempMatrix.reset().rotate(degreesToRadians(angle)).translate(x, y);
    const dim = this._getTransformedDimensions();
    const w = dim.x / 2;
    const h = dim.y / 2;

    const { a, b, c, d, tx, ty } = tempMatrix;

    const x0 = -w;
    const y0 = -h;
    tempTCornerPoint.tl.setXY(a * x0 + c * y0 + tx, b * x0 + d * y0 + ty);
    const x1 = w;
    const y1 = -h;
    tempTCornerPoint.tr.setXY(a * x1 + c * y1 + tx, b * x1 + d * y1 + ty);
    const x2 = -w;
    const y2 = h;
    tempTCornerPoint.bl.setXY(a * x2 + c * y2 + tx, b * x2 + d * y2 + ty);
    const x3 = w;
    const y3 = h;
    tempTCornerPoint.br.setXY(a * x3 + c * y3 + tx, b * x3 + d * y3 + ty);
    return tempTCornerPoint;
  }
  public calcOwnMatrix(): TMat2D {
    const key = this.transformMatrixKey();
    const cache = this.ownMatrixCache;

    if (!cacheKeyEqual(key, cache.key)) {
      const center = this.getRelativeCenterPoint();
      tempOptions.angle = this.angle;
      tempOptions.translateX = center.x;
      tempOptions.translateY = center.y;
      tempOptions.scaleX = this.scaleX;
      tempOptions.scaleY = this.scaleY;
      tempOptions.skewX = this.skewX;
      tempOptions.skewY = this.skewY;
      tempOptions.flipX = this.flipX;
      tempOptions.flipY = this.flipY;
      const value = composeMatrix(tempOptions);

      cache.key[0] = key[0];
      cache.key[1] = key[1];
      cache.key[2] = key[2];
      cache.key[3] = key[3];
      cache.key[4] = key[4];
      cache.key[5] = key[5];
      cache.key[6] = key[6];
      cache.key[7] = key[7];
      cache.key[8] = key[8];
      cache.key[9] = key[9];
      cache.key[10] = key[10];
      cache.key[11] = key[11];
      cache.key[12] = key[12];
      cache.key[13] = key[13];

      cache.value[0] = value[0];
      cache.value[1] = value[1];
      cache.value[2] = value[2];
      cache.value[3] = value[3];
      cache.value[4] = value[4];
      cache.value[5] = value[5];

      tempMatrix2.set(
        value[0],
        value[1],
        value[2],
        value[3],
        value[4],
        value[5],
      );
      this.pixiContent.setFromMatrix(tempMatrix2);
    }

    return cache.value;
  }
}
