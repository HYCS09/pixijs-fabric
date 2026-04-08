import { Application, Graphics, Matrix } from 'pixi.js';
import { textFactory } from './textFactory';

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d')!;

declare module 'pixi.js' {
  interface Graphics {
    skipFillOrStroke?: boolean; // 该元素是否需要fill或stroke
    pathDirty?: boolean; // 是否已经绘制过内容
  }
}

interface CanvasStateBase {
  fillStyle: string;
  strokeStyle: string;
  globalAlpha: number;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  miterLimit: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  matrix: Matrix;
}

const rotateMatrix = new Matrix();
const scaleMatrix = new Matrix();
const translateMatrix = new Matrix();
const transformMatrix = new Matrix();

class CanvasState implements CanvasStateBase {
  fillStyle: string;
  strokeStyle: string;
  globalAlpha: number;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  miterLimit: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  matrix: Matrix;
  constructor() {
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.globalAlpha = 1;
    this.lineWidth = 1;
    this.lineCap = 'butt';
    this.lineJoin = 'miter';
    this.miterLimit = 10;
    this.matrix = new Matrix();
    this.font = '10px sans-serif';
    this.textAlign = 'start';
    this.textBaseline = 'alphabetic';
  }
  copyStateFrom(ctx: FakeCanvasRenderingContext2D) {
    this.fillStyle = ctx.fillStyle;
    this.strokeStyle = ctx.strokeStyle;
    this.globalAlpha = ctx.globalAlpha;
    this.lineWidth = ctx.lineWidth;
    this.lineCap = ctx.lineCap;
    this.lineJoin = ctx.lineJoin;
    this.miterLimit = ctx.miterLimit;
    this.font = ctx.font;
    this.textAlign = ctx.textAlign;
    this.textBaseline = ctx.textBaseline;
    this.matrix.copyFrom(ctx.matrix);
  }
  setStateTo(ctx: FakeCanvasRenderingContext2D) {
    ctx.fillStyle = this.fillStyle;
    ctx.strokeStyle = this.strokeStyle;
    ctx.globalAlpha = this.globalAlpha;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = this.lineCap;
    ctx.lineJoin = this.lineJoin;
    ctx.miterLimit = this.miterLimit;
    ctx.font = this.font;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;
    ctx.matrix.copyFrom(this.matrix);
  }
}

const defaultState = new CanvasState();

export class FakeCanvasRenderingContext2D implements CanvasRenderingContext2D {
  globalAlpha: number;
  fillStyle: string;
  strokeStyle: string;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  lineWidth: number;
  miterLimit: number;
  font: string = '10px sans-serif';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  matrix: Matrix = new Matrix();
  private app: Application;
  private stateStack: CanvasState[] = [];
  private curStateIdx: number = -1;
  public drawIdx = 0;
  public fillIdx = 0;
  public strokeIdx = 0;
  constructor(app: Application) {
    this.app = app;
    defaultState.setStateTo(this);
    this.app.stage.addChild(this.curGraphics);
  }
  save(): void {
    this.curStateIdx++;
    if (!this.stateStack[this.curStateIdx]) {
      this.stateStack[this.curStateIdx] = new CanvasState();
    }

    this.stateStack[this.curStateIdx].copyStateFrom(this);
  }
  restore(): void {
    if (this.curStateIdx < 0) return;

    this.stateStack[this.curStateIdx].setStateTo(this);
    this.curStateIdx--;
  }
  private curGraphics = new Graphics();
  public getCurGraphics(): Graphics {
    const children = this.app.stage.children;
    if (!children[this.drawIdx]) {
      this.app.stage.addChild(new Graphics());
    }

    return children[this.drawIdx] as Graphics;
  }
  private finishPath(): void {
    this.curGraphics.setFromMatrix(this.matrix);
    this.drawIdx++;
    this.curGraphics = this.getCurGraphics();
  }
  beginPath(): void {
    if (this.curGraphics.pathDirty) {
      this.finishPath();
    }

    this.fillIdx = this.drawIdx;
    this.strokeIdx = this.drawIdx;
  }
  fill(): void {
    const fillIdx = this.fillIdx;
    const drawIdx = this.drawIdx;
    for (let i = fillIdx; i <= drawIdx; i++) {
      const g = this.app.stage.children[i] as Graphics;
      if (!g.skipFillOrStroke) {
        g.fill({ color: this.fillStyle || '#000000' });
      }
    }

    if (this.curGraphics.pathDirty) {
      this.finishPath();
    }

    this.fillIdx = this.drawIdx;
  }
  stroke(): void {
    const strokeIdx = this.strokeIdx;
    const drawIdx = this.drawIdx;
    for (let i = strokeIdx; i <= drawIdx; i++) {
      const g = this.app.stage.children[i] as Graphics;
      if (!g.skipFillOrStroke) {
        g.stroke({
          color: this.strokeStyle,
          width: this.lineWidth,
          miterLimit: this.miterLimit,
          join: this.lineJoin,
          cap: this.lineCap,
        });
      }
    }

    if (this.curGraphics.pathDirty) {
      this.finishPath();
    }

    this.strokeIdx = this.drawIdx;
  }
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ): void {
    this.curGraphics.arc(x, y, radius, startAngle, endAngle, counterclockwise);
    this.curGraphics.pathDirty = true;
  }
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
    this.curGraphics.arcTo(x1, y1, x2, y2, radius);
    this.curGraphics.pathDirty = true;
  }
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ): void {
    this.curGraphics.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    this.curGraphics.pathDirty = true;
  }
  moveTo(x: number, y: number): void {
    this.curGraphics.moveTo(x, y);
  }
  lineTo(x: number, y: number): void {
    this.curGraphics.lineTo(x, y);
    this.curGraphics.pathDirty = true;
  }
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.curGraphics.quadraticCurveTo(cpx, cpy, x, y);
    this.curGraphics.pathDirty = true;
  }
  rect(x: number, y: number, w: number, h: number): void {
    this.curGraphics.rect(x, y, w, h);
    this.curGraphics.pathDirty = true;
  }
  roundRect(x: number, y: number, w: number, h: number, radii?: number): void {
    this.curGraphics.roundRect(x, y, w, h, radii);
    this.curGraphics.pathDirty = true;
  }
  closePath(): void {
    this.curGraphics.closePath();
  }
  private strokeOrFillText(
    text: string,
    x: number,
    y: number,
    fillOrStroke: 'fill' | 'stroke',
    maxWidth?: number,
  ) {
    if (this.curGraphics.pathDirty) {
      this.finishPath();
    }

    const textTexture = textFactory.getOne(
      text,
      this.font,
      this.textAlign,
      this.textBaseline,
      fillOrStroke,
      this.fillStyle,
      this.strokeStyle,
      maxWidth,
    );
    const {
      _pixiFabricOffsetX,
      _pixiFabricOffsetY,
      _pixiFabricWidth,
      _pixiFabricHeight,
    } = textTexture;
    this.curGraphics.texture(
      textTexture,
      0xffffff,
      x + _pixiFabricOffsetX,
      y + _pixiFabricOffsetY,
      _pixiFabricWidth,
      _pixiFabricHeight,
    );

    this.curGraphics.skipFillOrStroke = true;

    this.finishPath();
  }
  fillText(text: string, x: number, y: number, maxWidth?: number): void {
    this.strokeOrFillText(text, x, y, 'fill', maxWidth);
  }
  strokeText(text: string, x: number, y: number, maxWidth?: number): void {
    this.strokeOrFillText(text, x, y, 'stroke', maxWidth);
  }
  rotate(radian: number): void {
    this.matrix.append(Matrix.IDENTITY.clone().rotate(radian));
  }
  scale(x: number, y: number): void {
    this.matrix.append(Matrix.IDENTITY.clone().scale(x, y));
  }
  translate(x: number, y: number): void {
    this.matrix.append(Matrix.IDENTITY.clone().translate(x, y));
  }
  transform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ): void {
    this.matrix.append(new Matrix(a, b, c, d, e, f));
  }
  measureText(text: string): TextMetrics {
    ctx.font = this.font;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;
    const metrics = ctx.measureText(text);
    return metrics;
  }
}
