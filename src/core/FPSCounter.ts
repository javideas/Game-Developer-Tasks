import type { Ticker } from 'pixi.js';

/**
 * FPSCounter
 * 
 * Displays frames-per-second as an HTML overlay in the top-left corner.
 * Uses a DOM element (not PixiJS text) so it's always visible regardless
 * of scene state or canvas transformations.
 */
export class FPSCounter {
  private element: HTMLDivElement;
  private frameCount = 0;
  private lastTime = performance.now();

  constructor() {
    this.element = document.createElement('div');
    this.element.id = 'fps-counter';
    this.element.textContent = 'FPS: --';
    document.body.appendChild(this.element);
  }

  /**
   * Call this on every frame (add to app.ticker)
   */
  update = (): void => {
    this.frameCount++;
    const currentTime = performance.now();

    if (currentTime - this.lastTime >= 1000) {
      this.element.textContent = `FPS: ${this.frameCount}`;
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
  };

  /**
   * Attach to a PixiJS ticker for automatic updates
   */
  attachTo(ticker: Ticker): void {
    ticker.add(this.update);
  }

  /**
   * Remove the FPS counter from the DOM
   */
  destroy(): void {
    this.element.remove();
  }
}

