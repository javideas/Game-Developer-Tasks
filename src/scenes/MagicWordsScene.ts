import { Container, Spritesheet } from 'pixi.js';
import type { Application } from '../core/Application';
import { BaseGameScene, type DeviceState } from './BaseGameScene';
import type { GameMode, GameModeContext } from '../modes/GameMode';
import { MagicWordsModeLiteral, MagicWordsModeCreative } from '../modes/magicWords';
import { ModeSelectionPanel } from '../components/ModeSelectionPanel';
import { SELECTION_PANEL } from '../config/magicWordsSettings';
import { SCENE_LAYOUT } from '../config/sharedSettings';

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
  /** Current scene mode (for debugging) */
  // @ts-expect-error: Mode is tracked for debugging but not read externally yet
  private _mode: 'selection' | 'literal' | 'creative' = 'selection';
  
  /** Active game mode instance */
  private activeMode: GameMode | null = null;
  
  /** Container for mode content */
  private modeContainer: Container | null = null;
  
  /** Selection screen container */
  private selectionContainer: Container | null = null;

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
    this.buildSelectionScreen();
  }

  onResize(): void {
    super.onResize();
    
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
    super.onStop();
    
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

  private buildSelectionScreen(): void {
    this._mode = 'selection';
    this.selectionContainer = new Container();
    this.gameContainer.addChild(this.selectionContainer);

    // Create mode selection panel
    const panel = new ModeSelectionPanel({
      title: 'Choose Your Experience',
      buttons: [
        {
          label: '📋 Literal Task',
          backgroundColor: 0x1565C0, // Blue for text/dialogue
          onClick: () => this.startMode('literal'),
        },
        {
          label: '✨ Creative Take',
          backgroundColor: 0x7B1FA2,
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

  private startMode(mode: 'literal' | 'creative'): void {
    this._mode = mode;

    // Remove selection screen
    if (this.selectionContainer) {
      this.selectionContainer.destroy({ children: true });
      this.selectionContainer = null;
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
    
    this.activeMode.start();
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
      spritesheet: null as unknown as Spritesheet, // No spritesheet for this task
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
}
