import { CENTER, LEFT, TOP } from '../constants';
import { FabricObject } from '../Object/FabricObject';
import { Point } from '../Point';

export const makeBoundingBoxFromPoints = (
  points: { x: number; y: number }[],
): { left: number; top: number; width: number; height: number } => {
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

  return {
    left,
    top,
    width: width - left,
    height: height - top,
  };
};

class Line extends FabricObject {
  x1 = 0;
  y1 = 0;
  x2 = 0;
  y2 = 0;
  constructor([x1, y1, x2, y2] = [0, 0, 0, 0], options: any = {}) {
    super();
    Object.assign(this, Line.ownDefaults);
    this.setOptions(options);
    this.x1 = x1;
    this.x2 = x2;
    this.y1 = y1;
    this.y2 = y2;
    this._setWidthHeight();
    const { left, top } = options;
    typeof left === 'number' && this.set(LEFT, left);
    typeof top === 'number' && this.set(TOP, top);
  }

  calcLinePoints(): {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
  } {
    const { x1: _x1, x2: _x2, y1: _y1, y2: _y2, width, height } = this;
    const xMult = _x1 <= _x2 ? -1 : 1,
      yMult = _y1 <= _y2 ? -1 : 1,
      x1 = (xMult * width) / 2,
      y1 = (yMult * height) / 2,
      x2 = (xMult * -width) / 2,
      y2 = (yMult * -height) / 2;

    return {
      x1,
      x2,
      y1,
      y2,
    };
  }
  _render(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();

    const p = this.calcLinePoints();
    ctx.moveTo(p.x1, p.y1);
    ctx.lineTo(p.x2, p.y2);

    ctx.lineWidth = this.strokeWidth;

    const origStrokeStyle = ctx.strokeStyle;
    ctx.strokeStyle = this.stroke ?? ctx.fillStyle;
    this.stroke && this._renderStroke(ctx);
    ctx.strokeStyle = origStrokeStyle;
  }

  _set(key: string, value: any) {
    super._set(key, value);
    if (['x1', 'x2', 'y1', 'y2'].includes(key)) {
      this._setWidthHeight();
    }
    return this;
  }
  _setWidthHeight() {
    const { x1, y1, x2, y2 } = this;
    this.width = Math.abs(x2 - x1);
    this.height = Math.abs(y2 - y1);
    const { left, top, width, height } = makeBoundingBoxFromPoints([
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ]);
    const position = new Point(left + width / 2, top + height / 2);
    this.setPositionByOrigin(position, CENTER, CENTER);
  }
}

export { Line };
