import { Application } from 'pixi.js';
import { useEffect } from 'react';
import { FakeCanvasRenderingContext2D } from './FakeCanvasRenderingContext2D';
import { ObjectGeometry } from './ObjectGeometry';

const width = 1200;
const height = 800;
const id = 'test-canvas';

const app = new Application();

class Obj1 extends ObjectGeometry {
  _render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.fill;
    ctx.strokeStyle = this.stroke;
    ctx.lineWidth = this.strokeWidth;
    ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.fill();
    ctx.stroke();
  }
}

function App() {
  const init = async () => {
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    await app.init({
      canvas,
      width,
      height,
      antialias: true,
    });

    const fakeCtx = new FakeCanvasRenderingContext2D(canvas);

    const objs: ObjectGeometry[] = [];

    const obj1 = new Obj1();
    objs.push(obj1);
    obj1.set({
      left: 300,
      top: 300,
      width: 100,
      height: 200,
      fill: 'blue',
      stroke: 'green',
      scaleX: 2,
      scaleY: 1.5,
      skewX: 15,
      skewY: 10,
      strokeWidth: 5,
      angle: 80,
    });
    console.log(obj1.originX, obj1.originY);

    objs.forEach((o) => {
      app.stage.addChild(o.pixiContent);
    });

    app.ticker.add(() => {
      objs.forEach((o) => {
        fakeCtx.bindObjectGeometry(o);
        o.render(fakeCtx);
      });
    });
  };
  useEffect(() => {
    init();
  }, []);

  return (
    <div id="wrapper" style={{ border: '10px solid red', width, height }}>
      <canvas
        id={id}
        style={{ width, height }}
        width={width}
        height={height}
      ></canvas>
    </div>
  );
}

export default App;
