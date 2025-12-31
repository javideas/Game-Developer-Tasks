import { behaviors, Particle } from '@pixi/particle-emitter';

/**
 * Configuration for the RotationOffsetBehavior
 */
export interface RotationOffsetConfig {
  /** Offset in degrees to add to the particle's rotation */
  offsetDegrees: number;
}

/**
 * Custom behavior that adds a rotation offset after other behaviors have run.
 * 
 * This is needed because moveAcceleration's `rotate: true` sets rotation = atan2(vy, vx),
 * which assumes the sprite's "forward" direction is right (0°). For a flame sprite
 * where "forward" (base/tip) points UP at rotation 0, we need to add 90° offset.
 * 
 * With this offset:
 * - Moving up → rotation = 0° (flame points up)
 * - Moving right → rotation = 90° (flame points right)
 * - Moving down → rotation = 180° (flame points down)
 */
export class RotationOffsetBehavior implements behaviors.IEmitterBehavior {
  static type = 'rotationOffset';
  static editorConfig = null;
  
  /** Run after moveAcceleration (which has order 2) */
  order = 50;
  
  private offsetRadians: number;
  
  constructor(config: RotationOffsetConfig) {
    this.offsetRadians = (config.offsetDegrees * Math.PI) / 180;
  }
  
  initParticles(_first: Particle): void {
    // No initialization needed
  }
  
  updateParticle(particle: Particle, _deltaSec: number): void {
    // Add offset to the rotation set by moveAcceleration
    particle.rotation += this.offsetRadians;
  }
}

