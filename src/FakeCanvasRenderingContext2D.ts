import { Graphics, Matrix, Rectangle, Texture, TextureSource } from 'pixi.js';
import { ObjectGeometry } from './ObjectGeometry';
import { textFactory } from './textFactory';

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d')!;

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
  matrix: Matrix = new Matrix();
  private stateStack: CanvasState[] = [];
  private curStateIdx: number = -1;
  readonly canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    defaultState.setStateTo(this);
  }
  private objectGeometry!: ObjectGeometry;
  private curGraphics!: Graphics;
  bindObjectGeometry(obj: ObjectGeometry) {
    // @ts-ignore
    obj.clearPixiContent();
    this.objectGeometry = obj;
    this.curGraphics = obj.getCurGraphics();
  }
  private finishPath(): void {
    this.curGraphics.setFromMatrix(this.matrix);
    this.objectGeometry.drawIdx++;
    this.curGraphics = this.objectGeometry.getCurGraphics();
  }
  beginPath(): void {
    if (this.curGraphics.pathDirty) {
      this.finishPath();
    }

    this.objectGeometry.fillIdx = this.objectGeometry.drawIdx;
    this.objectGeometry.strokeIdx = this.objectGeometry.drawIdx;
  }
  fill(): void {
    const fillIdx = this.objectGeometry.fillIdx;
    const drawIdx = this.objectGeometry.drawIdx;
    for (let i = fillIdx; i <= drawIdx; i++) {
      const g = this.objectGeometry.pixiContent.children[i];
      if (!g.skipFillOrStroke) {
        g.fill({ color: this.fillStyle || '#000000' });
      }
    }

    if (this.curGraphics.pathDirty) {
      this.finishPath();
    }

    this.objectGeometry.fillIdx = this.objectGeometry.drawIdx;
  }
  stroke(): void {
    const strokeIdx = this.objectGeometry.strokeIdx;
    const drawIdx = this.objectGeometry.drawIdx;
    for (let i = strokeIdx; i <= drawIdx; i++) {
      const g = this.objectGeometry.pixiContent.children[i];
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

    this.objectGeometry.strokeIdx = this.objectGeometry.drawIdx;
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
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ): void {
    console.warn(`ellipse暂不支持rotation、startAngle、endAngle、counterclockwise参数`);
    this.curGraphics.ellipse(x, y, radiusX, radiusY);
    this.curGraphics.pathDirty = true;
  }
  // clearRect(x: number, y: number, w: number, h: number): void {

  // }
  closePath(): void {
    this.curGraphics.closePath();
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
  reset(): void {
    // @ts-ignore
    this.objectGeometry.clearPixiContent();
    this.curStateIdx = -1;
    defaultState.setStateTo(this);
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
  fillRect(x: number, y: number, w: number, h: number): void {
    if (this.curGraphics.pathDirty) {
      this.finishPath();
    }

    this.curGraphics
      .rect(x, y, w, h)
      .fill({ color: this.fillStyle || '#000000' });
    this.curGraphics.skipFillOrStroke = true;

    this.finishPath();
  }
  strokeRect(x: number, y: number, w: number, h: number): void {
    if (this.curGraphics.pathDirty) {
      this.finishPath();
    }

    this.curGraphics.rect(x, y, w, h).stroke({
      color: this.strokeStyle,
      width: this.lineWidth,
      miterLimit: this.miterLimit,
      join: this.lineJoin,
      cap: this.lineCap,
    });
    this.curGraphics.skipFillOrStroke = true;

    this.finishPath();
  }
  drawImage(
    image: HTMLImageElement | HTMLCanvasElement,
    dx: number,
    dy: number,
  ): void;
  drawImage(
    image: HTMLImageElement | HTMLCanvasElement,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
  drawImage(
    image: HTMLImageElement | HTMLCanvasElement,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
  drawImage(
    image: HTMLImageElement | HTMLCanvasElement,
    a: number,
    b: number,
    c?: number,
    d?: number,
    e?: number,
    f?: number,
    g?: number,
    h?: number,
  ): void {
    if (this.curGraphics.pathDirty) {
      this.finishPath();
    }

    const hasEightArgs =
      typeof e === 'number' &&
      typeof f === 'number' &&
      typeof g === 'number' &&
      typeof h === 'number';
    const hasFourArgs = typeof c === 'number' && typeof d === 'number';

    let texture: Texture;
    if (hasEightArgs) {
      const baseTexture = TextureSource.from(image);
      texture = new Texture({
        source: baseTexture,
        frame: new Rectangle(a, b, c, d),
      });
      this.curGraphics.texture(texture, 0xffffff, e, f, g, h);
    } else if (hasFourArgs) {
      texture = Texture.from(image);
      this.curGraphics.texture(texture, 0xffffff, a, b, c, d);
    } else {
      texture = Texture.from(image);
      this.curGraphics.texture(texture, 0xffffff, a, b);
    }

    // texture.source.autoGenerateMipmaps = true;

    this.curGraphics.skipFillOrStroke = true;

    this.finishPath();
  }
  rotate(radian: number): void {
    rotateMatrix.reset().rotate(radian);
    this.matrix.append(rotateMatrix);
  }
  scale(x: number, y: number): void {
    scaleMatrix.reset().scale(x, y);
    this.matrix.append(scaleMatrix);
  }
  translate(x: number, y: number): void {
    translateMatrix.reset().translate(x, y);
    this.matrix.append(translateMatrix);
  }
  transform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ): void {
    transformMatrix.set(a, b, c, d, e, f);
    this.matrix.append(transformMatrix);
  }
  getTransform() {
    const domMatrix = new DOMMatrix();
    domMatrix.a = this.matrix.a;
    domMatrix.b = this.matrix.b;
    domMatrix.c = this.matrix.c;
    domMatrix.d = this.matrix.d;
    domMatrix.e = this.matrix.tx;
    domMatrix.f = this.matrix.ty;
    return domMatrix;
  }
  setTransform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ): void;
  setTransform(transform?: DOMMatrix2DInit): void;
  setTransform(
    a?: number | DOMMatrix2DInit,
    b?: number,
    c?: number,
    d?: number,
    e?: number,
    f?: number,
  ): void {
    if (!a) {
      this.matrix.reset();
    } else if (typeof a === 'object') {
      const matrix = a as DOMMatrix2DInit;
      this.matrix.set(
        matrix.a ?? 1,
        matrix.b ?? 0,
        matrix.c ?? 0,
        matrix.d ?? 1,
        matrix.e ?? 0,
        matrix.f ?? 0,
      );
    } else {
      this.matrix.set(a ?? 1, b ?? 0, c ?? 0, d ?? 1, e ?? 0, f ?? 0);
    }
  }
  resetTransform(): void {
    this.matrix.reset();
  }
  font: string = '10px sans-serif';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  measureText(text: string): TextMetrics {
    ctx.font = this.font;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;
    const metrics = ctx.measureText(text);
    return metrics;
  }

  // 以下打上deprecated的方法都为暂未实现的方法

  /** @deprecated */
  clip(path?: unknown, fillRule?: unknown): void {
    console.warn('clip方法暂未实现');
  }
  /** @deprecated */
  isPointInPath(
    path: unknown,
    x: unknown,
    y?: unknown,
    fillRule?: unknown,
  ): boolean {
    console.warn('isPointInPath方法暂未实现');
    return false;
  }
  /** @deprecated */
  isPointInStroke(path: unknown, x: unknown, y?: unknown): boolean {
    console.warn('isPointInStroke方法暂未实现');
    return false;
  }
  /** @deprecated */
  createConicGradient(
    startAngle: number,
    x: number,
    y: number,
  ): CanvasGradient {
    console.warn('createConicGradient方法暂未实现');
    return new CanvasGradient();
  }
  /** @deprecated */
  createLinearGradient(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): CanvasGradient {
    console.warn('createLinearGradient方法暂未实现');
    return new CanvasGradient();
  }
  /** @deprecated */
  createPattern(
    image: CanvasImageSource,
    repetition: string | null,
  ): CanvasPattern | null {
    console.warn('createPattern方法暂未实现');
    return null;
  }
  /** @deprecated */
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): CanvasGradient {
    console.warn('createRadialGradient方法暂未实现');
    return new CanvasGradient();
  }
  /** @deprecated */
  filter: string = 'none';
  /** @deprecated */
  createImageData(sw: unknown, sh?: unknown, settings?: unknown): ImageData {
    console.warn('createImageData方法暂未实现');
    return new ImageData(1, 1);
  }
  /** @deprecated */
  getImageData(
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    settings?: ImageDataSettings,
  ): ImageData {
    console.warn('getImageData方法暂未实现');
    return new ImageData(1, 1);
  }
  /** @deprecated */
  putImageData(
    imageData: unknown,
    dx: unknown,
    dy: unknown,
    dirtyX?: unknown,
    dirtyY?: unknown,
    dirtyWidth?: unknown,
    dirtyHeight?: unknown,
  ): void {
    console.warn('putImageData方法暂未实现');
  }
  /** @deprecated */
  imageSmoothingEnabled: boolean = true;
  /** @deprecated */
  imageSmoothingQuality: ImageSmoothingQuality = 'low';
  /** @deprecated */
  lineDashOffset: number = 0;
  /** @deprecated */
  getLineDash(): number[] {
    console.warn('getLineDash方法暂未实现');
    return [];
  }
  /** @deprecated */
  setLineDash(segments: number[]): void {
    console.warn('setLineDash方法暂未实现');
  }
  /** @deprecated */
  clearRect(x: number, y: number, w: number, h: number): void {
    console.warn('clearRect方法暂未实现');
  }
  /** @deprecated */
  getContextAttributes(): CanvasRenderingContext2DSettings {
    console.warn('getContextAttributes方法暂未实现');
    return {};
  }
  /** @deprecated */
  shadowBlur: number = 0;
  /** @deprecated */
  shadowColor: string = 'rgba(0, 0, 0, 0)';
  /** @deprecated */
  shadowOffsetX: number = 0;
  /** @deprecated */
  shadowOffsetY: number = 0;
  /** @deprecated */
  isContextLost(): boolean {
    console.warn('isContextLost方法暂未实现');
    return false;
  }
  /** @deprecated */
  direction: CanvasDirection = 'ltr';
  /** @deprecated */
  fontKerning: CanvasFontKerning = 'auto';
  /** @deprecated */
  fontStretch: CanvasFontStretch = 'normal';
  /** @deprecated */
  fontVariantCaps: CanvasFontVariantCaps = 'normal';
  /** @deprecated */
  letterSpacing: string = '0px';
  /** @deprecated */
  textRendering: CanvasTextRendering = 'auto';
  /** @deprecated */
  wordSpacing: string = '0px';
  /** @deprecated */
  globalCompositeOperation: GlobalCompositeOperation = 'source-over';
  /** @deprecated */
  drawFocusIfNeeded(path: unknown, element?: unknown): void {
    console.warn('drawFocusIfNeeded方法暂未实现');
  }
}