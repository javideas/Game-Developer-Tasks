import { Assets, BlurFilter, Container, Sprite } from 'pixi.js';

import bigbangBgUrl from '../assets/sprites/bigbang-bg/bigbang-bg.png';
import { ModeSelectionPanel } from '../components/ModeSelectionPanel';
import { SELECTION_PANEL } from '../config/magicWordsSettings';
import { SCENE_LAYOUT } from '../config/sharedSettings';
import type { Application } from '../core/Application';
import type { GameMode, GameModeContext } from '../modes/GameMode';
import { MagicWordsModeLiteral, MagicWordsModeCreative } from '../modes/magicWords';

import { BaseGameScene, type DeviceState } from './BaseGameScene';

// Background image for mode selection

/**
 * MagicWordsScene
 *
 * Task 2: Create a system that combines text and images like custom emojis.
 * Render a dialogue between characters with data from the API endpoint.
 *
 * This scene acts as a coordinator:
 * - Displays mode selection screen
 * - Delegates to mode classes (Literal, Creative)
 * - Forwards lifecycle events to active mode
 */
export class MagicWordsScene extends BaseGameScene {
  /** Current scene mode - tracked for debugging */
  private currentMode: 'selection' | 'literal' | 'creative' = 'selection';

  /** Get current scene mode (for debugging/testing) */
  get mode(): 'selection' | 'literal' | 'creative' {
    return this.currentMode;
  }

  /** Active game mode instance */
  private activeMode: GameMode | null = null;

  /** Container for mode content */
  private modeContainer: Container | null = null;

  /** Selection screen container */
  private selectionContainer: Container | null = null;

  /** Background sprite for selection screen */
  private selectionBg: Sprite | null = null;

  constructor(app: Application, onBack: () => void) {
    super(app, {
      title: 'Magic Words',
      onBack,
      contentPadding: SCENE_LAYOUT.screenPadding,
      maxScale: SCENE_LAYOUT.maxScale,
      preferredOrientation: 'landscape', // Auto-rotate content when device is portrait
    });
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  protected async buildContent(): Promise<void> {
    await this.buildSelectionScreen();
  }

  onResize(): void {
    super.onResize();

    // Scale selection background if in selection mode
    if (this.currentMode === 'selection' && this.selectionBg) {
      this.scaleSelectionBackground();
    }

    // Forward resize to active mode
    if (this.activeMode?.onResize) {
      this.activeMode.onResize();
    }
  }

  /**
   * Scale the selection background to cover the full screen
   * Uses "cover" behavior - scales to the larger dimension to fill the screen
   * Anchor Y is set to 0.35 to show more of the sofa (shifts image up)
   */
  private scaleSelectionBackground(): void {
    if (!this.selectionBg) return;

    const screenWidth = this.app.width || window.innerWidth;
    const screenHeight = this.app.height || window.innerHeight;
    const bgWidth = this.selectionBg.texture.width;
    const bgHeight = this.selectionBg.texture.height;

    // Calculate scale to cover - use the larger ratio to ensure full coverage
    const scaleX = screenWidth / bgWidth;
    const scaleY = screenHeight / bgHeight;
    const coverScale = Math.max(scaleX, scaleY);

    this.selectionBg.scale.set(coverScale);
    // Position X centered, Y at 35% of screen height to match anchor
    this.selectionBg.position.set(screenWidth / 2 - 140, screenHeight * 0.15);
  }

  protected onDeviceStateChange(newState: DeviceState, oldState: DeviceState): void {
    // Forward to active mode
    if (this.activeMode?.onDeviceStateChange) {
      this.activeMode.onDeviceStateChange(newState, oldState);
    }
  }

  onStop(): void {
    super.onStop();

    // Stop active mode
    if (this.activeMode) {
      this.activeMode.stop();
      this.activeMode = null;
    }

    // Reset mode for next entry
    this.currentMode = 'selection';
  }

  destroy(): void {
    this.onStop();
    super.destroy();
  }

  // ============================================================
  // Mode Selection
  // ============================================================

  private async buildSelectionScreen(): Promise<void> {
    this.currentMode = 'selection';
    this.selectionContainer = new Container();
    this.gameContainer.addChild(this.selectionContainer);

    // Load and add background image with blur
    const bgTexture = await Assets.load(bigbangBgUrl);
    this.selectionBg = new Sprite(bgTexture);
    this.selectionBg.anchor.set(0.5, 0.35); // Shift up to show more of the sofa

    // Apply blur filter like AceOfShadows
    const blurFilter = new BlurFilter();
    blurFilter.blur = 16;
    blurFilter.quality = 8;
    this.selectionBg.filters = [blurFilter];

    this.selectionContainer.addChild(this.selectionBg);
    this.scaleSelectionBackground();

    // Create mode selection panel
    const panel = new ModeSelectionPanel({
      title: 'Magic Words',
      description:
        'A system that combines text and images like custom emojis. Render a dialogue between characters with data from an API endpoint.',
      buttons: [
        {
          label: '📋 Literal Task',
          backgroundColor: 0x1565c0, // Blue for text/dialogue
          onClick: () => this.startMode('literal'),
        },
        {
          label: '✨ Creative Take',
          backgroundColor: 0x7b1fa2,
          onClick: () => this.startMode('creative'),
        },
      ],
      centerX: SELECTION_PANEL.centerX,
      centerY: SELECTION_PANEL.centerY,
      paddingX: SELECTION_PANEL.paddingX,
      paddingY: SELECTION_PANEL.paddingY,
      titleGap: SELECTION_PANEL.titleGap,
      buttonGap: SELECTION_PANEL.buttonGap,
      buttonWidth: SELECTION_PANEL.buttonWidth,
      buttonHeight: SELECTION_PANEL.buttonHeight,
      radius: SELECTION_PANEL.radius,
      backgroundAlpha: SELECTION_PANEL.backgroundAlpha,
      titleFontSize: SELECTION_PANEL.titleFontSize,
      buttonFontSize: SELECTION_PANEL.buttonFontSize,
      buttonRadius: SELECTION_PANEL.buttonRadius,
    });

    this.selectionContainer.addChild(panel);

    // Set design bounds from panel
    this.setDesignBounds(panel.getDesignBounds());
    this.requestLayout();
  }

  // ============================================================
  // Mode Management
  // ============================================================

  private async startMode(mode: 'literal' | 'creative'): Promise<void> {
    this.currentMode = mode;

    // Remove selection screen and background
    if (this.selectionContainer) {
      this.selectionContainer.destroy({ children: true });
      this.selectionContainer = null;
      this.selectionBg = null;
    }

    // Reset container transform
    this.gameContainer.scale.set(1);
    this.gameContainer.position.set(0);

    // Enable sub-mode navigation
    this.enableSubModeNavigation(() => this.returnToSelection());

    // Create container for mode content
    this.modeContainer = new Container();
    this.gameContainer.addChild(this.modeContainer);

    // Create mode context
    const context = this.createModeContext();

    // Instantiate and start the appropriate mode
    if (mode === 'literal') {
      this.activeMode = new MagicWordsModeLiteral(context);
    } else {
      this.activeMode = new MagicWordsModeCreative(context);
    }

    await this.activeMode.start();
  }

  private returnToSelection(): void {
    // Stop active mode
    if (this.activeMode) {
      this.activeMode.stop();
      this.activeMode = null;
    }

    // Clean up mode container
    if (this.modeContainer) {
      this.modeContainer.destroy({ children: true });
      this.modeContainer = null;
    }

    // Disable sub-mode navigation
    this.disableSubModeNavigation();

    // Clear game container and reset transform
    this.gameContainer.removeChildren();
    this.gameContainer.scale.set(1);
    this.gameContainer.position.set(0);

    // Rebuild selection screen
    this.buildSelectionScreen();
  }

  private createModeContext(): GameModeContext {
    const self = this;

    return {
      container: this.modeContainer!,
      spritesheet: undefined, // MagicWords modes load their own assets
      gameContainer: this.gameContainer,

      getDeviceState: () => self.getDeviceState(),

      requestLayout: () => self.requestLayout(),

      setDesignBounds: bounds => self.setDesignBounds(bounds),

      getScreenSize: () => ({
        width: self.app.width || window.innerWidth,
        height: self.app.height || window.innerHeight,
      }),

      generateTexture: graphics => self.app.pixi.renderer.generateTexture(graphics),
    };
  }
}
