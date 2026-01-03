import gsap from 'gsap';
import { Container, AnimatedSprite, Texture } from 'pixi.js';

/**
 * Manages a pool of sprites for the "landed" state of particles.
 *
 * When a particle lands on the floor (detected by FloorCollisionBehavior),
 * this manager:
 * 1. Activates a pooled sprite at the landing position
 * 2. Uses GSAP to animate: pause → shrink → hide
 * 3. Returns the sprite to the pool when complete
 *
 * This separates the death animation from the emitter lifecycle,
 * avoiding execution order bugs and providing smooth GSAP-controlled animations.
 */
export class LandedSpriteManager {
  private pool: AnimatedSprite[] = [];
  private activeCount = 0;
  private readonly container: Container;
  private readonly textures: Texture[];
  private readonly maxPoolSize: number;
  private readonly animationSpeed: number;

  /** Flag to prevent callbacks from accessing destroyed objects */
  private isDisposed = false;

  constructor(container: Container, textures: Texture[], maxPoolSize = 4, animationSpeed = 0.15) {
    this.container = container;
    this.textures = textures;
    this.maxPoolSize = maxPoolSize;
    this.animationSpeed = animationSpeed;
    this.initPool();
  }

  /**
   * Initialize the sprite pool
   */
  private initPool(): void {
    for (let i = 0; i < this.maxPoolSize; i++) {
      const sprite = new AnimatedSprite(this.textures);
      // Use bottom-center anchor (0.5, 1.0) so scaling happens from the base
      // The sprite will shrink upward toward its base (the floor)
      sprite.anchor.set(0.5, 1.0);
      sprite.visible = false;
      sprite.animationSpeed = this.animationSpeed;
      sprite.play();
      this.container.addChild(sprite);
      this.pool.push(sprite);
    }
  }

  /**
   * Spawn a landed sprite at the given position
   *
   * @param x - X position of landing
   * @param y - Y position (floor level)
   * @param scale - Current scale of the particle when it landed
   * @param pauseDuration - Time to wait before shrinking (ms)
   * @param shrinkDuration - Time to shrink to 0 (ms)
   * @param pivotOffset - Offset in pixels to adjust the shrink pivot (positive = higher)
   * @param onComplete - Callback when shrink animation completes
   * @returns true if sprite was spawned, false if pool exhausted
   */
  public spawnLanded(
    x: number,
    y: number,
    scale: number,
    pauseDuration: number,
    shrinkDuration: number,
    pivotOffset = 0,
    onComplete?: () => void
  ): boolean {
    // Find an available sprite in the pool
    const sprite = this.pool.find(s => !s.visible);
    if (!sprite) {
      // Pool exhausted - skip this landing (graceful degradation)
      return false;
    }

    // Spacing is enforced at spawn time via zone-based reservation in LandingSpacingBehavior.
    // No need to check spacing here - if the particle landed, its zone was clear.

    // Calculate anchor adjustment and position compensation
    // The sprite shrinks from its anchor point. To change where it shrinks from
    // without changing the visual position, we adjust anchor and compensate position.
    const textureHeight = 700; // From spritesheet
    const scaledHeight = textureHeight * scale;

    // Convert pivot offset to anchor ratio (0 = bottom, 1 = top)
    // Positive pivotOffset = shrink from higher point
    const anchorOffsetRatio = Math.max(0, Math.min(1, pivotOffset / scaledHeight));
    const newAnchorY = 1.0 - anchorOffsetRatio;

    // Compensate Y position so the visual bottom stays at y
    // With anchor.y = 1.0, bottom is at sprite.y
    // With anchor.y < 1.0, bottom is at sprite.y + (1 - anchor.y) * scaledHeight
    // To keep bottom at y: sprite.y = y - (1 - newAnchorY) * scaledHeight
    const compensatedY = y - (1 - newAnchorY) * scaledHeight;

    // Position and configure the sprite
    sprite.x = x;
    sprite.y = compensatedY;
    sprite.anchor.set(0.5, newAnchorY);
    sprite.scale.set(scale);
    sprite.rotation = 0; // Upright for clean shrink animation
    sprite.visible = true;
    this.activeCount++;

    // Store reference for GSAP to properly tween
    const scaleTarget = { value: scale };

    // GSAP timeline: pause → shrink → hide
    // We tween a proxy object and apply to sprite.scale each update
    // This ensures PixiJS's ObservablePoint is properly updated
    gsap
      .timeline()
      .to({}, { duration: pauseDuration / 1000 }) // Pause phase
      .to(scaleTarget, {
        value: 0,
        duration: shrinkDuration / 1000,
        ease: 'power2.in',
        onUpdate: () => {
          // Guard: Don't access destroyed objects
          if (this.isDisposed || !sprite.transform) return;
          sprite.scale.set(scaleTarget.value);
        },
        onComplete: () => {
          // Guard: Don't access destroyed objects
          if (this.isDisposed || !sprite.transform) return;
          sprite.visible = false;
          sprite.scale.set(1); // Reset for reuse
          sprite.anchor.set(0.5, 1.0); // Reset anchor for reuse
          this.activeCount--;
          // Call completion callback (e.g., to release section)
          onComplete?.();
        },
      });

    return true;
  }

  /**
   * Get the number of currently active (visible) landed sprites
   */
  public getActiveCount(): number {
    return this.activeCount;
  }

  /**
   * Get X positions of currently visible landed sprites (world-space).
   * Used to enforce landing spacing for new particles.
   */
  public getActiveXs(): number[] {
    return this.pool.filter(s => s.visible).map(s => s.x);
  }

  /**
   * Get the maximum pool size
   */
  public getMaxPoolSize(): number {
    return this.maxPoolSize;
  }

  /**
   * Kill all active GSAP tweens and reset the pool
   */
  public reset(): void {
    // Kill all GSAP tweens on pool sprites
    for (const sprite of this.pool) {
      gsap.killTweensOf(sprite);
      gsap.killTweensOf(sprite.scale);
      if (sprite.transform) {
        sprite.visible = false;
        sprite.scale.set(1);
      }
    }
    this.activeCount = 0;
  }

  /**
   * Clean up all resources
   */
  public destroy(): void {
    // Mark disposed FIRST to prevent callbacks from accessing destroyed objects
    this.isDisposed = true;

    this.reset();
    for (const sprite of this.pool) {
      gsap.killTweensOf(sprite);
      sprite.stop();
      sprite.destroy();
    }
    this.pool = [];
  }
}
