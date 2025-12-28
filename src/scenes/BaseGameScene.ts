import { Container, Sprite } from 'pixi.js';
import type { Scene } from '../core/SceneManager';
import type { Application } from '../core/Application';
import { Button } from '../components/Button';

export interface BaseGameSceneOptions {
  /** Scene title (shown in browser tab) */
  title: string;
  /** Callback when back button is clicked */
  onBack: () => void;
  /** Optional fullscreen background image URL */
  backgroundUrl?: string;
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
export abstract class BaseGameScene implements Scene {
  public readonly container: Container;
  
  protected app: Application;
  protected options: BaseGameSceneOptions;
  
  /** Fullscreen background sprite */
  private background: Sprite | null = null;
  
  /** Scalable content container for game elements */
  protected gameContainer: Container;
  
  /** Back button (floating UI, not scaled) */
  protected backButton: Button | null = null;

  /** Original document title (to restore on exit) */
  private originalTitle: string;

  constructor(app: Application, options: BaseGameSceneOptions) {
    this.app = app;
    this.options = options;
    this.originalTitle = document.title;
    
    this.container = new Container();
    this.gameContainer = new Container();
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
   * Scale and position background to cover entire screen
   */
  private layoutBackground(): void {
    if (!this.background) return;

    const screenW = this.app.width;
    const screenH = this.app.height;

    // Center the background
    this.background.x = screenW / 2;
    this.background.y = screenH / 2;

    // Scale to cover (like CSS background-size: cover)
    const tex = this.background.texture;
    if (tex.width > 0 && tex.height > 0) {
      const scaleX = screenW / tex.width;
      const scaleY = screenH / tex.height;
      const scale = Math.max(scaleX, scaleY); // Cover, not contain
      this.background.scale.set(scale);
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
   * Scale and position the game container to fit available space
   */
  private layoutScene(): void {
    const screenW = this.app.width;
    const screenH = this.app.height;
    const padding = SCENE_DESIGN.padding;

    // Available space (fullscreen with padding)
    const availableW = screenW - padding * 2;
    const availableH = screenH - padding * 2;

    // Get content bounds at scale 1
    this.gameContainer.scale.set(1);
    const bounds = this.gameContainer.getLocalBounds();
    
    // If content has no size yet, use design defaults
    const contentW = bounds.width > 0 ? bounds.width : SCENE_DESIGN.contentWidth;
    const contentH = bounds.height > 0 ? bounds.height : SCENE_DESIGN.contentHeight;

    // Calculate scale to fit (cap at 1.5 to avoid over-scaling)
    const scaleX = availableW / contentW;
    const scaleY = availableH / contentH;
    const scale = Math.min(scaleX, scaleY, 1.5);

    this.gameContainer.scale.set(scale);

    // Center in screen
    const scaledW = contentW * scale;
    const scaledH = contentH * scale;
    
    this.gameContainer.x = (screenW - scaledW) / 2 - bounds.x * scale;
    this.gameContainer.y = (screenH - scaledH) / 2 - bounds.y * scale;
  }

  /**
   * Override this method to add game-specific content to gameContainer
   */
  protected abstract buildContent(): void;

  /**
   * Call this after modifying gameContainer content to re-layout
   */
  protected requestLayout(): void {
    this.layoutScene();
  }

  onStop(): void {
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
  }
}
