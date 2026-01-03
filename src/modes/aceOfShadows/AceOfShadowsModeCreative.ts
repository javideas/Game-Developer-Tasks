import gsap from 'gsap';
import { Container, Sprite, Texture, Graphics, Text, TextStyle, Spritesheet } from 'pixi.js';

import {
  DESIGN_BOUNDS,
  TRIPEAKS_CONFIG,
  POKER_SUIT_ROWS,
  CARD_BACKS,
  TABLEAU_LAYOUTS,
  type TableauLayoutType,
  type TableauLayout,
} from '../../config/aceOfShadowsSettings';
import { killTweensRecursive } from '../../core';
import type { DeviceState } from '../../scenes/BaseGameScene';
import type { GameMode, GameModeContext } from '../GameMode';

/**
 * Represents a card in the TriPeaks tableau
 *
 * Face-down cards have deferred identity - textureName/rank are assigned when revealed.
 */
interface TableauCard {
  /** Grid position */
  row: number;
  col: number;

  /** Card identity (null for unassigned face-down cards) */
  textureName: string | null;
  faceTexture: Texture | null;
  backTexture: Texture;

  /** Card rank (1-13, where 1=Ace, 11=J, 12=Q, 13=K), 0 if unassigned */
  rank: number;

  /** State */
  isFaceUp: boolean;
  isRemoved: boolean;

  /** Visual container */
  container: Container;

  /** Cards in the row below that block this card (must be removed to reveal) */
  blockedBy: TableauCard[];
}

/**
 * AceOfShadowsModeCreative
 *
 * Creative interpretation of Task 1: TriPeaks Solitaire layout
 * Inspired by Solitaire Home Story by SOFTGAMES.
 *
 * Phase 1: Static layout with pyramid tableau, stock pile, and waste pile.
 * Phase 2: Click-to-fly animation with card flip.
 * Phase 3: Blocking logic and card reveal.
 * Phase 4: ±1 matching rules and smart draw.
 */
export class AceOfShadowsModeCreative implements GameMode {
  private context: GameModeContext;

  /** GSAP context for scoped animation cleanup (no global clear) */
  private gsapCtx: gsap.Context | null = null;

  /** Flag to prevent callbacks from accessing destroyed objects */
  private isDisposed = false;

  /** Get spritesheet (asserted to exist for this mode) */
  private get spritesheet(): Spritesheet {
    const ss = this.context.spritesheet;
    if (!ss) throw new Error('AceOfShadowsModeCreative requires a spritesheet');
    return ss;
  }

  // Layers (z-order from bottom to top)
  private tableauLayer: Container | null = null;
  private playerAreaLayer: Container | null = null;
  private flyingCardLayer: Container | null = null;

  // Card data
  private tableauCards: TableauCard[][] = [];
  private wasteCard: TableauCard | null = null;

  // Stock pile visuals
  private stockPile: Container | null = null;
  private stockCountText: Text | null = null;

  // Waste pile visual
  private wastePile: Container | null = null;

  // Textures
  private shadowTexture: Texture | null = null;
  private cardBackRedTexture: Texture | null = null;
  private cardBackDarkTexture: Texture | null = null;

  // Card dimensions (calculated from spritesheet)
  private cardWidth = 0;
  private cardHeight = 0;

  // Animation state
  private isAnimating = false;

  // Deferred card assignment - pool of unassigned card texture names
  private unassignedCards: string[] = [];

  // Game state
  private gameEnded = false;
  private messageOverlay: Container | null = null;

  // Layout selection
  private currentLayoutType: TableauLayoutType = TRIPEAKS_CONFIG.defaultLayout;
  private currentLayout: TableauLayout = TABLEAU_LAYOUTS[this.currentLayoutType];

  // Layout selector UI
  private layoutSelector: Container | null = null;

  constructor(context: GameModeContext) {
    this.context = context;
  }

  // ============================================================
  // GameMode Interface
  // ============================================================

  start(): void {
    // Reset disposed flag for new session
    this.isDisposed = false;

    // Initialize GSAP context for scoped animation cleanup
    this.gsapCtx = gsap.context(() => {});

    // Create layer hierarchy
    this.tableauLayer = new Container();
    this.playerAreaLayer = new Container();
    this.flyingCardLayer = new Container();

    this.context.container.addChild(this.tableauLayer);
    this.context.container.addChild(this.playerAreaLayer);
    this.context.container.addChild(this.flyingCardLayer);

    // Initialize textures
    this.initTextures();

    // Build the layout
    this.buildTableau();
    this.buildBlockingRelationships();
    this.buildStockPile();
    this.buildWastePile();

    // Build layout selector UI
    this.buildLayoutSelector();

    // Update visual state of all cards
    this.updateAllCardVisuals();

    // Debug: Log initial state
    this.logGameState('STARTUP');

    // Set design bounds and trigger layout
    this.context.setDesignBounds(DESIGN_BOUNDS.creative);
    this.context.requestLayout();
  }

  stop(): void {
    // Mark as disposed FIRST to prevent callbacks from accessing destroyed objects
    this.isDisposed = true;

    // Kill all GSAP animations recursively on our containers BEFORE destroying them
    // This prevents "transform is null" errors from animations on destroyed objects
    if (this.tableauLayer) {
      killTweensRecursive(this.tableauLayer);
    }
    if (this.playerAreaLayer) {
      killTweensRecursive(this.playerAreaLayer);
    }
    if (this.flyingCardLayer) {
      killTweensRecursive(this.flyingCardLayer);
    }

    // Also revert context if it tracked anything
    this.gsapCtx?.revert();
    this.gsapCtx = null;

    // Clean up tableau cards
    this.tableauCards = [];
    this.wasteCard = null;
    this.unassignedCards = [];

    // Destroy layers
    if (this.tableauLayer) {
      this.tableauLayer.destroy({ children: true });
      this.tableauLayer = null;
    }
    if (this.playerAreaLayer) {
      this.playerAreaLayer.destroy({ children: true });
      this.playerAreaLayer = null;
    }
    if (this.flyingCardLayer) {
      this.flyingCardLayer.destroy({ children: true });
      this.flyingCardLayer = null;
    }

    // Clean up message overlay
    if (this.messageOverlay) {
      this.messageOverlay.destroy({ children: true });
      this.messageOverlay = null;
    }

    // Clean up textures
    if (this.shadowTexture) {
      this.shadowTexture.destroy(true);
      this.shadowTexture = null;
    }

    // Clean up layout selector
    if (this.layoutSelector) {
      this.layoutSelector.destroy({ children: true });
      this.layoutSelector = null;
    }

    this.stockPile = null;
    this.stockCountText = null;
    this.wastePile = null;
    this.isAnimating = false;
    this.gameEnded = false;
    this.revealedRanksThisBatch.clear();
    this.initialDealtRanks.clear();
  }

  onResize(): void {
    // Layout is handled by BaseGameScene's responsive scaling
  }

  onDeviceStateChange(_newState: DeviceState, _oldState: DeviceState): void {
    // No device-specific layouts yet
  }

  // ============================================================
  // Texture Initialization
  // ============================================================

  private initTextures(): void {
    const spritesheet = this.spritesheet;

    // Get card back textures
    this.cardBackRedTexture = spritesheet.textures[CARD_BACKS.red] || null;
    this.cardBackDarkTexture = spritesheet.textures[CARD_BACKS.dark] || null;

    // Calculate card dimensions from a sample texture
    const sampleTexture = spritesheet.textures['sprite-1-1.png'];
    if (sampleTexture) {
      this.cardWidth = sampleTexture.width * TRIPEAKS_CONFIG.cardScale;
      this.cardHeight = sampleTexture.height * TRIPEAKS_CONFIG.cardScale;
    }

    // Create shadow texture
    this.createShadowTexture();
  }

  private createShadowTexture(): void {
    const spritesheet = this.spritesheet;
    const sampleTexture = spritesheet.textures['sprite-1-1.png'];
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

  // ============================================================
  // Card Utilities
  // ============================================================

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
   * Extract card rank from texture name (1-13)
   *
   * Spritesheet layout: sprite-ROW-COL.png
   * Column order: A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2
   *   - Col 1 = Ace (rank 1)
   *   - Col 2 = King (rank 13)
   *   - Col 3 = Queen (rank 12)
   *   - Col 4 = Jack (rank 11)
   *   - Col 5-13 = 10 down to 2 (rank = 15 - col)
   */
  private getRankFromTexture(textureName: string): number {
    const match = textureName.match(/sprite-\d+-(\d+)\.png/);
    if (match) {
      const col = parseInt(match[1]);
      if (col === 1) return 1; // Ace
      return 15 - col; // K=13, Q=12, J=11, 10=10, ..., 2=2
    }
    return 0;
  }

  /**
   * Check if two ranks are ±1 apart (with A-K wrap-around)
   */
  private isValidMove(cardRank: number, wasteRank: number): boolean {
    const diff = Math.abs(cardRank - wasteRank);
    // Difference of 1, or wrap-around (A=1 and K=13, diff=12)
    return diff === 1 || diff === 12;
  }

  /**
   * Shuffle an array in place (Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
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
  private getCardBackTexture(textureName: string): Texture {
    const match = textureName.match(/sprite-(\d+)-/);
    if (match) {
      const row = parseInt(match[1]);
      // Rows 1 and 3 (Hearts and Diamonds) use red back
      if (row === 1 || row === 3) {
        return this.cardBackRedTexture!;
      }
    }
    // Rows 4 and 6 (Spades and Clubs) use dark back
    return this.cardBackDarkTexture!;
  }

  /**
   * Create a card container for deferred assignment
   * Face-down cards don't need a face texture yet
   */
  private createCardContainerDeferred(
    textureName: string | null,
    isFaceUp: boolean
  ): { container: Container; backTexture: Texture } {
    const spritesheet = this.spritesheet;

    // Use dark back as default for unassigned cards
    const backTexture = textureName
      ? this.getCardBackTexture(textureName)
      : this.cardBackDarkTexture!;

    const container = new Container();

    // Add shadow
    if (this.shadowTexture) {
      const shadow = new Sprite(this.shadowTexture);
      shadow.anchor.set(0.5);
      shadow.x = TRIPEAKS_CONFIG.shadow.offsetX;
      shadow.y = TRIPEAKS_CONFIG.shadow.offsetY;
      shadow.alpha = TRIPEAKS_CONFIG.shadow.alpha;
      container.addChild(shadow);
    }

    // Add card sprite
    let cardSprite: Sprite;
    if (isFaceUp && textureName) {
      cardSprite = new Sprite(spritesheet.textures[textureName]);
    } else {
      cardSprite = new Sprite(backTexture);
    }
    cardSprite.anchor.set(0.5);
    cardSprite.name = 'cardSprite';
    container.addChild(cardSprite);

    // Apply scale
    container.scale.set(TRIPEAKS_CONFIG.cardScale);

    return { container, backTexture };
  }

  /**
   * Draw a card from the unassigned pool
   */
  private drawFromUnassigned(): string {
    if (this.unassignedCards.length === 0) {
      console.error('No unassigned cards left!');
      return 'sprite-1-1.png'; // Fallback
    }
    return this.unassignedCards.pop()!;
  }

  /**
   * Track ranks already dealt to initial face-up cards
   */
  private initialDealtRanks = new Set<number>();

  /**
   * Draw a card with a unique rank for initial dealing
   * Ensures no duplicate ranks in the starting tableau
   */
  private drawUniqueRankForInitial(): string {
    if (this.unassignedCards.length === 0) {
      console.error('No unassigned cards left!');
      return 'sprite-1-1.png'; // Fallback
    }

    // Find a card with a rank not already dealt
    const uniqueIndex = this.unassignedCards.findIndex(textureName => {
      const rank = this.getRankFromTexture(textureName);
      return !this.initialDealtRanks.has(rank);
    });

    if (uniqueIndex !== -1) {
      const [card] = this.unassignedCards.splice(uniqueIndex, 1);
      const rank = this.getRankFromTexture(card);
      this.initialDealtRanks.add(rank);
      return card;
    }

    // Fallback: all 13 ranks used, just draw any
    return this.unassignedCards.pop()!;
  }

  /**
   * Track ranks that have been revealed in the current reveal batch
   * to avoid revealing duplicate ranks (e.g., two 4s)
   */
  private revealedRanksThisBatch = new Set<number>();

  /**
   * Get all ranks currently visible (face-up) on the tableau
   */
  private getVisibleTableauRanks(): Set<number> {
    const ranks = new Set<number>();
    for (const row of this.tableauCards) {
      for (const card of row) {
        if (!card.isRemoved && card.isFaceUp && card.rank > 0) {
          ranks.add(card.rank);
        }
      }
    }
    return ranks;
  }

  /**
   * Probability that a revealed card will be "helpful" (±1 from chain)
   * Lower = harder game, player needs stock pile more
   * 0.0 = never helpful, 1.0 = always helpful
   */
  private readonly REVEAL_HELPFUL_CHANCE = 0.35;

  /**
   * Draw a card from the unassigned pool for REVEALING
   *
   * Only sometimes picks a helpful card (±1 from chain) to encourage stock usage.
   * Still avoids duplicate ranks on the table.
   */
  private drawHelpfulCardForReveal(targetRank: number): string {
    if (this.unassignedCards.length === 0) {
      console.error('No unassigned cards left!');
      return 'sprite-1-1.png'; // Fallback
    }

    // Get ranks to avoid (already on table + already revealed this batch + current waste)
    const visibleRanks = this.getVisibleTableauRanks();
    const ranksToAvoid = new Set([...visibleRanks, ...this.revealedRanksThisBatch]);

    // Also avoid the current waste card rank
    if (this.wasteCard && this.wasteCard.rank > 0) {
      ranksToAvoid.add(this.wasteCard.rank);
    }

    // Roll for helpfulness - only sometimes give a helpful card
    const isHelpful = Math.random() < this.REVEAL_HELPFUL_CHANCE;

    if (isHelpful) {
      // Try to find a helpful card (±1 from target)
      const helpfulIndex = this.unassignedCards.findIndex(textureName => {
        const rank = this.getRankFromTexture(textureName);
        return this.isValidMove(rank, targetRank) && !ranksToAvoid.has(rank);
      });

      if (helpfulIndex !== -1) {
        const [helpfulCard] = this.unassignedCards.splice(helpfulIndex, 1);
        const rank = this.getRankFromTexture(helpfulCard);
        this.revealedRanksThisBatch.add(rank);
        if (import.meta.env.DEV)
          console.log(
            `[LUCKY REVEAL] ${this.rankToString(rank)} (±1 from ${this.rankToString(targetRank)})`
          );
        return helpfulCard;
      }
    }

    // Not helpful or no helpful card available - draw a random unique card
    const randomIndex = this.unassignedCards.findIndex(textureName => {
      const rank = this.getRankFromTexture(textureName);
      return !ranksToAvoid.has(rank);
    });

    if (randomIndex !== -1) {
      const [card] = this.unassignedCards.splice(randomIndex, 1);
      const rank = this.getRankFromTexture(card);
      this.revealedRanksThisBatch.add(rank);
      if (import.meta.env.DEV) console.log(`[REVEAL] ${this.rankToString(rank)} (random, unique)`);
      return card;
    }

    // Last resort: any card (all unique ranks exhausted)
    if (import.meta.env.DEV) console.log(`[REVEAL] No unique rank available, drawing any`);
    return this.unassignedCards.pop()!;
  }

  /**
   * Draw a helpful card from the unassigned pool for STOCK DRAW
   * Finds a card that would enable playing a tableau card
   */
  private drawHelpfulCardForStock(): string {
    if (this.unassignedCards.length === 0) {
      console.error('No unassigned cards left!');
      return 'sprite-1-1.png'; // Fallback
    }

    // Get all face-up tableau card ranks
    const tableauRanks: number[] = [];
    for (const row of this.tableauCards) {
      for (const card of row) {
        if (!card.isRemoved && card.isFaceUp && card.rank > 0) {
          tableauRanks.push(card.rank);
        }
      }
    }

    if (tableauRanks.length === 0) {
      // No tableau cards left, just draw any
      return this.unassignedCards.pop()!;
    }

    // Find a card that would match ANY tableau card
    // (i.e., the drawn card becomes waste, then a tableau card is ±1 from it)
    const helpfulIndex = this.unassignedCards.findIndex(textureName => {
      const stockRank = this.getRankFromTexture(textureName);
      // Check if any tableau card would be ±1 from this stock card
      return tableauRanks.some(tableauRank => this.isValidMove(tableauRank, stockRank));
    });

    if (helpfulIndex !== -1) {
      const [helpfulCard] = this.unassignedCards.splice(helpfulIndex, 1);
      const rank = this.getRankFromTexture(helpfulCard);
      // Find which tableau card(s) it enables
      const enabledRanks = tableauRanks.filter(tr => this.isValidMove(tr, rank));
      if (import.meta.env.DEV)
        console.log(
          `[SMART STOCK] Drew ${this.rankToString(rank)} (will make tableau cards playable: ${enabledRanks.map(r => this.rankToString(r)).join(', ')})`
        );
      return helpfulCard;
    }

    // No helpful card found, draw from top
    if (import.meta.env.DEV) console.log(`[STOCK] No helpful card found, drawing random`);
    return this.unassignedCards.pop()!;
  }

  // ============================================================
  // Tableau Layout
  // ============================================================

  /**
   * Calculate card position in the pyramid layout
   */
  private calculateCardPosition(row: number, col: number): { x: number; y: number } {
    const { tableauCenterX, tableauTopY } = TRIPEAKS_CONFIG;
    const { horizontalOverlap, verticalOverlap, cardsPerRow, topYOffset } = this.currentLayout;
    const spread = this.currentLayout.rowSpread?.[row] ?? 1;
    const yFactor = this.currentLayout.rowYFactors?.[row] ?? row;

    // Horizontal spacing (accounting for overlap)
    const hSpacing = this.cardWidth * horizontalOverlap;

    const cardsInRow = cardsPerRow[row];
    // Intercalated pyramid: centered rows, odd/even row lengths naturally offset by half spacing
    const x = tableauCenterX + spread * (col - (cardsInRow - 1) / 2) * hSpacing;

    // Vertical position (accounting for overlap)
    const vSpacing = this.cardHeight * verticalOverlap;
    const y = tableauTopY + topYOffset + yFactor * vSpacing;

    return { x, y };
  }

  /**
   * Determine if a card should be face-up initially
   * Based on layout's initialFaceUpRows setting
   */
  private isInitiallyFaceUp(row: number): boolean {
    if (this.currentLayout.rowFaceUp && this.currentLayout.rowFaceUp[row] !== undefined) {
      return this.currentLayout.rowFaceUp[row]!;
    }
    const { rows, initialFaceUpRows } = this.currentLayout;
    return row >= rows - initialFaceUpRows;
  }

  /**
   * Build the tableau pyramid with deferred card assignment
   *
   * Only face-up cards (bottom row) get assigned identities.
   * Face-down cards are assigned when revealed, picking helpful cards.
   */
  private buildTableau(): void {
    if (!this.tableauLayer) return;

    // Initialize unassigned card pool with all 52 cards
    this.unassignedCards = this.getPokerCardNames();
    this.shuffleArray(this.unassignedCards);

    // Clear initial dealt ranks tracker
    this.initialDealtRanks.clear();

    this.tableauCards = [];

    const { rows, cardsPerRow, rotatedRows, rotationAngle, fanRotationRows, rowCardOrientations } =
      this.currentLayout;

    // First pass: create all card data and containers
    for (let row = 0; row < rows; row++) {
      const rowCards: TableauCard[] = [];
      const cardsInRow = cardsPerRow[row];

      for (let col = 0; col < cardsInRow; col++) {
        const isFaceUp = this.isInitiallyFaceUp(row);

        let textureName: string | null = null;
        let faceTexture: Texture | null = null;
        let rank = 0;

        if (isFaceUp) {
          // Face-up cards get assigned with unique ranks (no duplicates)
          textureName = this.drawUniqueRankForInitial();
          rank = this.getRankFromTexture(textureName);
          faceTexture = this.spritesheet.textures[textureName];
        }

        // Create card container (face-down cards just show back)
        const { container, backTexture } = this.createCardContainerDeferred(textureName, isFaceUp);

        // Position the card
        const pos = this.calculateCardPosition(row, col);
        container.x = pos.x;
        container.y = pos.y;

        // Apply per-card Y offset for arc effects
        const yOffset = this.currentLayout.rowCardYOffsets?.[row]?.[col] ?? 0;
        container.y += yOffset;

        // Apply rotation for diagonal / fan cards
        if (rotatedRows?.includes(row)) {
          // Get rotation angle: use per-row if available, otherwise use single angle
          const rowRotations = this.currentLayout.rowRotations;
          const angle = rowRotations?.[row] ?? rotationAngle ?? 0;

          if (angle !== 0) {
            const isLeftCard = col === 0;
            const orientation = rowCardOrientations?.[row]?.[col];
            const isDiagonal = orientation ? orientation === 'd' : true;

            // If this specific card is vertical in the layout mask, force it upright.
            if (!isDiagonal) {
              container.rotation = 0;
            } else if (fanRotationRows?.includes(row)) {
              // Fan rotation: rotate progressively by column offset to create an arc
              const cardsInThisRow = cardsPerRow[row];
              const halfSpan = (cardsInThisRow - 1) / 2;
              if (halfSpan > 0) {
                const offset = col - halfSpan; // negative left, positive right
                // Interpret `angle` as max edge angle for the row
                container.rotation = (offset / halfSpan) * angle;
              }
            } else {
              // Default: left card rotates counter-clockwise, right card rotates clockwise
              // Special-case hexagon top diagonals (row 1) to match reference direction
              const isHexagonTopDiagonal = this.currentLayoutType === 'hexagon' && row === 1;
              if (isHexagonTopDiagonal) {
                container.rotation = isLeftCard ? angle : -angle;
              } else {
                container.rotation = isLeftCard ? -angle : angle;
              }
            }
          }
        }

        // Store card data
        const card: TableauCard = {
          row,
          col,
          textureName,
          faceTexture,
          backTexture,
          rank,
          isFaceUp,
          isRemoved: false,
          container,
          blockedBy: [], // Will be populated in buildBlockingRelationships
        };

        // Make card interactive
        this.makeCardInteractive(card);

        rowCards.push(card);
      }

      this.tableauCards.push(rowCards);
    }

    // Second pass: add cards to layer with proper z-ordering
    // Sort all cards by row (top rows behind), then by Y position within row
    const allCards: TableauCard[] = [];
    for (let row = 0; row < rows; row++) {
      for (const card of this.tableauCards[row]) {
        allCards.push(card);
      }
    }

    // Sort by: 1) row (ascending - top rows first = behind)
    //          2) orientation (diagonals before verticals in same row)
    //          3) Y position (smaller Y first = behind)
    allCards.sort((a, b) => {
      // Primary: row (top rows first)
      if (a.row !== b.row) return a.row - b.row;

      // Secondary: diagonals before verticals in same row
      const orientA = rowCardOrientations?.[a.row]?.[a.col];
      const orientB = rowCardOrientations?.[b.row]?.[b.col];
      const isDiagA = orientA === 'd';
      const isDiagB = orientB === 'd';
      if (isDiagA !== isDiagB) return isDiagA ? -1 : 1;

      // Tertiary: Y position (smaller first)
      const dy = a.container.y - b.container.y;
      if (dy !== 0) return dy;

      // Quaternary: X position for same Y
      return a.container.x - b.container.x;
    });

    for (const card of allCards) {
      this.tableauLayer.addChild(card.container);
    }

    // Stock pile uses deferred assignment - just track how many cards remain
    // We don't create individual stock card objects; we draw from unassignedCards when needed
  }

  // ============================================================
  // Blocking Logic
  // ============================================================

  /**
   * Build parent-child blocking relationships between cards.
   *
   * In TriPeaks, cards in LOWER rows (front of pyramid) block cards in UPPER rows (back).
   * The bottom row(s) (based on initialFaceUpRows) are NEVER blocked.
   */
  private buildBlockingRelationships(): void {
    const { rows, cardsPerRow } = this.currentLayout;

    // For each row except the bottom row, find which cards in the row BELOW block it
    for (let row = 0; row < rows - 1; row++) {
      const blockerRow = row + 1;
      const blockerCards = this.tableauCards[blockerRow];
      const blockedCards = this.tableauCards[row];

      const blockerCount = cardsPerRow[blockerRow];
      const overlapThreshold = this.cardWidth * this.currentLayout.horizontalOverlap * 0.56;

      for (const blockedCard of blockedCards) {
        blockedCard.blockedBy = [];

        const blockedX = blockedCard.container.x;
        for (let bCol = 0; bCol < blockerCount; bCol++) {
          const blocker = blockerCards[bCol];
          const blockerX = blocker.container.x;
          if (Math.abs(blockerX - blockedX) <= overlapThreshold)
            blockedCard.blockedBy.push(blocker);
        }
      }
    }
  }

  /**
   * Check if a card is playable:
   * - Not removed
   * - Face-up (blocking determines face-up/down, not clickability)
   * - Valid ±1 move from waste card
   */
  private isCardPlayable(card: TableauCard): boolean {
    if (card.isRemoved) return false;
    if (!card.isFaceUp) return false;
    if (!this.wasteCard) return true; // First move is always valid

    return this.isValidMove(card.rank, this.wasteCard.rank);
  }

  /**
   * Get all currently playable tableau cards
   */
  private getPlayableCards(): TableauCard[] {
    const playable: TableauCard[] = [];
    for (const row of this.tableauCards) {
      for (const card of row) {
        if (this.isCardPlayable(card)) {
          playable.push(card);
        }
      }
    }
    return playable;
  }

  /**
   * Update visual state of a single card based on its playability
   */
  private updateCardVisual(card: TableauCard): void {
    if (card.isRemoved) return;

    const isPlayable = this.isCardPlayable(card);

    // Update cursor and interactivity based on playability (no opacity changes)
    if (isPlayable) {
      card.container.cursor = 'pointer';
      card.container.eventMode = 'static';
    } else {
      card.container.cursor = 'default';
      card.container.eventMode = 'none';
    }
  }

  /**
   * Update visual state of all tableau cards
   */
  private updateAllCardVisuals(): void {
    for (const row of this.tableauCards) {
      for (const card of row) {
        this.updateCardVisual(card);
      }
    }
  }

  /**
   * Check and reveal cards after a tableau card is played.
   *
   * ONLY reveals the next row when the ENTIRE current row is cleared.
   * Uses chain revealing: each card is ±1 from the previous, no duplicates.
   */
  private checkAndRevealCards(removedCard: TableauCard): void {
    if (import.meta.env.DEV)
      console.log(
        `[REVEAL] Checking after removing ${this.rankToString(removedCard.rank)} from row ${removedCard.row}`
      );

    // Clear the batch tracker and start chain with the NEW waste card rank
    this.revealedRanksThisBatch.clear();
    let chainRank = this.wasteCard?.rank || removedCard.rank;

    const behindRows = new Set(this.currentLayout.behindRows || []);
    const allVerticalCardsRemoved = this.areAllVerticalCardsRemoved();

    // Find the bottommost row that still has face-up cards remaining
    // Only reveal the next row up when this row is COMPLETELY cleared
    let revealedTotal = 0;
    const cardsToReveal: TableauCard[] = [];

    // Find the current "active" row (bottommost row with remaining face-up cards)
    let activeRow = -1;
    for (let rowIdx = this.tableauCards.length - 1; rowIdx >= 0; rowIdx--) {
      const hasRemainingFaceUp = this.tableauCards[rowIdx].some(c => !c.isRemoved && c.isFaceUp);
      if (hasRemainingFaceUp) {
        activeRow = rowIdx;
        break;
      }
    }

    // Check if the active row is completely cleared
    const activeRowCleared =
      activeRow === -1 || this.tableauCards[activeRow].every(c => c.isRemoved || !c.isFaceUp);

    if (import.meta.env.DEV)
      console.log(`  → Active row: ${activeRow}, cleared: ${activeRowCleared}`);

    // Only reveal next row if active row is completely cleared
    if (activeRowCleared) {
      // Find the next row up that has face-down cards to reveal
      for (let rowIdx = this.tableauCards.length - 1; rowIdx >= 0; rowIdx--) {
        // Skip diagonal rows until all vertical cards are removed
        if (behindRows.has(rowIdx) && !allVerticalCardsRemoved) {
          continue;
        }

        for (const card of this.tableauCards[rowIdx]) {
          if (card.isRemoved) continue;
          if (card.isFaceUp) continue;

          // Check if this card's blockers are all removed
          const blockersRemaining = card.blockedBy.filter(b => !b.isRemoved).length;

          if (blockersRemaining === 0) {
            if (import.meta.env.DEV)
              console.log(`  → row ${card.row}, col ${card.col}: UNBLOCKED, will reveal`);
            cardsToReveal.push(card);
          }
        }

        // If we found cards to reveal in this row, stop (one row at a time)
        if (cardsToReveal.length > 0) {
          break;
        }
      }

      // Reveal all cards from the target row
      for (const card of cardsToReveal) {
        if (import.meta.env.DEV)
          console.log(`  → REVEALING card at row ${card.row}, col ${card.col}`);
        this.revealCardWithChain(card, chainRank);
        chainRank = card.rank;
        revealedTotal++;
      }
    }

    if (import.meta.env.DEV) console.log(`[REVEAL] Revealed ${revealedTotal} card(s) total`);

    // Update all card visuals after state changes
    this.updateAllCardVisuals();
  }

  /**
   * Check if all vertical (non-diagonal) cards have been removed
   * Vertical cards are in rows NOT in behindRows
   */
  private areAllVerticalCardsRemoved(): boolean {
    const behindRows = new Set(this.currentLayout.behindRows || []);

    for (let row = 0; row < this.tableauCards.length; row++) {
      // Skip diagonal rows
      if (behindRows.has(row)) continue;

      // Check if any card in this vertical row remains
      for (const card of this.tableauCards[row]) {
        if (!card.isRemoved) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Reveal a face-down card with flip animation
   * Uses chain revealing - picks a card ±1 from targetRank, avoiding duplicates
   */
  private revealCardWithChain(card: TableauCard, targetRank: number): void {
    // Assign card identity NOW using chain logic
    const textureName = this.drawHelpfulCardForReveal(targetRank);
    card.textureName = textureName;
    card.rank = this.getRankFromTexture(textureName);
    card.faceTexture = this.spritesheet.textures[textureName];
    card.backTexture = this.getCardBackTexture(textureName);

    card.isFaceUp = true;

    const cardSprite = card.container.getChildByName('cardSprite') as Sprite;
    if (!cardSprite) return;

    if (import.meta.env.DEV)
      console.log(
        `[REVEAL] Assigned ${this.rankToString(card.rank)} to row ${card.row}, col ${card.col} (chain from ${this.rankToString(targetRank)})`
      );

    // Flip animation
    const flipDuration = 0.25;

    gsap.to(card.container.scale, {
      x: 0,
      duration: flipDuration / 2,
      ease: 'power2.in',
      onComplete: () => {
        if (this.isDisposed) return;
        cardSprite.texture = card.faceTexture!;
        gsap.to(card.container.scale, {
          x: TRIPEAKS_CONFIG.cardScale,
          duration: flipDuration / 2,
          ease: 'power2.out',
        });
      },
    });
  }

  // ============================================================
  // Debug Logging
  // ============================================================

  /**
   * Convert rank number to display string (A, 2-10, J, Q, K)
   */
  private rankToString(rank: number): string {
    if (rank === 1) return 'A';
    if (rank === 11) return 'J';
    if (rank === 12) return 'Q';
    if (rank === 13) return 'K';
    return String(rank);
  }

  /**
   * Log current game state for debugging
   */
  private logGameState(event: string): void {
    if (!import.meta.env.DEV) return;
    console.log(`\n========== ${event} ==========`);

    // Log active/waste card
    if (this.wasteCard) {
      const validLow = this.wasteCard.rank === 1 ? 13 : this.wasteCard.rank - 1;
      const validHigh = this.wasteCard.rank === 13 ? 1 : this.wasteCard.rank + 1;
      console.log(`ACTIVE CARD (waste): ${this.rankToString(this.wasteCard.rank)}`);
      console.log(
        `  → Can play: ${this.rankToString(validLow)} or ${this.rankToString(validHigh)}`
      );
    } else {
      console.log('ACTIVE CARD (waste): NONE');
    }

    // Log ALL cards in tableau (face-up and face-down)
    console.log('\nTABLEAU CARDS (all rows):');
    for (let row = 0; row < this.tableauCards.length; row++) {
      const rowCards = this.tableauCards[row];
      const cardsInfo: string[] = [];

      for (const card of rowCards) {
        if (card.isRemoved) {
          cardsInfo.push('[-]');
          continue;
        }

        if (!card.isFaceUp) {
          // Face-down card with deferred assignment
          cardsInfo.push('[?]');
        } else {
          const rankStr = this.rankToString(card.rank);
          // Face-up card - check if valid ±1 move
          const validMove = this.wasteCard
            ? this.isValidMove(card.rank, this.wasteCard.rank)
            : true;
          const status = validMove ? '✓' : 'X';
          cardsInfo.push(`${rankStr}(${status})`);
        }
      }

      console.log(`  Row ${row}: ${cardsInfo.join(' ')}`);
    }

    // Log playable cards summary
    const playable = this.getPlayableCards();
    console.log(
      `\nPLAYABLE (${playable.length}): ${playable.map(c => `${this.rankToString(c.rank)}`).join(', ') || 'NONE'}`
    );

    console.log(`UNASSIGNED POOL: ${this.unassignedCards.length} cards`);
    console.log('================================\n');
  }

  // ============================================================
  // Card Interactivity
  // ============================================================

  /**
   * Make a card clickable
   */
  private makeCardInteractive(card: TableauCard): void {
    const container = card.container;

    container.eventMode = 'static';
    container.cursor = 'pointer';

    container.on('pointerdown', () => {
      if (!card.isRemoved && !this.isAnimating && this.isCardPlayable(card)) {
        this.flyCardToWaste(card, 'tableau');
      }
    });
  }

  // ============================================================
  // Fly-to-Waste Animation
  // ============================================================

  /**
   * Fly a card to the waste pile with arc animation and optional flip
   */
  private flyCardToWaste(card: TableauCard, source: 'tableau' | 'stock'): void {
    if (this.isAnimating) return;
    this.isAnimating = true;

    const container = card.container;
    const cardSprite = container.getChildByName('cardSprite') as Sprite;

    // Get current global position and convert to flying layer coordinates
    let startX: number;
    let startY: number;

    if (source === 'tableau' && this.tableauLayer) {
      const globalPos = this.tableauLayer.toGlobal(container.position);
      const flyingPos = this.flyingCardLayer!.toLocal(globalPos);
      startX = flyingPos.x;
      startY = flyingPos.y;

      // Remove from tableau
      this.tableauLayer.removeChild(container);
    } else if (source === 'stock' && this.stockPile) {
      // Stock cards are positioned at stock pile center
      const globalPos = this.stockPile.toGlobal({ x: 0, y: 0 });
      const flyingPos = this.flyingCardLayer!.toLocal(globalPos);
      startX = flyingPos.x;
      startY = flyingPos.y;
    } else {
      this.isAnimating = false;
      return;
    }

    // Add to flying layer
    this.flyingCardLayer!.addChild(container);
    container.x = startX;
    container.y = startY;

    // Target position (waste pile in game coordinates)
    const wasteGlobalPos = this.wastePile!.toGlobal({ x: 0, y: 0 });
    const targetPos = this.flyingCardLayer!.toLocal(wasteGlobalPos);
    const targetX = targetPos.x;
    const targetY = targetPos.y;

    // Animation settings
    const duration = 0.35;
    const arcHeight = 60;
    const needsFlip = !card.isFaceUp;

    // Create GSAP timeline
    const tl = gsap.timeline({
      onComplete: () => {
        if (this.isDisposed) return;
        this.onCardLanded(card, source);
      },
    });

    // X position (linear)
    tl.to(
      container,
      {
        x: targetX,
        duration,
        ease: 'power2.inOut',
      },
      0
    );

    // Y position (arc - up then down)
    const midY = Math.min(startY, targetY) - arcHeight;

    tl.to(
      container,
      {
        y: midY,
        duration: duration / 2,
        ease: 'power2.out',
      },
      0
    );

    tl.to(
      container,
      {
        y: targetY,
        duration: duration / 2,
        ease: 'power2.in',
      },
      duration / 2
    );

    // Flip animation (only if face-down)
    if (needsFlip && cardSprite) {
      const flipDuration = 0.2;
      const flipStart = duration * 0.25;

      // Scale X to 0 (card edge-on)
      tl.to(
        container.scale,
        {
          x: 0,
          duration: flipDuration / 2,
          ease: 'power2.in',
          onComplete: () => {
            if (this.isDisposed) return;
            // Swap texture at midpoint
            if (card.faceTexture) {
              cardSprite.texture = card.faceTexture;
            }
          },
        },
        flipStart
      );

      // Scale X back to normal
      tl.to(
        container.scale,
        {
          x: TRIPEAKS_CONFIG.cardScale,
          duration: flipDuration / 2,
          ease: 'power2.out',
        },
        flipStart + flipDuration / 2
      );
    }

    // Rotation animation - reset diagonal cards to vertical (0 rotation)
    if (container.rotation !== 0) {
      tl.to(
        container,
        {
          rotation: 0,
          duration: duration,
          ease: 'power2.inOut',
        },
        0
      );
    }
  }

  /**
   * Called when a card finishes its fly animation
   */
  private onCardLanded(card: TableauCard, source: 'tableau' | 'stock'): void {
    // Remove old waste card
    if (this.wasteCard && this.wastePile) {
      this.wastePile.removeChild(this.wasteCard.container);
      this.wasteCard.container.destroy({ children: true });
    }

    // Move card from flying layer to waste pile
    this.flyingCardLayer!.removeChild(card.container);
    this.wastePile!.addChild(card.container);
    card.container.x = 0;
    card.container.y = 0;

    // Disable interactivity on waste card
    card.container.eventMode = 'none';
    card.container.cursor = 'default';

    // Update card state
    card.isFaceUp = true;
    card.isRemoved = true;
    this.wasteCard = card;

    this.isAnimating = false;

    // If this was a tableau card, check for reveals
    if (source === 'tableau') {
      this.checkAndRevealCards(card);

      // Check win condition
      if (this.checkWinCondition()) {
        this.showWinMessage();
        return;
      }
    } else {
      // Update all visuals after stock draw (new waste card = new valid moves)
      this.updateAllCardVisuals();
    }

    // Debug: Log state after move
    this.logGameState(`AFTER ${source.toUpperCase()} CLICK`);
  }

  // ============================================================
  // Stock Pile
  // ============================================================

  /**
   * Build the stock pile visual (draw deck)
   * Uses unassignedCards.length - 1 as count (reserve 1 for initial waste)
   */
  private buildStockPile(): void {
    if (!this.playerAreaLayer) return;

    this.stockPile = new Container();
    this.stockPile.x = TRIPEAKS_CONFIG.stockX;
    this.stockPile.y = TRIPEAKS_CONFIG.playerAreaY;

    // Create stacked cards visual (just back textures)
    this.updateStockPileVisual();

    // Add count badge (unassigned - 1 for initial waste card)
    const stockCount = Math.max(0, this.unassignedCards.length - 1);
    this.stockCountText = new Text(
      String(stockCount),
      new TextStyle({
        fontFamily: 'Arial, sans-serif',
        fontSize: 16,
        fontWeight: 'bold',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
    );
    this.stockCountText.resolution = 2;
    this.stockCountText.anchor.set(0.5);
    this.stockCountText.y = this.cardHeight / 2 + 15;
    this.stockPile.addChild(this.stockCountText);

    // Make stock pile interactive
    this.stockPile.eventMode = 'static';
    this.stockPile.cursor = 'pointer';

    this.stockPile.on('pointerdown', () => {
      this.drawFromStock();
    });

    this.playerAreaLayer.addChild(this.stockPile);
  }

  /**
   * Update the stock pile visual (stacked cards)
   * Stock count = unassignedCards.length (cards available to draw)
   */
  private updateStockPileVisual(): void {
    if (!this.stockPile) return;

    // Remove existing card sprites (but keep count text)
    const children = [...this.stockPile.children];
    for (const child of children) {
      if (child !== this.stockCountText) {
        this.stockPile.removeChild(child);
      }
    }

    // Add stacked card backs based on unassigned cards count
    const stockCount = this.unassignedCards.length;
    const visibleCards = Math.min(TRIPEAKS_CONFIG.stockVisibleCards, stockCount);

    for (let i = 0; i < visibleCards; i++) {
      const backSprite = new Sprite(this.cardBackDarkTexture!);
      backSprite.anchor.set(0.5);
      backSprite.scale.set(TRIPEAKS_CONFIG.cardScale);

      // Offset each card slightly
      backSprite.x = -i * TRIPEAKS_CONFIG.stockStackOffset;
      backSprite.y = -i * TRIPEAKS_CONFIG.stockStackOffset;

      // Insert before count text
      if (this.stockCountText) {
        const countIndex = this.stockPile.getChildIndex(this.stockCountText);
        this.stockPile.addChildAt(backSprite, countIndex);
      } else {
        this.stockPile.addChild(backSprite);
      }
    }

    // Update count
    if (this.stockCountText) {
      this.stockCountText.text = String(stockCount);
    }
  }

  /**
   * Draw a card from the stock pile using deferred assignment
   * Uses smart draw - picks a card that enables playing a tableau card
   */
  private drawFromStock(): void {
    if (this.isAnimating || this.unassignedCards.length === 0 || this.gameEnded) return;

    // Draw a card that would enable playing a tableau card
    const textureName = this.drawHelpfulCardForStock();
    const rank = this.getRankFromTexture(textureName);
    const faceTexture = this.spritesheet.textures[textureName];
    const backTexture = this.getCardBackTexture(textureName);

    // Create the card container
    const { container } = this.createCardContainerDeferred(textureName, false);

    // Create card object
    const card: TableauCard = {
      row: -1,
      col: -1,
      textureName,
      faceTexture,
      backTexture,
      rank,
      isFaceUp: false,
      isRemoved: false,
      container,
      blockedBy: [],
    };

    // Fly the card to waste
    this.flyCardToWaste(card, 'stock');

    // Update stock pile visual
    this.updateStockPileVisual();
  }

  // ============================================================
  // Waste Pile
  // ============================================================

  /**
   * Build the waste pile (current foundation card)
   * Uses deferred assignment for the initial waste card
   */
  private buildWastePile(): void {
    if (!this.playerAreaLayer) return;

    this.wastePile = new Container();
    this.wastePile.x = TRIPEAKS_CONFIG.wasteX;
    this.wastePile.y = TRIPEAKS_CONFIG.playerAreaY;

    // Draw first card from unassigned pool as initial waste card
    if (this.unassignedCards.length > 0) {
      const textureName = this.drawFromUnassigned();
      const rank = this.getRankFromTexture(textureName);
      const faceTexture = this.spritesheet.textures[textureName];
      const backTexture = this.getCardBackTexture(textureName);

      // Create card container showing face
      const { container } = this.createCardContainerDeferred(textureName, true);

      const firstCard: TableauCard = {
        row: -1,
        col: -1,
        textureName,
        faceTexture,
        backTexture,
        rank,
        isFaceUp: true,
        isRemoved: true,
        container,
        blockedBy: [],
      };

      // Disable interactivity
      firstCard.container.eventMode = 'none';

      // Position at waste pile center
      firstCard.container.x = 0;
      firstCard.container.y = 0;

      this.wastePile.addChild(firstCard.container);
      this.wasteCard = firstCard;
    }

    // Update stock count after drawing initial waste
    this.updateStockPileVisual();

    this.playerAreaLayer.addChild(this.wastePile);
  }

  // ============================================================
  // Win Condition
  // ============================================================

  /**
   * Check if the game is won (all tableau cards removed)
   */
  private checkWinCondition(): boolean {
    for (const row of this.tableauCards) {
      for (const card of row) {
        if (!card.isRemoved) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Show game won message and restart after delay
   */
  private showWinMessage(): void {
    if (this.gameEnded) return;
    this.gameEnded = true;

    if (import.meta.env.DEV) console.log('[GAME] YOU WON!');

    // Create overlay
    this.messageOverlay = new Container();

    // Semi-transparent background
    const bg = new Graphics();
    bg.beginFill(0x000000, 0.7);
    bg.drawRect(-500, -300, 1000, 600);
    bg.endFill();
    this.messageOverlay.addChild(bg);

    // Win message
    const winText = new Text(
      '🎉 Game Won! 🎉',
      new TextStyle({
        fontFamily: 'Arial, sans-serif',
        fontSize: 48,
        fontWeight: 'bold',
        fill: '#FFD700',
        stroke: '#000000',
        strokeThickness: 4,
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowDistance: 3,
      })
    );
    winText.anchor.set(0.5);
    winText.y = -30;
    this.messageOverlay.addChild(winText);

    // Restart countdown
    const countdownText = new Text(
      'Restarting in 3...',
      new TextStyle({
        fontFamily: 'Arial, sans-serif',
        fontSize: 24,
        fill: '#FFFFFF',
      })
    );
    countdownText.anchor.set(0.5);
    countdownText.y = 40;
    this.messageOverlay.addChild(countdownText);

    // Position overlay at center
    this.messageOverlay.x = TRIPEAKS_CONFIG.tableauCenterX;
    this.messageOverlay.y = 250;

    this.context.container.addChild(this.messageOverlay);

    // Countdown and restart
    let countdown = 3;
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        countdownText.text = `Restarting in ${countdown}...`;
      } else {
        clearInterval(countdownInterval);
        this.restartGame();
      }
    }, 1000);
  }

  /**
   * Restart the game
   */
  private restartGame(): void {
    if (import.meta.env.DEV) console.log('[GAME] Restarting...');
    this.stop();
    this.start();
  }

  // ============================================================
  // Layout Selector UI
  // ============================================================

  /**
   * Build the layout selector dropdown
   */
  private buildLayoutSelector(): void {
    this.layoutSelector = new Container();
    this.layoutSelector.x = 680;
    this.layoutSelector.y = 30;

    // Background
    const bg = new Graphics();
    bg.beginFill(0x333333, 0.9);
    bg.drawRoundedRect(-60, -12, 120, 28, 6);
    bg.endFill();
    this.layoutSelector.addChild(bg);

    // Current layout label
    const label = new Text(
      this.currentLayout.name,
      new TextStyle({
        fontFamily: 'Arial, sans-serif',
        fontSize: 14,
        fill: '#ffffff',
      })
    );
    label.anchor.set(0.5);
    label.name = 'layoutLabel';
    this.layoutSelector.addChild(label);

    // Dropdown caret
    const caret = new Text(
      '▾',
      new TextStyle({
        fontFamily: 'Arial, sans-serif',
        fontSize: 14,
        fill: '#bbbbbb',
      })
    );
    caret.anchor.set(0.5);
    caret.x = 45;
    this.layoutSelector.addChild(caret);

    // Hit area for opening dropdown
    this.layoutSelector.eventMode = 'static';
    this.layoutSelector.cursor = 'pointer';

    // Dropdown menu (hidden by default)
    const menu = new Container();
    menu.name = 'layoutMenu';
    menu.visible = false;
    menu.y = 22;
    this.layoutSelector.addChild(menu);

    const menuBg = new Graphics();
    menuBg.beginFill(0x222222, 0.95);
    menuBg.drawRoundedRect(-60, 0, 120, 92, 6);
    menuBg.endFill();
    menu.addChild(menuBg);

    const options: { type: TableauLayoutType; y: number }[] = [
      { type: 'castle', y: 16 },
      { type: 'hexagon', y: 46 },
      { type: 'crown', y: 76 },
    ];

    for (const opt of options) {
      const optText = new Text(
        TABLEAU_LAYOUTS[opt.type].name,
        new TextStyle({
          fontFamily: 'Arial, sans-serif',
          fontSize: 14,
          fill: '#ffffff',
        })
      );
      optText.anchor.set(0.5);
      optText.y = opt.y;
      optText.eventMode = 'static';
      optText.cursor = 'pointer';

      optText.on('pointerover', () => {
        optText.style.fill = '#ffd27a';
      });
      optText.on('pointerout', () => {
        optText.style.fill = '#ffffff';
      });
      optText.on('pointerdown', e => {
        e.stopPropagation();
        menu.visible = false;
        this.setLayout(opt.type);
      });

      menu.addChild(optText);
    }

    // Toggle menu on click
    this.layoutSelector.on('pointerdown', () => {
      // Don't open while animating end-state message
      if (this.gameEnded) return;
      menu.visible = !menu.visible;
    });

    this.context.container.addChild(this.layoutSelector);
  }

  /** Set layout type and restart the game */
  private setLayout(layoutType: TableauLayoutType): void {
    if (this.currentLayoutType === layoutType) return;
    this.currentLayoutType = layoutType;
    this.currentLayout = TABLEAU_LAYOUTS[this.currentLayoutType];

    if (import.meta.env.DEV) console.log(`[LAYOUT] Switched to: ${this.currentLayout.name}`);

    // Update label
    const label = this.layoutSelector?.getChildByName('layoutLabel') as Text;
    if (label) label.text = this.currentLayout.name;

    this.restartGame();
  }
}
