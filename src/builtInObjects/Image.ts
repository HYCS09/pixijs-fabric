import { FabricObject } from '../Object/FabricObject';

export type ImageSource =
  | HTMLImageElement
  | HTMLVideoElement
  | HTMLCanvasElement;

type TSize = {
  width: number;
  height: number;
};

class FabricImage extends FabricObject {
  strokeWidth: number = 0;
  srcFromAttribute: boolean = false;
  minimumScaleTrigger: number = 0.5;
  cropX: number = 0;
  cropY: number = 0;
  imageSmoothing: boolean = true;
  protected _filterScalingX = 1;
  protected _filterScalingY = 1;
  declare _element: ImageSource;
  declare _originalElement: ImageSource;
  constructor(elementId: string, options?: any);
  constructor(element: ImageSource, options?: any);
  constructor(arg0: ImageSource | string, options?: any) {
    super();
    Object.assign(this, FabricImage.ownDefaults);
    this.setOptions(options);
    this.setElement(
      typeof arg0 === 'string'
        ? (document.getElementById(arg0) as ImageSource)
        : arg0,
      options,
    );
  }
  setElement(element: ImageSource, size: Partial<TSize> = {}) {
    this._element = element;
    this._originalElement = element;
    this._setWidthHeight(size);
  }
  _setWidthHeight({ width, height }: Partial<TSize> = {}) {
    const size = this.getOriginalSize();
    this.width = width || size.width;
    this.height = height || size.height;
  }
  getElement() {
    return this._element;
  }
  getOriginalSize() {
    const element = this.getElement() as any;
    if (!element) {
      return {
        width: 0,
        height: 0,
      };
    }
    return {
      width: element.naturalWidth || element.width,
      height: element.naturalHeight || element.height,
    };
  }
  protected _renderStroke(ctx: CanvasRenderingContext2D): void {
    this._stroke(ctx);
    super._renderStroke(ctx);
  }
  _render(ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = this.imageSmoothing;
    this._renderPaintInOrder(ctx);
  }
  _stroke(ctx: CanvasRenderingContext2D) {
    if (!this.stroke || this.strokeWidth === 0) {
      return;
    }
    const w = this.width / 2,
      h = this.height / 2;
    ctx.beginPath();
    ctx.moveTo(-w, -h);
    ctx.lineTo(w, -h);
    ctx.lineTo(w, h);
    ctx.lineTo(-w, h);
    ctx.lineTo(-w, -h);
    ctx.closePath();
  }
  _renderFill(ctx: CanvasRenderingContext2D) {
    const elementToDraw = this._element;
    if (!elementToDraw) {
      return;
    }
    const scaleX = this._filterScalingX,
      scaleY = this._filterScalingY,
      w = this.width,
      h = this.height,
      // crop values cannot be lesser than 0.
      cropX = Math.max(this.cropX, 0),
      cropY = Math.max(this.cropY, 0),
      elWidth =
        (elementToDraw as HTMLImageElement).naturalWidth || elementToDraw.width,
      elHeight =
        (elementToDraw as HTMLImageElement).naturalHeight ||
        elementToDraw.height,
      sX = cropX * scaleX,
      sY = cropY * scaleY,
      // the width height cannot exceed element width/height, starting from the crop offset.
      sW = Math.min(w * scaleX, elWidth - sX),
      sH = Math.min(h * scaleY, elHeight - sY),
      x = -w / 2,
      y = -h / 2,
      maxDestW = Math.min(w, elWidth / scaleX - cropX),
      maxDestH = Math.min(h, elHeight / scaleY - cropY);

    elementToDraw &&
      ctx.drawImage(elementToDraw, sX, sY, sW, sH, x, y, maxDestW, maxDestH);
  }
}

export { FabricImage };
