import { Container, Sprite, Assets, Spritesheet, Texture, Graphics, Point, BlurFilter, Text, TextStyle } from 'pixi.js';
import { MotionBlurFilter } from '@pixi/filter-motion-blur';
import type { Application } from '../core/Application';
import { BaseGameScene } from './BaseGameScene';
import { Button } from '../components/Button';
import gsap from 'gsap';

/** Scene mode */
type SceneMode = 'selection' | 'literal' | 'creative';

// Spritesheet assets
import spritesheetJson from '../assets/sprites/ultimate-minimalist-card-asset/ace-of-shadows-spritesheet.json';
import spritesheetPng from '../assets/sprites/ultimate-minimalist-card-asset/ace-of-shadows-spritesheet.png';

/** Card stack offset (pixels between cards in a stack) */
const CARD_OFFSET = 0.5;

/** Number of cards in the deck */
const TOTAL_CARDS = 144;

/** Default time between card moves (seconds) */
const DEFAULT_MOVE_INTERVAL = 1;

/** Default animation duration for card movement (seconds) */
const DEFAULT_MOVE_DURATION = 2;

/** Slider configuration */
const SLIDER_MIN = 0.1;
const SLIDER_MAX = 2;
const SLIDER_STEP = 0.1;

/** Shadow offset from card */
const SHADOW_OFFSET_X = 3;
const SHADOW_OFFSET_Y = 3;

/** Shadow opacity */
const SHADOW_ALPHA = 0.35;

/** Card scale (1 = original size, 0.5 = half size) */
const CARD_SCALE = 0.5;

/** Default motion blur strength */
const DEFAULT_MOTION_BLUR = 1;

/** Motion blur slider config */
const BLUR_SLIDER_MIN = 0;
const BLUR_SLIDER_MAX = 10;
const BLUR_SLIDER_STEP = 1;

/**
 * The 4 poker suits in the spritesheet (rows with 13 cards each: A-K)
 * Based on spritesheet structure: sprite-{row}-{1-13}
 */
const POKER_SUIT_ROWS = [1, 3, 4, 6];

/**
 * AceOfShadowsScene
 * 
 * Task 1: Create 144 sprites stacked on top of each other like cards in a deck.
 * Every 1 second, the top card moves to a different stack with a 2-second animation.
 * 
 * Uses 2 complete poker decks (52×2 = 104) plus 40 random cards to reach 144.
 */
export class AceOfShadowsScene extends BaseGameScene {
  /** Left card stack (source) - contains card containers */
  private leftStack: Container[] = [];
  
  /** Right card stack (destination) */
  private rightStack: Container[] = [];
  
  /** Container for left stack */
  private leftContainer: Container = new Container();
  
  /** Container for right stack */
  private rightContainer: Container = new Container();
  
  /** Spritesheet reference */
  private spritesheet: Spritesheet | null = null;
  
  /** Interval timer ID */
  private moveIntervalId: ReturnType<typeof setInterval> | null = null;
  
  /** Currently animating card */
  private isAnimating = false;

  /** Shadow texture (generated once, reused) */
  private shadowTexture: Texture | null = null;

  /** Current move interval (seconds) - controlled by slider */
  private moveInterval = DEFAULT_MOVE_INTERVAL;

  /** Current move duration (seconds) - controlled by slider */
  private moveDuration = DEFAULT_MOVE_DURATION;

  /** Current motion blur strength - controlled by slider */
  private motionBlurStrength = DEFAULT_MOTION_BLUR;

  /** Slider UI container element */
  private sliderContainer: HTMLDivElement | null = null;

  /** Current scene mode */
  private mode: SceneMode = 'selection';

  /** Selection screen container */
  private selectionContainer: Container | null = null;

  /** Sub-mode back button (goes to selection, not menu) */
  private subModeBackButton: Button | null = null;

  constructor(app: Application, onBack: () => void) {
    super(app, {
      title: 'Ace of Shadows',
      onBack,
    });
  }

  protected async buildContent(): Promise<void> {
    await this.loadSpritesheet();
    this.buildSelectionScreen();
  }

  /**
   * Build the mode selection screen
   */
  private buildSelectionScreen(): void {
    this.mode = 'selection';
    this.selectionContainer = new Container();
    this.gameContainer.addChild(this.selectionContainer);

    // Title
    const titleStyle = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 36,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowDistance: 2,
    });

    const title = new Text('Choose Your Experience', titleStyle);
    title.resolution = 2;
    title.anchor.set(0.5);
    title.x = 400;
    title.y = 100;
    this.selectionContainer.addChild(title);

    // Literal Task button
    const literalBtn = new Button({
      label: '📋 Literal Task',
      width: 280,
      height: 60,
      backgroundColor: 0x2E7D32,
      fontSize: 20,
      radius: 12,
      onClick: () => this.startMode('literal'),
    });
    literalBtn.x = 400;
    literalBtn.y = 250;
    this.selectionContainer.addChild(literalBtn);

    // Creative Take button
    const creativeBtn = new Button({
      label: '✨ Creative Take',
      width: 280,
      height: 60,
      backgroundColor: 0x7B1FA2,
      fontSize: 20,
      radius: 12,
      onClick: () => this.startMode('creative'),
    });
    creativeBtn.x = 400;
    creativeBtn.y = 350;
    this.selectionContainer.addChild(creativeBtn);
  }

  /**
   * Start the selected mode
   */
  private startMode(mode: 'literal' | 'creative'): void {
    this.mode = mode;

    // Remove selection screen
    if (this.selectionContainer) {
      this.selectionContainer.destroy({ children: true });
      this.selectionContainer = null;
    }

    // Add sub-mode back button (goes to selection, not menu)
    this.createSubModeBackButton();

    if (mode === 'literal') {
      this.startLiteralMode();
    } else {
      this.startCreativeMode();
    }
  }

  /**
   * Create back button for sub-modes (returns to selection screen)
   */
  private createSubModeBackButton(): void {
    // Hide the menu back button
    if (this.backButton) {
      this.backButton.visible = false;
    }

    this.subModeBackButton = new Button({
      label: '← Back',
      width: 100,
      height: 36,
      backgroundColor: 0x000000,
      fontSize: 14,
      radius: 8,
      onClick: () => this.returnToSelection(),
    });
    this.subModeBackButton.alpha = 0.4;
    this.subModeBackButton.x = 70;
    this.subModeBackButton.y = 30;

    // Hover effects
    this.subModeBackButton.on('pointerover', () => {
      if (this.subModeBackButton) this.subModeBackButton.alpha = 0.9;
    });
    this.subModeBackButton.on('pointerout', () => {
      if (this.subModeBackButton) this.subModeBackButton.alpha = 0.4;
    });

    this.container.addChild(this.subModeBackButton);
  }

  /**
   * Return to the selection screen from a sub-mode
   */
  private returnToSelection(): void {
    // Clean up current mode
    this.cleanupCurrentMode();

    // Remove sub-mode back button
    if (this.subModeBackButton) {
      this.subModeBackButton.destroy();
      this.subModeBackButton = null;
    }

    // Show the menu back button again
    if (this.backButton) {
      this.backButton.visible = true;
    }

    // Clear game container
    this.gameContainer.removeChildren();

    // Rebuild selection screen
    this.buildSelectionScreen();
  }

  /**
   * Clean up resources from current mode
   */
  private cleanupCurrentMode(): void {
    if (this.mode === 'literal') {
      // Stop animation
      if (this.moveIntervalId) {
        clearInterval(this.moveIntervalId);
        this.moveIntervalId = null;
      }

      // Remove slider UI
      this.removeSliderUI();

      // Kill GSAP animations
      gsap.killTweensOf(this.leftContainer.children);
      gsap.killTweensOf(this.rightContainer.children);

      // Clear stacks
      this.leftStack = [];
      this.rightStack = [];
      this.leftContainer.removeChildren();
      this.rightContainer.removeChildren();

      // Reset animation state
      this.isAnimating = false;
      this.movingToRight = true;

      // Reset speed values to defaults
      this.moveInterval = DEFAULT_MOVE_INTERVAL;
      this.moveDuration = DEFAULT_MOVE_DURATION;
      this.motionBlurStrength = DEFAULT_MOTION_BLUR;
    }
  }

  /**
   * Start the literal task implementation
   */
  private startLiteralMode(): void {
    // Recreate containers (in case they were removed)
    this.leftContainer = new Container();
    this.rightContainer = new Container();
    
    this.createShadowTexture();
    this.createCardStacks();
    this.createSliderUI();
    this.startCardAnimation();
  }

  /**
   * Start the creative take implementation
   * TODO: Implement your creative idea here!
   */
  private startCreativeMode(): void {
    // Placeholder for creative mode
    const style = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 28,
      fill: '#ffffff',
      align: 'center',
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowDistance: 2,
    });

    const placeholder = new Text(
      '✨ Creative Mode\n\nYour unique card animation idea goes here!\n\n(Coming soon)',
      style
    );
    placeholder.resolution = 2;
    placeholder.anchor.set(0.5);
    placeholder.x = 400;
    placeholder.y = 300;
    this.gameContainer.addChild(placeholder);
  }

  /**
   * Create HTML slider UI for controlling animation speed
   */
  private createSliderUI(): void {
    // Create container for sliders
    this.sliderContainer = document.createElement('div');
    this.sliderContainer.id = 'ace-of-shadows-controls';
    this.sliderContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 30px;
      background: rgba(0, 0, 0, 0.7);
      padding: 15px 25px;
      border-radius: 12px;
      font-family: Arial, sans-serif;
      z-index: 1000;
    `;

    // Interval slider
    const intervalControl = this.createSlider({
      label: 'Interval',
      value: this.moveInterval,
      min: SLIDER_MIN,
      max: SLIDER_MAX,
      step: SLIDER_STEP,
      unit: 's',
      onChange: (value) => {
        this.moveInterval = value;
        this.restartAnimation();
      }
    });

    // Duration slider
    const durationControl = this.createSlider({
      label: 'Duration',
      value: this.moveDuration,
      min: SLIDER_MIN,
      max: SLIDER_MAX,
      step: SLIDER_STEP,
      unit: 's',
      onChange: (value) => {
        this.moveDuration = value;
      }
    });

    // Motion blur slider
    const blurControl = this.createSlider({
      label: 'Motion Blur',
      value: this.motionBlurStrength,
      min: BLUR_SLIDER_MIN,
      max: BLUR_SLIDER_MAX,
      step: BLUR_SLIDER_STEP,
      unit: '',
      decimals: 0,
      onChange: (value) => {
        this.motionBlurStrength = value;
      }
    });

    this.sliderContainer.appendChild(intervalControl);
    this.sliderContainer.appendChild(durationControl);
    this.sliderContainer.appendChild(blurControl);
    document.body.appendChild(this.sliderContainer);
  }

  /**
   * Create a single slider control
   */
  private createSlider(options: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit: string;
    decimals?: number;
    onChange: (value: number) => void;
  }): HTMLDivElement {
    const { label, value, min, max, step, unit, decimals = 1, onChange } = options;
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center;';

    const formatValue = (v: number) => `${label}: ${v.toFixed(decimals)}${unit}`;

    const labelEl = document.createElement('label');
    labelEl.style.cssText = 'color: white; font-size: 12px; margin-bottom: 5px;';
    labelEl.textContent = formatValue(value);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.style.cssText = `
      width: 120px;
      cursor: pointer;
      accent-color: #FF671D;
    `;

    slider.addEventListener('input', () => {
      const newValue = parseFloat(slider.value);
      labelEl.textContent = formatValue(newValue);
      onChange(newValue);
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(slider);
    return wrapper;
  }

  /**
   * Remove slider UI from DOM
   */
  private removeSliderUI(): void {
    if (this.sliderContainer) {
      this.sliderContainer.remove();
      this.sliderContainer = null;
    }
  }

  /** Static cache for spritesheet (persists across scene instances) */
  private static cachedSpritesheet: Spritesheet | null = null;

  /**
   * Load the spritesheet and extract textures
   * Uses static cache to avoid re-parsing on scene re-entry
   */
  private async loadSpritesheet(): Promise<void> {
    // Use cached spritesheet if available
    if (AceOfShadowsScene.cachedSpritesheet) {
      this.spritesheet = AceOfShadowsScene.cachedSpritesheet;
    } else {
      // First time: load and parse
      const texture = await Assets.load(spritesheetPng);
      this.spritesheet = new Spritesheet(texture, spritesheetJson);
      await this.spritesheet.parse();
      AceOfShadowsScene.cachedSpritesheet = this.spritesheet;
    }
    
    // Set background from spritesheet
    const bgTexture = this.spritesheet.textures['castle-bg.png'];
    if (bgTexture) {
      this.setBackground(bgTexture);
    }
  }

  /**
   * Create a reusable shadow texture
   */
  private createShadowTexture(): void {
    // Get card dimensions from first card texture
    const sampleTexture = this.spritesheet?.textures['sprite-1-1.png'];
    if (!sampleTexture) return;

    const w = sampleTexture.width;
    const h = sampleTexture.height;
    const radius = 8;

    // Create shadow as a Graphics object, then extract texture
    const shadowGraphics = new Graphics();
    shadowGraphics.beginFill(0x000000);
    shadowGraphics.drawRoundedRect(0, 0, w, h, radius);
    shadowGraphics.endFill();

    this.shadowTexture = this.app.pixi.renderer.generateTexture(shadowGraphics);
    shadowGraphics.destroy();
  }

  /**
   * Get all poker card texture names (4 suits × 13 ranks = 52 cards)
   */
  private getPokerCardNames(): string[] {
    const names: string[] = [];
    
    for (const row of POKER_SUIT_ROWS) {
      for (let col = 1; col <= 13; col++) {
        names.push(`sprite-${row}-${col}.png`);
      }
    }
    
    return names;
  }

  /**
   * Build the deck: 2 complete decks + random cards to fill 144
   */
  private buildDeck(): string[] {
    const pokerCards = this.getPokerCardNames(); // 52 cards
    const deck: string[] = [];
    
    // Add 2 complete decks (104 cards)
    deck.push(...pokerCards);
    deck.push(...pokerCards);
    
    // Fill remaining slots (144 - 104 = 40) with random cards
    const remaining = TOTAL_CARDS - deck.length;
    for (let i = 0; i < remaining; i++) {
      const randomIndex = Math.floor(Math.random() * pokerCards.length);
      deck.push(pokerCards[randomIndex]);
    }
    
    // Shuffle the deck for variety
    this.shuffleArray(deck);
    
    return deck;
  }

  /**
   * Fisher-Yates shuffle
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Create a card with shadow as a container
   */
  private createCardWithShadow(cardTexture: Texture): Container {
    const cardContainer = new Container();
    
    // Shadow sprite (offset and semi-transparent)
    if (this.shadowTexture) {
      const shadow = new Sprite(this.shadowTexture);
      shadow.anchor.set(0.5);
      shadow.x = SHADOW_OFFSET_X;
      shadow.y = SHADOW_OFFSET_Y;
      shadow.alpha = SHADOW_ALPHA;
      cardContainer.addChild(shadow);
    }
    
    // Card sprite
    const card = new Sprite(cardTexture);
    card.anchor.set(0.5);
    cardContainer.addChild(card);
    
    // Scale down the card
    cardContainer.scale.set(CARD_SCALE);
    
    return cardContainer;
  }

  /**
   * Create the initial card stacks
   */
  private createCardStacks(): void {
    if (!this.spritesheet) return;
    
    // Build the deck with proper poker cards
    const deck = this.buildDeck();
    
    // Get card dimensions for centering calculation
    const sampleTexture = this.spritesheet.textures['sprite-1-1.png'];
    const cardHeight = sampleTexture ? sampleTexture.height * CARD_SCALE : 90;
    
    // Calculate total deck height (cards stack upward with negative Y)
    const deckHeight = (TOTAL_CARDS - 1) * CARD_OFFSET + cardHeight;
    
    // Add containers to game area
    this.gameContainer.addChild(this.leftContainer);
    this.gameContainer.addChild(this.rightContainer);
    
    // Position stacks: centered vertically, with deck bottom at center
    // The deck grows upward (negative Y), so position at vertical center + half deck height
    const centerY = 300 + deckHeight / 2 - cardHeight / 2;
    
    this.leftContainer.x = 200;
    this.leftContainer.y = centerY;
    this.rightContainer.x = 600;
    this.rightContainer.y = centerY;
    
    // Create 144 cards in the left stack
    for (let i = 0; i < TOTAL_CARDS; i++) {
      const textureName = deck[i];
      const texture = this.spritesheet.textures[textureName];
      
      if (!texture) continue;
      
      const cardContainer = this.createCardWithShadow(texture);
      
      // Stack cards with offset so edges are visible
      cardContainer.x = 0;
      cardContainer.y = -i * CARD_OFFSET;
      
      this.leftContainer.addChild(cardContainer);
      this.leftStack.push(cardContainer);
    }
  }

  /** Direction: true = left→right (top card), false = right→left (bottom card) */
  private movingToRight = true;

  /**
   * Start the card movement animation loop
   */
  private startCardAnimation(): void {
    // Clear any existing interval
    if (this.moveIntervalId) {
      clearInterval(this.moveIntervalId);
    }
    this.moveIntervalId = setInterval(() => {
      this.moveCard();
    }, this.moveInterval * 1000);
  }

  /**
   * Restart animation with new interval (called when slider changes)
   */
  private restartAnimation(): void {
    this.startCardAnimation();
  }

  /**
   * Move a card between stacks
   * - Phase 1 (movingToRight=true): Move top card from left to right
   * - Phase 2 (movingToRight=false): Move bottom card from right to left, remaining cards fall
   */
  private moveCard(): void {
    if (this.isAnimating) return;

    if (this.movingToRight) {
      // Phase 1: Move top card from left to right
      if (this.leftStack.length === 0) {
        // Switch to phase 2
        this.movingToRight = false;
        this.moveCard();
        return;
      }
      this.moveTopCardToRight();
    } else {
      // Phase 2: Move bottom card from right to left
      if (this.rightStack.length === 0) {
        // Switch back to phase 1
        this.movingToRight = true;
        this.moveCard();
        return;
      }
      this.moveBottomCardToLeft();
    }
  }

  /**
   * Move the top card from left stack to right stack
   */
  private moveTopCardToRight(): void {
    const cardContainer = this.leftStack.pop()!;
    this.isAnimating = true;

    // Target position on right stack
    const targetY = -this.rightStack.length * CARD_OFFSET;

    // Convert position to right container's local coords
    const globalPos = this.leftContainer.toGlobal(cardContainer.position);
    const localPos = this.rightContainer.toLocal(globalPos);

    // Move to right container
    this.leftContainer.removeChild(cardContainer);
    this.rightContainer.addChild(cardContainer);
    cardContainer.x = localPos.x;
    cardContainer.y = localPos.y;

    // Calculate velocity direction for motion blur
    const deltaX = 0 - localPos.x;
    const deltaY = targetY - localPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const normalizedX = distance > 0 ? (deltaX / distance) * this.motionBlurStrength : 0;
    const normalizedY = distance > 0 ? (deltaY / distance) * this.motionBlurStrength : 0;

    // Apply motion blur filter
    const motionBlur = new MotionBlurFilter([normalizedX, normalizedY], 9);
    cardContainer.filters = [motionBlur];

    // Animate to final position
    gsap.to(cardContainer, {
      x: 0,
      y: targetY,
      duration: this.moveDuration,
      ease: 'power2.inOut',
      onUpdate: () => {
        // Reduce blur as we approach destination
        const progress = gsap.getProperty(cardContainer, 'x') as number;
        const remaining = Math.abs(progress) / Math.abs(localPos.x || 1);
        motionBlur.velocity = new Point(normalizedX * remaining, normalizedY * remaining);
      },
      onComplete: () => {
        cardContainer.filters = [];
        this.rightStack.push(cardContainer);
        this.isAnimating = false;
      }
    });
  }

  /**
   * Move the bottom card from right stack to left stack
   * The remaining cards in right stack "fall down" to fill the gap
   */
  private moveBottomCardToLeft(): void {
    // Take the bottom card (index 0)
    const cardContainer = this.rightStack.shift()!;
    this.isAnimating = true;

    // Target position on left stack (on top)
    const targetY = -this.leftStack.length * CARD_OFFSET;

    // Convert position to left container's local coords
    const globalPos = this.rightContainer.toGlobal(cardContainer.position);
    const localPos = this.leftContainer.toLocal(globalPos);

    // Move to left container
    this.rightContainer.removeChild(cardContainer);
    this.leftContainer.addChild(cardContainer);
    cardContainer.x = localPos.x;
    cardContainer.y = localPos.y;

    // Calculate velocity direction for motion blur
    const deltaX = 0 - localPos.x;
    const deltaY = targetY - localPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const normalizedX = distance > 0 ? (deltaX / distance) * this.motionBlurStrength : 0;
    const normalizedY = distance > 0 ? (deltaY / distance) * this.motionBlurStrength : 0;

    // Apply motion blur filter
    const motionBlur = new MotionBlurFilter([normalizedX, normalizedY], 9);
    cardContainer.filters = [motionBlur];

    // Animate the moved card to left stack
    gsap.to(cardContainer, {
      x: 0,
      y: targetY,
      duration: this.moveDuration,
      ease: 'power2.inOut',
      onUpdate: () => {
        // Reduce blur as we approach destination
        const progress = Math.abs(gsap.getProperty(cardContainer, 'x') as number);
        const total = Math.abs(localPos.x || 1);
        const remaining = progress / total;
        motionBlur.velocity = new Point(normalizedX * remaining, normalizedY * remaining);
      },
      onComplete: () => {
        cardContainer.filters = [];
        this.leftStack.push(cardContainer);
        this.isAnimating = false;
      }
    });

    // Animate remaining cards in right stack to "fall down" (fill the gap)
    this.rightStack.forEach((card, index) => {
      const newY = -index * CARD_OFFSET;
      gsap.to(card, {
        y: newY,
        duration: this.moveDuration * 0.5,
        ease: 'power2.out'
      });
    });
  }

  /**
   * Set the background texture (called after spritesheet loads)
   */
  private setBackground(texture: Texture): void {
    const bg = new Sprite(texture);
    bg.anchor.set(0.5);
    
    // Apply a subtle blur to the background for depth
    const blurFilter = new BlurFilter();
    blurFilter.blur = 2;
    blurFilter.quality = 4;
    bg.filters = [blurFilter];
    
    // Insert at the beginning of the main container (behind everything)
    this.container.addChildAt(bg, 0);
    
    // Store reference for layout updates
    (this as any)._asyncBackground = bg;
    this.layoutAsyncBackground();
  }

  /**
   * Layout the async-loaded background
   */
  private layoutAsyncBackground(): void {
    const bg = (this as any)._asyncBackground as Sprite | undefined;
    if (!bg) return;
    
    const screenW = this.app.width;
    const screenH = this.app.height;
    
    bg.x = screenW / 2;
    bg.y = screenH / 2;
    
    // Scale to cover
    const tex = bg.texture;
    if (tex.width > 0 && tex.height > 0) {
      const scaleX = screenW / tex.width;
      const scaleY = screenH / tex.height;
      bg.scale.set(Math.max(scaleX, scaleY));
    }
  }

  onResize(): void {
    super.onResize();
    this.layoutAsyncBackground();
  }

  onStop(): void {
    super.onStop();
    
    // Clean up based on current mode
    if (this.mode === 'literal') {
      // Clean up interval
      if (this.moveIntervalId) {
        clearInterval(this.moveIntervalId);
        this.moveIntervalId = null;
      }
      
      // Remove slider UI
      this.removeSliderUI();
      
      // Kill any ongoing GSAP animations
      gsap.killTweensOf(this.leftContainer.children);
      gsap.killTweensOf(this.rightContainer.children);
    }
    
    // Reset mode for next entry
    this.mode = 'selection';
  }

  destroy(): void {
    this.onStop();
    this.leftStack = [];
    this.rightStack = [];
    if (this.shadowTexture) {
      this.shadowTexture.destroy(true);
      this.shadowTexture = null;
    }
    super.destroy();
  }
}
