import { Container, AnimatedSprite, Texture, FederatedPointerEvent } from 'pixi.js';
import gsap from 'gsap';

/**
 * Represents an evolving landed flame/egg sprite
 */
export interface EvolvingSprite {
  sprite: AnimatedSprite;
  level: number;          // 0-2 = evolving, 3 = egg
  clicks: number;         // clicks at current level (3 to evolve)
  shrinkTween: gsap.core.Timeline | null;
  isActive: boolean;
  originalScale: number;
}

/**
 * Configuration for EvolvingLandedManager
 */
export interface EvolvingLandedConfig {
  clicksPerLevel: number;      // clicks needed to evolve (default 3)
  shrinkDuration: number;      // ms to shrink if not clicked
  pauseBeforeShrink: number;   // ms pause before shrinking starts
  pivotOffset: number;         // offset for shrink pivot (matches LandedSpriteManager)
  textureHeight: number;       // height of texture for pivot calculation
  eggYOffset: number;          // Y offset for egg (level 3) positioning
  scaleMultiplier: number;     // Scale multiplier (1.0 - 3.0)
  onEggCreated?: (x: number, y: number, sprite: AnimatedSprite) => void;  // callback when egg is fully formed (includes sprite for flying animation)
}

const DEFAULT_CONFIG: EvolvingLandedConfig = {
  clicksPerLevel: 3,
  shrinkDuration: 3000,  // 3 seconds to shrink (longer than before)
  pauseBeforeShrink: 500,
  pivotOffset: 15,       // 15px shrink pivot offset (matches creative mode default)
  textureHeight: 700,    // Same as FLAME_CONFIG.frameHeight
  eggYOffset: 0,         // No offset by default
  scaleMultiplier: 1.0,  // Default scale (1.0 - 3.0)
};

/**
 * EvolvingLandedManager
 * 
 * Manages landed flame sprites that can evolve into eggs through clicking.
 * 
 * Mechanics:
 * - Level 0: sprite-1 (flames with egg core) - initial particles
 * - Level 1: sprite-2 (more egg-like)
 * - Level 2: sprite-3 (egg with flame aura)
 * - Level 3: sprite-4 (pure golden egg) - stays permanently
 * 
 * Each level requires 3 clicks to evolve.
 * If not clicked, flame shrinks and disappears.
 * Clicking resets the shrink timer.
 */
export class EvolvingLandedManager {
  private pool: EvolvingSprite[] = [];
  private activeCount = 0;
  private readonly container: Container;
  private config: EvolvingLandedConfig;  // Mutable for runtime adjustment
  
  /** Flag to prevent callbacks from accessing destroyed objects */
  private isDisposed = false;
  
  // Texture sets for each level
  private level0Textures: Texture[] = [];  // sprite-1 (flames with egg core)
  private level1Textures: Texture[] = [];  // sprite-2 (more egg-like)
  private level2Textures: Texture[] = [];  // sprite-3 (egg with flame aura)
  private level3Textures: Texture[] = [];  // sprite-4 (pure golden egg)
  
  private readonly maxPoolSize: number;
  private readonly animationSpeed: number;
  
  constructor(
    container: Container,
    level0Textures: Texture[],
    level1Textures: Texture[],
    level2Textures: Texture[],
    level3Textures: Texture[],
    maxPoolSize: number = 6,
    animationSpeed: number = 0.15,
    config: Partial<EvolvingLandedConfig> = {}
  ) {
    this.container = container;
    this.level0Textures = level0Textures;
    this.level1Textures = level1Textures;
    this.level2Textures = level2Textures;
    this.level3Textures = level3Textures;
    this.maxPoolSize = maxPoolSize;
    this.animationSpeed = animationSpeed;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.initPool();
  }
  
  private initPool(): void {
    for (let i = 0; i < this.maxPoolSize; i++) {
      const sprite = new AnimatedSprite(this.level0Textures);
      sprite.anchor.set(0.5, 1.0);  // Bottom-center anchor
      sprite.visible = false;
      sprite.animationSpeed = this.animationSpeed;
      sprite.eventMode = 'static';
      sprite.cursor = 'pointer';
      sprite.play();
      this.container.addChild(sprite);
      
      const evolvingSprite: EvolvingSprite = {
        sprite,
        level: 0,
        clicks: 0,
        shrinkTween: null,
        isActive: false,
        originalScale: 0.2,  // Default, will be set on spawn
      };
      
      // Set up click handler
      sprite.on('pointerdown', (e: FederatedPointerEvent) => {
        e.stopPropagation();
        this.onSpriteClicked(evolvingSprite);
      });
      
      this.pool.push(evolvingSprite);
    }
  }
  
  /**
   * Handle click on a sprite
   */
  private onSpriteClicked(evolvingSprite: EvolvingSprite): void {
    if (!evolvingSprite.isActive) return;
    
    // If already an egg (level 3), clicking does nothing (egg collection logic elsewhere)
    if (evolvingSprite.level >= 3) return;
    
    // Recover scale to full size on click (even if shrinking)
    this.recoverScale(evolvingSprite);
    
    // Increment click counter
    evolvingSprite.clicks++;
    
    // Check if ready to evolve
    if (evolvingSprite.clicks >= this.config.clicksPerLevel) {
      evolvingSprite.clicks = 0;
      evolvingSprite.level++;
      
      // Switch textures based on new level
      this.updateSpriteTextures(evolvingSprite);
      
      // If reached egg level, stop shrinking
      if (evolvingSprite.level >= 3) {
        this.stopShrink(evolvingSprite);
        
        // Notify that egg was created (pass sprite for flying animation)
        if (this.config.onEggCreated) {
          this.config.onEggCreated(evolvingSprite.sprite.x, evolvingSprite.sprite.y, evolvingSprite.sprite);
        }
        return;
      }
    }
    
    // Reset shrink timer (keeps it alive longer)
    this.restartShrinkTimer(evolvingSprite);
  }
  
  /**
   * Recover sprite scale to its original full size
   */
  private recoverScale(evolvingSprite: EvolvingSprite): void {
    // Stop current shrink animation
    this.stopShrink(evolvingSprite);
    
    // Get the original scale (stored when spawned)
    const recoveryScale = evolvingSprite.originalScale;
    
    // Animate scale recovery with a nice bounce
    gsap.to(evolvingSprite.sprite.scale, {
      x: recoveryScale,
      y: recoveryScale,
      duration: 0.2,
      ease: 'back.out(2)',
    });
  }
  
  /**
   * Update sprite textures for current level
   */
  private updateSpriteTextures(evolvingSprite: EvolvingSprite): void {
    const textures = this.getTexturesForLevel(evolvingSprite.level);
    evolvingSprite.sprite.textures = textures;
    evolvingSprite.sprite.play();
    
    // Apply egg Y offset when reaching level 3
    if (evolvingSprite.level >= 3 && this.config.eggYOffset !== 0) {
      evolvingSprite.sprite.y += this.config.eggYOffset;
    }
  }
  
  /**
   * Get textures for a given level
   */
  private getTexturesForLevel(level: number): Texture[] {
    switch (level) {
      case 0: return this.level0Textures;
      case 1: return this.level1Textures;
      case 2: return this.level2Textures;
      case 3: return this.level3Textures;
      default: return this.level3Textures;
    }
  }
  
  /**
   * Stop the shrink animation
   */
  private stopShrink(evolvingSprite: EvolvingSprite): void {
    if (evolvingSprite.shrinkTween) {
      evolvingSprite.shrinkTween.kill();
      evolvingSprite.shrinkTween = null;
    }
  }
  
  /**
   * Restart the shrink timer
   * Uses same approach as LandedSpriteManager - shrinks in place via anchor
   */
  private restartShrinkTimer(evolvingSprite: EvolvingSprite): void {
    this.stopShrink(evolvingSprite);
    
    const currentScale = evolvingSprite.sprite.scale.x;
    const scaleTarget = { value: currentScale };
    
    evolvingSprite.shrinkTween = gsap.timeline()
      .to({}, { duration: this.config.pauseBeforeShrink / 1000 })
      .to(scaleTarget, {
        value: 0,
        duration: this.config.shrinkDuration / 1000,
        ease: 'power2.in',
        onUpdate: () => {
          // Guard: Don't access destroyed objects
          if (this.isDisposed || !evolvingSprite.sprite.transform) return;
          evolvingSprite.sprite.scale.set(scaleTarget.value);
        },
        onComplete: () => {
          // Guard: Don't access destroyed objects
          if (this.isDisposed) return;
          this.releaseSprite(evolvingSprite);
        }
      });
  }
  
  /**
   * Release sprite back to pool
   */
  private releaseSprite(evolvingSprite: EvolvingSprite): void {
    this.stopShrink(evolvingSprite);
    evolvingSprite.isActive = false;
    evolvingSprite.sprite.visible = false;
    evolvingSprite.sprite.scale.set(1);
    evolvingSprite.sprite.anchor.set(0.5, 1.0);  // Reset anchor for reuse
    evolvingSprite.level = 0;
    evolvingSprite.clicks = 0;
    this.activeCount--;
  }
  
  /**
   * Spawn a new landed sprite
   * Uses same pivot calculation as LandedSpriteManager for consistent shrinking
   */
  public spawnLanded(
    x: number,
    y: number,
    scale: number
  ): boolean {
    const evolvingSprite = this.pool.find(s => !s.isActive);
    if (!evolvingSprite) {
      return false;  // Pool exhausted
    }
    
    // Apply scale multiplier (doesn't affect pivot calculation)
    const finalScale = scale * this.config.scaleMultiplier;
    
    // Calculate anchor adjustment and position compensation
    // Same logic as LandedSpriteManager for consistent shrink behavior
    const scaledHeight = this.config.textureHeight * finalScale;
    
    // Convert pivot offset to anchor ratio (0 = bottom, 1 = top)
    // Positive pivotOffset = shrink from higher point
    const anchorOffsetRatio = Math.max(0, Math.min(1, this.config.pivotOffset / scaledHeight));
    const newAnchorY = 1.0 - anchorOffsetRatio;
    
    // Compensate Y position so the visual bottom stays at y
    // With anchor.y = 1.0, bottom is at sprite.y
    // With anchor.y < 1.0, bottom is at sprite.y + (1 - anchor.y) * scaledHeight
    // To keep bottom at y: sprite.y = y - (1 - newAnchorY) * scaledHeight
    const compensatedY = y - (1 - newAnchorY) * scaledHeight;
    
    // Initialize sprite
    evolvingSprite.isActive = true;
    evolvingSprite.level = 0;
    evolvingSprite.clicks = 0;
    evolvingSprite.originalScale = finalScale;  // Store for recovery on click (includes multiplier)
    evolvingSprite.sprite.anchor.set(0.5, newAnchorY);
    evolvingSprite.sprite.x = x;
    evolvingSprite.sprite.y = compensatedY;
    evolvingSprite.sprite.scale.set(finalScale);
    evolvingSprite.sprite.rotation = 0;
    evolvingSprite.sprite.visible = true;
    evolvingSprite.sprite.textures = this.level0Textures;
    evolvingSprite.sprite.play();
    
    this.activeCount++;
    
    // Start shrink timer
    this.restartShrinkTimer(evolvingSprite);
    
    return true;
  }
  
  /**
   * Get active count
   */
  public getActiveCount(): number {
    return this.activeCount;
  }
  
  /**
   * Get max pool size
   */
  public getMaxPoolSize(): number {
    return this.maxPoolSize;
  }
  
  /**
   * Get all active eggs (level 3)
   */
  public getActiveEggs(): EvolvingSprite[] {
    return this.pool.filter(s => s.isActive && s.level >= 3);
  }
  
  /**
   * Remove a specific egg (when collected)
   */
  public removeEgg(evolvingSprite: EvolvingSprite): void {
    this.releaseSprite(evolvingSprite);
  }

  /**
   * Release a sprite by its AnimatedSprite reference (after flying animation)
   * Returns the sprite to the pool and re-adds it to the container
   */
  public releaseBySprite(sprite: AnimatedSprite): void {
    const evolvingSprite = this.pool.find(s => s.sprite === sprite);
    if (evolvingSprite) {
      // Make sure sprite is back in our container
      if (sprite.parent !== this.container) {
        if (sprite.parent) {
          sprite.parent.removeChild(sprite);
        }
        this.container.addChild(sprite);
      }
      this.releaseSprite(evolvingSprite);
    }
  }
  
  /**
   * Set pivot offset for shrinking (adjustable at runtime)
   */
  public setPivotOffset(value: number): void {
    this.config.pivotOffset = value;
    // Note: Affects new spawns, not existing sprites
  }
  
  /**
   * Set Y offset for egg level (level 3) positioning
   */
  public setEggYOffset(value: number): void {
    this.config.eggYOffset = value;
    // Note: Affects new eggs, not existing ones
  }
  
  /**
   * Set scale multiplier (1.0 - 3.0)
   * Affects new spawns, not existing sprites
   */
  public setScale(value: number): void {
    this.config.scaleMultiplier = Math.max(1.0, Math.min(3.0, value));
  }
  
  /**
   * Reset all sprites
   */
  public reset(): void {
    for (const evolvingSprite of this.pool) {
      this.stopShrink(evolvingSprite);
      evolvingSprite.isActive = false;
      evolvingSprite.sprite.visible = false;
      evolvingSprite.sprite.scale.set(1);
      evolvingSprite.level = 0;
      evolvingSprite.clicks = 0;
    }
    this.activeCount = 0;
  }
  
  /**
   * Destroy manager
   */
  public destroy(): void {
    // Mark disposed FIRST to prevent callbacks from accessing destroyed objects
    this.isDisposed = true;
    
    this.reset();
    for (const evolvingSprite of this.pool) {
      // Kill any pending GSAP animations before destroying
      gsap.killTweensOf(evolvingSprite.sprite);
      gsap.killTweensOf(evolvingSprite.sprite.scale);
      evolvingSprite.sprite.off('pointerdown');
      evolvingSprite.sprite.stop();
      evolvingSprite.sprite.destroy();
    }
    this.pool = [];
  }
}

