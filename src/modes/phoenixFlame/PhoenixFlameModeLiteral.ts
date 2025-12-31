import { AnimatedSprite, Assets, Container, Graphics, Spritesheet, Text, TextStyle, Texture } from 'pixi.js';
import { Emitter } from '@pixi/particle-emitter';
import type { GameMode, GameModeContext } from '../GameMode';
import { FLAME_CONFIG, DESIGN_BOUNDS, SPRITE_BUDGET, PARTICLE_CONFIG } from '../../config/phoenixFlameSettings';
import { PhoenixFlameSettingsPanel } from './PhoenixFlameSettingsPanel';
import type { GameSettingsPanelConfig, SettingsPanelContext } from '../../components/GameSettingsPanel';
import { FloorCollisionBehavior } from './behaviors/FloorCollisionBehavior';
import { RotationOffsetBehavior } from './behaviors/RotationOffsetBehavior';
import { LandedSpriteManager } from './LandedSpriteManager';
import { createFlameEmitterConfig, type EmitterSettings } from './emitterConfig';

// Register custom behaviors with the emitter system
Emitter.registerBehavior(FloorCollisionBehavior as unknown as Parameters<typeof Emitter.registerBehavior>[0]);
Emitter.registerBehavior(RotationOffsetBehavior as unknown as Parameters<typeof Emitter.registerBehavior>[0]);

// Import spritesheet assets (HQ version)
import flameSheetJson from '../../assets/sprites/flame-hq/flames-hq-spritesheet.json';
import flameSheetPng from '../../assets/sprites/flame-hq/flames-hq.png';

/**
 * PhoenixFlameModeLiteral
 * 
 * Literal implementation of Task 3:
 * - Animated flame using spritesheet
 * - Max 10 sprites on screen (1 main + 6 flying + 3 landed)
 * - Particles fly using @pixi/particle-emitter
 * - GSAP handles death animation via LandedSpriteManager
 * - Settings panel for real-time adjustments
 * 
 * Architecture:
 * - Stage 1: Emitter handles spawn → flight physics → floor detection
 * - Stage 2: LandedSpriteManager handles landing → pause → shrink → recycle
 */
export class PhoenixFlameModeLiteral implements GameMode {
  private readonly context: GameModeContext;
  private content: Container | null = null;
  private flameSprite: AnimatedSprite | null = null;
  private spritesheet: Spritesheet | null = null;
  private settingsPanel: PhoenixFlameSettingsPanel | null = null;
  
  // Emitter system
  private emitter: Emitter | null = null;
  private particleContainer: Container | null = null;
  private landedContainer: Container | null = null;
  private landedManager: LandedSpriteManager | null = null;
  private flameTextures: Texture[] = [];
  
  // Settings (controlled by sliders)
  private currentScale: number = FLAME_CONFIG.scale;
  private particlePeakScale: number = PARTICLE_CONFIG.peakScale;
  private heightMultiplier: number = PARTICLE_CONFIG.heightMultiplier;
  private angleSpread: number = PARTICLE_CONFIG.angleSpread;
  private floorOffset: number = PARTICLE_CONFIG.floorExtraOffset;
  private flameYOffset: number = PARTICLE_CONFIG.flameYOffset;
  private landingPause: number = PARTICLE_CONFIG.landingPause;
  private shrinkOffset: number = PARTICLE_CONFIG.shrinkOffset;
  private bigFlamePivotOffset: number = PARTICLE_CONFIG.bigFlamePivotOffset;
  
  // Debug: pivot marker
  private pivotMarker: Graphics | null = null;
  private showPivotMarker: boolean = false;
  
  // Sprite counter display
  private particleCounterText: Text | null = null;

  // Design dimensions for layout
  private readonly designWidth = DESIGN_BOUNDS.width;
  private readonly designHeight = DESIGN_BOUNDS.height;

  constructor(context: GameModeContext) {
    this.context = context;
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  async start(): Promise<void> {
    // Set design bounds for responsive scaling
    this.context.setDesignBounds({
      x: 0,
      y: 0,
      width: this.designWidth,
      height: this.designHeight,
    });
    this.context.requestLayout();

    // Create content container
    this.content = new Container();
    this.context.container.addChild(this.content);

    // Show loading state
    this.showLoading();

    // Load spritesheet
    await this.loadSpritesheet();

    // Hide loading
    this.hideLoading();
    
    // Create main flame
    this.createFlame();
    
    // Create particle containers (in front of main flame)
    this.particleContainer = new Container();
    this.landedContainer = new Container();
    this.content.addChild(this.particleContainer);
    this.content.addChild(this.landedContainer);
    
    // Initialize emitter system
    this.createEmitter();
    
    // Initialize landed sprite manager
    this.createLandedManager();
    
    // Create settings panel
    this.createSettingsPanel();
    
    // Create sprite counter display
    this.createParticleCounter();
  }

  stop(): void {
    // Stop and destroy emitter
    if (this.emitter) {
      this.emitter.emit = false;
      this.emitter.destroy();
      this.emitter = null;
    }
    
    // Destroy landed manager
    if (this.landedManager) {
      this.landedManager.destroy();
      this.landedManager = null;
    }
    
    // Stop animation
    if (this.flameSprite) {
      this.flameSprite.stop();
      this.flameSprite.destroy();
      this.flameSprite = null;
    }

    // Clean up containers
    if (this.particleContainer) {
      this.particleContainer.destroy({ children: true });
      this.particleContainer = null;
    }
    
    if (this.landedContainer) {
      this.landedContainer.destroy({ children: true });
      this.landedContainer = null;
    }

    // Clean up settings panel
    if (this.settingsPanel) {
      this.settingsPanel.destroy({ children: true });
      this.settingsPanel = null;
    }

    // Clean up particle counter
    if (this.particleCounterText) {
      this.particleCounterText.destroy();
      this.particleCounterText = null;
    }

    // Clean up content
    if (this.content) {
      this.content.destroy({ children: true });
      this.content = null;
    }

    // Unload spritesheet
    if (this.spritesheet) {
      this.spritesheet.destroy(true);
      this.spritesheet = null;
    }
    
    this.flameTextures = [];
    
    // Clear the singleton behavior instance
    FloorCollisionBehavior.clearActiveInstance();
  }

  onResize(): void {
    this.settingsPanel?.onResize();
  }

  // ============================================================
  // Loading
  // ============================================================

  private showLoading(): void {
    if (!this.content) return;

    const loadingText = new Text('🔥 Igniting...', new TextStyle({
      fontFamily: 'Georgia, serif',
      fontSize: 32,
      fill: '#ff6600',
      align: 'center',
    }));
    loadingText.name = 'loading';
    loadingText.anchor.set(0.5);
    loadingText.x = this.designWidth / 2;
    loadingText.y = this.designHeight / 2;
    this.content.addChild(loadingText);
  }

  private hideLoading(): void {
    if (!this.content) return;
    const loading = this.content.getChildByName('loading');
    if (loading) {
      this.content.removeChild(loading);
      loading.destroy();
    }
  }

  // ============================================================
  // Spritesheet Loading
  // ============================================================

  private async loadSpritesheet(): Promise<void> {
    const texture = await Assets.load(flameSheetPng);
    this.spritesheet = new Spritesheet(texture, flameSheetJson);
    await this.spritesheet.parse();
    
    // Cache flame textures for emitter and landed manager
    const frames = this.spritesheet.animations['flame'];
    if (frames) {
      this.flameTextures = frames;
    }
  }

  // ============================================================
  // Flame Creation
  // ============================================================

  private createFlame(): void {
    if (!this.content || !this.spritesheet) return;

    const frames = this.spritesheet.animations['flame'];
    if (!frames || frames.length === 0) {
      console.error('[PhoenixFlame] No flame animation found in spritesheet');
      return;
    }

    // Create animated sprite
    this.flameSprite = new AnimatedSprite(frames);
    this.flameSprite.animationSpeed = FLAME_CONFIG.animationSpeed;
    this.flameSprite.scale.set(this.currentScale);
    
    // Center on screen horizontally
    this.flameSprite.x = this.designWidth / 2;
    
    // Set anchor from bigFlamePivotOffset (same as runtime slider behavior)
    this.updateFlameAnchor();

    // Start animation
    this.flameSprite.play();
    this.content.addChild(this.flameSprite);
    
    // Create pivot marker (for debugging)
    this.createPivotMarker();
    
    console.log('[PhoenixFlame] Main flame created (1 sprite)');
  }

  /**
   * Create the pivot marker for debugging
   */
  private createPivotMarker(): void {
    if (!this.content) return;
    
    this.pivotMarker = new Graphics();
    this.pivotMarker.visible = this.showPivotMarker;
    this.content.addChild(this.pivotMarker);
    
    this.updatePivotMarker();
  }

  /**
   * Update pivot marker position and appearance
   * Shows where the anchor/pivot point is (which is sprite.y)
   */
  private updatePivotMarker(): void {
    if (!this.pivotMarker || !this.flameSprite) return;
    
    // Clear and redraw
    this.pivotMarker.clear();
    
    // The pivot IS at sprite.y (that's what the anchor means)
    const pivotY = this.flameSprite.y;
    
    // Draw crosshair
    const size = 20;
    const thickness = 3;
    
    // Horizontal line (orange)
    this.pivotMarker.lineStyle(thickness, 0xFF671D, 1);
    this.pivotMarker.moveTo(-size, 0);
    this.pivotMarker.lineTo(size, 0);
    
    // Vertical line (orange)
    this.pivotMarker.moveTo(0, -size);
    this.pivotMarker.lineTo(0, size);
    
    // Circle outline
    this.pivotMarker.lineStyle(2, 0xFFFFFF, 0.8);
    this.pivotMarker.drawCircle(0, 0, size * 0.7);
    
    // Position the marker at the actual pivot (anchor) position
    this.pivotMarker.x = this.flameSprite.x;
    this.pivotMarker.y = pivotY;
  }

  // ============================================================
  // Emitter System
  // ============================================================

  private createEmitter(): void {
    if (!this.particleContainer || !this.flameSprite || this.flameTextures.length === 0) return;

    // Calculate spawn area based on flame dimensions
    const flameWidth = FLAME_CONFIG.frameWidth * this.currentScale;
    const flameHeight = FLAME_CONFIG.frameHeight * this.currentScale;
    
    // Spawn rectangle centered on flame, in the middle portion
    const spawnRect = {
      x: -flameWidth * 0.3,
      y: -flameHeight * 0.6,
      w: flameWidth * 0.6,
      h: flameHeight * 0.4,
    };

    // Create emitter settings
    const settings: EmitterSettings = {
      spawnRect,
      initialScale: PARTICLE_CONFIG.initialScale * this.currentScale,
      peakScale: this.particlePeakScale * this.currentScale,
      speed: PARTICLE_CONFIG.speed * this.heightMultiplier,
      speedVariation: PARTICLE_CONFIG.speedVariation,
      gravity: PARTICLE_CONFIG.gravity,
      angleSpread: this.angleSpread,
      lifetime: PARTICLE_CONFIG.lifetime,
      maxParticles: PARTICLE_CONFIG.maxFlyingParticles,
      frequency: PARTICLE_CONFIG.spawnRate,
      animationSpeed: PARTICLE_CONFIG.animationSpeed,
    };

    // Create emitter config with floor collision
    // Floor is relative to flame BASE (not pivot)
    const floorY = this.getFlameBaseY() + this.floorOffset;
    const config = createFlameEmitterConfig(this.flameTextures, {
      ...settings,
      floorCollision: {
        floorY,
        onLand: (x, y, scale) => this.onParticleLand(x, y, scale),
      },
    });
    
    // Create the emitter
    this.emitter = new Emitter(this.particleContainer, config);
    
    // Position emitter at flame center
    this.updateEmitterPosition();
    
    console.log(`[PhoenixFlame] Emitter created (max ${PARTICLE_CONFIG.maxFlyingParticles} flying particles)`);
  }

  private createLandedManager(): void {
    if (!this.landedContainer || this.flameTextures.length === 0) return;

    this.landedManager = new LandedSpriteManager(
      this.landedContainer,
      this.flameTextures,
      PARTICLE_CONFIG.maxLandedSprites,
      PARTICLE_CONFIG.animationSpeed
    );
    
    console.log(`[PhoenixFlame] LandedManager created (max ${PARTICLE_CONFIG.maxLandedSprites} landed sprites)`);
  }

  /**
   * Callback when a particle lands on the floor.
   * Creates a landed sprite that will pause then shrink.
   */
  private onParticleLand(x: number, y: number, scale: number): void {
    if (!this.landedManager) return;
    
    // Check sprite budget before spawning landed sprite
    const totalSprites = this.getTotalSpriteCount();
    if (totalSprites >= SPRITE_BUDGET.max) {
      // Budget exhausted, skip this landing
      return;
    }
    
    // Spawn landed sprite with pause and shrink animation
    // The pivotOffset adjusts where shrinking happens without moving the landing position
    this.landedManager.spawnLanded(
      x,
      y, // Keep floor position unchanged
      scale,
      this.landingPause * 1000, // Convert to ms
      PARTICLE_CONFIG.shrinkDuration,
      this.shrinkOffset // Adjusts shrink pivot without moving landing position
    );
  }

  // ============================================================
  // Sprite Counter
  // ============================================================

  private createParticleCounter(): void {
    if (!this.content) return;
    
    const style = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 18,
      fontWeight: 'bold',
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 3,
    });
    
    this.particleCounterText = new Text('Sprites: 1/10', style);
    this.particleCounterText.anchor.set(0, 0);
    this.particleCounterText.x = 20;
    this.particleCounterText.y = 20;
    this.content.addChild(this.particleCounterText);
    
    // Update counter periodically
    this.startCounterUpdate();
  }

  private startCounterUpdate(): void {
    const updateCounter = () => {
      if (!this.particleCounterText) return;
      
      const total = this.getTotalSpriteCount();
      const flying = this.emitter?.particleCount ?? 0;
      const landed = this.landedManager?.getActiveCount() ?? 0;
      
      // Color code based on usage
      const color = total >= 10 ? 0xff4444 : total >= 8 ? 0xffaa00 : 0x44ff44;
      this.particleCounterText.style.fill = color;
      this.particleCounterText.text = `Sprites: ${total}/10 (${flying} flying, ${landed} landed)`;
      
      requestAnimationFrame(updateCounter);
    };
    
    requestAnimationFrame(updateCounter);
  }

  private getTotalSpriteCount(): number {
    const mainFlame = 1;
    const flying = this.emitter?.particleCount ?? 0;
    const landed = this.landedManager?.getActiveCount() ?? 0;
    return mainFlame + flying + landed;
  }

  // ============================================================
  // Settings Panel
  // ============================================================

  private createSettingsPanel(): void {
    if (!this.content) return;

    const config: GameSettingsPanelConfig = {
      paddingX: 30,
      paddingY: 20,
      radius: 12,
      backgroundAlpha: 0.7,
      backgroundColor: 0x1a1a1a,
      designX: this.designWidth / 2,
      designY: this.designHeight - 60,
    };

    const panelContext: SettingsPanelContext = {
      getDeviceState: () => this.context.getDeviceState(),
      getScreenSize: () => this.context.getScreenSize(),
      getGameContainerScale: () => this.context.gameContainer.scale.x,
      getGameContainerY: () => this.context.gameContainer.y,
      getContentBottomY: () => this.designHeight,
    };

    const settings = {
      scale: this.currentScale,
      particleMaxScale: this.particlePeakScale,
      height: this.heightMultiplier,
      spread: this.angleSpread,
      floorOffset: this.floorOffset,
      flameYOffset: this.flameYOffset,
      landingPause: this.landingPause,
      shrinkOffset: this.shrinkOffset,
      bigFlamePivotOffset: this.bigFlamePivotOffset,
      showPivotMarker: this.showPivotMarker,
    };

    const callbacks = {
      onScaleChange: (value: number) => this.updateFlameScale(value),
      onParticleMaxScaleChange: (value: number) => this.updateParticlePeakScale(value),
      onHeightChange: (value: number) => this.updateHeightMultiplier(value),
      onSpreadChange: (value: number) => this.updateAngleSpread(value),
      onFloorOffsetChange: (value: number) => this.updateFloorOffset(value),
      onFlameYOffsetChange: (value: number) => this.updateFlameYOffset(value),
      onLandingPauseChange: (value: number) => this.updateLandingPause(value),
      onShrinkOffsetChange: (value: number) => this.updateShrinkOffset(value),
      onBigFlamePivotOffsetChange: (value: number) => this.updateBigFlamePivotOffset(value),
      onShowPivotMarkerChange: (value: boolean) => this.updateShowPivotMarker(value),
    };

    this.settingsPanel = new PhoenixFlameSettingsPanel(
      config,
      panelContext,
      settings,
      callbacks
    );

    this.content.addChild(this.settingsPanel);
  }

  // ============================================================
  // Settings Callbacks
  // ============================================================

  private updateFlameScale(scale: number): void {
    this.currentScale = scale;
    if (this.flameSprite) {
      this.flameSprite.scale.set(scale);
      this.updateFlamePosition();
      this.updateEmitterPosition();
      this.updatePivotMarker();
      
      // Update floor Y since flame base position changes with scale
      const behavior = FloorCollisionBehavior.getActiveInstance();
      if (behavior) {
        const newFloorY = this.getFlameBaseY() + this.floorOffset;
        behavior.updateFloorY(newFloorY);
      }
    }
  }

  private updateParticlePeakScale(scale: number): void {
    this.particlePeakScale = scale;
    // Note: Emitter config would need to be updated for new particles
    // Current particles continue with their existing scale behavior
  }

  private updateHeightMultiplier(value: number): void {
    this.heightMultiplier = value;
    // Note: Affects new particles via emitter speed
  }

  private updateAngleSpread(value: number): void {
    this.angleSpread = value;
    // Note: Affects new particles via emitter rotation behavior
  }

  private updateFloorOffset(value: number): void {
    this.floorOffset = value;
    // Update floor collision behavior via singleton
    const behavior = FloorCollisionBehavior.getActiveInstance();
    if (behavior) {
      const newFloorY = this.getFlameBaseY() + value;
      behavior.updateFloorY(newFloorY);
    }
  }

  private updateFlameYOffset(value: number): void {
    this.flameYOffset = value;
    this.updateFlamePosition();
    this.updateEmitterPosition();
    this.updatePivotMarker();
    
    // Update floor Y when flame position changes via singleton
    const behavior = FloorCollisionBehavior.getActiveInstance();
    if (behavior) {
      const newFloorY = this.getFlameBaseY() + this.floorOffset;
      behavior.updateFloorY(newFloorY);
    }
  }

  private updateLandingPause(value: number): void {
    this.landingPause = value;
    // Affects new landed sprites
  }

  private updateShrinkOffset(value: number): void {
    this.shrinkOffset = value;
    // Affects new landed sprites' shrink pivot position
  }

  private updateBigFlamePivotOffset(value: number): void {
    this.bigFlamePivotOffset = value;
    this.updateFlameAnchor();
    this.updatePivotMarker();
    this.updateEmitterPosition();
    
    // Update floor Y since flame base position changes with anchor
    const behavior = FloorCollisionBehavior.getActiveInstance();
    if (behavior) {
      const newFloorY = this.getFlameBaseY() + this.floorOffset;
      behavior.updateFloorY(newFloorY);
    }
  }

  private updateShowPivotMarker(show: boolean): void {
    this.showPivotMarker = show;
    if (this.pivotMarker) {
      this.pivotMarker.visible = show;
    }
  }

  private updateFlameAnchor(): void {
    if (!this.flameSprite) return;
    
    // Convert pixel offset to anchor ratio
    // Offset is in local flame pixels (texture-relative)
    // anchor.y: 0 = top, 1 = bottom
    // Pivot at 233px from base (bottom) on a 700px texture:
    //   = 233/700 = 0.333 from bottom
    //   = anchor.y of 1.0 - 0.333 = 0.667
    const textureHeight = FLAME_CONFIG.frameHeight;
    const offsetRatio = this.bigFlamePivotOffset / textureHeight;
    const newAnchorY = Math.max(0, Math.min(1, 1.0 - offsetRatio));
    
    // Update anchor - this IS the scaling pivot
    this.flameSprite.anchor.set(0.5, newAnchorY);
    
    // Update position (pivot point stays at same screen location)
    this.updateFlamePosition();
  }

  private updateFlamePosition(): void {
    if (!this.flameSprite) return;
    
    // The PIVOT POINT should be at this screen position
    // No compensation - the anchor IS the pivot, sprite.y IS where the pivot appears
    const pivotScreenY = this.designHeight * 0.75 + this.flameYOffset;
    
    // sprite.y = where the anchor point appears on screen
    this.flameSprite.y = pivotScreenY;
  }

  /**
   * Get the Y position of the flame's base (bottom) in screen coordinates
   */
  private getFlameBaseY(): number {
    if (!this.flameSprite) return this.designHeight * 0.75;
    
    const textureHeight = FLAME_CONFIG.frameHeight;
    const scaledHeight = textureHeight * this.currentScale;
    const anchorY = this.flameSprite.anchor.y;
    
    // Base is below anchor by (1 - anchorY) * scaledHeight
    return this.flameSprite.y + (1 - anchorY) * scaledHeight;
  }

  private updateEmitterPosition(): void {
    if (!this.emitter || !this.flameSprite) return;
    
    // Calculate center of flame in screen coords
    // The anchor is at sprite.y, so we need to find the visual center
    const textureHeight = FLAME_CONFIG.frameHeight;
    const scaledHeight = textureHeight * this.currentScale;
    const anchorY = this.flameSprite.anchor.y;
    
    // Distance from anchor to center = (0.5 - anchorY) * scaledHeight
    // Positive if anchor is below center, negative if above
    const anchorToCenterOffset = (0.5 - anchorY) * scaledHeight;
    const flameCenterY = this.flameSprite.y + anchorToCenterOffset;
    
    this.emitter.updateOwnerPos(this.flameSprite.x, flameCenterY);
  }
}
