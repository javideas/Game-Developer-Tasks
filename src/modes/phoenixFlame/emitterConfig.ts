import type { EmitterConfigV3 } from '@pixi/particle-emitter';
import type { Texture } from 'pixi.js';
import type { FloorCollisionConfig } from './behaviors/FloorCollisionBehavior';

/**
 * Settings for creating the flame particle emitter configuration
 */
export interface EmitterSettings {
  /** Spawn rectangle relative to emitter position */
  spawnRect: { x: number; y: number; w: number; h: number };
  /** Initial scale of particles */
  initialScale: number;
  /** Peak scale (reached at 10% of lifetime) */
  peakScale: number;
  /** Base speed in pixels per second */
  speed: number;
  /** Speed variation (+/- this amount) */
  speedVariation: number;
  /** Gravity acceleration in pixels per second squared */
  gravity: number;
  /** Angle spread in degrees (centered on -90 = upward) */
  angleSpread: number;
  /** Particle lifetime in seconds */
  lifetime: number;
  /** Maximum particles in the emitter */
  maxParticles: number;
  /** Spawn frequency (particles per second) */
  frequency: number;
  /** Animation speed for particle sprites */
  animationSpeed: number;
  /** Floor collision settings (optional) */
  floorCollision?: FloorCollisionConfig;
}

/**
 * Creates a PixiJS particle emitter configuration for flame particles.
 * 
 * The emitter handles:
 * - Spawning particles from a rectangular area (flame surface)
 * - Scale interpolation (small → peak within 10% → hold)
 * - Movement with gravity acceleration
 * - Rotation to follow velocity direction
 * - Animated sprite frames
 * 
 * @param textures - Array of textures for animated particles
 * @param settings - Configuration settings
 * @returns EmitterConfigV3 for @pixi/particle-emitter
 */
export function createFlameEmitterConfig(
  textures: Texture[],
  settings: EmitterSettings
): EmitterConfigV3 {
  const {
    spawnRect,
    initialScale,
    peakScale,
    speed,
    speedVariation,
    gravity,
    angleSpread,
    lifetime,
    maxParticles,
    frequency,
    animationSpeed,
  } = settings;

  // Calculate angle range (centered on -90 degrees = upward)
  const minAngle = -90 - angleSpread / 2;
  const maxAngle = -90 + angleSpread / 2;

  // Build behaviors array
  const behaviors: EmitterConfigV3['behaviors'] = [
    // Spawn from rectangular area (flame surface)
    {
      type: 'spawnShape',
      config: {
        type: 'rect',
        data: spawnRect,
      },
    },

    // Use animated flame textures
    {
      type: 'animatedSingle',
      config: {
        anim: {
          textures,
          loop: true,
          framerate: animationSpeed * 60, // Convert to frames per second
        },
      },
    },

    // Scale: small → peak quickly (10%) → hold at peak
    // The emitter maintains peak scale; floor shrinking is handled by LandedSpriteManager
    {
      type: 'scale',
      config: {
        scale: {
          list: [
            { value: initialScale, time: 0 },
            { value: peakScale, time: 0.1 }, // Peak at 10%
            { value: peakScale, time: 1 }, // Hold at peak
          ],
        },
      },
    },

    // Movement with gravity (upward initial, falls down)
    {
      type: 'moveAcceleration',
      config: {
        accel: { x: 0, y: gravity },
        minStart: speed - speedVariation,
        maxStart: speed + speedVariation,
        rotate: true, // Rotate to face direction of movement
      },
    },

    // Random initial rotation (direction of launch)
    {
      type: 'rotationStatic',
      config: {
        min: minAngle,
        max: maxAngle,
      },
    },
    
    // Add 270° (90 + 180) offset to flip the flame so base points in direction of movement
    // Original was 90°, user wanted 180° more, so 270° total (or -90°)
    {
      type: 'rotationOffset',
      config: {
        offsetDegrees: 270,
      },
    },
  ];

  // Add floor collision if configured
  if (settings.floorCollision) {
    behaviors.push({
      type: 'floorCollision',
      config: settings.floorCollision,
    });
  }

  return {
    emit: true,
    autoUpdate: true,
    lifetime: {
      min: lifetime * 0.8,
      max: lifetime * 1.2,
    },
    frequency: 1 / frequency, // Convert from particles/sec to seconds/particle
    maxParticles,
    pos: { x: 0, y: 0 },
    behaviors,
  };
}

/**
 * Default emitter settings based on phoenixFlameSettings.ts
 */
export const DEFAULT_EMITTER_SETTINGS: EmitterSettings = {
  spawnRect: { x: -50, y: -200, w: 100, h: 150 },
  initialScale: 0.05,
  peakScale: 0.2,
  speed: 280,
  speedVariation: 80,
  gravity: 800,
  angleSpread: 170,
  lifetime: 2.5,
  maxParticles: 6,
  frequency: 2, // 2 particles per second
  animationSpeed: 0.2,
};

