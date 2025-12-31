import { behaviors, Particle } from '@pixi/particle-emitter';

// Re-export types for convenience
export type IEmitterBehavior = behaviors.IEmitterBehavior;

/**
 * Configuration for the FloorCollisionBehavior
 */
export interface FloorCollisionConfig {
  /** Y position of the floor in world coordinates */
  floorY: number;
  /** Callback when a particle lands on the floor */
  onLand: (x: number, y: number, scale: number, rotation: number) => void;
}

// Singleton instance for runtime updates
let activeInstance: FloorCollisionBehavior | null = null;

/**
 * Custom behavior for @pixi/particle-emitter that detects floor collisions.
 * 
 * When a particle's Y position exceeds the configured floorY, it:
 * 1. Calls the onLand callback with the particle's state
 * 2. Kills the particle (sets age to maxLife)
 * 
 * This enables a two-stage particle system:
 * - Stage 1: Emitter handles flight physics
 * - Stage 2: External system (GSAP) handles death animation
 * 
 * Note: Because @pixi/particle-emitter instantiates behaviors from config,
 * we use a singleton pattern to allow runtime updates (e.g., slider changes).
 */
export class FloorCollisionBehavior implements behaviors.IEmitterBehavior {
  static type = 'floorCollision';
  static editorConfig = null;
  
  /** Order determines when this behavior runs (higher = later). Run after movement. */
  order = 100;
  
  private floorY: number;
  private onLand: FloorCollisionConfig['onLand'];
  
  constructor(config: FloorCollisionConfig) {
    this.floorY = config.floorY;
    this.onLand = config.onLand;
    // Store as active instance for runtime updates
    activeInstance = this;
  }
  
  /**
   * Initialize particles - not needed for collision detection
   */
  initParticles(_first: Particle): void {
    // No initialization needed
  }
  
  /**
   * Update each particle - check for floor collision
   */
  updateParticle(particle: Particle, _deltaSec: number): void {
    // Skip already-dead particles
    if (particle.age >= particle.maxLife) return;
    
    // Emitter particles have anchor at center (0.5, 0.5)
    // We need to check if the BOTTOM of the particle has hit the floor
    // Particle visual bottom = particle.y + (height * scale) / 2
    // For simplicity, we estimate using the texture height (700) and scale
    const textureHeight = 700; // From spritesheet
    const halfHeight = (textureHeight * particle.scale.x) / 2;
    const particleBottomY = particle.y + halfHeight;
    
    // Check if particle bottom has hit the floor
    if (particleBottomY >= this.floorY) {
      // Landed sprite uses bottom-center anchor (0.5, 1.0)
      // So sprite.y = floorY puts the bottom at the floor
      this.onLand(
        particle.x,
        this.floorY,
        particle.scale.x,
        particle.rotation
      );
      
      // Kill the emitter particle immediately
      particle.age = particle.maxLife;
    }
  }
  
  /**
   * Update the floor Y position at runtime (for slider control)
   */
  updateFloorY(newFloorY: number): void {
    this.floorY = newFloorY;
  }
  
  /**
   * Get current floor Y position
   */
  getFloorY(): number {
    return this.floorY;
  }
  
  /**
   * Get the active instance for runtime updates
   */
  static getActiveInstance(): FloorCollisionBehavior | null {
    return activeInstance;
  }
  
  /**
   * Clear the active instance (call on cleanup)
   */
  static clearActiveInstance(): void {
    activeInstance = null;
  }
}

