import { FabricObject } from '../Object/FabricObject';
import { degreesToRadians } from '../Object/ObjectGeometry';

class Circle extends FabricObject {
  radius = 0;
  startAngle = 0;
  endAngle = 360;
  counterClockwise = false;
  _render(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(
      0,
      0,
      this.radius,
      degreesToRadians(this.startAngle),
      degreesToRadians(this.endAngle),
      this.counterClockwise,
    );
    this._renderPaintInOrder(ctx);
  }
}

export { Circle };
