
import { Point } from "./Point";
import type { TMat2D } from "./typedefs";

/** 获取变换后的bounds */
const tempP2 = new Point();
export const sizeAfterTransform = (
  width: number,
  height: number,
  m: TMat2D
) => {
  const dimX = width / 2,
    dimY = height / 2;

  const a = m[0];
  const b = m[1];
  const c = m[2];
  const d = m[3];
  const tx = m[4];
  const ty = m[5];

  const p0x = -dimX * a + -dimY * c + tx;
  const p0y = -dimX * b + -dimY * d + ty;

  const p1x = dimX * a + -dimY * c + tx;
  const p1y = dimX * b + -dimY * d + ty;

  const p2x = -dimX * a + dimY * c + tx;
  const p2y = -dimX * b + dimY * d + ty;

  const p3x = dimX * a + dimY * c + tx;
  const p3y = dimX * b + dimY * d + ty;

  const maxX = Math.max(p0x, p1x, p2x, p3x);
  const minX = Math.min(p0x, p1x, p2x, p3x);
  const maxY = Math.max(p0y, p1y, p2y, p3y);
  const minY = Math.min(p0y, p1y, p2y, p3y);

  tempP2.setXY(maxX - minX, maxY - minY);

  return tempP2;
};