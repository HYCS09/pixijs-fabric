import { Application } from 'pixi.js';
import { useEffect } from 'react';
import { FakeCanvasRenderingContext2D } from './FakeCanvasRenderingContext2D';
import { FabricObject } from './Object/FabricObject';
import { Circle } from './builtInObjects/Circle';
import { Rect } from './builtInObjects/Rect';
import { Triangle } from './builtInObjects/Triangle';
import { Ellipse } from './builtInObjects/Ellipse';
import { Line } from './builtInObjects/Line';
import { Polyline } from './builtInObjects/Polyline';
import { Polygon } from './builtInObjects/Polygon';
import { Path } from './builtInObjects/Path';
import { FabricImage } from './builtInObjects/Image';
import localImg from './chameleon256x128.jpg';
import { FabricText } from './builtInObjects/Text';

const width = 1200;
const height = 800;
const id = 'test-canvas';

const app = new Application();

document.title = 'pixijs-fabric-test-canvas';

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

    const objs: FabricObject[] = [];

    const circle = new Circle();
    objs.push(circle);
    circle.set({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      radius: 50,
      fill: 'blue',
      stroke: 'green',
      scaleX: 1.5,
      scaleY: 1.5,
      strokeWidth: 5,
    });

    const rect = new Rect();
    objs.push(rect);
    rect.set({
      left: 300,
      top: 100,
      width: 150,
      height: 100,
      rx: 50,
      ry: 30,
      fill: 'gold',
      stroke: 'green',
      strokeWidth: 5,
    });

    const rect2 = new Rect();
    objs.push(rect2);
    rect2.set({
      left: 500,
      top: 100,
      width: 150,
      height: 100,
      fill: 'blue',
      stroke: 'red',
      strokeWidth: 5,
    });

    const triangle = new Triangle();
    objs.push(triangle);
    triangle.set({
      left: 700,
      top: 100,
      width: 100,
      height: 100,
      radius: 50,
      fill: 'blue',
      stroke: 'green',
      scaleX: 1.5,
      scaleY: 1.5,
      skewX: 20,
      strokeWidth: 5,
    });

    const ellipse = new Ellipse();
    objs.push(ellipse);
    ellipse.set({
      left: 900,
      top: 100,
      fill: 'blue',
      stroke: 'green',
      scaleX: 1.5,
      skewY: 10,
      strokeWidth: 5,
      rx: 80,
      ry: 50,
      width: 160,
      height: 100,
    });

    const line = new Line();
    objs.push(line);
    line.set({
      stroke: 'red',
      strokeWidth: 5,
      width: 150,
      height: 100,
      x1: 100,
      y1: 200,
      x2: 300,
      y2: 300,
      top: 400,
    });

    const poly = new Polyline(
      [
        { x: 10, y: 10 },
        { x: 50, y: 30 },
        { x: 40, y: 70 },
        { x: 60, y: 50 },
        { x: 100, y: 150 },
        { x: 40, y: 100 },
      ],
      {
        stroke: 'red',
        fill: 'gold',
        left: 100,
        top: 500,
        strokeWidth: 3,
      },
    );
    objs.push(poly);

    const polygon = new Polygon(
      [
        { x: 10, y: 10 },
        { x: 50, y: 30 },
        { x: 80, y: 100 },
        { x: 10, y: 150 },
        { x: 10, y: 0 },
      ],
      {
        stroke: 'green',
        strokeWidth: 5,
        fill: 'blue',
        left: 300,
        top: 400,
      },
    );
    objs.push(polygon);

    const path = new Path(
      `
        M 100 100 
        C 150 50, 250 150, 300 100 
        L 350 150 
        Q 400 200, 450 150 
        L 500 200 
        C 550 250, 450 350, 400 300 
        L 350 350 
        Z
      `,
      {
        stroke: '#E91E63',
        strokeWidth: 3,
        fill: 'rgba(233, 30, 99, 0.2)',
        left: 300,
        top: 300,
      },
    );
    objs.push(path);

    const heartPath = new Path(
      `
        M 150 200 
        C 150 150, 50 150, 50 200 
        C 50 250, 150 300, 150 300 
        C 150 300, 250 250, 250 200 
        C 250 150, 150 150, 150 200 
        Z
      `,
      {
        stroke: '#F44336',
        strokeWidth: 2,
        fill: 'rgba(244, 67, 54, 0.3)',
        left: 600,
        top: 300,
      },
    );
    objs.push(heartPath);

    const image = new Image();
    image.src = localImg;
    image.onload = () => {
      const fabricImg = new FabricImage(image);
      fabricImg.set({
        left: 600,
        top: 500,
        angle: -15,
        stroke: 'blue',
        strokeWidth: 10,
        scaleX: 1.5,
      });
      objs.push(fabricImg);
      app.stage.addChild(fabricImg.pixiContent);
    };

    const fabricText = new FabricText('Hello, pixijs-fabric!');
    fabricText.set({
      left: 900,
      top: 300,
      stroke: 'orange',
      fontSize: 30,
      angle: 10,
    });
    objs.push(fabricText);

    const fabricText2 = new FabricText('Hello, pixijs-fabric!', {
      fontSize: 40,
      fill: 'purple',
    });
    fabricText2.set({
      left: 800,
      top: 600,
      angle: -10,
    });
    objs.push(fabricText2);

    objs.forEach((o) => {
      app.stage.addChild(o.pixiContent);
    });

    app.ticker.add(() => {
      objs.forEach((o) => {
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
