import { Spine } from '@esotericsoftware/spine-pixi-v7';
import gsap from 'gsap';
import {
  Assets,
  Container,
  Graphics,
  Text,
  TextStyle,
  Spritesheet,
  Texture,
  AnimatedSprite,
  Ticker,
  Sprite,
} from 'pixi.js';

import flameEggSheetJson from '../../assets/sprites/flame-egg-levels/flame-egg.json';
import flameEggSheetPng from '../../assets/sprites/flame-egg-levels/flame-egg.png';
// Spine assets loaded from public folder (no Vite hashing - atlas references phoenix.png by name)
import { Slider } from '../../components/Slider';
import { killTweensRecursive, prefixSpritesheetFrames } from '../../core';
import type { GameModeContext } from '../GameMode';

import { EvolvingLandedManager } from './EvolvingLandedManager';
import type { FlyingParticle } from './FlyingParticlePool';
import { PhoenixFlameModeLiteral } from './PhoenixFlameModeLiteral';

/**
 * PhoenixFlameModeCreative
 *
 * Senior approach: Extends PhoenixFlameModeLiteral to reuse particle physics.
 * Adds evolving flame-to-egg mechanics with click interactions.
 *
 * Features:
 * - Phoenix Spine character instead of flame sprite
 * - Flames can evolve into eggs through clicking
 * - 3 clicks per level (4 levels: flame → evolving1 → evolving2 → egg)
 * - Eggs stay permanently until collected
 */
export class PhoenixFlameModeCreative extends PhoenixFlameModeLiteral {
  /** Static cache for flame-egg spritesheet (prevents re-parsing warnings) */
  private static flameEggSpritesheetCache: Spritesheet | null = null;

  private phoenix: Spine | null = null;
  private phoenixShadow: Sprite | null = null;
  private shadowTexture: Texture | null = null;

  // Evolving system
  private evolvingManager: EvolvingLandedManager | null = null;
  private flameEggSpritesheet: Spritesheet | null = null;
  private level1Textures: Texture[] = [];
  private level2Textures: Texture[] = [];
  private level3Textures: Texture[] = [];
  private level4Textures: Texture[] = []; // Pure eggs

  // Track eggs created
  private eggsCreated = 0;

  // Egg counter UI
  private eggCounterPanel: Container | null = null;
  private eggCounterText: Text | null = null;
  private eggCounterIcon: AnimatedSprite | null = null;

  // Creative settings panel (only shown in development)
  private static readonly DEBUG_PANEL = import.meta.env.DEV;
  private creativeSettingsPanel: Container | null = null;
  private debugCounterText: Text | null = null;
  private debugUpdateLoop: (() => void) | null = null;
  private creativeShrinkOffset = 15; // Pivot offset for shrinking (15px default)
  private eggYOffset = 0; // Y offset for egg (level 3) positioning
  private particleScale = 2.0; // Scale multiplier for particles (1.0 - 3.0)
  private eggIconScale = 0.18; // Scale for egg icon in counter UI
  private phoenixYOffset = -200; // Vertical offset for Phoenix position

  // Shadow settings (defaults from tuning)
  private shadowXOffset = 0; // Shadow X offset from Phoenix
  private shadowYOffset = -15; // Shadow Y offset from Phoenix feet
  private shadowOpacity = 0.8; // Center opacity (0-1)
  private shadowScale = 1.4; // Shadow scale multiplier

  constructor(context: GameModeContext) {
    super(context);
  }

  /**
   * Override start to set up evolving flame system
   */
  async start(): Promise<void> {
    // Set up design bounds
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

    // Load spritesheets
    await this.loadSpritesheetPublic(); // Parent's flame spritesheet
    await this.loadFlameEggSpritesheet();

    // Load Phoenix character first (renders behind particles)
    await this.loadPhoenix();

    // Create particle containers (in front of phoenix)
    this.createParticleContainersPublic();

    // Initialize particle system with evolving manager
    this.createEvolvingParticleSystem();

    // Start game loop
    this.startGameLoopPublic();

    // Add title
    this.addTitle();

    // Create cute egg counter UI
    this.createEggCounterPanel();

    // Add settings panel (debug only)
    if (PhoenixFlameModeCreative.DEBUG_PANEL) {
      this.createCreativeSettingsPanel();
    }
  }

  /**
   * Load the flame-egg evolution spritesheet (uses static cache to prevent re-parse warnings)
   */
  private async loadFlameEggSpritesheet(): Promise<void> {
    // Use cached spritesheet if available (prevents "already had an entry" warnings)
    // Check static class cache first, then Assets cache for HMR resilience
    if (PhoenixFlameModeCreative.flameEggSpritesheetCache) {
      this.flameEggSpritesheet = PhoenixFlameModeCreative.flameEggSpritesheetCache;
    } else if (Assets.cache.has('flame-egg-spritesheet')) {
      // Recover from HMR - spritesheet was parsed before but static cache was reset
      this.flameEggSpritesheet = Assets.cache.get('flame-egg-spritesheet') as Spritesheet;
      PhoenixFlameModeCreative.flameEggSpritesheetCache = this.flameEggSpritesheet;
    } else {
      const texture = await Assets.load<Texture>(flameEggSheetPng);
      // Prefix frame names to avoid collision with Ace of Shadows spritesheet
      const prefixedJson = prefixSpritesheetFrames(flameEggSheetJson, 'flame-');
      this.flameEggSpritesheet = new Spritesheet(texture, prefixedJson);
      await this.flameEggSpritesheet.parse();
      PhoenixFlameModeCreative.flameEggSpritesheetCache = this.flameEggSpritesheet;
      // Also store in Assets cache for HMR resilience
      Assets.cache.set('flame-egg-spritesheet', this.flameEggSpritesheet);
    }

    // Get textures for each evolution level (4 levels: flame→egg transition)
    this.level1Textures = this.flameEggSpritesheet.animations['level1'] || [];
    this.level2Textures = this.flameEggSpritesheet.animations['level2'] || [];
    this.level3Textures = this.flameEggSpritesheet.animations['level3'] || [];
    this.level4Textures = this.flameEggSpritesheet.animations['level4'] || [];

    if (import.meta.env.DEV)
      console.log('[PhoenixCreative] Flame-egg spritesheet loaded:', {
        level1: this.level1Textures.length,
        level2: this.level2Textures.length,
        level3: this.level3Textures.length,
        level4: this.level4Textures.length,
      });
  }

  /**
   * Create cute egg counter UI panel (golden coin style with egg icon)
   */
  private createEggCounterPanel(): void {
    if (!this.content || this.level4Textures.length === 0) return;

    this.eggCounterPanel = new Container();
    this.eggCounterPanel.x = 25;
    this.eggCounterPanel.y = 25;
    this.content.addChild(this.eggCounterPanel);

    // Panel background - warm gradient-like rounded rect
    const panelWidth = 130;
    const panelHeight = 50;
    const bg = new Graphics();

    // Outer border (golden)
    bg.beginFill(0xd4a017, 1);
    bg.drawRoundedRect(0, 0, panelWidth, panelHeight, 25);
    bg.endFill();

    // Inner background (warm brown)
    bg.beginFill(0x5c4033, 1);
    bg.drawRoundedRect(3, 3, panelWidth - 6, panelHeight - 6, 22);
    bg.endFill();

    // Subtle inner highlight
    bg.beginFill(0x7a5c45, 0.5);
    bg.drawRoundedRect(4, 4, panelWidth - 8, (panelHeight - 8) * 0.4, 20);
    bg.endFill();

    this.eggCounterPanel.addChild(bg);

    // Golden egg icon (using first frame of level4 texture - static, not animated)
    this.eggCounterIcon = new AnimatedSprite(this.level4Textures);
    this.eggCounterIcon.anchor.set(0.5, 0.5);
    this.eggCounterIcon.x = 32;
    this.eggCounterIcon.y = panelHeight / 2;
    this.eggCounterIcon.scale.set(this.eggIconScale);
    this.eggCounterIcon.gotoAndStop(0); // Static - first frame only
    this.eggCounterPanel.addChild(this.eggCounterIcon);

    // Counter text
    this.eggCounterText = new Text(
      '0',
      new TextStyle({
        fontFamily: 'Georgia, serif',
        fontSize: 28,
        fill: '#FFD700', // Golden
        fontWeight: 'bold',
        stroke: '#5C4033',
        strokeThickness: 2,
      })
    );
    this.eggCounterText.anchor.set(0, 0.5);
    this.eggCounterText.x = 58;
    this.eggCounterText.y = panelHeight / 2;
    this.eggCounterPanel.addChild(this.eggCounterText);

    if (import.meta.env.DEV) console.log('[PhoenixCreative] Egg counter panel created');
  }

  /**
   * Animate egg icon bounce when collecting an egg
   */
  private bounceEggIcon(): void {
    if (!this.eggCounterIcon) return;

    // Use current egg icon scale
    const originalScale = this.eggIconScale;

    // Quick bounce animation using requestAnimationFrame
    const startTime = performance.now();
    const duration = 300; // ms
    const bounceScale = 1.3; // Max scale during bounce

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out bounce curve
      const bounce = Math.sin(progress * Math.PI) * (1 - progress * 0.5);
      const scale = originalScale * (1 + bounce * (bounceScale - 1));

      if (this.eggCounterIcon) {
        this.eggCounterIcon.scale.set(scale);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Create settings panel with shrink offset, egg Y offset, and scale sliders
   */
  private createCreativeSettingsPanel(): void {
    if (!this.content) return;

    const sliderWidth = 150;
    const padding = 15;
    const sliderSpacing = 55;
    const panelWidth = sliderWidth + padding * 2;
    const panelHeight = 540; // Taller to fit 9 sliders + debug counter

    this.creativeSettingsPanel = new Container();

    // Position relative to actual screen (under FPS counter)
    // FPS counter is typically at top-right of screen with ~10px padding
    const screenSize = this.context.getScreenSize();
    const gameScale = this.context.gameContainer.scale.x;
    const gameX = this.context.gameContainer.x;
    const gameY = this.context.gameContainer.y;

    // Panel's screen width when scaled
    const panelScreenWidth = panelWidth * gameScale;

    // Target screen position: same margin as FPS counter (5px from right edge)
    const screenTargetX = screenSize.width - panelScreenWidth - 5;
    const screenTargetY = 35; // Below FPS counter

    // Convert screen position to game coordinates (inverse transform)
    const gameCoordX = (screenTargetX - gameX) / gameScale;
    const gameCoordY = (screenTargetY - gameY) / gameScale;

    this.creativeSettingsPanel.x = gameCoordX;
    this.creativeSettingsPanel.y = gameCoordY;
    this.content.addChild(this.creativeSettingsPanel);

    // Background
    const bg = new Graphics();
    bg.beginFill(0x000000, 0.7);
    bg.drawRoundedRect(0, 0, panelWidth, panelHeight, 8);
    bg.endFill();
    this.creativeSettingsPanel.addChild(bg);

    // 1. Scale slider (affects both flying and landed particles)
    const scaleSlider = new Slider({
      label: 'Scale',
      value: this.particleScale,
      min: 1.0,
      max: 3.0,
      step: 0.1,
      unit: 'x',
      width: sliderWidth,
      fontSize: 11,
      onChange: value => {
        this.particleScale = value;
        // Affect flying particles via parent's currentScale
        this.currentScale = value;
        // Affect landed particles
        this.evolvingManager?.setScale(value);
      },
    });
    scaleSlider.x = padding;
    scaleSlider.y = 35;
    this.creativeSettingsPanel.addChild(scaleSlider);

    // 2. Shrink Offset slider (default 15px)
    const shrinkSlider = new Slider({
      label: 'Shrink Pivot',
      value: this.creativeShrinkOffset,
      min: 0,
      max: 100,
      step: 5,
      unit: 'px',
      width: sliderWidth,
      fontSize: 11,
      onChange: value => {
        this.creativeShrinkOffset = value;
        this.evolvingManager?.setPivotOffset(value);
      },
    });
    shrinkSlider.x = padding;
    shrinkSlider.y = 35 + sliderSpacing;
    this.creativeSettingsPanel.addChild(shrinkSlider);

    // 3. Egg Y Offset slider
    const eggYSlider = new Slider({
      label: 'Egg Y Offset',
      value: this.eggYOffset,
      min: -100,
      max: 100,
      step: 5,
      unit: 'px',
      width: sliderWidth,
      fontSize: 11,
      onChange: value => {
        this.eggYOffset = value;
        this.evolvingManager?.setEggYOffset(value);
      },
    });
    eggYSlider.x = padding;
    eggYSlider.y = 35 + sliderSpacing * 2;
    this.creativeSettingsPanel.addChild(eggYSlider);

    // 4. Egg Icon Scale slider (for UI egg size)
    const eggIconSlider = new Slider({
      label: 'Egg Icon',
      value: this.eggIconScale,
      min: 0.1,
      max: 0.5,
      step: 0.02,
      unit: 'x',
      decimals: 2,
      width: sliderWidth,
      fontSize: 11,
      onChange: value => {
        this.eggIconScale = value;
        if (this.eggCounterIcon) {
          this.eggCounterIcon.scale.set(value);
        }
      },
    });
    eggIconSlider.x = padding;
    eggIconSlider.y = 35 + sliderSpacing * 3;
    this.creativeSettingsPanel.addChild(eggIconSlider);

    // 5. Phoenix Y Offset slider
    const phoenixYSlider = new Slider({
      label: 'Phoenix Y',
      value: this.phoenixYOffset,
      min: -200,
      max: 200,
      step: 10,
      unit: 'px',
      width: sliderWidth,
      fontSize: 11,
      onChange: value => {
        this.phoenixYOffset = value;
        if (this.phoenix) {
          this.phoenix.y = this.designHeight - 80 + value;
          this.updateShadowPosition();
        }
      },
    });
    phoenixYSlider.x = padding;
    phoenixYSlider.y = 35 + sliderSpacing * 4;
    this.creativeSettingsPanel.addChild(phoenixYSlider);

    // 6. Shadow X Offset slider
    const shadowXSlider = new Slider({
      label: 'Shadow X',
      value: this.shadowXOffset,
      min: -100,
      max: 100,
      step: 5,
      unit: 'px',
      width: sliderWidth,
      fontSize: 11,
      onChange: value => {
        this.shadowXOffset = value;
        this.updateShadowPosition();
      },
    });
    shadowXSlider.x = padding;
    shadowXSlider.y = 35 + sliderSpacing * 5;
    this.creativeSettingsPanel.addChild(shadowXSlider);

    // 7. Shadow Y Offset slider
    const shadowYSlider = new Slider({
      label: 'Shadow Y',
      value: this.shadowYOffset,
      min: -50,
      max: 100,
      step: 5,
      unit: 'px',
      width: sliderWidth,
      fontSize: 11,
      onChange: value => {
        this.shadowYOffset = value;
        this.updateShadowPosition();
      },
    });
    shadowYSlider.x = padding;
    shadowYSlider.y = 35 + sliderSpacing * 6;
    this.creativeSettingsPanel.addChild(shadowYSlider);

    // 8. Shadow Opacity slider
    const shadowOpacitySlider = new Slider({
      label: 'Shadow',
      value: this.shadowOpacity,
      min: 0,
      max: 1,
      step: 0.05,
      unit: '',
      decimals: 2,
      width: sliderWidth,
      fontSize: 11,
      onChange: value => {
        this.shadowOpacity = value;
        this.recreateShadow();
      },
    });
    shadowOpacitySlider.x = padding;
    shadowOpacitySlider.y = 35 + sliderSpacing * 7;
    this.creativeSettingsPanel.addChild(shadowOpacitySlider);

    // 9. Shadow Scale slider
    const shadowScaleSlider = new Slider({
      label: 'Shadow Size',
      value: this.shadowScale,
      min: 0.5,
      max: 3.0,
      step: 0.1,
      unit: 'x',
      decimals: 1,
      width: sliderWidth,
      fontSize: 11,
      onChange: value => {
        this.shadowScale = value;
        if (this.phoenixShadow) {
          this.phoenixShadow.scale.set(value);
        }
      },
    });
    shadowScaleSlider.x = padding;
    shadowScaleSlider.y = 35 + sliderSpacing * 8;
    this.creativeSettingsPanel.addChild(shadowScaleSlider);

    // 10. Debug counter text showing active sprites
    this.debugCounterText = new Text(
      'Flying: 0/6 | Landed: 0/6',
      new TextStyle({
        fontFamily: 'monospace',
        fontSize: 10,
        fill: '#00ff00',
      })
    );
    this.debugCounterText.x = padding;
    this.debugCounterText.y = 35 + sliderSpacing * 9 - 15;
    this.creativeSettingsPanel.addChild(this.debugCounterText);

    // Start debug update loop
    this.debugUpdateLoop = () => this.updateDebugCounter();
    Ticker.shared.add(this.debugUpdateLoop);
  }

  /**
   * Update debug counter text with current sprite counts
   */
  private updateDebugCounter(): void {
    if (!this.debugCounterText) return;

    const flyingActive = this.flyingPool?.getActiveCount() ?? 0;
    const flyingMax = this.flyingPool?.getMaxPoolSize() ?? 0;
    const landedActive = this.evolvingManager?.getActiveCount() ?? 0;
    const landedMax = this.evolvingManager?.getMaxPoolSize() ?? 0;

    this.debugCounterText.text = `Flying: ${flyingActive}/${flyingMax} | Landed: ${landedActive}/${landedMax}`;
  }

  /**
   * Create the evolving particle system
   */
  private createEvolvingParticleSystem(): void {
    // Override flameTextures to use level1 (sprite-1) for flying particles too
    this.flameTextures = this.level1Textures;

    // Set initial scale for flying particles
    this.currentScale = this.particleScale;

    // Create flying pool using parent method (now uses level1 textures)
    this.createParticleSystemPublic();

    // Replace landed manager with evolving manager
    if (this.landedManager) {
      this.landedManager.destroy();
      this.landedManager = null;
    }

    if (this.landedContainer && this.level1Textures.length > 0) {
      // Use new spritesheet for all levels: sprite-1 through sprite-4
      this.evolvingManager = new EvolvingLandedManager(
        this.landedContainer,
        this.level1Textures, // Level 0: sprite-1 (flames with egg core)
        this.level2Textures, // Level 1: sprite-2 (more egg-like)
        this.level3Textures, // Level 2: sprite-3 (egg with flame aura)
        this.level4Textures, // Level 3: sprite-4 (pure golden egg)
        6, // Max pool size
        0.15, // Animation speed
        {
          clicksPerLevel: 3,
          shrinkDuration: 4000, // 4 seconds to shrink (longer)
          pauseBeforeShrink: 800,
          pivotOffset: this.creativeShrinkOffset,
          textureHeight: 250, // Approx height of sprite-1 frames
          eggYOffset: this.eggYOffset,
          onEggCreated: (x, y, sprite) => this.onEggCreated(x, y, sprite),
        }
      );
    }
  }

  /**
   * Called when an egg is fully formed - animate it flying to the counter
   */
  private onEggCreated(x: number, y: number, eggSprite: AnimatedSprite): void {
    if (import.meta.env.DEV)
      console.log(
        `[PhoenixCreative] Egg created at (${x.toFixed(0)}, ${y.toFixed(0)}), flying to counter...`
      );

    // Trigger egg-made animation on phoenix
    if (this.phoenix) {
      this.phoenix.state.setAnimation(1, 'egg-made', false);
    }

    // Animate egg flying to the counter with a beautiful curved trajectory
    this.animateEggToCounter(eggSprite);
  }

  /**
   * Animate an egg sprite flying to the counter with a beautiful curved trajectory
   */
  private animateEggToCounter(eggSprite: AnimatedSprite): void {
    if (!this.eggCounterPanel || !this.content) return;

    // Get target position (center of egg icon in counter)
    const targetX = this.eggCounterPanel.x + 32; // Egg icon x position
    const targetY = this.eggCounterPanel.y + 25; // Egg icon y position

    // Starting position (already set on sprite)
    const startX = eggSprite.x;
    const startY = eggSprite.y;

    // Calculate control point for bezier curve (arc upward)
    const midX = (startX + targetX) / 2;
    const midY = Math.min(startY, targetY) - 150; // Arc upward

    // Store original sprite scale for animation
    const originalScale = eggSprite.scale.x;
    const targetScale = 0.18; // Match counter icon scale

    // Create a proxy object for GSAP to animate
    const progress = { t: 0 };

    // Bring egg to front during flight
    if (eggSprite.parent) {
      eggSprite.parent.removeChild(eggSprite);
    }
    this.content.addChild(eggSprite);

    // Animate along bezier curve using GSAP
    gsap.to(progress, {
      t: 1,
      duration: 0.8,
      ease: 'power2.inOut',
      onUpdate: () => {
        const t = progress.t;

        // Quadratic bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
        const oneMinusT = 1 - t;
        const oneMinusT2 = oneMinusT * oneMinusT;
        const t2 = t * t;
        const twoT = 2 * oneMinusT * t;

        eggSprite.x = oneMinusT2 * startX + twoT * midX + t2 * targetX;
        eggSprite.y = oneMinusT2 * startY + twoT * midY + t2 * targetY;

        // Scale down as it approaches target
        const scale = originalScale + (targetScale - originalScale) * t;
        eggSprite.scale.set(scale);

        // Optional: slight rotation during flight
        eggSprite.rotation = Math.sin(t * Math.PI * 2) * 0.2;
      },
      onComplete: () => {
        // Reset sprite state
        eggSprite.rotation = 0;

        // IMPORTANT: Release sprite back to pool so it can be reused
        this.evolvingManager?.releaseBySprite(eggSprite);

        // Increment counter
        this.eggsCreated++;
        if (this.eggCounterText) {
          this.eggCounterText.text = String(this.eggsCreated);
        }

        // Bounce the counter icon
        this.bounceEggIcon();

        if (import.meta.env.DEV)
          console.log(`[PhoenixCreative] Egg collected! Total: ${this.eggsCreated}`);
      },
    });
  }

  /**
   * Override particle landing to use evolving manager
   */
  protected override onParticleLand(particle: FlyingParticle, floorY: number): void {
    if (!this.flyingPool) return;

    const x = particle.sprite.x;
    const scale = particle.sprite.scale.x;

    // Release flying particle back to pool
    this.flyingPool.release(particle);

    // Use evolving manager if available, otherwise fall back to parent
    if (this.evolvingManager) {
      this.evolvingManager.spawnLanded(x, floorY, scale);
    } else if (this.landedManager) {
      this.landedManager.spawnLanded(
        x,
        floorY,
        scale,
        this.landingPause * 1000,
        4000, // Longer shrink
        this.shrinkOffset
      );
    }
  }

  /**
   * Load Phoenix Spine character
   */
  private async loadPhoenix(): Promise<void> {
    if (!this.content) return;

    // Only add assets if not already registered (prevents cache warnings on re-entry)
    // Assets are in public/spine/ folder (no Vite hashing - atlas references phoenix.png by name)
    const basePath = import.meta.env.BASE_URL + 'spine/';
    if (!Assets.cache.has('phoenixSkeleton')) {
      Assets.add({ alias: 'phoenixSkeleton', src: basePath + 'phoenix.json' });
    }
    if (!Assets.cache.has('phoenixAtlas')) {
      Assets.add({ alias: 'phoenixAtlas', src: basePath + 'phoenix.atlas' });
    }
    await Assets.load(['phoenixSkeleton', 'phoenixAtlas']);

    // Create shadow first (renders behind phoenix)
    this.createPhoenixShadow();

    this.phoenix = Spine.from({
      skeleton: 'phoenixSkeleton',
      atlas: 'phoenixAtlas',
    });

    this.phoenix.x = this.designWidth / 2;
    // Root bone is now at feet, so position at floor level + offset
    this.phoenix.y = this.designHeight - 80 + this.phoenixYOffset;
    this.phoenix.scale.set(1);

    this.phoenix.state.setAnimation(0, 'idle', true);

    this.content.addChild(this.phoenix);

    if (import.meta.env.DEV)
      console.log(
        '[PhoenixCreative] Spine loaded, animations:',
        this.phoenix.skeleton.data.animations.map(a => a.name)
      );
  }

  /**
   * Create a smooth radial gradient shadow texture using canvas
   */
  private createShadowTexture(width: number, height: number, centerOpacity: number): Texture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Create radial gradient (elliptical by scaling)
    const centerX = width / 2;
    const centerY = height / 2;
    const radiusX = width / 2;
    const radiusY = height / 2;

    // Scale to make elliptical gradient
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(1, radiusY / radiusX); // Squash vertically

    // Create circular gradient (will be squashed to ellipse)
    // Opacity scales from centerOpacity at center to 0 at edge
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radiusX);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${centerOpacity})`); // Dark center
    gradient.addColorStop(0.4, `rgba(0, 0, 0, ${centerOpacity * 0.6})`); // Mid
    gradient.addColorStop(0.7, `rgba(0, 0, 0, ${centerOpacity * 0.25})`); // Fade
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparent edge

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radiusX, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    return Texture.from(canvas);
  }

  /**
   * Create an elliptical shadow under the Phoenix with smooth gradient
   */
  private createPhoenixShadow(): void {
    if (!this.content) return;

    // Create gradient texture (240x50 ellipse)
    const shadowWidth = 240;
    const shadowHeight = 50;
    this.shadowTexture = this.createShadowTexture(shadowWidth, shadowHeight, this.shadowOpacity);

    // Create sprite from texture
    this.phoenixShadow = new Sprite(this.shadowTexture);
    this.phoenixShadow.anchor.set(0.5, 0.5);
    this.phoenixShadow.x = this.designWidth / 2 + this.shadowXOffset;
    this.phoenixShadow.y = this.designHeight - 80 + this.phoenixYOffset + this.shadowYOffset;
    this.phoenixShadow.scale.set(this.shadowScale);

    this.content.addChild(this.phoenixShadow);
  }

  /**
   * Recreate shadow with new opacity/settings
   */
  private recreateShadow(): void {
    if (!this.content || !this.phoenixShadow) return;

    // Store current position
    const x = this.phoenixShadow.x;
    const y = this.phoenixShadow.y;

    // Destroy old
    this.phoenixShadow.destroy();
    if (this.shadowTexture) {
      this.shadowTexture.destroy(true);
    }

    // Create new with updated settings
    const shadowWidth = 240;
    const shadowHeight = 50;
    this.shadowTexture = this.createShadowTexture(shadowWidth, shadowHeight, this.shadowOpacity);
    this.phoenixShadow = new Sprite(this.shadowTexture);
    this.phoenixShadow.anchor.set(0.5, 0.5);
    this.phoenixShadow.x = x;
    this.phoenixShadow.y = y;
    this.phoenixShadow.scale.set(this.shadowScale);

    // Add behind phoenix (at index 0)
    this.content.addChildAt(this.phoenixShadow, 0);
  }

  /**
   * Update shadow position when Phoenix moves
   */
  private updateShadowPosition(): void {
    if (!this.phoenixShadow || !this.phoenix) return;

    this.phoenixShadow.x = this.phoenix.x + this.shadowXOffset;
    this.phoenixShadow.y = this.phoenix.y + this.shadowYOffset;
  }

  /**
   * Override spawn position to emit from Phoenix head
   */
  protected override getSpawnPosition(): { x: number; y: number } {
    if (!this.phoenix) {
      return { x: this.designWidth / 2, y: this.designHeight / 2 };
    }

    const x = this.phoenix.x + (Math.random() - 0.5) * 60;
    // Head is ~250px above feet (body at 140 + head at 55 + head height)
    const pivotY = this.phoenix.y - 300; // Head area (above character)
    const randomOffset = Math.random() * this.spawnHeightRange * 0.3;
    const y = pivotY - randomOffset;

    return { x, y };
  }

  /**
   * Override floor Y calculation for Phoenix
   */
  protected override getFlameBaseY(): number {
    return this.designHeight - 80;
  }

  /**
   * Override hook - no animation on particle spawn
   */
  protected override onParticleSpawned(): void {
    // No animation on spawn - egg-made triggers on egg creation
  }

  /**
   * Override to check Phoenix instead of flame sprite
   */
  protected override hasMainCharacter(): boolean {
    return this.phoenix !== null;
  }

  /**
   * Get egg count
   */
  public getEggsCreated(): number {
    return this.eggsCreated;
  }

  private addTitle(): void {
    if (!this.content) return;

    // Create container for title with background
    const titleContainer = new Container();
    titleContainer.x = this.designWidth / 2;
    titleContainer.y = this.designHeight - 60;

    const titleStyle = new TextStyle({
      fontFamily: 'Georgia, serif',
      fontSize: 26,
      fill: '#ff6b35',
      fontWeight: 'bold',
    });
    const title = new Text('🔥 Phoenix Flame 🔥', titleStyle);
    title.anchor.set(0.5, 0);

    // Background box
    const paddingX = 20;
    const paddingY = 8;
    const bg = new Graphics();
    bg.beginFill(0x000000, 0.6);
    bg.drawRoundedRect(
      -title.width / 2 - paddingX,
      -paddingY,
      title.width + paddingX * 2,
      title.height + paddingY * 2,
      12
    );
    bg.endFill();

    titleContainer.addChild(bg);
    titleContainer.addChild(title);
    this.content.addChild(titleContainer);
  }

  /**
   * Override stop to clean up
   */
  override stop(): void {
    // Stop debug update loop
    if (this.debugUpdateLoop) {
      Ticker.shared.remove(this.debugUpdateLoop);
      this.debugUpdateLoop = null;
    }

    // Kill GSAP tweens recursively on containers before destroying
    if (this.eggCounterPanel) {
      killTweensRecursive(this.eggCounterPanel);
      this.eggCounterPanel.destroy({ children: true });
      this.eggCounterPanel = null;
      this.eggCounterText = null;
      this.eggCounterIcon = null;
    }

    if (this.creativeSettingsPanel) {
      killTweensRecursive(this.creativeSettingsPanel);
      this.creativeSettingsPanel.destroy({ children: true });
      this.creativeSettingsPanel = null;
      this.debugCounterText = null;
    }

    if (this.evolvingManager) {
      this.evolvingManager.destroy();
      this.evolvingManager = null;
    }

    // Don't destroy cached spritesheet - just clear reference
    // The static cache keeps it alive for scene re-entry
    this.flameEggSpritesheet = null;
    this.level1Textures = [];
    this.level2Textures = [];
    this.level3Textures = [];
    this.level4Textures = [];

    if (this.phoenixShadow) {
      this.phoenixShadow.destroy();
      this.phoenixShadow = null;
    }

    if (this.shadowTexture) {
      this.shadowTexture.destroy(true);
      this.shadowTexture = null;
    }

    if (this.phoenix) {
      this.phoenix.destroy();
      this.phoenix = null;
    }

    super.stop();
  }

  /**
   * Override resize to reposition settings panel relative to screen
   */
  override onResize(): void {
    this.repositionSettingsPanel();
  }

  /**
   * Reposition settings panel to stay at screen-relative position
   */
  private repositionSettingsPanel(): void {
    if (!this.creativeSettingsPanel) return;

    const sliderWidth = 150;
    const padding = 15;
    const panelWidth = sliderWidth + padding * 2; // 180 in game units

    const screenSize = this.context.getScreenSize();
    const gameScale = this.context.gameContainer.scale.x;
    const gameX = this.context.gameContainer.x;
    const gameY = this.context.gameContainer.y;

    // Panel's screen width when scaled
    const panelScreenWidth = panelWidth * gameScale;

    // Target screen position: same margin as FPS counter (5px from right edge)
    const screenTargetX = screenSize.width - panelScreenWidth - 5;
    const screenTargetY = 35;

    // Convert screen position to game coordinates (inverse transform)
    const gameCoordX = (screenTargetX - gameX) / gameScale;
    const gameCoordY = (screenTargetY - gameY) / gameScale;

    this.creativeSettingsPanel.x = gameCoordX;
    this.creativeSettingsPanel.y = gameCoordY;
  }
}
