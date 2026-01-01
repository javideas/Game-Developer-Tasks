import { Container, AnimatedSprite, Texture } from 'pixi.js';

/**
 * Represents a flying particle with physics state.
 */
export interface FlyingParticle {
  sprite: AnimatedSprite;
  velocityX: number;
  velocityY: number;
  slotId: number;      // Which trajectory slot this particle uses (-1 if spacing disabled)
  age: number;
  maxAge: number;
  isActive: boolean;
}

/**
 * FlyingParticlePool
 * 
 * Object pool for flying particles.
 * Senior approach: Pre-allocate sprites, reuse them without create/destroy during gameplay.
 * 
 * Benefits:
 * - No garbage collection pressure during gameplay
 * - Consistent memory usage
 * - Fast acquire/release (no allocation)
 */
export class FlyingParticlePool {
  private pool: FlyingParticle[] = [];
  private readonly container: Container;
  private readonly textures: Texture[];
  private readonly maxPoolSize: number;
  private readonly animationSpeed: number;
  
  constructor(
    container: Container,
    textures: Texture[],
    maxPoolSize: number,
    animationSpeed: number
  ) {
    this.container = container;
    this.textures = textures;
    this.maxPoolSize = maxPoolSize;
    this.animationSpeed = animationSpeed;
    this.initPool();
  }
  
  private initPool(): void {
    for (let i = 0; i < this.maxPoolSize; i++) {
      const sprite = new AnimatedSprite(this.textures);
      sprite.anchor.set(0.5, 0.5);
      sprite.visible = false;
      sprite.animationSpeed = this.animationSpeed;
      sprite.play();
      this.container.addChild(sprite);
      
      this.pool.push({
        sprite,
        velocityX: 0,
        velocityY: 0,
        slotId: -1,
        age: 0,
        maxAge: 0,
        isActive: false,
      });
    }
  }
  
  /**
   * Acquire a particle from the pool.
   * Returns null if pool is exhausted.
   */
  acquire(): FlyingParticle | null {
    const particle = this.pool.find(p => !p.isActive);
    if (particle) {
      particle.isActive = true;
      particle.age = 0;
      particle.slotId = -1;
      particle.sprite.visible = true;
    }
    return particle ?? null;
  }
  
  /**
   * Release a particle back to the pool.
   */
  release(particle: FlyingParticle): void {
    particle.isActive = false;
    particle.sprite.visible = false;
    particle.slotId = -1;
    particle.velocityX = 0;
    particle.velocityY = 0;
  }
  
  /**
   * Update all active particles (physics).
   * 
   * @param deltaSec - Time delta in seconds
   * @param gravity - Gravity acceleration in pixels/second²
   * @param rotationOffset - Offset to add to rotation (degrees)
   */
  update(deltaSec: number, gravity: number, rotationOffset: number = 270): void {
    const rotationOffsetRad = (rotationOffset * Math.PI) / 180;
    
    for (const particle of this.pool) {
      if (!particle.isActive) continue;
      
      // Update velocity (gravity)
      particle.velocityY += gravity * deltaSec;
      
      // Update position
      particle.sprite.x += particle.velocityX * deltaSec;
      particle.sprite.y += particle.velocityY * deltaSec;
      
      // Update rotation to face movement direction + offset
      particle.sprite.rotation = Math.atan2(particle.velocityY, particle.velocityX) + rotationOffsetRad;
      
      // Update age
      particle.age += deltaSec;
    }
  }
  
  /**
   * Get all active particles.
   */
  getActive(): FlyingParticle[] {
    return this.pool.filter(p => p.isActive);
  }
  
  /**
   * Get count of active particles.
   */
  getActiveCount(): number {
    return this.pool.filter(p => p.isActive).length;
  }
  
  /**
   * Get max pool size.
   */
  getMaxPoolSize(): number {
    return this.maxPoolSize;
  }
  
  /**
   * Reset all particles to inactive.
   */
  reset(): void {
    for (const particle of this.pool) {
      particle.isActive = false;
      particle.sprite.visible = false;
      particle.slotId = -1;
    }
  }
  
  /**
   * Destroy all sprites and clean up.
   */
  destroy(): void {
    for (const particle of this.pool) {
      particle.sprite.stop();
      particle.sprite.destroy();
    }
    this.pool = [];
  }
}

