import { Polyline } from './Polyline';

export class Polygon extends Polyline {
  protected isOpen() {
    return false;
  }
}
