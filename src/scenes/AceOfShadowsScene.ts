import { Container, Sprite, Assets, Spritesheet, Texture, Graphics, Point, BlurFilter, Text, TextStyle } from 'pixi.js';
import { MotionBlurFilter } from '@pixi/filter-motion-blur';
import type { Application } from '../core/Application';
import { BaseGameScene } from './BaseGameScene';
import { Button } from '../components/Button';
import { Slider } from '../components/Slider';
import { Toggle } from '../components/Toggle';
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

/** Card back texture names (red and dark) */
const CARD_BACK_RED = 'sprite-7-7.png';
const CARD_BACK_DARK = 'sprite-8-1.png';

/** Animation mode for card movement */
type AnimationMode = 'linear' | 'spiral';

/** Arc height for spiral animation (pixels above the straight line) */
const SPIRAL_ARC_HEIGHT = 80;

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

  /** Slider UI container (PixiJS) */
  private sliderContainer: Container | null = null;

  /** Current scene mode */
  private mode: SceneMode = 'selection';

  /** Selection screen container */
  private selectionContainer: Container | null = null;

  /** Sub-mode back button (goes to selection, not menu) */
  private subModeBackButton: Button | null = null;

  /** Realistic 3D shadows enabled */
  private realisticShadows = true;

  /** Animation mode: linear (straight) or spiral (arc + flip) */
  private animationMode: AnimationMode = 'spiral';

  /** Card back textures (red and dark) */
  private cardBackRedTexture: Texture | null = null;
  private cardBackDarkTexture: Texture | null = null;

  /** Floor shadow sprite - always at floor level, follows card X */
  private floorShadow: Sprite | null = null;

  /** Stack shadow sprite - appears on top card of stack, masked */
  private stackShadow: Sprite | null = null;

  /** Stack shadow mask sprite */
  private stackShadowMask: Sprite | null = null;

  /** Floor Y position (base level for shadows) */
  private floorY = 0;

  /** Shadow layer - always behind cards */
  private shadowLayer: Container | null = null;

  /** Card layer - contains both stacks and moving cards */
  private cardLayer: Container | null = null;

  /** Stack shadow layer - sits ABOVE card stacks for proper visibility */
  private stackShadowLayer: Container | null = null;

  /** Moving card layer - ABOVE everything, for the card currently animating */
  private movingCardLayer: Container | null = null;

  /** Card dimensions for calculations */
  private cardWidth = 0;
  private cardHeight = 0;

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
      // FIRST: Kill ALL GSAP tweens globally to prevent animation on destroyed objects
      gsap.globalTimeline.clear();
      
      // Stop animation interval
      if (this.moveIntervalId) {
        clearInterval(this.moveIntervalId);
        this.moveIntervalId = null;
      }

      // Remove slider UI
      this.removeSliderUI();

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
      
      // Clean up shadow sprites
      if (this.floorShadow) {
        this.floorShadow.destroy();
        this.floorShadow = null;
      }
      if (this.stackShadow) {
        this.stackShadow.destroy();
        this.stackShadow = null;
      }
      if (this.stackShadowMask) {
        this.stackShadowMask.destroy();
        this.stackShadowMask = null;
      }
      
      // Clean up layers
      if (this.shadowLayer) {
        this.shadowLayer.destroy({ children: true });
        this.shadowLayer = null;
      }
      // stackShadowLayer and movingCardLayer are children of cardLayer, will be destroyed with it
      this.stackShadowLayer = null;
      this.movingCardLayer = null;
      if (this.cardLayer) {
        this.cardLayer.destroy({ children: true });
        this.cardLayer = null;
      }
      
      this.realisticShadows = false;
    }
  }

  /**
   * Start the literal task implementation
   */
  private startLiteralMode(): void {
    // Reset shadow toggle to default (enabled)
    this.realisticShadows = true;
    
    // Create layer hierarchy for proper z-ordering:
    // shadowLayer → floor shadow (behind everything)
    // cardLayer → contains stacks and stackShadowLayer
    this.shadowLayer = new Container();
    this.cardLayer = new Container();
    
    // Add layers to gameContainer
    this.gameContainer.addChild(this.shadowLayer);
    this.gameContainer.addChild(this.cardLayer);
    
    // Recreate stack containers
    this.leftContainer = new Container();
    this.rightContainer = new Container();
    
    // Add stack containers to card layer
    this.cardLayer.addChild(this.leftContainer);
    this.cardLayer.addChild(this.rightContainer);
    
    // Stack shadow layer - sits ABOVE the card stacks (so shadow appears ON cards)
    this.stackShadowLayer = new Container();
    this.cardLayer.addChild(this.stackShadowLayer);
    
    // Moving card layer - ABOVE everything (moving card always on top)
    this.movingCardLayer = new Container();
    this.cardLayer.addChild(this.movingCardLayer);
    
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
   * Create PixiJS slider UI for controlling animation speed
   * Added to gameContainer so it scales with the responsive layout
   */
  private createSliderUI(): void {
    this.sliderContainer = new Container();
    
    // Background panel (wider to fit toggles and reset buttons)
    const panelWidth = 750;
    const panelHeight = 60;
    const panel = new Graphics();
    panel.beginFill(0x000000, 0.7);
    panel.drawRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 12);
    panel.endFill();
    this.sliderContainer.addChild(panel);

    // Layout: 3 sliders + 2 toggles + 2 reset buttons
    const sliderWidth = 100;
    const controlY = 5;

    // Interval slider
    const intervalSlider = new Slider({
      label: 'Interval',
      value: this.moveInterval,
      min: SLIDER_MIN,
      max: SLIDER_MAX,
      step: SLIDER_STEP,
      unit: 's',
      width: sliderWidth,
      onChange: (value) => {
        this.moveInterval = value;
        this.restartAnimation();
      }
    });
    intervalSlider.x = -285;
    intervalSlider.y = controlY;
    this.sliderContainer.addChild(intervalSlider);

    // Duration slider
    const durationSlider = new Slider({
      label: 'Duration',
      value: this.moveDuration,
      min: SLIDER_MIN,
      max: SLIDER_MAX,
      step: SLIDER_STEP,
      unit: 's',
      width: sliderWidth,
      onChange: (value) => {
        this.moveDuration = value;
      }
    });
    durationSlider.x = -165;
    durationSlider.y = controlY;
    this.sliderContainer.addChild(durationSlider);

    // Motion blur slider
    const blurSlider = new Slider({
      label: 'Blur',
      value: this.motionBlurStrength,
      min: BLUR_SLIDER_MIN,
      max: BLUR_SLIDER_MAX,
      step: BLUR_SLIDER_STEP,
      unit: '',
      decimals: 0,
      width: sliderWidth,
      onChange: (value) => {
        this.motionBlurStrength = value;
      }
    });
    blurSlider.x = -45;
    blurSlider.y = controlY;
    this.sliderContainer.addChild(blurSlider);

    // 3D Shadows toggle
    const shadowToggle = new Toggle({
      label: '3D Shadows',
      value: this.realisticShadows,
      onChange: (value) => {
        this.realisticShadows = value;
      }
    });
    shadowToggle.x = 75;
    shadowToggle.y = controlY - 10;
    this.sliderContainer.addChild(shadowToggle);

    // Spiral mode toggle (flip animation)
    const spiralToggle = new Toggle({
      label: 'Spiral',
      value: this.animationMode === 'spiral',
      onChange: (value) => {
        this.animationMode = value ? 'spiral' : 'linear';
      }
    });
    spiralToggle.x = 145;
    spiralToggle.y = controlY - 10;
    this.sliderContainer.addChild(spiralToggle);

    // Reset buttons for quick debugging
    const resetBtnStyle = {
      fontSize: 12,
      fontFamily: 'Arial',
      fill: 0xFFFFFF,
      fontWeight: 'bold' as const
    };
    const resetBtnWidth = 55;
    const resetBtnHeight = 28;

    // Reset to A (left deck)
    const resetABtn = this.createResetButton('A', resetBtnWidth, resetBtnHeight, resetBtnStyle, () => {
      this.resetAllCardsTo('left');
    });
    resetABtn.x = 230;
    resetABtn.y = controlY;
    this.sliderContainer.addChild(resetABtn);

    // Reset to B (right deck)
    const resetBBtn = this.createResetButton('B', resetBtnWidth, resetBtnHeight, resetBtnStyle, () => {
      this.resetAllCardsTo('right');
    });
    resetBBtn.x = 295;
    resetBBtn.y = controlY;
    this.sliderContainer.addChild(resetBBtn);

    // Position at bottom of game area (design coordinates)
    this.sliderContainer.x = 400; // Center of 800px design width
    this.sliderContainer.y = 550; // Near bottom of 600px design height

    // Add to gameContainer so it scales with responsive layout
    this.gameContainer.addChild(this.sliderContainer);
  }

  /**
   * Create a small reset button for the control panel
   */
  private createResetButton(
    label: string,
    width: number,
    height: number,
    style: { fontSize: number; fontFamily: string; fill: number; fontWeight: 'bold' },
    onClick: () => void
  ): Container {
    const btn = new Container();
    
    const bg = new Graphics();
    bg.beginFill(0x444444);
    bg.drawRoundedRect(-width / 2, -height / 2, width, height, 6);
    bg.endFill();
    btn.addChild(bg);
    
    const text = new Text(`Reset ${label}`, new TextStyle({
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      fill: style.fill,
      fontWeight: style.fontWeight
    }));
    text.resolution = 2;
    text.anchor.set(0.5);
    btn.addChild(text);
    
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    
    btn.on('pointerover', () => {
      bg.tint = 0x666666;
    });
    btn.on('pointerout', () => {
      bg.tint = 0xFFFFFF;
    });
    btn.on('pointerdown', onClick);
    
    return btn;
  }

  /**
   * Instantly reset all cards to one deck (for debugging)
   * Complete reset - like refreshing the page but starting with selected deck
   */
  private resetAllCardsTo(target: 'left' | 'right'): void {
    // 1. STOP EVERYTHING - Kill ALL GSAP tweens globally
    gsap.globalTimeline.clear();
    
    // 2. Stop the animation interval
    if (this.moveIntervalId) {
      clearInterval(this.moveIntervalId);
      this.moveIntervalId = null;
    }
    
    // 3. Hide and reset shadows
    this.hideDualShadows();
    
    // 4. Clear all containers completely
    if (this.movingCardLayer) {
      this.movingCardLayer.removeChildren();
    }
    if (this.shadowLayer) {
      // Keep floor shadow, remove everything else
      const children = [...this.shadowLayer.children];
      for (const child of children) {
        if (child !== this.floorShadow) {
          this.shadowLayer.removeChild(child);
        }
      }
    }
    this.leftContainer.removeChildren();
    this.rightContainer.removeChildren();
    
    // 5. Clear stack arrays
    this.leftStack = [];
    this.rightStack = [];
    
    // 6. Reset animation state
    this.isAnimating = false;
    this.movingToRight = target === 'left'; // Next move goes away from the reset deck
    
    // 7. Rebuild the deck fresh (creates new cards)
    if (!this.spritesheet) return;
    
    // Load card back textures (in case they were lost)
    this.cardBackRedTexture = this.spritesheet.textures[CARD_BACK_RED] || null;
    this.cardBackDarkTexture = this.spritesheet.textures[CARD_BACK_DARK] || null;
    
    // Build fresh deck
    const deck = this.buildDeck();
    
    // Determine which container and stack to use
    const targetContainer = target === 'left' ? this.leftContainer : this.rightContainer;
    const targetStack = target === 'left' ? this.leftStack : this.rightStack;
    
    // Create 144 fresh cards
    for (let i = 0; i < TOTAL_CARDS; i++) {
      const textureName = deck[i];
      const texture = this.spritesheet.textures[textureName];
      
      if (!texture) continue;
      
      const cardContainer = this.createCardWithShadow(texture, textureName);
      
      // Position in stack
      cardContainer.x = 0;
      cardContainer.y = -i * CARD_OFFSET;
      
      // If resetting to B, show back texture
      if (target === 'right') {
        const cardSprite = this.getCardSprite(cardContainer);
        const backTexture = this.getCardBackTexture(textureName);
        if (cardSprite && backTexture) {
          cardSprite.texture = backTexture;
          (cardContainer as any).isShowingFace = false;
        }
      }
      
      targetContainer.addChild(cardContainer);
      targetStack.push(cardContainer);
    }
    
    // 8. Restart animation
    this.startCardAnimation();
  }

  /**
   * Remove slider UI
   */
  private removeSliderUI(): void {
    if (this.sliderContainer) {
      this.sliderContainer.destroy({ children: true });
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
   * Stores the face texture for flip animation
   */
  private createCardWithShadow(cardTexture: Texture, textureName: string): Container {
    const cardContainer = new Container() as Container & { 
      faceTexture: Texture; 
      textureName: string;
      isShowingFace: boolean;
    };
    
    // Store face texture and name for flip animation
    cardContainer.faceTexture = cardTexture;
    cardContainer.textureName = textureName;
    cardContainer.isShowingFace = true;
    
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
    card.name = 'cardSprite'; // Name it for easy access
    cardContainer.addChild(card);
    
    // Scale down the card
    cardContainer.scale.set(CARD_SCALE);
    
    return cardContainer;
  }

  /**
   * Get the card sprite from a card container
   */
  private getCardSprite(cardContainer: Container): Sprite | null {
    return cardContainer.getChildByName('cardSprite') as Sprite | null;
  }

  /**
   * Get the appropriate card back texture based on card suit
   * Red suits (hearts, diamonds) use red back; black suits (spades, clubs) use dark back
   */
  private getCardBackTexture(textureName: string): Texture | null {
    // Red suits are in rows 1 and 4 (hearts, diamonds)
    // Dark suits are in rows 3 and 6 (spades, clubs)
    const match = textureName.match(/sprite-(\d+)-/);
    if (match) {
      const row = parseInt(match[1]);
      // Rows 1, 4 are red suits; rows 3, 6 are dark suits
      if (row === 1 || row === 4) {
        return this.cardBackRedTexture;
      }
    }
    return this.cardBackDarkTexture;
  }

  /**
   * Create both shadow sprites for 3D shadow effect
   * - floorShadow: In shadowLayer (behind cards), at floor level
   * - stackShadow: In stackShadowLayer (above cards), masked by card shape
   */
  private createShadowSprites(): void {
    if (!this.shadowTexture || !this.shadowLayer || !this.stackShadowLayer || !this.spritesheet) return;
    
    // Floor shadow - in shadowLayer (behind everything)
    // Anchor at bottom center so shadow sits ON the floor, not extending below
    this.floorShadow = new Sprite(this.shadowTexture);
    this.floorShadow.anchor.set(0.5, 1);
    this.floorShadow.scale.set(CARD_SCALE);
    this.floorShadow.alpha = 0;
    this.shadowLayer.addChild(this.floorShadow);
    
    // Stack shadow - in stackShadowLayer (ABOVE card stacks, so visible ON cards)
    this.stackShadow = new Sprite(this.shadowTexture);
    this.stackShadow.anchor.set(0.5);
    this.stackShadow.scale.set(CARD_SCALE);
    this.stackShadow.alpha = 0;
    this.stackShadowLayer.addChild(this.stackShadow);
    
    // Mask for stack shadow - use a CARD texture for proper clipping
    const cardTexture = this.spritesheet.textures['sprite-1-1.png'];
    if (cardTexture) {
      this.stackShadowMask = new Sprite(cardTexture);
      this.stackShadowMask.anchor.set(0.5);
      this.stackShadowMask.scale.set(CARD_SCALE);
      this.stackShadowMask.visible = false;
      this.stackShadowLayer.addChild(this.stackShadowMask);
    }
  }

  /**
   * Shadow projection info for the stack shadow
   */
  private stackShadowInfo: {
    visible: boolean;
    x: number;
    y: number;
  } = { visible: false, x: 0, y: 0 };

  /**
   * Calculate stack shadow visibility and position
   * Called each frame during animation to determine if card is over a stack
   * 
   * Stack shadow only appears if:
   * 1. Card is over a stack with cards
   * 2. Moving card is ABOVE the top card of that stack (can cast shadow down onto it)
   */
  private calculateStackShadow(
    cardGameX: number,
    cardGameY: number,
    leftStack: Container[],
    rightStack: Container[]
  ): void {
    const leftStackX = this.leftContainer.x;
    const rightStackX = this.rightContainer.x;
    
    // Hit detection width
    const halfWidth = this.cardWidth / 2 + 10;
    
    // Check if over left stack
    if (Math.abs(cardGameX - leftStackX) < halfWidth && leftStack.length > 0) {
      const topCard = leftStack[leftStack.length - 1];
      const topCardY = this.leftContainer.y + topCard.y;
      
      // Only show stack shadow if moving card is ABOVE the top card
      // (lower Y value = higher position on screen)
      if (cardGameY < topCardY) {
        this.stackShadowInfo.visible = true;
        this.stackShadowInfo.x = leftStackX;
        this.stackShadowInfo.y = topCardY;
        return;
      }
    }
    
    // Check if over right stack
    if (Math.abs(cardGameX - rightStackX) < halfWidth && rightStack.length > 0) {
      const topCard = rightStack[rightStack.length - 1];
      const topCardY = this.rightContainer.y + topCard.y;
      
      // Only show stack shadow if moving card is ABOVE the top card
      if (cardGameY < topCardY) {
        this.stackShadowInfo.visible = true;
        this.stackShadowInfo.x = rightStackX;
        this.stackShadowInfo.y = topCardY;
        return;
      }
    }
    
    // Not over any stack, or card is below the top card
    this.stackShadowInfo.visible = false;
  }

  /**
   * Update both shadows based on current card position
   * - floorShadow: Always visible at floor Y, follows card X
   * - stackShadow: Only visible when over a stack, masked by top card
   */
  private updateDualShadows(cardGameX: number, _cardGameY: number): void {
    if (!this.floorShadow || !this.stackShadow || !this.stackShadowMask) return;
    
    // Floor shadow - always at floor level, follows card X
    // Same size as card, aligned with bottom of decks
    this.floorShadow.x = cardGameX;
    this.floorShadow.y = this.floorY;
    // Keep shadow same size as cards (no dynamic scaling)
    this.floorShadow.scale.set(CARD_SCALE);
    
    // Stack shadow - only when over a stack (ON the top card surface)
    if (this.stackShadowInfo.visible) {
      this.stackShadow.alpha = SHADOW_ALPHA;
      // Position shadow at card's X with offset (like attached shadows)
      this.stackShadow.x = cardGameX + SHADOW_OFFSET_X * CARD_SCALE;
      this.stackShadow.y = this.stackShadowInfo.y + SHADOW_OFFSET_Y * CARD_SCALE;
      
      // Position mask at the top card (no offset - mask is the card itself)
      this.stackShadowMask.x = this.stackShadowInfo.x;
      this.stackShadowMask.y = this.stackShadowInfo.y;
      this.stackShadowMask.visible = true;
      this.stackShadow.mask = this.stackShadowMask;
    } else {
      // Hide stack shadow when not over a stack
      this.stackShadow.alpha = 0;
      this.stackShadowMask.visible = false;
      this.stackShadow.mask = null;
    }
  }

  /**
   * Hide both shadows (called when animation completes)
   */
  private hideDualShadows(): void {
    if (this.floorShadow) {
      this.floorShadow.alpha = 0;
    }
    if (this.stackShadow) {
      this.stackShadow.alpha = 0;
      this.stackShadow.mask = null;
    }
    if (this.stackShadowMask) {
      this.stackShadowMask.visible = false;
    }
  }

  /**
   * Get the attached shadow sprite from a card container
   */
  private getCardShadow(cardContainer: Container): Sprite | null {
    // Shadow is the first child of the card container
    const firstChild = cardContainer.children[0];
    return firstChild instanceof Sprite ? firstChild : null;
  }

  /**
   * Create the initial card stacks
   */
  private createCardStacks(): void {
    if (!this.spritesheet) return;
    
    // Load card back textures
    this.cardBackRedTexture = this.spritesheet.textures[CARD_BACK_RED] || null;
    this.cardBackDarkTexture = this.spritesheet.textures[CARD_BACK_DARK] || null;
    
    // Build the deck with proper poker cards
    const deck = this.buildDeck();
    
    // Get card dimensions for centering calculation
    const sampleTexture = this.spritesheet.textures['sprite-1-1.png'];
    this.cardWidth = sampleTexture ? sampleTexture.width * CARD_SCALE : 60;
    this.cardHeight = sampleTexture ? sampleTexture.height * CARD_SCALE : 90;
    
    // Calculate total deck height (cards stack upward with negative Y)
    const deckHeight = (TOTAL_CARDS - 1) * CARD_OFFSET + this.cardHeight;
    
    // Position stacks: centered vertically, with deck bottom at center
    // The deck grows upward (negative Y), so position at vertical center + half deck height
    const centerY = 300 + deckHeight / 2 - this.cardHeight / 2;
    
    this.leftContainer.x = 200;
    this.leftContainer.y = centerY;
    this.rightContainer.x = 600;
    this.rightContainer.y = centerY;
    
    // Floor Y = actual bottom edge of the stack (where shadows should land)
    // Card centers are at centerY, so floor is at centerY + half card height
    this.floorY = centerY + this.cardHeight / 2;
    
    // Create both shadow sprites (floor + stack)
    this.createShadowSprites();
    
    // Create 144 cards in the left stack
    for (let i = 0; i < TOTAL_CARDS; i++) {
      const textureName = deck[i];
      const texture = this.spritesheet.textures[textureName];
      
      if (!texture) continue;
      
      const cardContainer = this.createCardWithShadow(texture, textureName);
      
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

    // Target position on right stack (in rightContainer local coords)
    const targetY = -this.rightStack.length * CARD_OFFSET;

    // Get card's current position in game coordinates
    const globalPos = this.leftContainer.toGlobal(cardContainer.position);
    const gamePos = this.cardLayer!.toLocal(globalPos);

    // Calculate target position in game coordinates
    const targetGameX = this.rightContainer.x;
    const targetGameY = this.rightContainer.y + targetY;

    // Move card to movingCardLayer (on top of everything during animation)
    this.leftContainer.removeChild(cardContainer);
    this.movingCardLayer!.addChild(cardContainer);
    cardContainer.x = gamePos.x;
    cardContainer.y = gamePos.y;

    // For motion blur calculation
    const localPos = { x: gamePos.x - targetGameX, y: gamePos.y - targetGameY };

    // Calculate velocity direction for motion blur
    const deltaX = 0 - localPos.x;
    const deltaY = targetY - localPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const normalizedX = distance > 0 ? (deltaX / distance) * this.motionBlurStrength : 0;
    const normalizedY = distance > 0 ? (deltaY / distance) * this.motionBlurStrength : 0;

    // Apply motion blur filter
    const motionBlur = new MotionBlurFilter([normalizedX, normalizedY], 9);
    cardContainer.filters = [motionBlur];

    // 3D Shadow handling - dual shadow system
    const attachedShadow = this.getCardShadow(cardContainer);
    if (this.realisticShadows && attachedShadow && this.floorShadow) {
      // Hide attached shadow on moving card
      attachedShadow.visible = false;
      
      // Show floor shadow
      this.floorShadow.alpha = SHADOW_ALPHA;
      
      // Initial shadow positions (card is now in game coordinates)
      this.calculateStackShadow(gamePos.x, gamePos.y, this.leftStack, this.rightStack);
      this.updateDualShadows(gamePos.x, gamePos.y);
    }

    // Get card data for texture swapping
    const cardData = cardContainer as Container & { 
      faceTexture: Texture; 
      textureName: string;
      isShowingFace: boolean;
    };
    const cardSprite = this.getCardSprite(cardContainer);

    if (this.animationMode === 'spiral' && cardSprite) {
      // SPIRAL MODE: Arc + Flip animation
      // NOTE: Card moves STRAIGHT first, then arc + flip after clearing A deck
      const midY = Math.min(gamePos.y, targetGameY) - SPIRAL_ARC_HEIGHT;
      const backTexture = this.getCardBackTexture(cardData.textureName);
      let flipStarted = false;
      let hasFlipped = false;
      let arcStarted = false;
      
      // Clearance: card must be more than one card width away from source deck EDGE
      // Deck edge is at center + cardWidth/2, so total distance from center = 1.5 * cardWidth
      const leftStackX = this.leftContainer.x;
      const clearanceDistance = this.cardWidth * 1.5;
      const flipDuration = 0.4; // Fixed flip duration for responsive feel
      
      // Calculate remaining distance after clearance for arc timing
      const totalXDistance = Math.abs(gamePos.x - targetGameX);
      const arcDuration = this.moveDuration * 0.6; // Arc takes 60% of remaining time after clearance

      // Create timeline for coordinated animation
      const tl = gsap.timeline({
        onUpdate: () => {
          const currentX = gsap.getProperty(cardContainer, 'x') as number;
          const currentY = gsap.getProperty(cardContainer, 'y') as number;
          
          // Update motion blur
          const progress = Math.abs(currentX - targetGameX);
          const total = totalXDistance || 1;
          const remaining = progress / total;
          motionBlur.velocity = new Point(normalizedX * remaining, normalizedY * remaining);
          
          // Check clearance: card center must be more than 1.5x card width from A deck center
          const isClear = Math.abs(currentX - leftStackX) > clearanceDistance;
          
          // Start arc animation when clear (triggered once)
          if (!arcStarted && isClear) {
            arcStarted = true;
            // Arc: go up then down
            gsap.to(cardContainer, {
              y: midY,
              duration: arcDuration / 2,
              ease: 'power2.out',
              onComplete: () => {
                gsap.to(cardContainer, {
                  y: targetGameY,
                  duration: arcDuration / 2,
                  ease: 'power2.in'
                });
              }
            });
          }
          
          // Start flip animation when clear (triggered once)
          if (!flipStarted && isClear) {
            flipStarted = true;
            // Dynamic flip: scale.x 1 → 0 → 1 (face to back)
            gsap.to(cardContainer.scale, {
              x: 0,
              duration: flipDuration / 2,
              ease: 'power2.in',
              onComplete: () => {
                if (backTexture && !hasFlipped) {
                  cardSprite.texture = backTexture;
                  hasFlipped = true;
                }
                gsap.to(cardContainer.scale, {
                  x: CARD_SCALE,
                  duration: flipDuration / 2,
                  ease: 'power2.out'
                });
              }
            });
          }
          
          // Update dual shadows
          if (this.realisticShadows && this.floorShadow) {
            this.calculateStackShadow(currentX, currentY, this.leftStack, this.rightStack);
            this.updateDualShadows(currentX, currentY);
          }
        },
        onComplete: () => {
          // Kill any nested tweens that might still be running (arc/flip)
          gsap.killTweensOf(cardContainer);
          gsap.killTweensOf(cardContainer.scale);
          
          cardContainer.filters = [];
          cardContainer.scale.x = CARD_SCALE; // Reset scale
          cardData.isShowingFace = false; // Now showing back
          // Ensure back texture is shown (in case flip didn't complete)
          if (backTexture && !hasFlipped) {
            cardSprite.texture = backTexture;
          }
          
          // Move to destination
          this.movingCardLayer!.removeChild(cardContainer);
          this.rightContainer.addChild(cardContainer);
          cardContainer.x = 0;
          cardContainer.y = targetY;
          
          this.rightStack.push(cardContainer);
          this.isAnimating = false;
          
          if (attachedShadow) attachedShadow.visible = true;
          this.hideDualShadows();
        }
      });

      // X movement - straight line the entire way
      tl.to(cardContainer, {
        x: targetGameX,
        duration: this.moveDuration,
        ease: 'power2.inOut'
      }, 0);
      
      // Y stays at initial position - arc is triggered dynamically when clear

    } else {
      // LINEAR MODE: Straight movement (existing behavior)
      gsap.to(cardContainer, {
        x: targetGameX,
        y: targetGameY,
        duration: this.moveDuration,
        ease: 'power2.inOut',
        onUpdate: () => {
          const currentX = gsap.getProperty(cardContainer, 'x') as number;
          const progress = Math.abs(currentX - targetGameX);
          const total = Math.abs(gamePos.x - targetGameX) || 1;
          const remaining = progress / total;
          motionBlur.velocity = new Point(normalizedX * remaining, normalizedY * remaining);
          
          if (this.realisticShadows && this.floorShadow) {
            const cardGameX = gsap.getProperty(cardContainer, 'x') as number;
            const cardGameY = gsap.getProperty(cardContainer, 'y') as number;
            this.calculateStackShadow(cardGameX, cardGameY, this.leftStack, this.rightStack);
            this.updateDualShadows(cardGameX, cardGameY);
          }
        },
        onComplete: () => {
          cardContainer.filters = [];
          
          this.movingCardLayer!.removeChild(cardContainer);
          this.rightContainer.addChild(cardContainer);
          cardContainer.x = 0;
          cardContainer.y = targetY;
          
          this.rightStack.push(cardContainer);
          this.isAnimating = false;
          
          if (attachedShadow) attachedShadow.visible = true;
          this.hideDualShadows();
        }
      });
    }
  }

  /**
   * Move the bottom card from right stack to left stack
   * The remaining cards in right stack "fall down" to fill the gap
   * 
   * Note: Bottom card stays BEHIND the stacks during animation (in shadowLayer)
   * because it's coming from the bottom of the source stack.
   */
  private moveBottomCardToLeft(): void {
    // Take the bottom card (index 0)
    const cardContainer = this.rightStack.shift()!;
    this.isAnimating = true;

    // Target position on left stack (in leftContainer local coords)
    const targetY = -this.leftStack.length * CARD_OFFSET;

    // Get card's current position in game coordinates
    const globalPos = this.rightContainer.toGlobal(cardContainer.position);
    const gamePos = this.gameContainer.toLocal(globalPos);

    // Calculate target position in game coordinates (relative to gameContainer)
    const targetGameX = this.leftContainer.x;
    const targetGameY = this.leftContainer.y + targetY;

    // Move card to shadowLayer (BEHIND stacks) since it's coming from the bottom
    // This keeps it behind the source stack during animation
    this.rightContainer.removeChild(cardContainer);
    this.shadowLayer!.addChild(cardContainer);
    cardContainer.x = gamePos.x;
    cardContainer.y = gamePos.y;

    // For motion blur calculation
    const deltaX = targetGameX - gamePos.x;
    const deltaY = targetGameY - gamePos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const normalizedX = distance > 0 ? (deltaX / distance) * this.motionBlurStrength : 0;
    const normalizedY = distance > 0 ? (deltaY / distance) * this.motionBlurStrength : 0;

    // Apply motion blur filter
    const motionBlur = new MotionBlurFilter([normalizedX, normalizedY], 9);
    cardContainer.filters = [motionBlur];

    // 3D Shadow handling - dual shadow system
    const attachedShadow = this.getCardShadow(cardContainer);
    if (this.realisticShadows && attachedShadow && this.floorShadow) {
      // Hide attached shadow on moving card
      attachedShadow.visible = false;
      
      // Show floor shadow
      this.floorShadow.alpha = SHADOW_ALPHA;
      
      // Initial shadow positions (card is now in game coordinates)
      this.calculateStackShadow(gamePos.x, gamePos.y, this.leftStack, this.rightStack);
      this.updateDualShadows(gamePos.x, gamePos.y);
    }

    // Track if card has been promoted to top layer
    // Track z-order promotion and clearance distance
    // Card must be more than one card width away from source deck EDGE
    // Deck edge is at center - cardWidth/2, so total distance from center = 1.5 * cardWidth
    let promotedToTop = false;
    const rightStackX = this.rightContainer.x;
    const clearanceDistance = this.cardWidth * 1.5;

    // Get card data for texture swapping
    const cardData = cardContainer as Container & { 
      faceTexture: Texture; 
      textureName: string;
      isShowingFace: boolean;
    };
    const cardSprite = this.getCardSprite(cardContainer);

    if (this.animationMode === 'spiral' && cardSprite) {
      // SPIRAL MODE: Straight line first, then Arc + Flip
      // Card moves in straight line until it clears B deck, then arcs and flips
      const midY = Math.min(gamePos.y, targetGameY) - SPIRAL_ARC_HEIGHT;
      let flipStarted = false;
      let hasFlipped = false;
      let arcStarted = false;
      
      const flipDuration = 0.4; // Fixed flip duration for responsive feel
      
      // Calculate remaining distance after clearance for arc timing
      const totalXDistance = Math.abs(gamePos.x - targetGameX);
      const arcDuration = this.moveDuration * 0.6; // Arc takes 60% of remaining time after clearance
      
      const tl = gsap.timeline({
        onUpdate: () => {
          const currentX = gsap.getProperty(cardContainer, 'x') as number;
          const currentY = gsap.getProperty(cardContainer, 'y') as number;
          
          // Update motion blur
          const progress = Math.abs(currentX - targetGameX);
          const total = totalXDistance || 1;
          const remaining = progress / total;
          motionBlur.velocity = new Point(normalizedX * remaining, normalizedY * remaining);
          
          // Check clearance: card center must be more than 1.5x card width from B deck center
          const isClear = Math.abs(currentX - rightStackX) > clearanceDistance;
          
          // Promote to top layer when clear of B deck
          if (!promotedToTop && isClear) {
            promotedToTop = true;
            this.shadowLayer!.removeChild(cardContainer);
            this.movingCardLayer!.addChild(cardContainer);
            cardContainer.x = currentX;
            cardContainer.y = currentY;
          }
          
          // Start arc animation when clear (triggered once)
          if (!arcStarted && isClear) {
            arcStarted = true;
            // Arc: go up then down
            gsap.to(cardContainer, {
              y: midY,
              duration: arcDuration / 2,
              ease: 'power2.out',
              onComplete: () => {
                gsap.to(cardContainer, {
                  y: targetGameY,
                  duration: arcDuration / 2,
                  ease: 'power2.in'
                });
              }
            });
          }
          
          // Start flip animation when clear (triggered once)
          if (!flipStarted && isClear) {
            flipStarted = true;
            // Dynamic flip: scale.x 1 → 0 → 1 (back to face)
            gsap.to(cardContainer.scale, {
              x: 0,
              duration: flipDuration / 2,
              ease: 'power2.in',
              onComplete: () => {
                if (!hasFlipped) {
                  cardSprite.texture = cardData.faceTexture;
                  hasFlipped = true;
                }
                gsap.to(cardContainer.scale, {
                  x: CARD_SCALE,
                  duration: flipDuration / 2,
                  ease: 'power2.out'
                });
              }
            });
          }
          
          // Update dual shadows
          if (this.realisticShadows && this.floorShadow) {
            this.calculateStackShadow(currentX, currentY, this.leftStack, this.rightStack);
            this.updateDualShadows(currentX, currentY);
          }
        },
        onComplete: () => {
          // Kill any nested tweens that might still be running (arc/flip)
          gsap.killTweensOf(cardContainer);
          gsap.killTweensOf(cardContainer.scale);
          
          cardContainer.filters = [];
          cardContainer.scale.x = CARD_SCALE;
          cardData.isShowingFace = true; // Now showing face
          // Ensure face texture is shown (in case flip didn't complete)
          if (!hasFlipped) {
            cardSprite.texture = cardData.faceTexture;
          }
          
          // Move to destination
          if (promotedToTop) {
            this.movingCardLayer!.removeChild(cardContainer);
          } else {
            this.shadowLayer!.removeChild(cardContainer);
          }
          this.leftContainer.addChild(cardContainer);
          cardContainer.x = 0;
          cardContainer.y = targetY;
          
          this.leftStack.push(cardContainer);
          this.isAnimating = false;
          
          if (attachedShadow) attachedShadow.visible = true;
          this.hideDualShadows();
        }
      });

      // X movement - straight line the entire way
      tl.to(cardContainer, {
        x: targetGameX,
        duration: this.moveDuration,
        ease: 'power2.inOut'
      }, 0);
      
      // Y stays at initial position - arc is triggered dynamically when clear

    } else {
      // LINEAR MODE: Straight movement
      gsap.to(cardContainer, {
        x: targetGameX,
        y: targetGameY,
        duration: this.moveDuration,
        ease: 'power2.inOut',
        onUpdate: () => {
          const currentX = gsap.getProperty(cardContainer, 'x') as number;
          const progress = Math.abs(currentX - targetGameX);
          const total = Math.abs(gamePos.x - targetGameX) || 1;
          const remaining = progress / total;
          motionBlur.velocity = new Point(normalizedX * remaining, normalizedY * remaining);
          
          if (!promotedToTop && Math.abs(currentX - rightStackX) > clearanceDistance) {
            promotedToTop = true;
            const currentY = gsap.getProperty(cardContainer, 'y') as number;
            this.shadowLayer!.removeChild(cardContainer);
            this.movingCardLayer!.addChild(cardContainer);
            cardContainer.x = currentX;
            cardContainer.y = currentY;
          }
          
          if (this.realisticShadows && this.floorShadow) {
            const cardGameX = gsap.getProperty(cardContainer, 'x') as number;
            const cardGameY = gsap.getProperty(cardContainer, 'y') as number;
            this.calculateStackShadow(cardGameX, cardGameY, this.leftStack, this.rightStack);
            this.updateDualShadows(cardGameX, cardGameY);
          }
        },
        onComplete: () => {
          cardContainer.filters = [];
          
          if (promotedToTop) {
            this.movingCardLayer!.removeChild(cardContainer);
          } else {
            this.shadowLayer!.removeChild(cardContainer);
          }
          this.leftContainer.addChild(cardContainer);
          cardContainer.x = 0;
          cardContainer.y = targetY;
          
          this.leftStack.push(cardContainer);
          this.isAnimating = false;
          
          if (attachedShadow) attachedShadow.visible = true;
          this.hideDualShadows();
        }
      });
    }

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
    
    // FIRST: Kill ALL GSAP tweens globally to prevent animation on destroyed objects
    gsap.globalTimeline.clear();
    
    // Clean up based on current mode
    if (this.mode === 'literal') {
      // Clean up interval
      if (this.moveIntervalId) {
        clearInterval(this.moveIntervalId);
        this.moveIntervalId = null;
      }
      
      // Remove slider UI
      this.removeSliderUI();
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
    if (this.floorShadow) {
      this.floorShadow.destroy();
      this.floorShadow = null;
    }
    super.destroy();
  }
}
