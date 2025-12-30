import { Container, Graphics } from 'pixi.js';
import type { DeviceState } from '../scenes/BaseGameScene';
import { SCENE_LAYOUT } from '../config/sharedSettings';

/**
 * Configuration for GameSettingsPanel
 */
export interface GameSettingsPanelConfig {
  /** Horizontal padding inside panel */
  paddingX: number;
  /** Vertical padding inside panel */
  paddingY: number;
  /** Corner radius */
  radius: number;
  /** Background opacity (0-1) */
  backgroundAlpha: number;
  /** Background color */
  backgroundColor: number;
  /** Design X position (center of panel) */
  designX: number;
  /** Design Y position (center of panel) */
  designY: number;
}

/**
 * Context provided to settings panel for responsive behavior
 */
export interface SettingsPanelContext {
  /** Get current device state */
  getDeviceState(): DeviceState;
  /** Get screen dimensions */
  getScreenSize(): { width: number; height: number };
  /** Get game container for scale reference */
  getGameContainerScale(): number;
  /** Get game container Y position */
  getGameContainerY(): number;
  /** Get bottom Y of game content (for panel positioning) */
  getContentBottomY(): number;
}

/**
 * GameSettingsPanel - Abstract base class for in-game settings UI
 * 
 * Provides:
 * - Auto-sizing background that wraps content
 * - Panel is centered at designX/designY by default
 * - Responsive scaling based on available screen space
 * - Device state change handling (phone/tablet/desktop)
 * - Consistent styling across all game tasks
 * 
 * Subclasses implement:
 * - buildControls(): Create sliders, toggles, buttons
 * - rebuildForDeviceState(): Rebuild for different screen sizes
 * 
 * Subclasses can override:
 * - scaleToFit(): Custom positioning logic (e.g., below content vs fixed position)
 */
export abstract class GameSettingsPanel extends Container {
  protected config: GameSettingsPanelConfig;
  protected context: SettingsPanelContext;
  
  /** Background panel graphic */
  protected panel: Graphics;
  
  /** Content container (holds all controls) */
  protected content: Container;
  
  /** Current device state */
  protected currentDeviceState: DeviceState;
  
  constructor(config: GameSettingsPanelConfig, context: SettingsPanelContext) {
    super();
    
    this.config = config;
    this.context = context;
    this.currentDeviceState = context.getDeviceState();
    
    // Create background panel
    this.panel = new Graphics();
    this.addChild(this.panel);
    
    // Create content container
    this.content = new Container();
    this.addChild(this.content);
    
    // Build controls (implemented by subclass)
    this.buildControls();
    
    // Update background to fit content and center the panel
    this.updatePanelBackground();
    this.centerPanelAtOrigin();
    
    // Position at design coordinates (panel is now centered at origin)
    this.x = config.designX;
    this.y = config.designY;
    
    // Initial scaling (subclasses may override scaleToFit)
    requestAnimationFrame(() => this.scaleToFit());
  }
  
  /**
   * Build all UI controls (sliders, toggles, buttons).
   * Called once during construction.
   * Must add controls to this.content container.
   */
  protected abstract buildControls(): void;
  
  /**
   * Rebuild controls for a new device state.
   * Called when device state changes (e.g., phone to desktop).
   */
  protected abstract rebuildForDeviceState(state: DeviceState): void;
  
  /**
   * Update the background panel to fit content
   */
  protected updatePanelBackground(): void {
    const bounds = this.content.getLocalBounds();
    const { paddingX, paddingY, radius, backgroundColor, backgroundAlpha } = this.config;
    
    this.panel.clear();
    this.panel.beginFill(backgroundColor, backgroundAlpha);
    this.panel.drawRoundedRect(
      bounds.x - paddingX,
      bounds.y - paddingY,
      bounds.width + paddingX * 2,
      bounds.height + paddingY * 2,
      radius
    );
    this.panel.endFill();
  }
  
  /**
   * Center the panel at origin (0,0) so that setting x/y positions the center.
   * This offsets both content and background so the visual center is at (0,0).
   */
  protected centerPanelAtOrigin(): void {
    // Make centering idempotent (we can call this after rebuilds without drifting)
    this.panel.position.set(0, 0);
    this.content.position.set(0, 0);
    
    const bounds = this.getLocalBounds();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    // Offset children so center is at origin
    this.panel.x -= centerX;
    this.panel.y -= centerY;
    this.content.x -= centerX;
    this.content.y -= centerY;
  }
  
  /**
   * Default: Scale panel to fit available screen space below game content.
   * Subclasses can override for different positioning (e.g., fixed top position).
   */
  public scaleToFit(): void {
    const { width: screenW, height: screenH } = this.context.getScreenSize();
    
    // Determine padding based on screen size
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;
    const useCompactPadding = Math.min(cssWidth, cssHeight) < SCENE_LAYOUT.largePaddingBreakpoint;
    const minPadding = useCompactPadding ? SCENE_LAYOUT.screenPaddingPhone : SCENE_LAYOUT.screenPadding;
    
    // Reset scale to measure actual size
    this.scale.set(1);
    
    // Get panel bounds in design coordinates
    const panelBounds = this.getLocalBounds();
    const panelDesignWidth = panelBounds.width;
    const panelDesignHeight = panelBounds.height;
    
    // Get container scale
    const containerScale = this.context.getGameContainerScale();
    
    // Current panel size in screen coordinates
    const currentPanelScreenWidth = panelDesignWidth * containerScale;
    const currentPanelScreenHeight = panelDesignHeight * containerScale;
    
    // Calculate available space below game content
    const contentBottomDesign = this.context.getContentBottomY();
    const contentBottomScreen = this.context.getGameContainerY() + contentBottomDesign * containerScale;
    const cardMargin = 20;
    
    const availableTop = contentBottomScreen + cardMargin;
    const availableBottom = screenH - minPadding.bottom;
    const availableHeight = Math.max(0, availableBottom - availableTop);
    
    const availableWidth = screenW - minPadding.left - minPadding.right;
    
    // Calculate scale to fit
    const scaleX = availableWidth / currentPanelScreenWidth;
    const scaleY = availableHeight / currentPanelScreenHeight;
    
    const maxScale = 1.8;
    const minScale = 1.0;
    const additionalScale = Math.max(minScale, Math.min(scaleX, scaleY, maxScale));
    
    this.scale.set(additionalScale);
    
    // Center vertically in available space
    const availableCenterY = (availableTop + availableBottom) / 2;
    const targetDesignY = (availableCenterY - this.context.getGameContainerY()) / containerScale;
    this.y = targetDesignY;
    
    // Keep horizontal centering from config
    this.x = this.config.designX;
  }
  
  /**
   * Handle window resize
   */
  public onResize(): void {
    this.scaleToFit();
  }
  
  /**
   * Handle device state change
   */
  public onDeviceStateChange(newState: DeviceState): void {
    if (newState === this.currentDeviceState) return;
    
    this.currentDeviceState = newState;
    
    // Clear and rebuild controls
    this.content.removeChildren();
    this.rebuildForDeviceState(newState);
    this.updatePanelBackground();
    this.centerPanelAtOrigin();
    this.scaleToFit();
  }
  
  /**
   * Clean up resources
   */
  public destroy(options?: { children?: boolean }): void {
    super.destroy(options ?? { children: true });
  }
}
