import {
  AnimatedSprite,
  Assets,
  Container,
  Graphics,
  Spritesheet,
  Text,
  TextStyle,
  Texture,
  Ticker,
} from 'pixi.js';

import flameSheetJson from '../../assets/sprites/flame-hq/flames-hq-spritesheet.json';
import flameSheetPng from '../../assets/sprites/flame-hq/flames-hq.png';
import type {
  GameSettingsPanelConfig,
  SettingsPanelContext,
} from '../../components/GameSettingsPanel';
import {
  FLAME_CONFIG,
  DESIGN_BOUNDS,
  SPRITE_BUDGET,
  PARTICLE_CONFIG,
} from '../../config/phoenixFlameSettings';
import { killTweensRecursive } from '../../core';
import type { GameMode, GameModeContext } from '../GameMode';

import { FlyingParticlePool, type FlyingParticle } from './FlyingParticlePool';
import { LandedSpriteManager } from './LandedSpriteManager';
import { PhoenixFlameSettingsPanel } from './PhoenixFlameSettingsPanel';

// Import spritesheet assets (HQ version)

/**
 * PhoenixFlameModeLiteral
 *
 * Senior implementation of Task 3:
 * - Animated flame using spritesheet
 * - Max 10 sprites on screen (1 main + 6 flying + 3 landed)
 * - Custom FlyingParticlePool with object pooling (no create/destroy during gameplay)
 * - TrajectorySlotManager for spacing (no physics calculation per spawn)
 * - GSAP handles death animation via LandedSpriteManager
 * - Settings panel for real-time adjustments
 *
 * Architecture:
 * - Stage 1: FlyingParticlePool handles spawn → flight physics → floor detection
 * - Stage 2: LandedSpriteManager handles landing → pause → shrink → recycle
 *
 * Key principle: Validate BEFORE create. Never spawn then kill.
 */
export class PhoenixFlameModeLiteral implements GameMode {
  /** Static cache for flame spritesheet (prevents re-parsing warnings) */
  private static spritesheetCache: Spritesheet | null = null;

  protected readonly context: GameModeContext;
  protected content: Container | null = null;
  protected flameSprite: AnimatedSprite | null = null;
  protected spritesheet: Spritesheet | null = null;
  protected settingsPanel: PhoenixFlameSettingsPanel | null = null;

  // Particle system (senior approach: object pooling)
  protected flyingPool: FlyingParticlePool | null = null;
  protected particleContainer: Container | null = null;
  protected landedContainer: Container | null = null;
  protected landedManager: LandedSpriteManager | null = null;
  protected flameTextures: Texture[] = [];

  // Spawn control
  protected spawnTimer = 0;
  protected spawnInterval: number = 1000 / PARTICLE_CONFIG.spawnRate; // ms between spawns

  // Threshold tracking for variety
  protected angleThreshold: number = PARTICLE_CONFIG.angleThreshold;
  protected speedThreshold: number = PARTICLE_CONFIG.speedThreshold;
  protected lastSpawnAngle = -90;
  protected lastSpawnSpeed: number = PARTICLE_CONFIG.speed;

  // Settings (controlled by sliders)
  protected currentScale: number = FLAME_CONFIG.scale;
  protected particlePeakScale: number = PARTICLE_CONFIG.peakScale;
  protected heightMultiplier: number = PARTICLE_CONFIG.heightMultiplier;
  protected angleSpread: number = PARTICLE_CONFIG.angleSpread;
  protected floorOffset: number = PARTICLE_CONFIG.floorExtraOffset;
  protected flameYOffset: number = PARTICLE_CONFIG.flameYOffset;
  protected landingPause: number = PARTICLE_CONFIG.landingPause;
  protected shrinkOffset: number = PARTICLE_CONFIG.shrinkOffset;
  protected gravity: number = PARTICLE_CONFIG.gravity;
  protected bigFlamePivotOffset: number = PARTICLE_CONFIG.bigFlamePivotOffset;
  protected spawnHeightRange: number = PARTICLE_CONFIG.spawnHeightRange;

  // Debug: pivot marker
  protected pivotMarker: Graphics | null = null;
  protected showPivotMarker = false;

  // Design dimensions for layout
  protected readonly designWidth = DESIGN_BOUNDS.width;
  protected readonly designHeight = DESIGN_BOUNDS.height;

  constructor(context: GameModeContext) {
    this.context = context;
  }

  // ============================================================
  // Public methods for subclass access
  // ============================================================

  public async loadSpritesheetPublic(): Promise<void> {
    await this.loadSpritesheet();
  }

  public createParticleContainersPublic(): void {
    if (!this.content) return;
    this.particleContainer = new Container();
    this.landedContainer = new Container();
    this.content.addChild(this.particleContainer);
    this.content.addChild(this.landedContainer);
  }

  public createParticleSystemPublic(): void {
    this.createLandedManager();
    this.createFlyingPool();
  }

  public startGameLoopPublic(): void {
    this.startGameLoop();
  }

  // ============================================================
  // Override hooks for subclasses
  // ============================================================

  /** Override to provide custom spawn position */
  protected getSpawnPosition(): { x: number; y: number } {
    if (!this.flameSprite) {
      return { x: this.designWidth / 2, y: this.designHeight / 2 };
    }

    const x = this.flameSprite.x;
    const pivotY = this.flameSprite.y;
    const randomOffset = Math.random() * this.spawnHeightRange;
    const y = pivotY - randomOffset;

    return { x, y };
  }

  /** Override to provide custom floor Y position */
  protected getFlameBaseY(): number {
    if (!this.flameSprite) return this.designHeight * 0.75;

    const textureHeight = FLAME_CONFIG.frameHeight;
    const scaledHeight = textureHeight * this.currentScale;
    const anchorY = this.flameSprite.anchor.y;

    // Base is below anchor by (1 - anchorY) * scaledHeight
    return this.flameSprite.y + (1 - anchorY) * scaledHeight;
  }

  /** Override to react when particle is spawned */
  protected onParticleSpawned(): void {
    // Default: no action (can be overridden by subclasses)
  }

  /** Override to check if main character exists */
  protected hasMainCharacter(): boolean {
    return this.flameSprite !== null;
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

    // Initialize landed sprite manager
    this.createLandedManager();

    // Initialize flying particle pool
    this.createFlyingPool();

    // Start the game loop
    this.startGameLoop();

    // Create settings panel
    this.createSettingsPanel();

    // Start sprite counter update loop (updates panel's counter display)
    this.startCounterUpdate();
  }

  stop(): void {
    // Stop game loop
    this.stopGameLoop();

    // Kill all GSAP animations recursively BEFORE destroying
    if (this.content) {
      killTweensRecursive(this.content);
    }

    // Destroy flying pool
    if (this.flyingPool) {
      this.flyingPool.destroy();
      this.flyingPool = null;
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

    // Clean up content
    if (this.content) {
      this.content.destroy({ children: true });
      this.content = null;
    }

    // Don't destroy cached spritesheet - just clear reference
    // The static cache keeps it alive for scene re-entry
    this.spritesheet = null;

    this.flameTextures = [];
  }

  onResize(): void {
    this.settingsPanel?.onResize();
  }

  // ============================================================
  // Loading
  // ============================================================

  private showLoading(): void {
    if (!this.content) return;

    const loadingText = new Text(
      '🔥 Igniting...',
      new TextStyle({
        fontFamily: 'Georgia, serif',
        fontSize: 32,
        fill: '#ff6600',
        align: 'center',
      })
    );
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
    // Use cached spritesheet if available (prevents "already had an entry" warnings)
    // Check static class cache first, then Assets cache for HMR resilience
    if (PhoenixFlameModeLiteral.spritesheetCache) {
      this.spritesheet = PhoenixFlameModeLiteral.spritesheetCache;
    } else if (Assets.cache.has('phoenix-flame-spritesheet')) {
      // Recover from HMR - spritesheet was parsed before but static cache was reset
      this.spritesheet = Assets.cache.get('phoenix-flame-spritesheet') as Spritesheet;
      PhoenixFlameModeLiteral.spritesheetCache = this.spritesheet;
    } else {
      const texture = await Assets.load(flameSheetPng);
      this.spritesheet = new Spritesheet(texture, flameSheetJson);
      await this.spritesheet.parse();
      PhoenixFlameModeLiteral.spritesheetCache = this.spritesheet;
      // Also store in Assets cache for HMR resilience
      Assets.cache.set('phoenix-flame-spritesheet', this.spritesheet);
    }

    // Cache flame textures for pools
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

    if (import.meta.env.DEV) console.log('[PhoenixFlame] Main flame created (1 sprite)');
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
    this.pivotMarker.lineStyle(thickness, 0xff671d, 1);
    this.pivotMarker.moveTo(-size, 0);
    this.pivotMarker.lineTo(size, 0);

    // Vertical line (orange)
    this.pivotMarker.moveTo(0, -size);
    this.pivotMarker.lineTo(0, size);

    // Circle outline
    this.pivotMarker.lineStyle(2, 0xffffff, 0.8);
    this.pivotMarker.drawCircle(0, 0, size * 0.7);

    // Position the marker at the actual pivot (anchor) position
    this.pivotMarker.x = this.flameSprite.x;
    this.pivotMarker.y = pivotY;
  }

  // ============================================================
  // Particle System (Senior Approach: Pools + Slots)
  // ============================================================

  private createFlyingPool(): void {
    if (!this.particleContainer || this.flameTextures.length === 0) return;

    this.flyingPool = new FlyingParticlePool(
      this.particleContainer,
      this.flameTextures,
      PARTICLE_CONFIG.maxFlyingParticles,
      PARTICLE_CONFIG.animationSpeed
    );

    if (import.meta.env.DEV)
      console.log(
        `[PhoenixFlame] FlyingPool created (max ${PARTICLE_CONFIG.maxFlyingParticles} flying sprites)`
      );
  }

  private createLandedManager(): void {
    if (!this.landedContainer || this.flameTextures.length === 0) return;

    this.landedManager = new LandedSpriteManager(
      this.landedContainer,
      this.flameTextures,
      PARTICLE_CONFIG.maxLandedSprites,
      PARTICLE_CONFIG.animationSpeed
    );

    if (import.meta.env.DEV)
      console.log(
        `[PhoenixFlame] LandedManager created (max ${PARTICLE_CONFIG.maxLandedSprites} landed sprites)`
      );
  }

  // ============================================================
  // Game Loop (Physics + Spawning)
  // ============================================================

  private startGameLoop(): void {
    let lastTime = performance.now();

    const gameLoop = () => {
      const now = performance.now();
      const deltaMs = now - lastTime;
      const deltaSec = deltaMs / 1000;
      lastTime = now;

      // Update flying particles physics
      this.updateFlyingParticles(deltaSec);

      // Check for floor collisions
      this.checkFloorCollisions();

      // Try to spawn new particles
      this.updateSpawning(deltaMs);
    };

    // Add to shared ticker
    Ticker.shared.add(gameLoop);

    // Store for cleanup
    (this as { _gameLoop?: () => void })._gameLoop = gameLoop;
  }

  private stopGameLoop(): void {
    const loop = (this as { _gameLoop?: () => void })._gameLoop;
    if (loop) {
      Ticker.shared.remove(loop);
      delete (this as { _gameLoop?: () => void })._gameLoop;
    }
  }

  private updateFlyingParticles(deltaSec: number): void {
    if (!this.flyingPool) return;

    // Update physics for all flying particles
    this.flyingPool.update(deltaSec, this.gravity, 270);

    // Update scale animation (grow from initial to peak)
    for (const particle of this.flyingPool.getActive()) {
      const lifeProgress = particle.age / particle.maxAge;

      // Scale: small → peak quickly (at 5% of lifetime)
      const initialScale = PARTICLE_CONFIG.initialScale * this.currentScale;
      const peakScale = this.particlePeakScale * this.currentScale;

      let currentScale: number;
      if (lifeProgress < 0.05) {
        // Grow to peak in first 5%
        const growProgress = lifeProgress / 0.05;
        currentScale = initialScale + (peakScale - initialScale) * growProgress;
      } else {
        // Hold at peak
        currentScale = peakScale;
      }

      particle.sprite.scale.set(currentScale);
    }
  }

  private checkFloorCollisions(): void {
    if (!this.flyingPool) return;

    const floorY = this.getFlameBaseY() + this.floorOffset;

    // Check each active particle for floor collision
    for (const particle of this.flyingPool.getActive()) {
      // Check if particle bottom has hit the floor
      const textureHeight = FLAME_CONFIG.frameHeight;
      const halfHeight = (textureHeight * particle.sprite.scale.x) / 2;
      const particleBottomY = particle.sprite.y + halfHeight;

      if (particleBottomY >= floorY) {
        this.onParticleLand(particle, floorY);
      }
    }
  }

  private updateSpawning(deltaMs: number): void {
    this.spawnTimer += deltaMs;

    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer -= this.spawnInterval;
      this.trySpawnParticle();
    }
  }

  /**
   * Try to spawn a new particle.
   * Senior approach: Check budget BEFORE creating particle.
   */
  private trySpawnParticle(): boolean {
    if (!this.flyingPool || !this.hasMainCharacter()) return false;

    // 1. Check sprite budget
    const flyingCount = this.flyingPool.getActiveCount();
    const landedCount = this.landedManager?.getActiveCount() ?? 0;
    const totalSprites = 1 + flyingCount + landedCount; // 1 = main flame

    if (totalSprites >= SPRITE_BUDGET.max) {
      return false; // Budget exhausted - don't spawn
    }

    // 2. Generate angle (with optional threshold for variety)
    const halfSpread = this.angleSpread / 2;
    const minAngle = -90 - halfSpread;
    const maxAngle = -90 + halfSpread;
    const angle = this.generateAngleWithThreshold(minAngle, maxAngle);

    // 3. Generate speed (with optional threshold for variety)
    const baseSpeed = PARTICLE_CONFIG.speed * this.heightMultiplier;
    const speedVariation = PARTICLE_CONFIG.speedVariation;
    const speed = this.generateSpeedWithThreshold(baseSpeed, speedVariation);

    // 4. Store for next spawn's threshold check
    this.lastSpawnAngle = angle;
    this.lastSpawnSpeed = speed;

    // 5. Acquire particle from pool
    const particle = this.flyingPool.acquire();
    if (!particle) {
      return false; // Pool exhausted
    }

    // 6. Configure particle
    const spawnPos = this.getSpawnPosition();
    const angleRad = (angle * Math.PI) / 180;

    particle.sprite.x = spawnPos.x;
    particle.sprite.y = spawnPos.y;
    particle.velocityX = Math.cos(angleRad) * speed;
    particle.velocityY = Math.sin(angleRad) * speed;
    particle.slotId = -1;
    particle.maxAge = PARTICLE_CONFIG.lifetime;
    particle.sprite.scale.set(PARTICLE_CONFIG.initialScale * this.currentScale);

    // 7. Notify subclass of spawn (e.g., for animations)
    this.onParticleSpawned();

    return true;
  }

  /**
   * Generate angle respecting threshold (minimum difference from last angle)
   */
  private generateAngleWithThreshold(minAngle: number, maxAngle: number): number {
    const range = maxAngle - minAngle;

    if (this.angleThreshold <= 0 || range <= 0) {
      // No threshold - fully random
      return minAngle + Math.random() * range;
    }

    // Generate angle that's at least threshold degrees away from last
    const attempts = 10; // Max attempts to find valid angle
    for (let i = 0; i < attempts; i++) {
      const angle = minAngle + Math.random() * range;
      const diff = Math.abs(angle - this.lastSpawnAngle);

      if (diff >= this.angleThreshold) {
        return angle;
      }
    }

    // Fallback: force opposite side of last angle
    const centerAngle = (minAngle + maxAngle) / 2;
    if (this.lastSpawnAngle > centerAngle) {
      // Last was right, go left
      return minAngle + Math.random() * (range / 2);
    } else {
      // Last was left, go right
      return centerAngle + Math.random() * (range / 2);
    }
  }

  /**
   * Generate speed respecting threshold (minimum difference from last speed)
   */
  private generateSpeedWithThreshold(baseSpeed: number, variation: number): number {
    const minSpeed = baseSpeed - variation;
    const maxSpeed = baseSpeed + variation;

    if (this.speedThreshold <= 0) {
      // No threshold - fully random
      return minSpeed + Math.random() * (maxSpeed - minSpeed);
    }

    // Generate speed that's at least threshold away from last
    const attempts = 10; // Max attempts to find valid speed
    for (let i = 0; i < attempts; i++) {
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      const diff = Math.abs(speed - this.lastSpawnSpeed);

      if (diff >= this.speedThreshold) {
        return speed;
      }
    }

    // Fallback: force opposite side of last speed
    if (this.lastSpawnSpeed > baseSpeed) {
      // Last was fast, go slow
      return minSpeed + Math.random() * variation * 0.5;
    } else {
      // Last was slow, go fast
      return baseSpeed + Math.random() * variation * 0.5;
    }
  }

  /**
   * Callback when a particle lands on the floor.
   * Transfers from flying pool to landed manager.
   * Override in subclasses for custom landing behavior.
   */
  protected onParticleLand(particle: FlyingParticle, floorY: number): void {
    if (!this.landedManager || !this.flyingPool) return;

    const x = particle.sprite.x;
    const scale = particle.sprite.scale.x;

    // Release flying particle back to pool
    this.flyingPool.release(particle);

    // Check sprite budget before spawning landed sprite
    const flyingCount = this.flyingPool.getActiveCount();
    const landedCount = this.landedManager.getActiveCount();
    const totalSprites = 1 + flyingCount + landedCount;

    if (totalSprites >= SPRITE_BUDGET.max) {
      return; // Budget exhausted
    }

    // Spawn landed sprite with pause and shrink animation
    this.landedManager.spawnLanded(
      x,
      floorY,
      scale,
      this.landingPause * 1000, // Convert to ms
      PARTICLE_CONFIG.shrinkDuration,
      this.shrinkOffset
    );
  }

  // ============================================================
  // Sprite Counter
  // ============================================================

  private startCounterUpdate(): void {
    const updateCounter = () => {
      if (!this.settingsPanel) return;

      const flying = this.flyingPool?.getActiveCount() ?? 0;
      const landed = this.landedManager?.getActiveCount() ?? 0;
      const total = 1 + flying + landed; // 1 = main flame

      this.settingsPanel.updateSpriteCounter(total, flying, landed);

      requestAnimationFrame(updateCounter);
    };

    requestAnimationFrame(updateCounter);
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
      // These are ignored by PhoenixFlameSettingsPanel.scaleToFit (it anchors to screen bounds),
      // but GameSettingsPanel requires them.
      designX: 0,
      designY: 0,
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
      spawnHeightRange: this.spawnHeightRange,
      gravity: this.gravity,
      angleThreshold: this.angleThreshold,
      speedThreshold: this.speedThreshold,
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
      onSpawnHeightRangeChange: (value: number) => this.updateSpawnHeightRange(value),
      onGravityChange: (value: number) => this.updateGravity(value),
      onAngleThresholdChange: (value: number) => this.updateAngleThreshold(value),
      onSpeedThresholdChange: (value: number) => this.updateSpeedThreshold(value),
    };

    this.settingsPanel = new PhoenixFlameSettingsPanel(config, panelContext, settings, callbacks);

    // Attach the panel to screen bounds (not inside the scaled/rotated game content).
    // We mount it to the scene root container: rotationWrapper.parent == BaseGameScene.container.
    const sceneRoot = this.context.gameContainer.parent?.parent;
    (sceneRoot ?? this.content).addChild(this.settingsPanel);
  }

  // ============================================================
  // Settings Callbacks
  // ============================================================

  private updateFlameScale(scale: number): void {
    this.currentScale = scale;
    if (this.flameSprite) {
      this.flameSprite.scale.set(scale);
      this.updateFlamePosition();
      this.updatePivotMarker();
    }
  }

  private updateParticlePeakScale(scale: number): void {
    this.particlePeakScale = scale;
    // Affects new and existing particles via scale animation
  }

  private updateHeightMultiplier(value: number): void {
    this.heightMultiplier = value;
    // Affects new particles via speed
  }

  private updateAngleSpread(value: number): void {
    this.angleSpread = value;
    // Affects new particles
  }

  private updateFloorOffset(value: number): void {
    this.floorOffset = value;
    // Floor collision is checked dynamically in checkFloorCollisions()
  }

  private updateFlameYOffset(value: number): void {
    this.flameYOffset = value;
    this.updateFlamePosition();
    this.updatePivotMarker();
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
  }

  private updateShowPivotMarker(show: boolean): void {
    this.showPivotMarker = show;
    if (this.pivotMarker) {
      this.pivotMarker.visible = show;
    }
  }

  private updateSpawnHeightRange(value: number): void {
    this.spawnHeightRange = value;
    // Affects new particles via getSpawnPosition()
  }

  private updateGravity(value: number): void {
    this.gravity = value;
    // Affects physics update immediately
  }

  private updateAngleThreshold(value: number): void {
    this.angleThreshold = value;
    // Affects new particles
  }

  private updateSpeedThreshold(value: number): void {
    this.speedThreshold = value;
    // Affects new particles
  }

  private updateFlameAnchor(): void {
    if (!this.flameSprite) return;

    // Convert pixel offset to anchor ratio
    // Offset is in local flame pixels (texture-relative)
    // anchor.y: 0 = top, 1 = bottom
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
    const pivotScreenY = this.designHeight * 0.75 + this.flameYOffset;

    // sprite.y = where the anchor point appears on screen
    this.flameSprite.y = pivotScreenY;
  }

  /**
   * Get the Y position of the flame's base (bottom) in screen coordinates
   */
}
