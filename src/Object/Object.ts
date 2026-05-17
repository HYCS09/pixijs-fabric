import { ALIASING_LIMIT, CENTER, SCALE_X, SCALE_Y, STROKE } from '../constants';
import { Point } from '../Point';
import { TCacheCanvasDimensions, TDegree } from '../typedefs';
import { qrDecompose } from '../matrix';
import { FakeCanvasRenderingContext2D } from '../FakeCanvasRenderingContext2D';
import {
  cacheProperties,
  fabricObjectDefaultValues,
  stateProperties,
} from './defaultValues';
import { ObjectGeometry } from './ObjectGeometry';

const temp = new Point();
const temp2 = new Point();

const tempDim: TCacheCanvasDimensions = {
  width: 0,
  height: 0,
  x: 0,
  y: 0,
  zoomX: 1,
  zoomY: 1,
};

export type TCachedFabricObject<T extends InnerObject = InnerObject> = T &
  Required<
    Pick<
      T,
      | 'zoomX'
      | 'zoomY'
      | '_cacheCanvas'
      | 'cacheTranslationX'
      | 'cacheTranslationY'
    >
  >;

export type DrawContext =
  | {
      parentClipPaths: InnerObject[];
      width: number;
      height: number;
      cacheTranslationX: number;
      cacheTranslationY: number;
      zoomX: number;
      zoomY: number;
    }
  | Record<string, never>;

export class InnerObject extends ObjectGeometry {
  declare minScaleLimit: number;
  declare opacity: number;
  declare paintFirst: 'fill' | 'stroke';
  declare fill: string;
  declare fillRule: CanvasFillRule;
  declare stroke: string;
  declare strokeDashArray: number[] | null;
  declare strokeDashOffset: number;
  declare strokeLineCap: CanvasLineCap;
  declare strokeLineJoin: CanvasLineJoin;
  declare strokeMiterLimit: number;
  declare globalCompositeOperation: GlobalCompositeOperation;
  declare backgroundColor: string;

  declare visible: boolean;

  declare includeDefaultValues: boolean;
  declare excludeFromExport: boolean;

  declare objectCaching: boolean;

  declare clipPath?: InnerObject;
  declare inverted: boolean;
  declare absolutePositioned: boolean;
  declare centeredRotation: boolean;
  declare centeredScaling: boolean;
  static stateProperties: string[] = stateProperties;
  static cacheProperties: string[] = cacheProperties;
  declare dirty: boolean;
  declare _cacheCanvas?: HTMLCanvasElement;
  declare zoomX?: number;
  declare zoomY?: number;
  declare cacheTranslationX?: number;
  declare cacheTranslationY?: number;
  // declare group?: Group;
  declare ownCaching?: boolean;
  declare _transformDone?: boolean;
  static ownDefaults = fabricObjectDefaultValues;
  static getDefaults(): Record<string, any> {
    return InnerObject.ownDefaults;
  }
  static type = 'FabricObject';
  get type() {
    const name = (this.constructor as typeof InnerObject).type;
    if (name === 'FabricObject') {
      return 'object';
    }
    return name.toLowerCase();
  }
  constructor(options?: any) {
    super();
    Object.assign(this, InnerObject.ownDefaults);
    this.setOptions(options);
  }
  protected setOptions(options: Record<string, any> = {}) {
    this._setOptions(options);
  }
  _render(ctx: CanvasRenderingContext2D) {}
  transform(ctx: CanvasRenderingContext2D) {
    this.calcOwnMatrix();
  }
  getObjectScaling() {
    // if we are inside a group total zoom calculation is complex, we defer to generic matrices
    const options = qrDecompose(this.calcOwnMatrix());
    temp.setXY(Math.abs(options.scaleX), Math.abs(options.scaleY));
    return temp;
  }
  protected _renderPaintInOrder(ctx: CanvasRenderingContext2D) {
    if (this.paintFirst === STROKE) {
      this._renderStroke(ctx);
      this._renderFill(ctx);
    } else {
      this._renderFill(ctx);
      this._renderStroke(ctx);
    }
  }

  isNotVisible() {
    return (
      this.opacity === 0 ||
      (!this.width && !this.height && this.strokeWidth === 0) ||
      !this.visible
    );
  }

  render(ctx: CanvasRenderingContext2D) {
    this.pixiContent.visible = false;

    if (this.isNotVisible()) return;

    this.pixiContent.visible = true;

    this.drawSelectionBackground(ctx);
    this.transform(ctx);
    this.pixiContent.alpha = this.opacity ?? 1;

    this.drawObject(ctx);

    this.dirty = false;
  }

  drawObject(ctx: CanvasRenderingContext2D) {
    if (!this.dirty) return;

    const originalFill = this.fill;
    const originalStroke = this.stroke;
    (ctx as FakeCanvasRenderingContext2D).bindObjectGeometry(this);
    this._renderBackground(ctx);
    this._render(ctx);
    this.fill = originalFill;
    this.stroke = originalStroke;
  }

  protected _renderBackground(ctx: CanvasRenderingContext2D) {
    if (!this.backgroundColor) return;

    const dim = this._getNonTransformedDimensions();
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(-dim.x / 2, -dim.y / 2, dim.x, dim.y);
  }

  drawSelectionBackground(_ctx: CanvasRenderingContext2D) {
    /* no op */
  }

  protected getCanvasRetinaScaling() {
    return devicePixelRatio;
  }

  protected _getCacheCanvasDimensions(): TCacheCanvasDimensions {
    const objectScale = this.getTotalObjectScaling();
    // calculate dimensions without skewing
    const dim = this._getTransformedDimensions({ skewX: 0, skewY: 0 });
    const neededX = (dim.x * objectScale.x) / this.scaleX;
    const neededY = (dim.y * objectScale.y) / this.scaleY;

    tempDim.width = Math.ceil(neededX + ALIASING_LIMIT);
    tempDim.height = Math.ceil(neededY + ALIASING_LIMIT);
    tempDim.zoomX = objectScale.x;
    tempDim.zoomY = objectScale.y;
    tempDim.x = neededX;
    tempDim.y = neededY;
    return tempDim;
  }

  getTotalObjectScaling() {
    const scale = this.getObjectScaling();
    temp2.setXY(scale.x, scale.y);
    return temp2;
  }

  rotate(angle: TDegree) {
    const { centeredRotation, originX, originY } = this;

    if (centeredRotation) {
      const { x, y } = this.getRelativeCenterPoint();
      this.originX = CENTER;
      this.originY = CENTER;
      this.left = x;
      this.top = y;
    }

    this.set('angle', angle);

    if (centeredRotation) {
      const { x, y } = this.getPositionByOrigin(originX, originY);
      this.left = x;
      this.top = y;
      this.originX = originX;
      this.originY = originY;
    }
  }

  protected _renderFill(ctx: CanvasRenderingContext2D) {
    if (!this.fill) {
      return;
    }

    ctx.save();
    this._setFillStyles(ctx, this);
    ctx.fill();
    ctx.restore();
  }

  protected _renderStroke(ctx: CanvasRenderingContext2D) {
    if (!this.stroke || this.strokeWidth === 0) {
      return;
    }

    ctx.save();

    this._setStrokeStyles(ctx, this);
    ctx.stroke();
    ctx.restore();
  }
  protected _setFillStyles(
    ctx: CanvasRenderingContext2D,
    { fill }: Pick<this, 'fill'>,
  ) {
    if (fill) {
      ctx.fillStyle = this.fill;
    }
  }
  protected _setStrokeStyles(
    ctx: CanvasRenderingContext2D,
    decl: Pick<
      this,
      | 'stroke'
      | 'strokeWidth'
      | 'strokeLineCap'
      | 'strokeDashOffset'
      | 'strokeLineJoin'
      | 'strokeMiterLimit'
    >,
  ) {
    const stroke = decl.stroke;

    if (!stroke) return;

    ctx.lineWidth = this.strokeWidth;
    ctx.lineCap = this.strokeLineCap;
    ctx.lineJoin = this.strokeLineJoin;
    ctx.miterLimit = this.strokeMiterLimit;
    ctx.strokeStyle = stroke;
  }
  complexity() {
    return 1;
  }
  isType(...types: string[]) {
    return (
      types.includes((this.constructor as typeof InnerObject).type) ||
      types.includes(this.type)
    );
  }
  private _constrainScale(value: number): number {
    if (Math.abs(value) < this.minScaleLimit) {
      if (value < 0) {
        return -this.minScaleLimit;
      } else {
        return this.minScaleLimit;
      }
    } else if (value === 0) {
      return 0.0001;
    }
    return value;
  }
  protected _set(key: string, value: any) {
    if (key === SCALE_X || key === SCALE_Y) {
      value = this._constrainScale(value);
    }
    if (key === SCALE_X && value < 0) {
      this.flipX = !this.flipX;
      value *= -1;
    } else if (key === 'scaleY' && value < 0) {
      this.flipY = !this.flipY;
      value *= -1;
      // i don't like this automatic initialization here
    }

    const isChanged = this[key as keyof this] !== value;
    super._set(key, value);

    // invalidate caches
    if (
      isChanged &&
      (this.constructor as typeof InnerObject).cacheProperties.includes(key)
    ) {
      this.dirty = true;
    }

    return this;
  }
}
