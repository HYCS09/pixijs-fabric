import { kRect } from '../constants';
import { FabricObject } from '../Object/FabricObject';

class Rect extends FabricObject {
  rx = 0;
  ry = 0;
  _render(ctx: CanvasRenderingContext2D) {
    const { width: w, height: h } = this;
    const x = -w / 2;
    const y = -h / 2;
    const rx = this.rx ? Math.min(this.rx, w / 2) : 0;
    const ry = this.ry ? Math.min(this.ry, h / 2) : 0;
    const isRounded = rx !== 0 || ry !== 0;

    ctx.beginPath();

    ctx.moveTo(x + rx, y);

    ctx.lineTo(x + w - rx, y);
    isRounded &&
      ctx.bezierCurveTo(
        x + w - kRect * rx,
        y,
        x + w,
        y + kRect * ry,
        x + w,
        y + ry,
      );

    ctx.lineTo(x + w, y + h - ry);
    isRounded &&
      ctx.bezierCurveTo(
        x + w,
        y + h - kRect * ry,
        x + w - kRect * rx,
        y + h,
        x + w - rx,
        y + h,
      );

    ctx.lineTo(x + rx, y + h);
    isRounded &&
      ctx.bezierCurveTo(
        x + kRect * rx,
        y + h,
        x,
        y + h - kRect * ry,
        x,
        y + h - ry,
      );

    ctx.lineTo(x, y + ry);
    isRounded &&
      ctx.bezierCurveTo(x, y + kRect * ry, x + kRect * rx, y, x + rx, y);

    ctx.closePath();

    this._renderPaintInOrder(ctx);
  }
}

export { Rect };
