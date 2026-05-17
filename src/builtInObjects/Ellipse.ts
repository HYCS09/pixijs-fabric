import { FabricObject } from '../Object/FabricObject';

class Ellipse extends FabricObject {
  rx = 0;
  ry = 0;
  _render(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.save();
    ctx.transform(1, 0, 0, this.ry / this.rx, 0, 0);
    ctx.arc(0, 0, this.rx, 0, Math.PI * 2, false);
    this._renderPaintInOrder(ctx);
    ctx.restore();
  }
}

export { Ellipse };
