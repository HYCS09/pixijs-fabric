import { Canvas } from 'fabric';

declare module 'fabric' {
  interface Canvas {
    init: () => Promise<void>;
  }
}

Canvas.prototype.init = async function () {};
