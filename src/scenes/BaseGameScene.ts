import gsap from 'gsap';
import {
  Container,
  Sprite,
  Assets,
  Spritesheet,
  Texture,
  BlurFilter,
  Text,
  TextStyle,
  Graphics,
  type ISpritesheetData,
} from 'pixi.js';

import { Button } from '../components/Button';
import { SCENE_LAYOUT } from '../config/sharedSettings';
import type { Application } from '../core/Application';
import type { Scene } from '../core/SceneManager';

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
  /**
   * Preferred orientation for this scene.
   * - 'landscape': auto-rotate content when device is in portrait
   * - 'portrait': auto-rotate content when device is in landscape
   * - 'any' (default): no rotation, adapt to current orientation
   */
  preferredOrientation?: 'landscape' | 'portrait' | 'any';
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

  /** Wrapper container for orientation rotation (contains gameContainer) */
  private rotationWrapper: Container;

  /** Whether content is currently rotated for orientation preference */
  private isRotatedForOrientation = false;

  constructor(app: Application, options: BaseGameSceneOptions) {
    this.app = app;
    this.options = options;
    this.originalTitle = document.title;

    this.container = new Container();
    this.rotationWrapper = new Container();
    this.gameContainer = new Container();
    this.rotationWrapper.addChild(this.gameContainer);
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
   *
   * When content is rotated for orientation preference, this returns the
   * "effective" state (e.g., phoneLandscape even if device is in portrait).
   */
  protected getDeviceState(): DeviceState {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const isPhone = Math.min(screenW, screenH) < SCENE_LAYOUT.phoneBreakpoint;

    // If content is rotated, flip the portrait/landscape detection
    const isPortrait = this.isRotatedForOrientation
      ? screenW > screenH // Inverted when rotated
      : screenH > screenW;

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
      width: 80,
      height: 36,
      backgroundColor: 0x000000,
      fontSize: 14,
      radius: 8,
      onClick: onBack,
    });
    this.subModeBackButton.alpha = 0.4;

    // Hover effects
    this.subModeBackButton.on('pointerover', () => {
      if (this.subModeBackButton) this.subModeBackButton.alpha = 0.9;
    });
    this.subModeBackButton.on('pointerout', () => {
      if (this.subModeBackButton) this.subModeBackButton.alpha = 0.4;
    });

    this.container.addChild(this.subModeBackButton);

    // Position using shared method (handles rotation)
    this.positionBackButton();
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
    jsonData: ISpritesheetData,
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

  async onStart(): Promise<void> {
    // Update browser tab title
    document.title = this.options.title;

    // Build in order: background → rotationWrapper (contains gameContainer) → UI
    this.buildBackground();
    this.container.addChild(this.rotationWrapper);

    // Await buildContent to ensure async operations complete before layout
    try {
      await this.buildContent();
    } catch (error) {
      console.error(`[${this.options.title}] Failed to build content:`, error);
      this.showErrorState(error instanceof Error ? error.message : 'Failed to load content');
      // Continue with layout so back button is accessible
    }

    this.buildBackButton();
    this.layoutScene();
    // Must be AFTER layoutScene() because layoutScene decides whether we're rotated.
    this.positionBackButton();
    this.positionFPSCounter();
  }

  onResize(): void {
    this.layoutBackground();
    this.layoutScene();
    this.positionBackButton();
    this.positionFPSCounter();

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
   * Position back buttons in the physical top-left corner.
   *
   * When the scene is auto-rotated, these buttons should:
   * - Rotate with the game (same angle as the rotated content)
   * - Move to the corresponding *effective-landscape* corner
   *
   * For our 90° RIGHT (clockwise) rotation, the effective landscape top-left corner
   * maps to the physical BOTTOM-left corner. So the back button should sit at
   * physical bottom-left when rotated.
   *
   * Note: `Button` is centered around its (x,y), so we place it using bounds.
   */
  private positionBackButton(): void {
    const screenW = this.app.width || window.innerWidth;
    const screenH = this.app.height || window.innerHeight;
    const padding = 10;

    const desiredRotation = this.isRotatedForOrientation ? this.rotationWrapper.rotation : 0;

    const placeInCorner = (btn: Button, corner: 'topLeft' | 'bottomLeft'): void => {
      btn.rotation = desiredRotation;

      // Temporary position at origin so bounds reflect only rotation/size.
      btn.position.set(0, 0);
      const b = btn.getBounds();

      const desiredX = padding;
      const desiredY = corner === 'topLeft' ? padding : screenH - padding - b.height;

      // Move so its bounds top-left matches the desired corner position.
      btn.x += desiredX - b.x;
      btn.y += desiredY - b.y;

      // Safety clamp (in case bounds behave unexpectedly on first frame)
      const b2 = btn.getBounds();
      let dx = 0;
      let dy = 0;
      if (b2.x < padding) dx += padding - b2.x;
      if (b2.y < padding) dy += padding - b2.y;
      if (b2.x + b2.width > screenW - padding) dx -= b2.x + b2.width - (screenW - padding);
      if (b2.y + b2.height > screenH - padding) dy -= b2.y + b2.height - (screenH - padding);
      if (dx !== 0 || dy !== 0) {
        btn.x += dx;
        btn.y += dy;
      }
    };

    // Only one is visible at a time, but we can position both safely.
    const corner: 'topLeft' | 'bottomLeft' = this.isRotatedForOrientation
      ? 'bottomLeft'
      : 'topLeft';
    if (this.backButton) placeInCorner(this.backButton, corner);
    if (this.subModeBackButton) placeInCorner(this.subModeBackButton, corner);
  }

  /**
   * Position FPS counter DOM element.
   *
   * When the scene is auto-rotated, the FPS counter should:
   * - Rotate with the game (same direction)
   * - Move to the corresponding *effective-landscape* top-right corner
   *
   * For our 90° RIGHT (clockwise) rotation, the effective landscape top-right corner
   * maps to the physical TOP-left corner. So FPS should sit at physical top-left when rotated.
   */
  private positionFPSCounter(): void {
    const fpsElement = document.getElementById('fps-counter');
    if (!fpsElement) return;

    const padding = 10;

    if (this.isRotatedForOrientation) {
      // Place at physical top-left, rotate with the game (-90°).
      let left = padding;
      let top = padding;
      fpsElement.style.left = `${left}px`;
      fpsElement.style.top = `${top}px`;
      fpsElement.style.right = 'auto';
      fpsElement.style.bottom = 'auto';
      fpsElement.style.transform = 'rotate(-90deg)';
      fpsElement.style.transformOrigin = 'top left';

      // Clamp in-bounds based on actual DOM rect after transform
      const rect = fpsElement.getBoundingClientRect();
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      if (rect.left < padding) left += padding - rect.left;
      if (rect.top < padding) top += padding - rect.top;
      if (rect.right > screenW - padding) left -= rect.right - (screenW - padding);
      if (rect.bottom > screenH - padding) top -= rect.bottom - (screenH - padding);
      fpsElement.style.left = `${left}px`;
      fpsElement.style.top = `${top}px`;
    } else {
      // Default: physical top-right, no rotation (matches CSS)
      fpsElement.style.top = `${padding}px`;
      fpsElement.style.right = `${padding}px`;
      fpsElement.style.left = 'auto';
      fpsElement.style.bottom = 'auto';
      fpsElement.style.transform = 'none';
      fpsElement.style.transformOrigin = '';
    }
  }

  /**
   * Check if we need to rotate content based on preferred orientation.
   * Returns true if content should be rotated 90 degrees.
   */
  private shouldRotateForOrientation(): boolean {
    const pref = this.options.preferredOrientation ?? 'any';
    if (pref === 'any') return false;

    const screenW = this.app.width || window.innerWidth;
    const screenH = this.app.height || window.innerHeight;
    const isPortrait = screenH > screenW;

    // Rotate if preference doesn't match current orientation
    if (pref === 'landscape' && isPortrait) return true;
    if (pref === 'portrait' && !isPortrait) return true;
    return false;
  }

  /**
   * Scale and position the game container to fit available space.
   * Uses explicit designBounds (set via setDesignBounds) for consistent layout.
   * Uses getResponsivePadding() for dynamic phone/desktop padding.
   * Handles orientation rotation when preferredOrientation is set.
   */
  private layoutScene(): void {
    // Get screen dimensions - use window as fallback if PixiJS dimensions aren't ready
    const physicalW = this.app.width || window.innerWidth;
    const physicalH = this.app.height || window.innerHeight;
    let screenW = physicalW;
    let screenH = physicalH;

    // If dimensions are invalid, skip layout
    if (screenW <= 0 || screenH <= 0) {
      return;
    }

    // Check if we need to rotate for orientation preference
    const needsRotation = this.shouldRotateForOrientation();
    this.isRotatedForOrientation = needsRotation;

    if (needsRotation) {
      // Rotate the wrapper 90° to the RIGHT (clockwise)
      // (Pixi rotation is CCW-positive, so clockwise is negative)
      this.rotationWrapper.rotation = -Math.PI / 2;

      // Keep the rotated content fully on-screen:
      // With pivot at (0,0), rotating -90° moves content into negative Y.
      // Translating by physicalH shifts it back into view.
      this.rotationWrapper.x = 0;
      this.rotationWrapper.y = physicalH;

      // Swap available dimensions for layout calculation (content sees swapped screen)
      [screenW, screenH] = [screenH, screenW];
    } else {
      // No rotation
      this.rotationWrapper.rotation = 0;
      this.rotationWrapper.x = 0;
      this.rotationWrapper.y = 0;
    }

    // Use dynamic responsive padding (phone vs desktop/tablet)
    // This is the single source of truth for device-specific padding
    const p = this.getResponsivePadding();

    // Available space (fullscreen with per-side padding)
    // When rotated, swap padding left/right with top/bottom conceptually
    const availableW = screenW - (needsRotation ? p.top + p.bottom : p.left + p.right);
    const availableH = screenH - (needsRotation ? p.left + p.right : p.top + p.bottom);

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

    // Padding offsets (swap when rotated)
    const padLeft = needsRotation ? p.top : p.left;
    const padTop = needsRotation ? p.left : p.top;

    this.gameContainer.x = padLeft + (availableW - scaledW) / 2 - boundsX * scale;
    this.gameContainer.y = padTop + (availableH - scaledH) / 2 - boundsY * scale;
  }

  /**
   * Override this method to add game-specific content to gameContainer.
   * Can be async for loading assets.
   */
  protected abstract buildContent(): void | Promise<void>;

  /**
   * Display an error state when content fails to load.
   * Override in subclasses for custom error UI.
   */
  protected showErrorState(message: string): void {
    // Semi-transparent overlay
    const overlay = new Graphics();
    overlay.beginFill(0x000000, 0.7);
    overlay.drawRect(0, 0, SCENE_DESIGN.contentWidth, SCENE_DESIGN.contentHeight);
    overlay.endFill();

    // Error text
    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 24,
      fill: '#ff6b6b',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: SCENE_DESIGN.contentWidth - 80,
    });
    const errorText = new Text(`⚠️ ${message}`, style);
    errorText.anchor.set(0.5);
    errorText.x = SCENE_DESIGN.contentWidth / 2;
    errorText.y = SCENE_DESIGN.contentHeight / 2;

    overlay.addChild(errorText);
    this.gameContainer.addChild(overlay);
  }

  /**
   * Call this after modifying gameContainer content or design bounds to re-layout
   */
  protected requestLayout(): void {
    this.layoutScene();
  }

  onStop(): void {
    // Kill GSAP tweens on this scene's containers (scoped, not global)
    // Individual modes should handle their own GSAP cleanup via gsapCtx.revert()
    gsap.killTweensOf(this.gameContainer);
    gsap.killTweensOf(this.container);

    // Restore original document title when leaving scene
    document.title = this.originalTitle;

    // Reset FPS counter position (in case it was rotated)
    this.isRotatedForOrientation = false;
    this.positionFPSCounter();
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
