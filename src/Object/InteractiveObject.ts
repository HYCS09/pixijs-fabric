import { Point } from '../Point';
import type { TCornerPoint, TDegree } from '../typedefs';
import { InnerObject } from './Object';
import { interactiveObjectDefaultValues } from './defaultValues';

export type TOCoord = Point & {
  corner: TCornerPoint;
  touchCorner: TCornerPoint;
};

export type TBorderRenderingStyleOverride = Partial<
  Pick<InteractiveFabricObject, 'borderColor' | 'borderDashArray'>
>;

export type TStyleOverride = TBorderRenderingStyleOverride &
  Partial<
    Pick<InteractiveFabricObject, 'hasBorders' | 'hasControls'> & {
      forActiveSelection: boolean;
    }
  >;

export class InteractiveFabricObject extends InnerObject {
  declare noScaleCache: boolean;

  declare snapAngle?: TDegree;
  declare snapThreshold?: TDegree;

  declare lockMovementX: boolean;
  declare lockMovementY: boolean;
  declare lockRotation: boolean;
  declare lockScalingX: boolean;
  declare lockScalingY: boolean;
  declare lockSkewingX: boolean;
  declare lockSkewingY: boolean;
  declare lockScalingFlip: boolean;

  declare cornerSize: number;
  declare touchCornerSize: number;
  declare transparentCorners: boolean;
  declare cornerColor: string;
  declare cornerStrokeColor: string;
  declare cornerStyle: 'rect' | 'circle';
  declare cornerDashArray: number[] | null;
  declare hasControls: boolean;

  declare borderColor: string;
  declare borderDashArray: number[] | null;
  declare borderOpacityWhenMoving: number;
  declare borderScaleFactor: number;
  declare hasBorders: boolean;
  declare selectionBackgroundColor: string;

  declare selectable: boolean;
  declare evented: boolean;
  declare perPixelTargetFind: boolean;
  declare activeOn: 'down' | 'up';

  declare hoverCursor: CSSStyleDeclaration['cursor'] | null;
  declare moveCursor: CSSStyleDeclaration['cursor'] | null;
  declare oCoords: Record<string, TOCoord>;
  declare __corner?: string;
  declare _controlsVisibility: Record<string, boolean>;
  declare isMoving?: boolean;
  declare _scaling?: boolean;

  // declare canvas?: Canvas;

  static ownDefaults = interactiveObjectDefaultValues;

  static getDefaults(): Record<string, any> {
    return {
      ...super.getDefaults(),
      ...InteractiveFabricObject.ownDefaults,
    };
  }
  constructor(options?: any) {
    super();
    Object.assign(
      this,
      // (this.constructor as typeof InteractiveFabricObject).createControls(),
      InteractiveFabricObject.ownDefaults,
    );
    this.setOptions(options);
  }
  strokeBorders(ctx: CanvasRenderingContext2D, size: Point): void {
    ctx.strokeRect(-size.x / 2, -size.y / 2, size.x, size.y);
  }
  setControlVisible(controlKey: string, visible: boolean) {
    if (!this._controlsVisibility) {
      this._controlsVisibility = {};
    }
    this._controlsVisibility[controlKey] = visible;
  }
  setControlsVisibility(options: Record<string, boolean> = {}) {
    Object.entries(options).forEach(([controlKey, visibility]) =>
      this.setControlVisible(controlKey, visibility),
    );
  }
}
