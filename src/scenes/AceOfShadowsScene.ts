import { Container, Sprite, Assets, Spritesheet, Texture, Graphics } from 'pixi.js';
import type { Application } from '../core/Application';
import { BaseGameScene } from './BaseGameScene';
import gsap from 'gsap';

// Spritesheet assets
import spritesheetJson from '../assets/sprites/ultimate-minimalist-card-asset/ace-of-shadows-spritesheet.json';
import spritesheetPng from '../assets/sprites/ultimate-minimalist-card-asset/ace-of-shadows-spritesheet.png';

/** Card stack offset (pixels between cards in a stack) */
const CARD_OFFSET = 0.5;

/** Number of cards in the deck */
const TOTAL_CARDS = 144;

/** Time between card moves (seconds) */
const MOVE_INTERVAL = 0.1;

/** Animation duration for card movement (seconds) */
const MOVE_DURATION = 0.2;

/** Shadow offset from card */
const SHADOW_OFFSET_X = 3;
const SHADOW_OFFSET_Y = 3;

/** Shadow opacity */
const SHADOW_ALPHA = 0.35;

/** Card scale (1 = original size, 0.5 = half size) */
const CARD_SCALE = 0.5;

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

  constructor(app: Application, onBack: () => void) {
    super(app, {
      title: 'Ace of Shadows',
      onBack,
    });
  }

  protected async buildContent(): Promise<void> {
    await this.loadSpritesheet();
    this.createShadowTexture();
    this.createCardStacks();
    this.startCardAnimation();
  }

  /**
   * Load the spritesheet and extract textures
   */
  private async loadSpritesheet(): Promise<void> {
    const texture = await Assets.load(spritesheetPng);
    this.spritesheet = new Spritesheet(texture, spritesheetJson);
    await this.spritesheet.parse();
    
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
    this.moveIntervalId = setInterval(() => {
      this.moveCard();
    }, MOVE_INTERVAL * 1000);
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

    // Animate to final position
    gsap.to(cardContainer, {
      x: 0,
      y: targetY,
      duration: MOVE_DURATION,
      ease: 'power2.inOut',
      onComplete: () => {
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

    // Animate the moved card to left stack
    gsap.to(cardContainer, {
      x: 0,
      y: targetY,
      duration: MOVE_DURATION,
      ease: 'power2.inOut',
      onComplete: () => {
        this.leftStack.push(cardContainer);
        this.isAnimating = false;
      }
    });

    // Animate remaining cards in right stack to "fall down" (fill the gap)
    this.rightStack.forEach((card, index) => {
      const newY = -index * CARD_OFFSET;
      gsap.to(card, {
        y: newY,
        duration: MOVE_DURATION * 0.5,
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
    
    // Clean up interval
    if (this.moveIntervalId) {
      clearInterval(this.moveIntervalId);
      this.moveIntervalId = null;
    }
    
    // Kill any ongoing GSAP animations
    gsap.killTweensOf(this.leftContainer.children);
    gsap.killTweensOf(this.rightContainer.children);
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
