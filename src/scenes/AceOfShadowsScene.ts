import { Container, Spritesheet } from 'pixi.js';
import type { Application } from '../core/Application';
import { BaseGameScene, type DeviceState } from './BaseGameScene';
import type { GameMode, GameModeContext } from '../modes/GameMode';
import { AceOfShadowsModeLiteral, AceOfShadowsModeCreative } from '../modes/aceOfShadows';
import { ModeSelectionPanel } from '../components/ModeSelectionPanel';
import {
  SELECTION_PANEL,
  SCENE_LAYOUT,
} from '../config/aceOfShadowsSettings';

// Spritesheet assets
import spritesheetJson from '../assets/sprites/ultimate-minimalist-card-asset/ace-of-shadows-spritesheet.json';
import spritesheetPng from '../assets/sprites/ultimate-minimalist-card-asset/ace-of-shadows-spritesheet.png';

/** Scene mode */
type SceneMode = 'selection' | 'literal' | 'creative';

/**
 * AceOfShadowsScene
 * 
 * Task 1: Create 144 sprites stacked on top of each other like cards in a deck.
 * Every 1 second, the top card moves to a different stack with a 2-second animation.
 * 
 * This scene acts as a coordinator:
 * - Loads shared resources (spritesheet, background)
 * - Displays mode selection screen
 * - Delegates to mode classes (Literal, Creative)
 * - Forwards lifecycle events to active mode
 */
export class AceOfShadowsScene extends BaseGameScene {
  /** Loaded spritesheet (shared across modes) */
  private spritesheet: Spritesheet | null = null;
  
  /** Current scene mode - tracked for debugging, use getter if needed */
  // @ts-expect-error: Mode is tracked for debugging but not read externally yet
  private _mode: SceneMode = 'selection';
  
  /** Active game mode instance */
  private activeMode: GameMode | null = null;
  
  /** Container for mode content */
  private modeContainer: Container | null = null;
  
  /** Selection screen container */
  private selectionContainer: Container | null = null;

  constructor(app: Application, onBack: () => void) {
    super(app, {
      title: 'Ace of Shadows',
      onBack,
      contentPadding: SCENE_LAYOUT.screenPadding,
      maxScale: SCENE_LAYOUT.maxScale,
    });
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  protected async buildContent(): Promise<void> {
    await this.loadSpritesheetAndBackground();
    this.buildSelectionScreen();
  }

  onResize(): void {
    super.onResize(); // Handles background layout + device state change detection
    
    // Forward resize to active mode
    if (this.activeMode?.onResize) {
      this.activeMode.onResize();
    }
  }

  protected onDeviceStateChange(newState: DeviceState, oldState: DeviceState): void {
    // Forward to active mode
    if (this.activeMode?.onDeviceStateChange) {
      this.activeMode.onDeviceStateChange(newState, oldState);
    }
  }

  onStop(): void {
    super.onStop(); // Clears GSAP timeline in base class
    
    // Stop active mode
    if (this.activeMode) {
      this.activeMode.stop();
      this.activeMode = null;
    }
    
    // Reset mode for next entry
    this._mode = 'selection';
  }

  destroy(): void {
    this.onStop();
    super.destroy();
  }

  // ============================================================
  // Mode Selection
  // ============================================================

  /**
   * Build the mode selection screen using ModeSelectionPanel component
   */
  private buildSelectionScreen(): void {
    this._mode = 'selection';
    this.selectionContainer = new Container();
    this.gameContainer.addChild(this.selectionContainer);

    // Create mode selection panel using config and reusable component
    const panel = new ModeSelectionPanel({
      title: 'Choose Your Experience',
      buttons: [
        {
          label: '📋 Literal Task',
          backgroundColor: 0x2E7D32,
          onClick: () => this.startMode('literal'),
        },
        {
          label: '✨ Creative Take',
          backgroundColor: 0x7B1FA2,
          onClick: () => this.startMode('creative'),
        },
      ],
      // Use centralized config values
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

    // Set design bounds from panel's calculated size
    this.setDesignBounds(panel.getDesignBounds());
    this.requestLayout();
  }

  // ============================================================
  // Mode Management
  // ============================================================

  /**
   * Start the selected mode
   */
  private startMode(mode: 'literal' | 'creative'): void {
    this._mode = mode;

    // Remove selection screen
    if (this.selectionContainer) {
      this.selectionContainer.destroy({ children: true });
      this.selectionContainer = null;
    }

    // Reset container transform before building new mode content
    this.gameContainer.scale.set(1);
    this.gameContainer.position.set(0);

    // Enable sub-mode navigation (hides menu button, shows back button)
    this.enableSubModeNavigation(() => this.returnToSelection());

    // Create container for mode content
    this.modeContainer = new Container();
    this.gameContainer.addChild(this.modeContainer);

    // Create mode context
    const context = this.createModeContext();

    // Instantiate and start the appropriate mode
    if (mode === 'literal') {
      this.activeMode = new AceOfShadowsModeLiteral(context);
    } else {
      this.activeMode = new AceOfShadowsModeCreative(context);
    }
    
    this.activeMode.start();
  }

  /**
   * Return to the selection screen from a sub-mode
   */
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

    // Disable sub-mode navigation (restores menu button)
    this.disableSubModeNavigation();

    // Clear game container and reset transform
    this.gameContainer.removeChildren();
    this.gameContainer.scale.set(1);
    this.gameContainer.position.set(0);

    // Rebuild selection screen
    this.buildSelectionScreen();
  }

  /**
   * Create the context object passed to game modes
   */
  private createModeContext(): GameModeContext {
    const self = this;
    
    return {
      container: this.modeContainer!,
      spritesheet: this.spritesheet!,
      gameContainer: this.gameContainer,
      
      getDeviceState: () => self.getDeviceState(),
      
      requestLayout: () => self.requestLayout(),
      
      setDesignBounds: (bounds) => self.setDesignBounds(bounds),
      
      getScreenSize: () => ({
        width: self.app.width || window.innerWidth,
        height: self.app.height || window.innerHeight,
      }),
      
      generateTexture: (graphics) => self.app.pixi.renderer.generateTexture(graphics),
    };
  }

  // ============================================================
  // Resource Loading
  // ============================================================

  /**
   * Load the spritesheet and set up background
   * Uses base class caching to avoid re-parsing on scene re-entry
   */
  private async loadSpritesheetAndBackground(): Promise<void> {
    // Use base class spritesheet loader with caching
    this.spritesheet = await this.loadSpritesheet(
      spritesheetJson,
      spritesheetPng,
      'ace-of-shadows'
    );
    
    // Set background from spritesheet using base class method
    const bgTexture = this.spritesheet.textures['castle-bg.png'];
    if (bgTexture) {
      this.setBackgroundTexture(bgTexture, {
        blur: 2,
        landscapeYOffset: 0.25, // Show more of castle top in landscape
      });
    }
  }
}
