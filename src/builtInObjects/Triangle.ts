import { FabricObject } from '../Object/FabricObject';

class Triangle extends FabricObject {
  _render(ctx: CanvasRenderingContext2D) {
    const widthBy2 = this.width / 2,
      heightBy2 = this.height / 2;

    ctx.beginPath();
    ctx.moveTo(-widthBy2, heightBy2);
    ctx.lineTo(0, -heightBy2);
    ctx.lineTo(widthBy2, heightBy2);
    ctx.closePath();

    this._renderPaintInOrder(ctx);
  }
}

export { Triangle };
