import { Application as PixiApplication } from 'pixi.js';
import { FPSCounter } from './FPSCounter';
import { SceneManager } from './SceneManager';

/**
 * Application
 * 
 * Wrapper around PixiJS Application that handles:
 * - Canvas initialization and DOM insertion
 * - Responsive resizing
 * - FPS counter
 * - Scene management
 */
export class Application {
  public readonly pixi: PixiApplication;
  public readonly scenes: SceneManager;
  public readonly fpsCounter: FPSCounter;

  private resizeTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Initialize PixiJS
    this.pixi = new PixiApplication({
      background: '#ffffff',
      resizeTo: window,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Add canvas to DOM
    document.body.appendChild(this.pixi.view as HTMLCanvasElement);

    // Initialize FPS counter
    this.fpsCounter = new FPSCounter();
    this.fpsCounter.attachTo(this.pixi.ticker);

    // Initialize scene manager
    this.scenes = new SceneManager(this.pixi);

    // Handle window resize
    window.addEventListener('resize', this.onResize);
  }

  /**
   * Debounced resize handler
   */
  private onResize = (): void => {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeTimeout = setTimeout(() => {
      this.scenes.onResize();
    }, 50);
  };

  /**
   * Screen width (shortcut)
   */
  get width(): number {
    return this.pixi.screen.width;
  }

  /**
   * Screen height (shortcut)
   */
  get height(): number {
    return this.pixi.screen.height;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.fpsCounter.destroy();
    this.pixi.destroy(true);
  }
}

