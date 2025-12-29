import { Container, Sprite, Assets, Spritesheet, Texture, BlurFilter } from 'pixi.js';
import type { Scene } from '../core/SceneManager';
import type { Application } from '../core/Application';
import { Button } from '../components/Button';
import { SCENE_LAYOUT } from '../config/sharedSettings';
import gsap from 'gsap';

export interface BaseGameSceneOptions {
  /** Scene title (shown in browser tab) */
  title: string;
  /** Callback when back button is clicked */
  onBack: () => void;
  /** Optional fullscreen background image URL */
  backgroundUrl?: string;
  /**
   * Optional per-scene padding (in pixels) used by the responsive layout.
   * Defaults to SCENE_DESIGN.padding on all sides.
   */
  contentPadding?: { left: number; right: number; top: number; bottom: number };
  /** Optional max scale clamp for responsive layout (defaults to 1.5) */
  maxScale?: number;
}

/** Design constants for game scenes */
const SCENE_DESIGN = {
  /** Base design size for content area */
  contentWidth: 800,
  contentHeight: 600,
  /** Padding around content */
  padding: 40,
};

/**
 * BaseGameScene
 * 
 * Abstract base class for game scenes. Provides:
 * - Fullscreen background image (optional, covers entire screen)
 * - Browser tab title updates to game name
 * - Back to menu button (floating, top-left)
 * - Responsive content container that scales to fit
 * 
 * Extend this class and override buildContent() to add game logic.
 */
/** Explicit design bounds for consistent layout */
export interface DesignBounds {
  /** Left edge of design area (design coordinates) */
  x: number;
  /** Top edge of design area (design coordinates) */
  y: number;
  /** Width of design area */
  width: number;
  /** Height of design area */
  height: number;
}

/** Device state for responsive layout decisions */
export type DeviceState = 'phonePortrait' | 'phoneLandscape' | 'desktop';

/** Options for texture-based backgrounds */
export interface BackgroundOptions {
  /** Blur amount (0 = no blur) */
  blur?: number;
  /** Landscape Y offset (0-1, shifts background down to show top) */
  landscapeYOffset?: number;
}

export abstract class BaseGameScene implements Scene {
  public readonly container: Container;
  
  protected app: Application;
  protected options: BaseGameSceneOptions;
  
  /** Fullscreen background sprite */
  private background: Sprite | null = null;
  
  /** Background options for texture-based backgrounds */
  private backgroundOptions: BackgroundOptions = {};
  
  /** Scalable content container for game elements */
  protected gameContainer: Container;
  
  /** Back button (floating UI, not scaled) */
  protected backButton: Button | null = null;

  /** Sub-mode back button (for scenes with multiple modes) */
  protected subModeBackButton: Button | null = null;

  /** Original document title (to restore on exit) */
  private originalTitle: string;

  /** Static cache for spritesheets (persists across scene instances) */
  private static spritesheetCache = new Map<string, Spritesheet>();

  /** Track device state for responsive rebuild detection */
  private lastDeviceState: DeviceState | null = null;

  /** 
   * Explicit design bounds for layout calculation.
   * Set via setDesignBounds() - never uses getLocalBounds().
   */
  private designBounds: DesignBounds = {
    x: 0,
    y: 0,
    width: SCENE_DESIGN.contentWidth,
    height: SCENE_DESIGN.contentHeight,
  };

  constructor(app: Application, options: BaseGameSceneOptions) {
    this.app = app;
    this.options = options;
    this.originalTitle = document.title;
    
    this.container = new Container();
    this.gameContainer = new Container();
  }

  /**
   * Set explicit design bounds for layout calculation.
   * This ensures consistent, predictable layout regardless of content state.
   */
  protected setDesignBounds(bounds: DesignBounds): void {
    this.designBounds = { ...bounds };
  }

  /**
   * Get responsive padding based on screen size.
   * Uses CSS pixels (window.innerWidth/Height) for consistent detection across devices.
   * Single source of truth: SCENE_LAYOUT.largePaddingBreakpoint.
   */
  private getResponsivePadding(): { left: number; right: number; top: number; bottom: number } {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const useCompactPadding = Math.min(screenW, screenH) < SCENE_LAYOUT.largePaddingBreakpoint;
    
    return useCompactPadding ? SCENE_LAYOUT.screenPaddingPhone : SCENE_LAYOUT.screenPadding;
  }

  /**
   * Get current device state for responsive layout decisions.
   * Uses CSS pixels (window.innerWidth/Height) for consistent detection.
   * Single source of truth for phone/tablet/desktop detection.
   */
  protected getDeviceState(): DeviceState {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const isPhone = Math.min(screenW, screenH) < SCENE_LAYOUT.phoneBreakpoint;
    const isPortrait = screenH > screenW;
    
    if (isPhone && isPortrait) return 'phonePortrait';
    if (isPhone && !isPortrait) return 'phoneLandscape';
    return 'desktop';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUB-MODE NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Enable sub-mode navigation (hides menu button, shows back-to-selection button).
   * Use this when your scene has multiple modes (e.g., "Literal Task" vs "Creative Take").
   * @param onBack Callback when the back button is clicked
   */
  protected enableSubModeNavigation(onBack: () => void): void {
    // Hide menu button
    if (this.backButton) {
      this.backButton.visible = false;
    }

    // Create sub-mode back button
    this.subModeBackButton = new Button({
      label: '← Back',
      width: 100,
      height: 36,
      backgroundColor: 0x000000,
      fontSize: 14,
      radius: 8,
      onClick: onBack,
    });
    this.subModeBackButton.alpha = 0.4;
    this.subModeBackButton.x = 70;
    this.subModeBackButton.y = 30;

    // Hover effects
    this.subModeBackButton.on('pointerover', () => {
      if (this.subModeBackButton) this.subModeBackButton.alpha = 0.9;
    });
    this.subModeBackButton.on('pointerout', () => {
      if (this.subModeBackButton) this.subModeBackButton.alpha = 0.4;
    });

    this.container.addChild(this.subModeBackButton);
  }

  /**
   * Disable sub-mode navigation (restores menu button).
   * Call this when returning to the mode selection screen.
   */
  protected disableSubModeNavigation(): void {
    if (this.subModeBackButton) {
      this.subModeBackButton.destroy();
      this.subModeBackButton = null;
    }

    if (this.backButton) {
      this.backButton.visible = true;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SPRITESHEET LOADING
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Load a spritesheet with automatic caching.
   * Cached spritesheets persist across scene instances to avoid re-parsing.
   * @param jsonData The spritesheet JSON data (imported)
   * @param pngPath The spritesheet PNG path (imported)
   * @param cacheKey Unique key for caching (e.g., 'ace-of-shadows')
   * @returns The parsed Spritesheet
   */
  protected async loadSpritesheet(
    jsonData: any,
    pngPath: string,
    cacheKey: string
  ): Promise<Spritesheet> {
    // Return cached if available
    if (BaseGameScene.spritesheetCache.has(cacheKey)) {
      return BaseGameScene.spritesheetCache.get(cacheKey)!;
    }

    // Load and parse
    const texture = await Assets.load(pngPath);
    const spritesheet = new Spritesheet(texture, jsonData);
    await spritesheet.parse();

    // Cache for future use
    BaseGameScene.spritesheetCache.set(cacheKey, spritesheet);

    return spritesheet;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEXTURE-BASED BACKGROUND
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Set a background from a texture (instead of URL).
   * Useful when background comes from a spritesheet.
   * @param texture The texture to use as background
   * @param options Optional background settings (blur, landscape offset)
   */
  protected setBackgroundTexture(texture: Texture, options?: BackgroundOptions): void {
    // Remove existing background if any
    if (this.background) {
      this.background.destroy();
    }

    this.background = new Sprite(texture);
    this.background.anchor.set(0.5);
    this.backgroundOptions = options ?? {};

    // Apply blur if specified
    if (options?.blur) {
      const blurFilter = new BlurFilter();
      blurFilter.blur = options.blur;
      blurFilter.quality = 4;
      this.background.filters = [blurFilter];
    }

    // Insert at beginning (behind everything)
    this.container.addChildAt(this.background, 0);
    this.layoutBackground();
  }

  onStart(): void {
    // Update browser tab title
    document.title = this.options.title;
    
    // Build in order: background → gameContainer → UI
    this.buildBackground();
    this.container.addChild(this.gameContainer);
    this.buildContent();
    this.buildBackButton();
    this.layoutScene();
  }

  onResize(): void {
    this.layoutBackground();
    this.layoutScene();
    this.positionBackButton();
    
    // Detect device state changes (phone/tablet/desktop, portrait/landscape)
    const currentState = this.getDeviceState();
    if (this.lastDeviceState !== null && this.lastDeviceState !== currentState) {
      this.onDeviceStateChange(currentState, this.lastDeviceState);
    }
    this.lastDeviceState = currentState;
  }

  /**
   * Called when device state changes (e.g., phone to desktop, portrait to landscape).
   * Override in child classes to rebuild responsive UI.
   * @param newState The new device state
   * @param oldState The previous device state
   */
  protected onDeviceStateChange(_newState: DeviceState, _oldState: DeviceState): void {
    // Default: do nothing. Override in child class for responsive UI updates.
  }

  /**
   * Build fullscreen background if URL provided
   */
  private buildBackground(): void {
    if (!this.options.backgroundUrl) return;

    this.background = Sprite.from(this.options.backgroundUrl);
    this.background.anchor.set(0.5);
    this.container.addChild(this.background);
    this.layoutBackground();

    // Re-layout when texture loads (async)
    this.background.texture.baseTexture.once('loaded', () => {
      this.layoutBackground();
    });
  }

  /**
   * Scale and position background to cover entire screen.
   * Supports landscape Y offset for texture-based backgrounds.
   */
  private layoutBackground(): void {
    if (!this.background) return;

    const screenW = this.app.width;
    const screenH = this.app.height;
    const isLandscape = screenW > screenH;

    // Center horizontally
    this.background.x = screenW / 2;

    // Scale to cover (like CSS background-size: cover)
    const tex = this.background.texture;
    if (tex.width > 0 && tex.height > 0) {
      const scaleX = screenW / tex.width;
      const scaleY = screenH / tex.height;
      const scale = Math.max(scaleX, scaleY);
      this.background.scale.set(scale);

      // Apply landscape Y offset (shifts background down to show more top)
      if (isLandscape && this.backgroundOptions?.landscapeYOffset) {
        const scaledHeight = tex.height * scale;
        const overflow = scaledHeight - screenH;
        this.background.y = screenH / 2 + overflow * this.backgroundOptions.landscapeYOffset;
      } else {
        this.background.y = screenH / 2;
      }
    } else {
      this.background.y = screenH / 2;
    }
  }

  /**
   * Build the floating back button
   */
  private buildBackButton(): void {
    this.backButton = new Button({
      label: '← Menu',
      width: 100,
      height: 36,
      backgroundColor: 0x000000,
      fontSize: 14,
      radius: 8,
      onClick: this.options.onBack,
    });
    this.backButton.alpha = 0.4;
    
    // Make it more visible on hover
    this.backButton.on('pointerover', () => { 
      if (this.backButton) this.backButton.alpha = 0.9; 
    });
    this.backButton.on('pointerout', () => { 
      if (this.backButton) this.backButton.alpha = 0.4; 
    });
    
    this.container.addChild(this.backButton);
    this.positionBackButton();
  }

  /**
   * Position back button in top-left corner
   */
  private positionBackButton(): void {
    if (this.backButton) {
      this.backButton.x = 70;
      this.backButton.y = 30;
    }
  }

  /**
   * Scale and position the game container to fit available space.
   * Uses explicit designBounds (set via setDesignBounds) for consistent layout.
   * Uses getResponsivePadding() for dynamic phone/desktop padding.
   */
  private layoutScene(): void {
    // Get screen dimensions - use window as fallback if PixiJS dimensions aren't ready
    const screenW = this.app.width || window.innerWidth;
    const screenH = this.app.height || window.innerHeight;
    
    // If dimensions are invalid, skip layout
    if (screenW <= 0 || screenH <= 0) {
      return;
    }
    
    // Use dynamic responsive padding (phone vs desktop/tablet)
    // This is the single source of truth for device-specific padding
    const p = this.getResponsivePadding();

    // Available space (fullscreen with per-side padding)
    const availableW = screenW - (p.left + p.right);
    const availableH = screenH - (p.top + p.bottom);

    // Use explicit design bounds (never getLocalBounds - that's inconsistent)
    const { x: boundsX, y: boundsY, width: contentW, height: contentH } = this.designBounds;

    // Calculate scale to fit (cap at maxScale to avoid over-scaling)
    const scaleX = availableW / contentW;
    const scaleY = availableH / contentH;
    const maxScale = this.options.maxScale ?? 1.5;
    const scale = Math.min(scaleX, scaleY, maxScale);

    this.gameContainer.scale.set(scale);

    // Center in the padded available rect
    const scaledW = contentW * scale;
    const scaledH = contentH * scale;
    
    this.gameContainer.x = p.left + (availableW - scaledW) / 2 - boundsX * scale;
    this.gameContainer.y = p.top + (availableH - scaledH) / 2 - boundsY * scale;
  }

  /**
   * Override this method to add game-specific content to gameContainer
   */
  protected abstract buildContent(): void;

  /**
   * Call this after modifying gameContainer content or design bounds to re-layout
   */
  protected requestLayout(): void {
    this.layoutScene();
  }

  onStop(): void {
    // Kill ALL GSAP tweens globally to prevent animation on destroyed objects
    // This is a safety net for all scenes using GSAP animations
    gsap.globalTimeline.clear();
    
    // Restore original document title when leaving scene
    document.title = this.originalTitle;
  }

  destroy(): void {
    this.gameContainer.removeChildren();
    if (this.background) {
      this.background.destroy();
      this.background = null;
    }
    if (this.backButton) {
      this.backButton.destroy();
      this.backButton = null;
    }
    if (this.subModeBackButton) {
      this.subModeBackButton.destroy();
      this.subModeBackButton = null;
    }
  }
}
