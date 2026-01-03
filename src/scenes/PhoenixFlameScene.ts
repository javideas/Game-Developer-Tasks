import { Assets, Container, Sprite } from 'pixi.js';
import type { Application } from '../core/Application';
import { BaseGameScene, type DeviceState } from './BaseGameScene';
import type { GameMode, GameModeContext } from '../modes/GameMode';
import { PhoenixFlameModeLiteral, PhoenixFlameModeCreative } from '../modes/phoenixFlame';
import { ModeSelectionPanel } from '../components/ModeSelectionPanel';
import { SELECTION_PANEL } from '../config/phoenixFlameSettings';
import { SCENE_LAYOUT } from '../config/sharedSettings';

// Background image
import phoenixFlameBg from '../assets/sprites/phoenix-flame/phoenix-flame-bg.jpeg';

/**
 * PhoenixFlameScene
 * 
 * Task 3: Make a particle-effect demo showing a great fire effect.
 * Keep the number of images at max 10 sprites on screen at the same time.
 * 
 * This scene acts as a coordinator:
 * - Displays mode selection screen
 * - Delegates to mode classes (Literal, Creative)
 * - Forwards lifecycle events to active mode
 */
export class PhoenixFlameScene extends BaseGameScene {
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
  
  /** Background sprite */
  private backgroundSprite: Sprite | null = null;

  constructor(app: Application, onBack: () => void) {
    super(app, {
      title: 'Phoenix Flame',
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
    // Load and add background
    await this.loadBackground();
    
    this.buildSelectionScreen();
  }
  
  private async loadBackground(): Promise<void> {
    const texture = await Assets.load(phoenixFlameBg);
    this.backgroundSprite = new Sprite(texture);
    
    // Add to container at index 0 (behind everything)
    this.container.addChildAt(this.backgroundSprite, 0);
    
    // Size will be set in onResize
    this.updateBackgroundSize();
  }
  
  private updateBackgroundSize(): void {
    if (!this.backgroundSprite) return;
    
    const screenW = this.app.width || window.innerWidth;
    const screenH = this.app.height || window.innerHeight;
    
    // Cover the entire screen while maintaining aspect ratio
    const texture = this.backgroundSprite.texture;
    const bgAspect = texture.width / texture.height;
    const screenAspect = screenW / screenH;
    
    if (screenAspect > bgAspect) {
      // Screen is wider - fit to width
      this.backgroundSprite.width = screenW;
      this.backgroundSprite.height = screenW / bgAspect;
    } else {
      // Screen is taller - fit to height
      this.backgroundSprite.height = screenH;
      this.backgroundSprite.width = screenH * bgAspect;
    }
    
    // Center the background
    this.backgroundSprite.x = (screenW - this.backgroundSprite.width) / 2;
    this.backgroundSprite.y = (screenH - this.backgroundSprite.height) / 2;
  }

  onResize(): void {
    super.onResize();
    
    // Update background size
    this.updateBackgroundSize();
    
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
    this.currentMode = 'selection';
  }

  destroy(): void {
    this.onStop();
    
    // Clean up background
    if (this.backgroundSprite) {
      this.backgroundSprite.destroy();
      this.backgroundSprite = null;
    }
    
    super.destroy();
  }

  // ============================================================
  // Mode Selection
  // ============================================================

  private buildSelectionScreen(): void {
    this.currentMode = 'selection';
    this.selectionContainer = new Container();
    this.gameContainer.addChild(this.selectionContainer);

    // Create mode selection panel
    const panel = new ModeSelectionPanel({
      title: 'Phoenix Flame',
      description: 'A particle-effect demo showing a great fire effect. Keep the number of images at max 10 sprites on screen at the same time.',
      buttons: [
        {
          label: '🔥 Literal Task',
          backgroundColor: 0xE65100, // Deep orange for fire
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
    this.currentMode = mode;

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
      this.activeMode = new PhoenixFlameModeLiteral(context);
    } else {
      this.activeMode = new PhoenixFlameModeCreative(context);
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
      spritesheet: undefined, // Phoenix modes load their own spritesheets
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
