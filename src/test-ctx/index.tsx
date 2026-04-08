import { Application } from 'pixi.js';
import { useEffect } from 'react';
import { FakeCanvasRenderingContext2D } from '../FakeCanvasRenderingContext2D';

const width = 800;
const height = 600;
const id = 'test-canvas';

const test = (ctx: CanvasRenderingContext2D) => {
  ctx.scale(1.1, 1.1);
  ctx.translate(50, 0);
  ctx.beginPath();
  ctx.rotate((Math.PI / 180) * 10);

  ctx.fillStyle = 'red';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 10;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.moveTo(100, 100);
  ctx.lineTo(200, 100);
  ctx.lineTo(200, 200);
  ctx.lineTo(100, 200);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  // ctx.translate(300, 0);
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(300, 100, 400, 200);
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = 'blue';
  ctx.rect(0, 200, 100, 150);
  ctx.fill();

  ctx.scale(1, 1.1);
  ctx.beginPath();
  ctx.fillStyle = 'gold';
  ctx.rect(100, 350, 100, 100);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(300, 200);
  ctx.strokeStyle = 'green';
  ctx.bezierCurveTo(300, 300, 400, 300, 400, 200);
  ctx.stroke();

  ctx.translate(300, 0);
  ctx.beginPath();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'cyan';
  ctx.fillStyle = 'green';
  ctx.font = '40px sans-serif';
  ctx.fillText('hello', 150, 150, 30);
  ctx.strokeText('你好', 250, 150);
};

const getCtx1 = async () => {
  console.log('pixi');
  const app = new Application();
  // @ts-ignore
  window.app = app;
  await app.init({
    width,
    height,
    backgroundColor: '0x000000',
    canvas: document.getElementById(id) as HTMLCanvasElement,
    resolution: 1,
    backgroundAlpha: 0,
  });
  const ctx = new FakeCanvasRenderingContext2D(app);
  return ctx;
};

const getCtx2 = async () => {
  console.log('canvas 2d');
  const canvas = document.getElementById(id) as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  return ctx;
};

function App() {
  const init = async () => {
    const ctx = await getCtx2();
    test(ctx);
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
