import { Point, XY } from './Point';
import type { InnerObject as BaseFabricObject } from './Object/Object';

interface NominalTag<T> {
  nominalTag?: T;
}
type Nominal<Type, Tag> = NominalTag<Tag> & Type;

export type TValidToObjectMethod = 'toDatalessObject' | 'toObject';

const enum Degree {}
const enum Radian {}

export type TDegree = Nominal<number, Degree>;
export type TRadian = Nominal<number, Radian>;

export type TMat2D = [
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
];

export type TSize = {
  width: number;
  height: number;
};

export type TBBox = {
  left: number;
  top: number;
} & TSize;

export type TOriginX = 'center' | 'left' | 'right' | number;
export type TOriginY = 'center' | 'top' | 'bottom' | number;

export type TCornerPoint = {
  tl: Point;
  tr: Point;
  bl: Point;
  br: Point;
};

type TNonFunctionPropertyNames<T> = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];
export type TClassProperties<T> = Pick<T, TNonFunctionPropertyNames<T>>;
export type TOptions<T> = Partial<T> & Record<string, any>;

export type Abortable = {
  signal?: AbortSignal;
};

export type Constructor<T = object> = new (...args: any[]) => T;

export type TCrossOrigin = '' | 'anonymous' | 'use-credentials' | null;

export type ImageFormat = 'jpeg' | 'png' | 'webp';

export type TRectBounds = [min: XY, max: XY];

export type TToCanvasElementOptions<
  T extends BaseFabricObject = BaseFabricObject,
> = {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  filter?: (object: T) => boolean;
};

export type TCacheCanvasDimensions = TSize & {
  /* width and height in `TCacheCanvasDimensions` include a small ALIASING_LIMIT of 1 or 2 px.
  /* zoomX X scaling value of the object (including parents and viewport scaling) */
  zoomX: number;
  /* zoomY Y scaling value of the object (including parents and viewport scaling) */
  zoomY: number;
  /* Similar to width and height, but they take care of the real size including non scaling stroke */
  x: number;
  y: number;
};

export type TDataUrlOptions<T extends BaseFabricObject = BaseFabricObject> =
  TToCanvasElementOptions<T> & {
    multiplier?: number;
    format?: ImageFormat;
    quality?: number;
    enableRetinaScaling?: boolean;
  };
