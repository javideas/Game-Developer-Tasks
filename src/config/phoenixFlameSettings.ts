/**
 * Phoenix Flame Configuration
 * 
 * Task 3: Particle fire effect with max 10 sprites on screen
 * 
 * This config centralizes all flame animation settings and constraints.
 */

// ============================================================
// Sprite Budget (MUST NOT EXCEED 10)
// ============================================================
export const SPRITE_BUDGET = {
  /** Maximum sprites allowed on screen at once */
  max: 10,
  
  /** Budget allocation for literal mode */
  literal: {
    /** Main animated flame sprites (AnimatedSprite counts as 1 each) */
    flames: 1,
    /** Remaining for future enhancements (sparks, glow, smoke) */
    reserved: 9,
  },
} as const;

// ============================================================
// Flame Animation Settings
// ============================================================
export const FLAME_CONFIG = {
  /** Animation playback speed (0.1 = slow flicker, 0.3 = fast) */
  animationSpeed: 0.15,
  
  /** Scale multiplier for the flame sprite (HQ flames are 192x1024, so smaller scale needed) */
  scale: 1.10,
  
  /** Anchor point (0.5, 1.0 = bottom-center so scaling happens from base) */
  anchor: { x: 0.5, y: 1.0 },
  
  /** Blend mode for additive glow effect */
  useAdditiveBlend: false,
  
  /** Frame dimensions for HQ flames (cropped to actual flame area) */
  frameWidth: 192,
  frameHeight: 700,
} as const;

// ============================================================
// Particle Settings (Emitter-based system)
// ============================================================
export const PARTICLE_CONFIG = {
  /** Maximum flying particles in the emitter (leaves room for landed sprites) */
  maxFlyingParticles: 6,
  
  /** Maximum landed sprites (shrinking on floor) */
  maxLandedSprites: 3,
  
  /** Particles spawned per second */
  spawnRate: 3,
  
  /** Maximum particle lifetime in seconds */
  lifetime: 2.5,
  
  /** Initial scale (small but visible, grows quickly to peak) */
  initialScale: 0.05,
  
  /** Peak scale (relative to main flame scale) - reached at 10% of trajectory */
  peakScale: 0.2,
  
  /** Min peak scale for slider */
  peakScaleMin: 0.01,
  
  /** Max peak scale for slider */
  peakScaleMax: 0.5,
  
  /** Base speed (pixels per second) */
  speed: 280,
  
  /** Speed variation (random +/- this amount) */
  speedVariation: 80,
  
  /** Angle spread in degrees for initial launch */
  angleSpread: 150,
  
  /** Min/max angle spread for slider */
  angleSpreadMin: 20,
  angleSpreadMax: 180,
  
  /** Height multiplier (affects spawn area and trajectory) */
  heightMultiplier: 1.0,
  
  /** Min/max height multiplier for slider */
  heightMultiplierMin: 0.3,
  heightMultiplierMax: 3.0,
  
  /** Spawn height range - how far UP from the pivot particles can spawn (in pixels, scaled) */
  spawnHeightRange: 300,
  spawnHeightRangeMin: 0,
  spawnHeightRangeMax: 600,
  
  /** Pause before shrinking starts (seconds) */
  landingPause: 0.3,
  landingPauseMin: 0,
  landingPauseMax: 1,
  
  /** How long particles shrink on the floor before disappearing (ms) */
  shrinkDuration: 400,
  
  /** Gravity acceleration (pixels per second squared) - higher = more dramatic arc */
  gravity: 800,
  gravityMin: 800,
  gravityMax: 1600,
  
  /** Minimum angle difference from last particle (0 = disabled, fully random) */
  angleThreshold: 0,
  angleThresholdMin: 0,
  angleThresholdMax: 90,
  
  /** Minimum speed difference from last particle (0 = disabled, fully random) */
  speedThreshold: 0,
  speedThresholdMin: 0,
  speedThresholdMax: 100,
  
  /** Extra offset below the bottom of the flame sprite for floor */
  floorExtraOffset: -20,
  
  /** Min/max floor offset for slider */
  floorOffsetMin: -200,
  floorOffsetMax: 200,
  
  /** Flame Y position offset from center (0 = center of screen) */
  flameYOffset: -110,
  flameYOffsetMin: -300,
  flameYOffsetMax: 300,
  
  /** Animation speed for particles */
  animationSpeed: 0.2,
  
  /** Shrink offset - adjusts where the shrinking pivot point is (positive = higher) */
  shrinkOffset: 50,
  shrinkOffsetMin: -200,
  shrinkOffsetMax: 200,
  
  /** Big flame scale pivot offset in local flame pixels (texture-relative) */
  bigFlamePivotOffset: 235,
  bigFlamePivotOffsetMin: 0,
  bigFlamePivotOffsetMax: 700,
} as const;

// ============================================================
// Selection Panel (matches MagicWords structure)
// ============================================================
export const SELECTION_PANEL = {
  centerX: 400,
  centerY: 360,
  paddingX: 40,
  paddingY: 30,
  titleGap: 30,
  buttonGap: 20,
  buttonWidth: 260,
  buttonHeight: 60,
  radius: 16,
  backgroundAlpha: 0.85,
  titleFontSize: 28,
  buttonFontSize: 20,
  buttonRadius: 10,
} as const;

// ============================================================
// Design Bounds
// ============================================================
export const DESIGN_BOUNDS = {
  x: 0,
  y: 0,
  width: 800,
  height: 720,
} as const;

