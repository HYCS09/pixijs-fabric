import { Point, Texture } from 'pixi.js';

// const helperCanvas = document.createElement('canvas');
// const helperCtx = helperCanvas.getContext('2d')!;

const spliter = '_-_';

declare module 'pixi.js' {
  interface Texture {
    _pixiFabricOffsetX: number;
    _pixiFabricOffsetY: number;
    _pixiFabricWidth: number;
    _pixiFabricHeight: number;
  }
}

const genKey = (
  text: string,
  font: string,
  textAlign: CanvasTextAlign,
  textBaseline: CanvasTextBaseline,
  fillOrStroke: 'fill' | 'stroke',
  fillStyle: string,
  strokeStyle: string,
  maxWidth?: number
) => {
  return `${text}${spliter}${font}${spliter}${textAlign}${spliter}${textBaseline}${spliter}${fillOrStroke}${spliter}${fillStyle}${spliter}${strokeStyle}${spliter}${maxWidth}`;
};

const temp = new Point();

class TextFactory {
  private map = new Map<string, Texture>();
  private drawText(
    text: string,
    metrics: TextMetrics,
    ctx: CanvasRenderingContext2D,
    fillOrStroke: 'fill' | 'stroke',
    maxWidth?: number
  ) {
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const { actualBoundingBoxAscent, actualBoundingBoxLeft } = metrics;
    // 增加 padding 偏移
    const padding = 2;
    const tx = actualBoundingBoxLeft + padding;
    const ty = actualBoundingBoxAscent + padding;
    ctx.translate(tx, ty);

    if (fillOrStroke === 'fill') {
      ctx.fillText(text, 0, 0, maxWidth);
    } else {
      ctx.strokeText(text, 0, 0, maxWidth);
    }
  }
  private calcOffset(metrics: TextMetrics): Point {
    const { actualBoundingBoxLeft, actualBoundingBoxAscent } = metrics;
    // 增加 padding 偏移
    const padding = 2;
    temp.set(
      -actualBoundingBoxLeft - padding,
      -actualBoundingBoxAscent - padding
    );
    return temp;
  }
  private updateCanvasSize(metrics: TextMetrics, canvas: HTMLCanvasElement) {
    const { actualBoundingBoxAscent, actualBoundingBoxDescent, width } =
      metrics;

    // 增加 padding 确保文字不会被裁切
    const padding = 2;
    const canvasWidth = width + padding * 2;
    const height =
      actualBoundingBoxAscent + actualBoundingBoxDescent + padding * 2;

    canvas.style.width = `${canvasWidth}px`;
    canvas.width = canvasWidth * devicePixelRatio;
    canvas.style.height = `${height}px`;
    canvas.height = height * devicePixelRatio;
  }
  private createOne(
    text: string,
    font: string,
    textAlign: CanvasTextAlign,
    textBaseline: CanvasTextBaseline,
    fillOrStroke: 'fill' | 'stroke',
    fillStyle: string,
    strokeStyle: string,
    maxWidth?: number
  ): Texture {
    // console.log('create text:', text);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = font;
    ctx.textAlign = textAlign;
    ctx.textBaseline = textBaseline;
    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = strokeStyle;
    const metrics = ctx.measureText(text);

    this.updateCanvasSize(metrics, canvas);

    // resize之后会重置画笔状态，所以这里需要重新设置画笔状态
    ctx.font = font;
    ctx.textAlign = textAlign;
    ctx.textBaseline = textBaseline;
    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = strokeStyle;
    this.drawText(text, metrics, ctx, fillOrStroke, maxWidth);

    const texture = Texture.from(canvas);
    texture.source.autoGenerateMipmaps = true;
    const key = genKey(
      text,
      font,
      textAlign,
      textBaseline,
      fillOrStroke,
      fillStyle,
      strokeStyle
    );
    this.map.set(key, texture);

    const { x, y } = this.calcOffset(metrics);
    texture._pixiFabricOffsetX = x;
    texture._pixiFabricOffsetY = y;
    // 增加 padding
    const padding = 2;
    texture._pixiFabricWidth = metrics.width + padding * 2;
    texture._pixiFabricHeight =
      metrics.actualBoundingBoxAscent +
      metrics.actualBoundingBoxDescent +
      padding * 2;

    return texture;
  }
  public getOne(
    text: string,
    font: string,
    textAlign: CanvasTextAlign,
    textBaseline: CanvasTextBaseline,
    fillOrStroke: 'fill' | 'stroke',
    fillStyle: string,
    strokeStyle: string,
    maxWidth?: number
  ): Texture {
    const key = genKey(
      text,
      font,
      textAlign,
      textBaseline,
      fillOrStroke,
      fillStyle,
      strokeStyle,
      maxWidth
    );
    return (
      this.map.get(key) ||
      this.createOne(
        text,
        font,
        textAlign,
        textBaseline,
        fillOrStroke,
        fillStyle,
        strokeStyle,
        maxWidth
      )
    );
  }
}

export const textFactory = new TextFactory();
