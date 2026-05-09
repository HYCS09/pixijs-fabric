import { Point } from './Point';


interface NominalTag<T> {
  nominalTag?: T;
}
type Nominal<Type, Tag> = NominalTag<Tag> & Type;

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