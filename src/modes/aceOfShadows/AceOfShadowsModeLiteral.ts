import { Container, Sprite, Texture, Graphics, Point, Spritesheet } from 'pixi.js';
import { MotionBlurFilter } from '@pixi/filter-motion-blur';
import gsap from 'gsap';
import type { GameMode, GameModeContext } from '../GameMode';
import type { DeviceState } from '../../scenes/BaseGameScene';
import { LiteralModeSettingsPanel, type LiteralModeSettings } from './LiteralModeSettingsPanel';
import type { SettingsPanelContext } from '../../components/GameSettingsPanel';
import { killTweensRecursive } from '../../core';
import {
  CARD_CONFIG,
  SHADOW_CONFIG,
  POKER_SUIT_ROWS,
  CARD_BACKS,
  PANEL_UI,
  DESIGN_BOUNDS,
  getPreservedSettings,
  saveSettings,
  getDefaultSettings,
} from '../../config/aceOfShadowsSettings';

/** Animation mode for card movement */
type AnimationMode = 'linear' | 'spiral';

/** 
 * Extended Container type with card-specific properties.
 * Used for card sprites that need to track face/back state.
 */
interface CardContainer extends Container {
  faceTexture: Texture;
  textureName: string;
  isShowingFace: boolean;
}

/**
 * AceOfShadowsModeLiteral
 * 
 * Implements the literal interpretation of Task 1:
 * - 144 cards stacked in a deck
 * - Every interval, top card moves to destination stack
 * - When source is empty, bottom card from destination returns
 * - Supports linear and spiral animation modes
 * - 3D shadow system with floor and stack shadows
 */
export class AceOfShadowsModeLiteral implements GameMode {
  private context: GameModeContext;
  
  /** GSAP context for scoped animation cleanup (no global clear) */
  private gsapCtx: gsap.Context | null = null;
  
  /** Flag to prevent callbacks from accessing destroyed objects */
  private isDisposed = false;
  
  /** Get spritesheet (asserted to exist for this mode) */
  private get spritesheet(): Spritesheet | undefined {
    return this.context.spritesheet;
  }
  
  // Card stacks (use CardContainer type for proper typing)
  private leftStack: CardContainer[] = [];
  private rightStack: CardContainer[] = [];
  private leftContainer: Container = new Container();
  private rightContainer: Container = new Container();
  
  // Layers
  private shadowLayer: Container | null = null;
  private cardLayer: Container | null = null;
  private stackShadowLayer: Container | null = null;
  private movingCardLayer: Container | null = null;
  
  // Shadow system
  private shadowTexture: Texture | null = null;
  private floorShadow: Sprite | null = null;
  private stackShadow: Sprite | null = null;
  private stackShadowMask: Sprite | null = null;
  private floorY = 0;
  
  // Card textures
  private cardBackRedTexture: Texture | null = null;
  private cardBackDarkTexture: Texture | null = null;
  
  // Card dimensions
  private cardWidth = 0;
  private cardHeight = 0;
  
  // Settings UI
  private settingsPanel: LiteralModeSettingsPanel | null = null;
  
  // Animation state
  private moveIntervalId: ReturnType<typeof setInterval> | null = null;
  private isAnimating = false;
  private movingToRight = true;
  
  // Settings values
  private moveInterval: number;
  private moveDuration: number;
  private motionBlurStrength: number;
  private arcHeightA: number;
  private arcHeightB: number;
  private realisticShadows: boolean;
  private animationMode: AnimationMode;
  private keepSettings: boolean;
  private activeDeck: 'left' | 'right';
  
  // Stack shadow calculation info
  private stackShadowInfo = { visible: false, x: 0, y: 0 };
  
  constructor(context: GameModeContext) {
    this.context = context;
    
    // Load preserved settings or use defaults
    const preserved = getPreservedSettings();
    if (preserved && preserved.keepSettings) {
      this.moveInterval = preserved.interval;
      this.moveDuration = preserved.duration;
      this.motionBlurStrength = preserved.motionBlur;
      this.arcHeightA = preserved.arcHeightA;
      this.arcHeightB = preserved.arcHeightB;
      this.realisticShadows = preserved.realisticShadows;
      this.animationMode = preserved.animationMode;
      this.keepSettings = preserved.keepSettings;
      this.activeDeck = preserved.activeDeck;
    } else {
      const defaults = getDefaultSettings();
      this.moveInterval = defaults.interval;
      this.moveDuration = defaults.duration;
      this.motionBlurStrength = defaults.motionBlur;
      this.arcHeightA = defaults.arcHeightA;
      this.arcHeightB = defaults.arcHeightB;
      this.realisticShadows = defaults.realisticShadows;
      this.animationMode = defaults.animationMode;
      this.keepSettings = defaults.keepSettings;
      this.activeDeck = defaults.activeDeck;
    }
  }
  
  // ============================================================
  // GameMode Interface
  // ============================================================
  
  start(): void {
    // Reset disposed flag for new session
    this.isDisposed = false;
    
    // Initialize GSAP context for scoped animation cleanup
    this.gsapCtx = gsap.context(() => {});
    
    // Create layer hierarchy for proper z-ordering
    this.shadowLayer = new Container();
    this.cardLayer = new Container();
    
    this.context.container.addChild(this.shadowLayer);
    this.context.container.addChild(this.cardLayer);
    
    // Recreate stack containers
    this.leftContainer = new Container();
    this.rightContainer = new Container();
    
    this.cardLayer.addChild(this.leftContainer);
    this.cardLayer.addChild(this.rightContainer);
    
    // Stack shadow layer - sits ABOVE the card stacks
    this.stackShadowLayer = new Container();
    this.cardLayer.addChild(this.stackShadowLayer);
    
    // Moving card layer - ABOVE everything
    this.movingCardLayer = new Container();
    this.cardLayer.addChild(this.movingCardLayer);
    
    this.createShadowTexture();
    this.createCardStacks();
    this.createSettingsPanel();
    
    // If preserved settings had activeDeck as 'right', reset cards there
    if (this.activeDeck === 'right') {
      this.resetAllCardsTo('right');
    }
    
    this.startCardAnimation();
    
    // Set design bounds based on device state
    const deviceState = this.context.getDeviceState();
    if (deviceState === 'phonePortrait') {
      this.context.setDesignBounds({
        ...DESIGN_BOUNDS.literal,
        height: 600,
      });
    } else {
      this.context.setDesignBounds(DESIGN_BOUNDS.literal);
    }
    this.context.requestLayout();
  }
  
  stop(): void {
    // Mark as disposed FIRST to prevent callbacks from accessing destroyed objects
    this.isDisposed = true;
    
    // Save settings before cleanup
    saveSettings({
      interval: this.moveInterval,
      duration: this.moveDuration,
      motionBlur: this.motionBlurStrength,
      arcHeightA: this.arcHeightA,
      arcHeightB: this.arcHeightB,
      realisticShadows: this.realisticShadows,
      animationMode: this.animationMode,
      keepSettings: this.keepSettings,
      activeDeck: this.activeDeck,
    });
    
    // Kill all GSAP animations recursively on our containers BEFORE destroying them
    // This prevents "transform is null" errors from animations on destroyed objects
    killTweensRecursive(this.leftContainer);
    killTweensRecursive(this.rightContainer);
    if (this.movingCardLayer) {
      killTweensRecursive(this.movingCardLayer);
    }
    
    // Also revert context if it tracked anything
    this.gsapCtx?.revert();
    this.gsapCtx = null;
    
    // Stop animation interval
    if (this.moveIntervalId) {
      clearInterval(this.moveIntervalId);
      this.moveIntervalId = null;
    }
    
    // Remove settings panel
    this.removeSettingsPanel();
    
    // Clear stacks
    this.leftStack = [];
    this.rightStack = [];
    this.leftContainer.removeChildren();
    this.rightContainer.removeChildren();
    
    // Reset animation state
    this.isAnimating = false;
    this.movingToRight = true;
    
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
    if (this.shadowTexture) {
      this.shadowTexture.destroy(true);
      this.shadowTexture = null;
    }
    
    // Clean up layers
    if (this.shadowLayer) {
      this.shadowLayer.destroy({ children: true });
      this.shadowLayer = null;
    }
    this.stackShadowLayer = null;
    this.movingCardLayer = null;
    if (this.cardLayer) {
      this.cardLayer.destroy({ children: true });
      this.cardLayer = null;
    }
  }
  
  onResize(): void {
    // Scale settings panel to fit available space
    if (this.settingsPanel) {
      this.settingsPanel.onResize();
    }
  }
  
  onDeviceStateChange(newState: DeviceState, _oldState: DeviceState): void {
    if (this.settingsPanel) {
      this.settingsPanel.onDeviceStateChange(newState);
    }
    
    // Update design bounds for new device state
    if (newState === 'phonePortrait') {
      this.context.setDesignBounds({
        ...DESIGN_BOUNDS.literal,
        height: 600,
      });
    } else {
      this.context.setDesignBounds(DESIGN_BOUNDS.literal);
    }
    this.context.requestLayout();
  }
  
  // ============================================================
  // Card Stack Management
  // ============================================================
  
  private createShadowTexture(): void {
    const sampleTexture = this.spritesheet?.textures['sprite-1-1.png'];
    if (!sampleTexture) return;
    
    const w = sampleTexture.width;
    const h = sampleTexture.height;
    const radius = 8;
    
    const shadowGraphics = new Graphics();
    shadowGraphics.beginFill(0x000000);
    shadowGraphics.drawRoundedRect(0, 0, w, h, radius);
    shadowGraphics.endFill();
    
    this.shadowTexture = this.context.generateTexture(shadowGraphics);
    shadowGraphics.destroy();
  }
  
  private getPokerCardNames(): string[] {
    const names: string[] = [];
    for (const row of POKER_SUIT_ROWS) {
      for (let col = 1; col <= 13; col++) {
        names.push(`sprite-${row}-${col}.png`);
      }
    }
    return names;
  }
  
  private buildDeck(): string[] {
    const pokerCards = this.getPokerCardNames();
    const deck: string[] = [];
    
    deck.push(...pokerCards);
    deck.push(...pokerCards);
    
    const remaining = CARD_CONFIG.totalCards - deck.length;
    for (let i = 0; i < remaining; i++) {
      const randomIndex = Math.floor(Math.random() * pokerCards.length);
      deck.push(pokerCards[randomIndex]);
    }
    
    this.shuffleArray(deck);
    return deck;
  }
  
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  
  private createCardWithShadow(cardTexture: Texture, textureName: string): CardContainer {
    const cardContainer = new Container() as CardContainer;
    
    cardContainer.faceTexture = cardTexture;
    cardContainer.textureName = textureName;
    cardContainer.isShowingFace = true;
    
    if (this.shadowTexture) {
      const shadow = new Sprite(this.shadowTexture);
      shadow.anchor.set(0.5);
      shadow.x = SHADOW_CONFIG.offsetX;
      shadow.y = SHADOW_CONFIG.offsetY;
      shadow.alpha = SHADOW_CONFIG.alpha;
      cardContainer.addChild(shadow);
    }
    
    const card = new Sprite(cardTexture);
    card.anchor.set(0.5);
    card.name = 'cardSprite';
    cardContainer.addChild(card);
    
    cardContainer.scale.set(CARD_CONFIG.scale);
    
    return cardContainer;
  }
  
  private getCardSprite(cardContainer: Container): Sprite | null {
    return cardContainer.getChildByName('cardSprite') as Sprite | null;
  }
  
  private getCardShadow(cardContainer: Container): Sprite | null {
    const firstChild = cardContainer.children[0];
    return firstChild instanceof Sprite ? firstChild : null;
  }
  
  /**
   * Get appropriate card back texture based on suit (row)
   * 
   * Spritesheet suit rows:
   *   - Row 1 = Hearts (red)
   *   - Row 3 = Diamonds (red)
   *   - Row 4 = Spades (black)
   *   - Row 6 = Clubs (black)
   */
  private getCardBackTexture(textureName: string): Texture | null {
    const match = textureName.match(/sprite-(\d+)-/);
    if (match) {
      const row = parseInt(match[1]);
      // Rows 1 and 3 (Hearts and Diamonds) use red back
      if (row === 1 || row === 3) {
        return this.cardBackRedTexture;
      }
    }
    // Rows 4 and 6 (Spades and Clubs) use dark back
    return this.cardBackDarkTexture;
  }
  
  private createCardStacks(): void {
    const spritesheet = this.spritesheet;
    if (!spritesheet) return;
    
    this.cardBackRedTexture = spritesheet.textures[CARD_BACKS.red] || null;
    this.cardBackDarkTexture = spritesheet.textures[CARD_BACKS.dark] || null;
    
    const deck = this.buildDeck();
    
    const sampleTexture = spritesheet.textures['sprite-1-1.png'];
    this.cardWidth = sampleTexture ? sampleTexture.width * CARD_CONFIG.scale : 60;
    this.cardHeight = sampleTexture ? sampleTexture.height * CARD_CONFIG.scale : 90;
    
    const deckHeight = (CARD_CONFIG.totalCards - 1) * CARD_CONFIG.stackOffset + this.cardHeight;
    const centerY = 300 + deckHeight / 2 - this.cardHeight / 2;
    
    this.leftContainer.x = 200;
    this.leftContainer.y = centerY;
    this.rightContainer.x = 600;
    this.rightContainer.y = centerY;
    
    this.floorY = centerY + this.cardHeight / 2;
    
    this.createShadowSprites();
    
    for (let i = 0; i < CARD_CONFIG.totalCards; i++) {
      const textureName = deck[i];
      const texture = spritesheet.textures[textureName];
      
      if (!texture) continue;
      
      const cardContainer = this.createCardWithShadow(texture, textureName);
      cardContainer.x = 0;
      cardContainer.y = -i * CARD_CONFIG.stackOffset;
      
      this.leftContainer.addChild(cardContainer);
      this.leftStack.push(cardContainer);
    }
  }
  
  // ============================================================
  // Shadow System
  // ============================================================
  
  private createShadowSprites(): void {
    if (!this.shadowTexture || !this.shadowLayer || !this.stackShadowLayer) return;
    
    const spritesheet = this.spritesheet;
    if (!spritesheet) return;
    
    this.floorShadow = new Sprite(this.shadowTexture);
    this.floorShadow.anchor.set(0.5, 1);
    this.floorShadow.scale.set(CARD_CONFIG.scale);
    this.floorShadow.alpha = 0;
    this.shadowLayer.addChild(this.floorShadow);
    
    this.stackShadow = new Sprite(this.shadowTexture);
    this.stackShadow.anchor.set(0.5);
    this.stackShadow.scale.set(CARD_CONFIG.scale);
    this.stackShadow.alpha = 0;
    this.stackShadowLayer.addChild(this.stackShadow);
    
    const cardTexture = spritesheet.textures['sprite-1-1.png'];
    if (cardTexture) {
      this.stackShadowMask = new Sprite(cardTexture);
      this.stackShadowMask.anchor.set(0.5);
      this.stackShadowMask.scale.set(CARD_CONFIG.scale);
      this.stackShadowMask.visible = false;
      this.stackShadowLayer.addChild(this.stackShadowMask);
    }
  }
  
  private calculateStackShadow(
    cardGameX: number,
    cardGameY: number,
    leftStack: CardContainer[],
    rightStack: CardContainer[]
  ): void {
    const leftStackX = this.leftContainer.x;
    const rightStackX = this.rightContainer.x;
    const halfWidth = this.cardWidth / 2 + 10;
    
    if (Math.abs(cardGameX - leftStackX) < halfWidth && leftStack.length > 0) {
      const topCard = leftStack[leftStack.length - 1];
      const topCardY = this.leftContainer.y + topCard.y;
      
      if (cardGameY < topCardY) {
        this.stackShadowInfo.visible = true;
        this.stackShadowInfo.x = leftStackX;
        this.stackShadowInfo.y = topCardY;
        return;
      }
    }
    
    if (Math.abs(cardGameX - rightStackX) < halfWidth && rightStack.length > 0) {
      const topCard = rightStack[rightStack.length - 1];
      const topCardY = this.rightContainer.y + topCard.y;
      
      if (cardGameY < topCardY) {
        this.stackShadowInfo.visible = true;
        this.stackShadowInfo.x = rightStackX;
        this.stackShadowInfo.y = topCardY;
        return;
      }
    }
    
    this.stackShadowInfo.visible = false;
  }
  
  private updateDualShadows(cardGameX: number, _cardGameY: number, cardScaleX?: number): void {
    if (!this.floorShadow || !this.stackShadow || !this.stackShadowMask) return;
    
    this.floorShadow.x = cardGameX;
    this.floorShadow.y = this.floorY;
    
    const scaleX = cardScaleX !== undefined ? cardScaleX : CARD_CONFIG.scale;
    this.floorShadow.scale.set(scaleX, CARD_CONFIG.scale);
    
    if (this.stackShadowInfo.visible) {
      this.stackShadow.alpha = SHADOW_CONFIG.alpha;
      this.stackShadow.x = cardGameX + SHADOW_CONFIG.offsetX * CARD_CONFIG.scale;
      this.stackShadow.y = this.stackShadowInfo.y + SHADOW_CONFIG.offsetY * CARD_CONFIG.scale;
      
      this.stackShadowMask.x = this.stackShadowInfo.x;
      this.stackShadowMask.y = this.stackShadowInfo.y;
      this.stackShadowMask.visible = true;
      this.stackShadow.mask = this.stackShadowMask;
    } else {
      this.stackShadow.alpha = 0;
      this.stackShadowMask.visible = false;
      this.stackShadow.mask = null;
    }
  }
  
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
  
  // ============================================================
  // Animation System
  // ============================================================
  
  private startCardAnimation(): void {
    if (this.moveIntervalId) {
      clearInterval(this.moveIntervalId);
    }
    this.moveIntervalId = setInterval(() => {
      this.moveCard();
    }, this.moveInterval * 1000);
  }
  
  private restartAnimation(): void {
    this.startCardAnimation();
  }
  
  private moveCard(): void {
    if (this.isAnimating) return;
    
    if (this.movingToRight) {
      if (this.leftStack.length === 0) {
        this.movingToRight = false;
        this.moveCard();
        return;
      }
      this.moveTopCardToRight();
    } else {
      if (this.rightStack.length === 0) {
        this.movingToRight = true;
        this.moveCard();
        return;
      }
      this.moveBottomCardToLeft();
    }
  }
  
  private moveTopCardToRight(): void {
    const cardContainer = this.leftStack.pop()!;
    this.isAnimating = true;
    
    const targetY = -this.rightStack.length * CARD_CONFIG.stackOffset;
    
    const globalPos = this.leftContainer.toGlobal(cardContainer.position);
    const gamePos = this.cardLayer!.toLocal(globalPos);
    
    const targetGameX = this.rightContainer.x;
    const targetGameY = this.rightContainer.y + targetY;
    
    this.leftContainer.removeChild(cardContainer);
    this.movingCardLayer!.addChild(cardContainer);
    cardContainer.x = gamePos.x;
    cardContainer.y = gamePos.y;
    
    let prevX = gamePos.x;
    let prevY = gamePos.y;
    const motionBlur = new MotionBlurFilter([0, 0], 9);
    cardContainer.filters = [motionBlur];
    
    const totalDistance = Math.sqrt(
      Math.pow(targetGameX - gamePos.x, 2) + Math.pow(targetGameY - gamePos.y, 2)
    );
    const maxVelocity = totalDistance / (this.moveDuration * 60);
    
    const attachedShadow = this.getCardShadow(cardContainer);
    if (this.realisticShadows && attachedShadow && this.floorShadow) {
      attachedShadow.visible = false;
      this.floorShadow.alpha = SHADOW_CONFIG.alpha;
      this.calculateStackShadow(gamePos.x, gamePos.y, this.leftStack, this.rightStack);
      this.updateDualShadows(gamePos.x, gamePos.y);
    }
    
    const cardData = cardContainer as CardContainer;
    const cardSprite = this.getCardSprite(cardContainer);
    
    if (this.animationMode === 'spiral' && cardSprite) {
      const midY = Math.min(gamePos.y, targetGameY) - this.arcHeightA;
      const backTexture = this.getCardBackTexture(cardData.textureName);
      let flipStarted = false;
      let hasFlipped = false;
      let arcStarted = false;
      
      const leftStackX = this.leftContainer.x;
      const clearanceDistance = this.cardWidth * 1.5;
      const flipDuration = 0.4;
      const arcDuration = this.moveDuration * 0.6;
      
      const tl = gsap.timeline({
        onUpdate: () => {
          // Guard: Don't access destroyed objects
          if (this.isDisposed || !cardContainer.transform) return;
          
          const currentX = gsap.getProperty(cardContainer, 'x') as number;
          const currentY = gsap.getProperty(cardContainer, 'y') as number;
          
          const velX = currentX - prevX;
          const velY = currentY - prevY;
          const velocity = Math.sqrt(velX * velX + velY * velY);
          prevX = currentX;
          prevY = currentY;
          
          const blurScale = Math.min(velocity / (maxVelocity || 1), 1) * this.motionBlurStrength;
          const containerScale = this.context.gameContainer.scale.x;
          motionBlur.velocity = new Point(velX * blurScale * containerScale, velY * blurScale * containerScale);
          
          const isClear = Math.abs(currentX - leftStackX) > clearanceDistance;
          
          if (!arcStarted && isClear) {
            arcStarted = true;
            gsap.to(cardContainer, {
              y: midY,
              duration: arcDuration / 2,
              ease: 'power2.out',
              onComplete: () => {
                if (this.isDisposed) return;
                gsap.to(cardContainer, {
                  y: targetGameY,
                  duration: arcDuration / 2,
                  ease: 'power2.in'
                });
              }
            });
          }
          
          if (!flipStarted && isClear) {
            flipStarted = true;
            gsap.to(cardContainer.scale, {
              x: 0,
              duration: flipDuration / 2,
              ease: 'power2.in',
              onComplete: () => {
                if (this.isDisposed) return;
                if (backTexture && !hasFlipped) {
                  cardSprite.texture = backTexture;
                  hasFlipped = true;
                }
                gsap.to(cardContainer.scale, {
                  x: CARD_CONFIG.scale,
                  duration: flipDuration / 2,
                  ease: 'power2.out'
                });
              }
            });
          }
          
          if (this.realisticShadows && this.floorShadow) {
            this.calculateStackShadow(currentX, currentY, this.leftStack, this.rightStack);
            this.updateDualShadows(currentX, currentY, cardContainer.scale.x);
          }
        },
        onComplete: () => {
          if (this.isDisposed) return;
          
          gsap.killTweensOf(cardContainer);
          gsap.killTweensOf(cardContainer.scale);
          
          cardContainer.filters = [];
          cardContainer.scale.x = CARD_CONFIG.scale;
          cardData.isShowingFace = false;
          if (backTexture && !hasFlipped) {
            cardSprite.texture = backTexture;
          }
          
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
      
      tl.to(cardContainer, {
        x: targetGameX,
        duration: this.moveDuration,
        ease: 'power2.inOut'
      }, 0);
      
    } else {
      gsap.to(cardContainer, {
        x: targetGameX,
        y: targetGameY,
        duration: this.moveDuration,
        ease: 'power2.inOut',
        onUpdate: () => {
          const currentX = gsap.getProperty(cardContainer, 'x') as number;
          const currentY = gsap.getProperty(cardContainer, 'y') as number;
          
          const velX = currentX - prevX;
          const velY = currentY - prevY;
          const velocity = Math.sqrt(velX * velX + velY * velY);
          prevX = currentX;
          prevY = currentY;
          
          const blurScale = Math.min(velocity / (maxVelocity || 1), 1) * this.motionBlurStrength;
          const containerScale = this.context.gameContainer.scale.x;
          motionBlur.velocity = new Point(velX * blurScale * containerScale, velY * blurScale * containerScale);
          
          if (this.realisticShadows && this.floorShadow) {
            this.calculateStackShadow(currentX, currentY, this.leftStack, this.rightStack);
            this.updateDualShadows(currentX, currentY);
          }
        },
        onComplete: () => {
          if (this.isDisposed) return;
          
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
  
  private moveBottomCardToLeft(): void {
    const cardContainer = this.rightStack.shift()!;
    this.isAnimating = true;
    
    const targetY = -this.leftStack.length * CARD_CONFIG.stackOffset;
    
    const globalPos = this.rightContainer.toGlobal(cardContainer.position);
    const gamePos = this.context.container.toLocal(globalPos);
    
    const targetGameX = this.leftContainer.x;
    const targetGameY = this.leftContainer.y + targetY;
    
    this.rightContainer.removeChild(cardContainer);
    this.shadowLayer!.addChild(cardContainer);
    cardContainer.x = gamePos.x;
    cardContainer.y = gamePos.y;
    
    let prevX2 = gamePos.x;
    let prevY2 = gamePos.y;
    const motionBlur = new MotionBlurFilter([0, 0], 9);
    cardContainer.filters = [motionBlur];
    
    const totalDistance2 = Math.sqrt(
      Math.pow(targetGameX - gamePos.x, 2) + Math.pow(targetGameY - gamePos.y, 2)
    );
    const maxVelocity2 = totalDistance2 / (this.moveDuration * 60);
    
    const attachedShadow = this.getCardShadow(cardContainer);
    if (this.realisticShadows && attachedShadow && this.floorShadow) {
      attachedShadow.visible = false;
      this.floorShadow.alpha = SHADOW_CONFIG.alpha;
      this.calculateStackShadow(gamePos.x, gamePos.y, this.leftStack, this.rightStack);
      this.updateDualShadows(gamePos.x, gamePos.y);
    }
    
    let promotedToTop = false;
    const rightStackX = this.rightContainer.x;
    const clearanceDistance = this.cardWidth * 1.5;
    
    const cardData = cardContainer as CardContainer;
    const cardSprite = this.getCardSprite(cardContainer);
    
    if (this.animationMode === 'spiral' && cardSprite) {
      const midY = Math.min(gamePos.y, targetGameY) - this.arcHeightB;
      let flipStarted = false;
      let hasFlipped = false;
      let arcStarted = false;
      
      const flipDuration = 0.4;
      const arcDuration = this.moveDuration * 0.6;
      
      const tl = gsap.timeline({
        onUpdate: () => {
          // Guard: Don't access destroyed objects
          if (this.isDisposed || !cardContainer.transform) return;
          
          const currentX = gsap.getProperty(cardContainer, 'x') as number;
          const currentY = gsap.getProperty(cardContainer, 'y') as number;
          
          const velX2 = currentX - prevX2;
          const velY2 = currentY - prevY2;
          const velocity2 = Math.sqrt(velX2 * velX2 + velY2 * velY2);
          prevX2 = currentX;
          prevY2 = currentY;
          
          const blurScale2 = Math.min(velocity2 / (maxVelocity2 || 1), 1) * this.motionBlurStrength;
          const containerScale2 = this.context.gameContainer.scale.x;
          motionBlur.velocity = new Point(velX2 * blurScale2 * containerScale2, velY2 * blurScale2 * containerScale2);
          
          const isClear = Math.abs(currentX - rightStackX) > clearanceDistance;
          
          if (!promotedToTop && isClear) {
            promotedToTop = true;
            this.shadowLayer!.removeChild(cardContainer);
            this.movingCardLayer!.addChild(cardContainer);
            cardContainer.x = currentX;
            cardContainer.y = currentY;
          }
          
          if (!arcStarted && isClear) {
            arcStarted = true;
            gsap.to(cardContainer, {
              y: midY,
              duration: arcDuration / 2,
              ease: 'power2.out',
              onComplete: () => {
                if (this.isDisposed) return;
                gsap.to(cardContainer, {
                  y: targetGameY,
                  duration: arcDuration / 2,
                  ease: 'power2.in'
                });
              }
            });
          }
          
          if (!flipStarted && isClear) {
            flipStarted = true;
            gsap.to(cardContainer.scale, {
              x: 0,
              duration: flipDuration / 2,
              ease: 'power2.in',
              onComplete: () => {
                if (this.isDisposed) return;
                if (!hasFlipped) {
                  cardSprite.texture = cardData.faceTexture;
                  hasFlipped = true;
                }
                gsap.to(cardContainer.scale, {
                  x: CARD_CONFIG.scale,
                  duration: flipDuration / 2,
                  ease: 'power2.out'
                });
              }
            });
          }
          
          if (this.realisticShadows && this.floorShadow) {
            this.calculateStackShadow(currentX, currentY, this.leftStack, this.rightStack);
            this.updateDualShadows(currentX, currentY, cardContainer.scale.x);
          }
        },
        onComplete: () => {
          if (this.isDisposed) return;
          
          gsap.killTweensOf(cardContainer);
          gsap.killTweensOf(cardContainer.scale);
          
          cardContainer.filters = [];
          cardContainer.scale.x = CARD_CONFIG.scale;
          cardData.isShowingFace = true;
          if (!hasFlipped) {
            cardSprite.texture = cardData.faceTexture;
          }
          
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
      
      tl.to(cardContainer, {
        x: targetGameX,
        duration: this.moveDuration,
        ease: 'power2.inOut'
      }, 0);
      
    } else {
      gsap.to(cardContainer, {
        x: targetGameX,
        y: targetGameY,
        duration: this.moveDuration,
        ease: 'power2.inOut',
        onUpdate: () => {
          const currentX = gsap.getProperty(cardContainer, 'x') as number;
          const currentY = gsap.getProperty(cardContainer, 'y') as number;
          
          const velX2 = currentX - prevX2;
          const velY2 = currentY - prevY2;
          const velocity2 = Math.sqrt(velX2 * velX2 + velY2 * velY2);
          prevX2 = currentX;
          prevY2 = currentY;
          
          const blurScale2 = Math.min(velocity2 / (maxVelocity2 || 1), 1) * this.motionBlurStrength;
          const containerScale2 = this.context.gameContainer.scale.x;
          motionBlur.velocity = new Point(velX2 * blurScale2 * containerScale2, velY2 * blurScale2 * containerScale2);
          
          if (!promotedToTop && Math.abs(currentX - rightStackX) > clearanceDistance) {
            promotedToTop = true;
            this.shadowLayer!.removeChild(cardContainer);
            this.movingCardLayer!.addChild(cardContainer);
            cardContainer.x = currentX;
            cardContainer.y = currentY;
          }
          
          if (this.realisticShadows && this.floorShadow) {
            this.calculateStackShadow(currentX, currentY, this.leftStack, this.rightStack);
            this.updateDualShadows(currentX, currentY);
          }
        },
        onComplete: () => {
          if (this.isDisposed) return;
          
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
    
    this.rightStack.forEach((card, index) => {
      const newY = -index * CARD_CONFIG.stackOffset;
      gsap.to(card, {
        y: newY,
        duration: this.moveDuration * 0.5,
        ease: 'power2.out'
      });
    });
  }
  
  // ============================================================
  // Settings UI
  // ============================================================
  
  /**
   * Create the settings panel using the LiteralModeSettingsPanel component
   */
  private createSettingsPanel(): void {
    const self = this;
    
    // Create context for the settings panel
    const panelContext: SettingsPanelContext = {
      getDeviceState: () => this.context.getDeviceState(),
      getScreenSize: () => this.context.getScreenSize(),
      getGameContainerScale: () => this.context.gameContainer.scale.x,
      getGameContainerY: () => this.context.gameContainer.y,
      getContentBottomY: () => this.leftContainer.y + this.cardHeight / 2,
    };
    
    // Initial settings from current values
    const initialSettings: LiteralModeSettings = {
      moveInterval: this.moveInterval,
      moveDuration: this.moveDuration,
      motionBlurStrength: this.motionBlurStrength,
      arcHeightA: this.arcHeightA,
      arcHeightB: this.arcHeightB,
      realisticShadows: this.realisticShadows,
      animationMode: this.animationMode,
      keepSettings: this.keepSettings,
      activeDeck: this.activeDeck,
    };
    
    // Create settings panel
    this.settingsPanel = new LiteralModeSettingsPanel(
      {
        paddingX: PANEL_UI.paddingX,
        paddingY: PANEL_UI.paddingY,
        radius: PANEL_UI.radius,
        backgroundAlpha: 0.7,
        backgroundColor: 0x000000,
        designX: 400,
        designY: 540,
      },
      panelContext,
      initialSettings,
      {
        onIntervalChange: (value) => {
          self.moveInterval = value;
          self.restartAnimation();
        },
        onDurationChange: (value) => {
          self.moveDuration = value;
        },
        onBlurChange: (value) => {
          self.motionBlurStrength = value;
        },
        onArcAChange: (value) => {
          self.arcHeightA = value;
        },
        onArcBChange: (value) => {
          self.arcHeightB = value;
        },
        onShadowsChange: (value) => {
          self.realisticShadows = value;
        },
        onSpiralChange: (value) => {
          self.animationMode = value ? 'spiral' : 'linear';
        },
        onKeepSettingsChange: (value) => {
          self.keepSettings = value;
        },
        onResetDeck: (target) => {
          self.activeDeck = target;
          self.resetAllCardsTo(target);
        },
      }
    );
    
    this.context.container.addChild(this.settingsPanel);
  }
  
  /**
   * Remove the settings panel
   */
  private removeSettingsPanel(): void {
    if (this.settingsPanel) {
      this.settingsPanel.destroy({ children: true });
      this.settingsPanel = null;
    }
  }
  
  private resetAllCardsTo(target: 'left' | 'right'): void {
    // Kill animations on card containers (scoped, not global)
    gsap.killTweensOf([this.leftContainer, this.rightContainer]);
    if (this.movingCardLayer) {
      gsap.killTweensOf(this.movingCardLayer.children);
    }
    
    if (this.moveIntervalId) {
      clearInterval(this.moveIntervalId);
      this.moveIntervalId = null;
    }
    
    this.hideDualShadows();
    
    if (this.movingCardLayer) {
      this.movingCardLayer.removeChildren();
    }
    if (this.shadowLayer) {
      const children = [...this.shadowLayer.children];
      for (const child of children) {
        if (child !== this.floorShadow) {
          this.shadowLayer.removeChild(child);
        }
      }
    }
    this.leftContainer.removeChildren();
    this.rightContainer.removeChildren();
    
    this.leftStack = [];
    this.rightStack = [];
    
    this.isAnimating = false;
    this.movingToRight = target === 'left';
    
    const spritesheet = this.spritesheet;
    if (!spritesheet) return;
    
    this.cardBackRedTexture = spritesheet.textures[CARD_BACKS.red] || null;
    this.cardBackDarkTexture = spritesheet.textures[CARD_BACKS.dark] || null;
    
    const deck = this.buildDeck();
    
    const targetContainer = target === 'left' ? this.leftContainer : this.rightContainer;
    const targetStack = target === 'left' ? this.leftStack : this.rightStack;
    
    for (let i = 0; i < CARD_CONFIG.totalCards; i++) {
      const textureName = deck[i];
      const texture = spritesheet.textures[textureName];
      
      if (!texture) continue;
      
      const cardContainer = this.createCardWithShadow(texture, textureName);
      
      cardContainer.x = 0;
      cardContainer.y = -i * CARD_CONFIG.stackOffset;
      
      if (target === 'right') {
        const cardSprite = this.getCardSprite(cardContainer);
        const backTexture = this.getCardBackTexture(textureName);
        if (cardSprite && backTexture) {
          cardSprite.texture = backTexture;
          (cardContainer as CardContainer).isShowingFace = false;
        }
      }
      
      targetContainer.addChild(cardContainer);
      targetStack.push(cardContainer);
    }
    
    this.startCardAnimation();
  }
}


