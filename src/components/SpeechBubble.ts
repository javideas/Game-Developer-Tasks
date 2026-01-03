import { NineSlicePlane } from '@pixi/mesh-extras';
import { Container, Graphics, Texture, Sprite, Assets } from 'pixi.js';

/**
 * SpeechBubble Options
 */
export interface SpeechBubbleOptions {
  /** Width of the bubble */
  width: number;
  /** Height of the bubble */
  height: number;
  /** Texture for the bubble (if not provided, will use graphics) */
  texture?: Texture | string;
  /** 9-slice margins: [left, top, right, bottom] */
  sliceMargins?: [number, number, number, number];
  /**
   * Scale factor for border thickness (default 1).
   * Values < 1 make borders appear thinner by rendering at larger internal size then scaling down.
   * Example: 0.5 = borders appear half as thick.
   */
  borderScale?: number;
  /**
   * Which side the provided texture's tail is on BEFORE any mirroring.
   * For `dialog-bubble.png` this is `left`.
   */
  textureDefaultTailSide?: 'left' | 'right';
  /**
   * Tail tip position in local bubble coordinates (pixels) for the UNMIRRORED texture.
   * Used to place name badges, etc. If omitted, falls back to a reasonable default.
   */
  tailTip?: { x: number; y: number };
  /** Tail side ('left' | 'right') */
  tailSide?: 'left' | 'right';
  /** Tail configuration (only used if texture not provided) */
  tail?: {
    baseWidth: number;
    tipOutX: number;
    tipUpY: number;
    topOffset: number;
  };
}

/**
 * SpeechBubble Component
 *
 * A reusable speech bubble using 9-slice scaling or graphics fallback
 */
export class SpeechBubble extends Container {
  private options: SpeechBubbleOptions;
  private background: Graphics | NineSlicePlane | Sprite | null = null;
  private texture: Texture | null = null;
  private isReady = false;
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;

  constructor(options: SpeechBubbleOptions) {
    super();

    // Default values
    this.options = {
      tailSide: 'right',
      sliceMargins: [20, 20, 20, 20], // Default margins for 9-slice
      textureDefaultTailSide: 'left',
      ...options,
    };

    // Start async initialization
    this.init();
  }

  private async init(): Promise<void> {
    // If texture is provided (string path or Texture), load and use 9-slice
    if (this.options.texture) {
      if (typeof this.options.texture === 'string') {
        this.texture = await Assets.load(this.options.texture);
      } else if (this.options.texture instanceof Texture) {
        this.texture = this.options.texture;
      } else {
        // Assume it's a URL string from Vite import
        this.texture = await Assets.load(this.options.texture as string);
      }
      this.createNineSlice();
    } else {
      // Fallback to graphics drawing
      this.createGraphics();
    }

    this.isReady = true;
    if (this.readyResolve) {
      this.readyResolve();
    }
  }

  /**
   * Wait for the bubble to be ready (texture loaded)
   */
  public async waitForReady(): Promise<void> {
    if (this.isReady) return;

    if (!this.readyPromise) {
      this.readyPromise = new Promise(resolve => {
        this.readyResolve = resolve;
      });
    }

    return this.readyPromise;
  }

  private createNineSlice(): void {
    if (!this.texture) return;

    // Remove old background
    if (this.background) {
      this.removeChild(this.background);
      this.background.destroy();
    }

    const { width, height, sliceMargins, borderScale = 1 } = this.options;
    const [left, top, right, bottom] = sliceMargins || [20, 20, 20, 20];

    // Create 9-slice plane
    const nineSlice = new NineSlicePlane(this.texture, left, top, right, bottom);

    // To make borders appear thinner, we render at a larger internal size
    // and then scale the mesh down. The corners stay at their original pixel
    // size in the mesh but get scaled down visually.
    // internalMultiplier = 1 / borderScale (e.g., borderScale=0.5 → 2x internal size)
    const internalMultiplier = 1 / borderScale;
    nineSlice.width = width * internalMultiplier;
    nineSlice.height = height * internalMultiplier;

    this.applyNineSliceFlip(nineSlice, borderScale);

    this.background = nineSlice;
    this.addChild(nineSlice);
  }

  private applyNineSliceFlip(nineSlice: NineSlicePlane, borderScale = 1): void {
    const desired = this.options.tailSide || 'right';
    const textureDefault = this.options.textureDefaultTailSide || 'left';
    const shouldFlip = desired !== textureDefault;

    // Apply borderScale to both axes, and flip X if needed
    if (shouldFlip) {
      nineSlice.scale.set(-borderScale, borderScale);
      nineSlice.x = this.options.width; // Adjust position after flipping
    } else {
      nineSlice.scale.set(borderScale, borderScale);
      nineSlice.x = 0;
    }
  }

  private createGraphics(): void {
    // Remove old background
    if (this.background) {
      this.removeChild(this.background);
      this.background.destroy();
    }

    const graphics = new Graphics();
    this.background = graphics;
    this.addChild(graphics);
    this.draw();
  }

  /**
   * Draw the speech bubble (graphics fallback)
   */
  private draw(): void {
    if (!(this.background instanceof Graphics)) return;

    const { width, height } = this.options;
    const bgColor = 0xfff8e7;
    const borderColor = 0xc4a574;
    const borderWidth = 3;
    const radius = 20;
    const tail = this.options.tail || {
      baseWidth: 40,
      tipOutX: 35,
      tipUpY: 30,
      topOffset: 15,
    };
    const tailSide = this.options.tailSide || 'right';

    this.background.clear();
    this.background.lineStyle(borderWidth, borderColor);
    this.background.beginFill(bgColor);

    const r = radius;
    const tailY = tail.topOffset;
    const halfBase = tail.baseWidth / 2;

    if (tailSide === 'right') {
      // Right tail: simple triangle from right side
      this.background.moveTo(r, 0);
      this.background.lineTo(width - r, 0);
      this.background.arcTo(width, 0, width, r, r);
      this.background.lineTo(width, tailY - halfBase);

      // Simple triangle pointing right
      const tipX = width + tail.tipOutX;
      const tipY = tailY;

      this.background.lineTo(tipX, tipY);
      this.background.lineTo(width, tailY + halfBase);
      this.background.lineTo(width, height - r);
    } else {
      // Left tail: simple triangle from left side (mirrored)
      const tipX = -tail.tipOutX;
      const tipY = tailY;

      this.background.moveTo(0, tailY - halfBase);
      this.background.lineTo(tipX, tipY);
      this.background.lineTo(0, tailY + halfBase);
      this.background.lineTo(0, r);
      this.background.arcTo(0, 0, r, 0, r);
      this.background.lineTo(width - r, 0);
    }

    // Complete the rectangle
    if (tailSide === 'left') {
      this.background.arcTo(width, 0, width, r, r);
    }

    if (tailSide === 'left') {
      this.background.lineTo(width, height - r);
    }

    this.background.arcTo(width, height, width - r, height, r);
    this.background.lineTo(r, height);
    this.background.arcTo(0, height, 0, height - r, r);

    if (tailSide === 'right') {
      this.background.lineTo(0, r);
      this.background.arcTo(0, 0, r, 0, r);
    }

    this.background.closePath();
    this.background.endFill();
  }

  /**
   * Update the tail side
   */
  public setTailSide(side: 'left' | 'right'): void {
    if (this.options.tailSide !== side) {
      this.options.tailSide = side;

      if (this.background instanceof NineSlicePlane) {
        const borderScale = this.options.borderScale ?? 1;
        this.applyNineSliceFlip(this.background, borderScale);
      } else if (this.background instanceof Graphics) {
        this.draw();
      }
    }
  }

  /**
   * Update size
   */
  public setSize(width: number, height: number): void {
    this.options.width = width;
    this.options.height = height;

    if (this.background instanceof NineSlicePlane) {
      const borderScale = this.options.borderScale ?? 1;
      const internalMultiplier = 1 / borderScale;
      this.background.width = width * internalMultiplier;
      this.background.height = height * internalMultiplier;
      this.applyNineSliceFlip(this.background, borderScale);
    } else if (this.background instanceof Graphics) {
      this.draw();
    }
  }

  /**
   * Get the tail tip position (for positioning name badge)
   */
  public getTailTipPosition(): { x: number; y: number } {
    const { width, tailSide } = this.options;

    // If using a texture, use configured tail tip (defaults are tuned for `dialog-bubble.png`)
    if (this.options.texture) {
      const textureDefault = this.options.textureDefaultTailSide || 'left';
      const tip = this.options.tailTip || { x: 18, y: 12 };

      // If desired side matches the default texture side, use tip as-is.
      // Otherwise mirror around the bubble width.
      const shouldMirror = (tailSide || 'right') !== textureDefault;
      return {
        x: shouldMirror ? width - tip.x : tip.x,
        y: tip.y,
      };
    }

    // Graphics fallback: approximate from tail config
    const tail = this.options.tail || { baseWidth: 40, tipOutX: 35, tipUpY: 30, topOffset: 15 };
    const tailY = tail.topOffset;
    if ((tailSide || 'right') === 'right') {
      return { x: width + tail.tipOutX, y: tailY };
    }
    return { x: -tail.tipOutX, y: tailY };
  }
}
