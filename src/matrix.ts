import { Matrix } from 'pixi.js';
import type { TDegree, TMat2D, TRadian } from './typedefs';

declare module 'pixi.js' {
  interface Matrix {
    reset(): this;
    fabricSkew(angleX: number, angleY: number): Matrix;
  }
}
Matrix.prototype.reset = function () {
  this.set(1, 0, 0, 1, 0, 0);
  return this;
};
const skewTemp = new Matrix();
Matrix.prototype.fabricSkew = function (skewX: number, skewY: number) {
  skewTemp.reset();
  skewTemp.c = Math.tan(skewX);
  skewTemp.b = Math.tan(skewY);
  return this.prepend(skewTemp);
};

export type TRotateMatrixArgs = {
  angle?: TDegree;
};

export type TTranslateMatrixArgs = {
  translateX?: number;
  translateY?: number;
};

export type TScaleMatrixArgs = {
  scaleX?: number;
  scaleY?: number;
  flipX?: boolean;
  flipY?: boolean;
  skewX?: TDegree;
  skewY?: TDegree;
};

export type TComposeMatrixArgs = TTranslateMatrixArgs &
  TRotateMatrixArgs &
  TScaleMatrixArgs;

const tempM = new Matrix();
const tempTMat2D3: TMat2D = [1, 0, 0, 1, 0, 0];
export const PiBy180 = Math.PI / 180;

const degreesToRadians = (degrees: TDegree): TRadian =>
  (degrees * PiBy180) as TRadian;

export const radiansToDegrees = (radians: TRadian): TDegree =>
  (radians / PiBy180) as TDegree;

export const calcDimensionsMatrix = ({
  scaleX = 1,
  scaleY = 1,
  flipX = false,
  flipY = false,
  skewX = 0, // 角度制
  skewY = 0, // 角度制
}: {
  scaleX?: number;
  scaleY?: number;
  flipX?: boolean;
  flipY?: boolean;
  skewX?: number;
  skewY?: number;
}): TMat2D => {
  tempM.reset();

  if (skewY) {
    tempM.fabricSkew(0, degreesToRadians(skewY));
  }
  if (skewX) {
    tempM.fabricSkew(degreesToRadians(skewX), 0);
  }

  tempM.scale(flipX ? -scaleX : scaleX, flipY ? -scaleY : scaleY);

  tempTMat2D3[0] = tempM.a;
  tempTMat2D3[1] = tempM.b;
  tempTMat2D3[2] = tempM.c;
  tempTMat2D3[3] = tempM.d;
  tempTMat2D3[4] = tempM.tx;
  tempTMat2D3[5] = tempM.ty;

  return tempTMat2D3;
};
const tempMatrix2 = new Matrix();
const tempM3 = new Matrix();
const tempMat2D: TMat2D = [1, 0, 0, 1, 0, 0];
export const composeMatrix = (options: TComposeMatrixArgs): TMat2D => {
  const { translateX = 0, translateY = 0, angle = 0 as TDegree } = options;
  tempMatrix2
    .reset()
    .rotate(degreesToRadians(angle))
    .translate(translateX, translateY);

  const scaleMatrix = calcDimensionsMatrix(options);
  tempM3.set(
    scaleMatrix[0],
    scaleMatrix[1],
    scaleMatrix[2],
    scaleMatrix[3],
    scaleMatrix[4],
    scaleMatrix[5],
  );
  if (!isIdentityMatrix(scaleMatrix)) {
    tempMatrix2.append(tempM3);
  }

  const { a, b, c, d, tx, ty } = tempMatrix2;
  tempMat2D[0] = a;
  tempMat2D[1] = b;
  tempMat2D[2] = c;
  tempMat2D[3] = d;
  tempMat2D[4] = tx;
  tempMat2D[5] = ty;
  return tempMat2D;
};

export const isIdentityMatrix = (matrix: TMat2D) => {
  return (
    matrix[0] === 1 &&
    matrix[1] === 0 &&
    matrix[2] === 0 &&
    matrix[3] === 1 &&
    matrix[4] === 0 &&
    matrix[5] === 0
  );
};

export const calcPlaneRotation = ([a, b]: TMat2D) =>
  Math.atan2(b, a) as TRadian;

const tempRes = {
  angle: 0 as TDegree,
  scaleX: 1,
  scaleY: 1,
  skewX: 0 as TDegree,
  skewY: 0 as TDegree,
  translateX: 0,
  translateY: 0,
};
export type TQrDecomposeOut = Required<
  Omit<TComposeMatrixArgs, 'flipX' | 'flipY'>
>;
export const qrDecompose = (a: TMat2D): TQrDecomposeOut => {
  const angle = calcPlaneRotation(a),
    denom = Math.pow(a[0], 2) + Math.pow(a[1], 2),
    scaleX = Math.sqrt(denom),
    scaleY = (a[0] * a[3] - a[2] * a[1]) / scaleX,
    skewX = Math.atan2(a[0] * a[2] + a[1] * a[3], denom);

  tempRes.angle = radiansToDegrees(angle);
  tempRes.scaleX = scaleX;
  tempRes.scaleY = scaleY;
  tempRes.skewX = radiansToDegrees(skewX);
  tempRes.skewY = 0 as TDegree;
  tempRes.translateX = a[4] || 0;
  tempRes.translateY = a[5] || 0;

  return tempRes;
};
