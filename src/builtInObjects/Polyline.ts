import { CENTER, LEFT, TOP } from '../constants';
import { calcDimensionsMatrix } from '../matrix';
import { FabricObject } from '../Object/FabricObject';
import { Point } from '../Point';

const makeBoundingBoxFromPoints = (points: XY[]) => {
  let left = 0,
    top = 0,
    width = 0,
    height = 0;

  for (let i = 0, len = points.length; i < len; i++) {
    const { x, y } = points[i];
    if (x > width || !i) width = x;
    if (x < left || !i) left = x;
    if (y > height || !i) height = y;
    if (y < top || !i) top = y;
  }

  return { left, top, width: width - left, height: height - top };
};

const dimOptions: any = {};
const temp = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  pathOffset: new Point(),
  strokeOffset: new Point(),
  strokeDiff: new Point(),
};

interface XY {
  x: number;
  y: number;
}

class Polyline extends FabricObject {
  declare points: XY[];
  declare pathOffset: Point;
  private tempPointsArray: XY[] = [];
  initialized = false;
  constructor(points: XY[] = [], options: any) {
    super();
    Object.assign(this, Polyline.ownDefaults);
    this.setOptions(options);
    this.points = points;
    const { left, top } = options;
    this.initialized = true;
    this.setBoundingBox(true);
    typeof left === 'number' && this.set(LEFT, left);
    typeof top === 'number' && this.set(TOP, top);
  }
  setBoundingBox(adjustPosition?: boolean) {
    const { left, top, width, height, pathOffset, strokeOffset, strokeDiff } =
      this._calcDimensions();
    this.set({ width, height, pathOffset, strokeOffset, strokeDiff });
    adjustPosition &&
      this.setPositionByOrigin(
        new Point(left + width / 2, top + height / 2),
        CENTER,
        CENTER,
      );
  }
  protected isOpen() {
    return true;
  }
  _render(ctx: CanvasRenderingContext2D) {
    const len = this.points.length,
      x = this.pathOffset.x,
      y = this.pathOffset.y;

    if (!len || isNaN(this.points[len - 1].y)) {
      // do not draw if no points or odd points
      // NaN comes from parseFloat of a empty string in parser
      return;
    }
    ctx.beginPath();
    ctx.moveTo(this.points[0].x - x, this.points[0].y - y);
    for (let i = 0; i < len; i++) {
      const point = this.points[i];
      ctx.lineTo(point.x - x, point.y - y);
    }
    !this.isOpen() && ctx.closePath();
    this._renderPaintInOrder(ctx);
  }
  private _calcDimensions(options?: any) {
    dimOptions.scaleX = this.scaleX;
    dimOptions.scaleY = this.scaleY;
    dimOptions.skewX = this.skewX;
    dimOptions.skewY = this.skewY;
    dimOptions.strokeLineCap = this.strokeLineCap;
    dimOptions.strokeLineJoin = this.strokeLineJoin;
    dimOptions.strokeMiterLimit = this.strokeMiterLimit;
    dimOptions.strokeUniform = this.strokeUniform;
    dimOptions.strokeWidth = this.strokeWidth;
    if (options) {
      Object.assign(dimOptions, options);
    }

    const points = this.points;
    if (points.length === 0) {
      return {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        pathOffset: new Point(),
        strokeOffset: new Point(),
        strokeDiff: new Point(),
      };
    }
    const bbox = makeBoundingBoxFromPoints(points);
    // Remove scale effect, since it's applied after
    dimOptions.scaleX = 1;
    dimOptions.scaleY = 1;
    const matrix = calcDimensionsMatrix(dimOptions);
    const a = matrix[0];
    const b = matrix[1];
    const c = matrix[2];
    const d = matrix[3];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!this.tempPointsArray[i]) {
        this.tempPointsArray[i] = { x: 0, y: 0 };
      }

      this.tempPointsArray[i].x = a * p.x + c * p.y;
      this.tempPointsArray[i].y = b * p.x + d * p.y;
    }
    const bboxNoStroke = makeBoundingBoxFromPoints(this.tempPointsArray);
    const scale = new Point(this.scaleX, this.scaleY);
    let offsetX = bbox.left + bbox.width / 2,
      offsetY = bbox.top + bbox.height / 2;

    temp.left = bbox.left;
    temp.top = bbox.top;
    temp.width = bbox.width;
    temp.height = bbox.height;
    temp.pathOffset.setXY(offsetX, offsetY);
    const subtractTemp = new Point();
    subtractTemp.setXY(bbox.left, bbox.top);
    const { x, y } = temp.strokeOffset
      .setXY(bboxNoStroke.left, bboxNoStroke.top)
      .subtract(subtractTemp)
      .multiply(scale);
    temp.strokeOffset.setXY(x, y);
    subtractTemp.setXY(bboxNoStroke.width, bboxNoStroke.height);
    const { x: w, y: h } = temp.strokeDiff
      .setXY(bbox.width, bbox.height)
      .subtract(subtractTemp)
      .multiply(scale);
    temp.strokeDiff.setXY(w, h);
    return temp;
  }
}

export { Polyline };
