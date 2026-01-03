/**
 * Ace of Shadows Settings Configuration
 *
 * Centralized configuration for card animation parameters.
 * All timing values in seconds, distances in pixels.
 */

/** Card stack configuration */
export const CARD_CONFIG = {
  /** Pixels between cards in a stack */
  stackOffset: 0.5,
  /** Total number of cards in deck */
  totalCards: 144,
  /** Card scale (1 = original size) */
  scale: 0.5,
};

/** Animation timing defaults */
export const TIMING_DEFAULTS = {
  /** Time between card moves (seconds) */
  interval: 1,
  /** Animation duration for card movement (seconds) */
  duration: 2,
  /** Motion blur strength */
  motionBlur: 0,
};

/** Timing slider configuration */
export const TIMING_SLIDER = {
  min: 0.1,
  max: 2,
  step: 0.1,
};

/** Motion blur slider configuration */
export const BLUR_SLIDER = {
  min: 0,
  max: 10,
  step: 1,
};

/** Arc height configuration for spiral animation */
export const ARC_DEFAULTS = {
  /** Arc height A→B (pixels above straight line) */
  heightA: 80,
  /** Arc height B→A (pixels above straight line) */
  heightB: 120,
};

/** Arc height slider configuration */
export const ARC_SLIDER = {
  min: 40,
  max: 140,
  step: 10,
};

/** Shadow configuration */
export const SHADOW_CONFIG = {
  /** Shadow offset X from card */
  offsetX: 3,
  /** Shadow offset Y from card */
  offsetY: 3,
  /** Shadow opacity (0-1) */
  alpha: 0.35,
};

/** Toggle defaults */
export const TOGGLE_DEFAULTS = {
  /** 3D shadows enabled by default */
  realisticShadows: true,
  /** Animation mode: 'linear' or 'spiral' */
  animationMode: 'spiral' as 'linear' | 'spiral',
  /** Keep settings between scene visits */
  keepSettings: false,
};

/** Poker suit rows in spritesheet (rows with 13 cards each: A-K) */
export const POKER_SUIT_ROWS = [1, 3, 4, 6];

/** Card back texture names */
export const CARD_BACKS = {
  red: 'sprite-7-7.png',
  dark: 'sprite-8-1.png',
};

/** Mode selection panel configuration */
export const SELECTION_PANEL = {
  /** Horizontal padding around content */
  paddingX: 40,
  /** Vertical padding around content */
  paddingY: 30,
  /** Gap between title and first button */
  titleGap: 55,
  /** Gap between buttons */
  buttonGap: 20,
  /** Button width */
  buttonWidth: 280,
  /** Button height */
  buttonHeight: 55,
  /** Panel center X (design coordinates) */
  centerX: 400,
  /** Panel center Y (design coordinates) */
  centerY: 220,
  /** Panel corner radius */
  radius: 20,
  /** Panel background opacity */
  backgroundAlpha: 0.5,
  /** Title font size */
  titleFontSize: 32,
  /** Button font size */
  buttonFontSize: 20,
  /** Button corner radius */
  buttonRadius: 12,
};

/** Settings panel UI configuration */
export const PANEL_UI = {
  /** Horizontal padding around settings content */
  paddingX: 13,
  /** Vertical padding around settings content */
  paddingY: 13,
  /** Corner radius of panel background */
  radius: 12,
  /** Gap between cells in each row */
  gap: 8,
  /** Slider track width */
  sliderWidth: 90,
  /** Row 1 Y position (relative to panel center) */
  row1Y: -20,
  /** Row 2 Y position (relative to panel center) */
  row2Y: 25,
  /** Cell widths for row 1: [Interval, Duration, Blur, 3D Shadows, Spiral] */
  row1CellWidths: [130, 130, 110, 110, 90],
  /** Cell widths for row 2: [Arc A→B, Arc B→A, Keep Settings, Deck A, Deck B] */
  row2CellWidths: [130, 130, 130, 90, 90],
  /** Deck toggle button dimensions */
  deckButtonWidth: 55,
  deckButtonHeight: 28,
};

// SCENE_LAYOUT is now in sharedSettings.ts (shared across all tasks)
// Re-export for backward compatibility
export { SCENE_LAYOUT } from './sharedSettings';

/**
 * Explicit design bounds per mode.
 * These are used for consistent, predictable layout (instead of dynamic getLocalBounds).
 * All values are in design coordinates.
 *
 * Layout reference:
 * - Selection: Title at y=100, buttons at y=250/350 (centered at x=400)
 * - Literal: Decks at x=200/600, settings at y=540, arc peak at ~80
 * - Creative: Placeholder text centered at 400,300
 */
export const DESIGN_BOUNDS = {
  /**
   * Selection screen: title + mode picker buttons in panel
   * NOTE: These are fallback values - actual bounds are calculated dynamically
   * from content + padding in buildSelectionScreen()
   */
  selection: {
    x: 140, // Fallback left edge
    y: 70, // Fallback top edge
    width: 520, // Fallback width
    height: 300, // Fallback height
  },
  /** Literal mode: card stacks + settings panel + arc height */
  literal: {
    x: 100, // Left edge (left deck at x=200, minus some margin)
    y: 80, // Top edge (accounts for arc height ~140 above deck top)
    width: 600, // Content width (decks at 200 and 600, plus margins)
    height: 520, // Content height (from arc peak to settings panel bottom)
  },
  /** Creative mode: TriPeaks solitaire layout */
  creative: {
    x: 0,
    y: 0,
    width: 800,
    height: 600,
  },
};

// ============================================================
// TRIPEAKS CREATIVE MODE CONFIG
// ============================================================

/** Available tableau layout types */
export type TableauLayoutType = 'castle' | 'hexagon' | 'crown';

/** Layout-specific configuration */
export interface TableauLayout {
  name: string;
  rows: number;
  cardsPerRow: number[];
  /** Number of bottom rows that start face-up */
  initialFaceUpRows: number;
  /** Optional per-row override for initial face-up state (true=face-up, false=face-down) */
  rowFaceUp?: boolean[];
  /** Vertical overlap ratio */
  verticalOverlap: number;
  /** Horizontal overlap ratio */
  horizontalOverlap: number;
  /** Top Y offset adjustment */
  topYOffset: number;
  /**
   * Optional per-row Y placement factor (in units of vSpacing).
   * If omitted, uses row index (0,1,2...).
   */
  rowYFactors?: number[];
  /**
   * Optional per-row horizontal spread multiplier.
   * 1.0 = normal centering, >1 spreads cards wider (useful for "corner" cards).
   */
  rowSpread?: number[];
  /**
   * Optional per-card orientation per row.
   * 'v' = vertical (rotation 0)
   * 'd' = diagonal (rotation computed from rowRotations / rotationAngle)
   * If provided, should match cardsPerRow[row] length for each row.
   */
  rowCardOrientations?: ('v' | 'd')[][];
  /**
   * Optional rows that should be rotated (diagonal corner cards).
   * Contains row indices.
   */
  rotatedRows?: number[];
  /**
   * Rotation angle in radians for rotated rows (single value for all).
   */
  rotationAngle?: number;
  /**
   * Optional per-row rotation angles in radians (overrides rotationAngle).
   * Index corresponds to row index.
   */
  rowRotations?: number[];
  /**
   * Optional rows that should use "fan" rotation:
   * cards in the row rotate progressively by column offset, creating an arc.
   * Uses rowRotations[row] as the max edge angle for that row.
   */
  fanRotationRows?: number[];
  /**
   * Optional rows that should be rendered behind others (lower z-index).
   * Contains row indices.
   */
  behindRows?: number[];
  /**
   * Optional per-card Y offset per row, for arc effects.
   * Positive = lower, negative = higher.
   * If provided, should match cardsPerRow[row] length for each row.
   */
  rowCardYOffsets?: number[][];
}

/**
 * Predefined layouts for the tableau
 */
export const TABLEAU_LAYOUTS: Record<TableauLayoutType, TableauLayout> = {
  /** Castle: Traditional pyramid shape (3-4-5-6) */
  castle: {
    name: 'Castle',
    rows: 4,
    cardsPerRow: [3, 4, 5, 6],
    initialFaceUpRows: 1,
    verticalOverlap: 0.55,
    horizontalOverlap: 0.78,
    topYOffset: 0,
  },
  /**
   * Hexagon: Diamond grid with corner cards
   * - 5 rows, 4 columns conceptually
   * - Row 0: 2 cards visible (center columns 1,2)
   * - Row 1: 2 cards face-down (corner columns 0,3) - between top and middle
   * - Row 2: 4 cards visible (all columns 0,1,2,3)
   * - Row 3: 2 cards face-down (corner columns 0,3) - between middle and bottom
   * - Row 4: 2 cards visible (center columns 1,2)
   */
  hexagon: {
    name: 'Hexagon',
    rows: 5,
    cardsPerRow: [2, 2, 4, 2, 2],
    initialFaceUpRows: 1, // Only use rowFaceUp for control
    rowFaceUp: [true, false, true, false, true], // Corner rows are face-down
    verticalOverlap: 1.08, // >1 = no overlap, slight margin between rows
    horizontalOverlap: 1.05, // Slight horizontal margin
    topYOffset: -50, // Move up above stock/waste area
    // Y factors to position corner rows between main rows
    rowYFactors: [0, 0.5, 1, 1.5, 2],
    // Spread: center rows use normal, corner rows spread to outer columns
    rowSpread: [1, 2.5, 1, 2.5, 1],
    // Diagonal corner cards are rotated
    rotatedRows: [1, 3],
    rotationAngle: Math.PI / 6, // 30 degrees
    // Corner cards render behind face-up cards
    behindRows: [1, 3],
  },
  /**
   * Crown: Fan-shaped layout with diagonal cards spreading upward
   * - Row 0 (bottom): 3 vertical face-up cards
   * - Rows 1-6: 2 diagonal face-down cards each, progressively spreading
   * Total: 15 cards (3 + 12)
   */
  crown: {
    name: 'Crown',
    // Reference pattern (left-to-right):
    //       d v d
    // d v v v v v d
    //   d d v v d d
    //       v v v
    //
    // Note: row 0 is top, increasing row index goes downward.
    rows: 4,
    cardsPerRow: [3, 7, 6, 3],
    initialFaceUpRows: 1,
    rowFaceUp: [false, false, false, true], // ONLY bottom row face-up
    // Spacing - more separation between cards
    verticalOverlap: 0.45, // Slightly more vertical space
    horizontalOverlap: 0.72, // More horizontal space (less overlap)
    topYOffset: 100, // Move whole layout up
    rowYFactors: [0, 0.85, 1.6, 2.75], // More space before bottom row
    // Row spreads: 2nd row tighter, bottom row much wider for margin
    rowSpread: [1.6, 1.4, 1.4, 2.2], // Bottom row very wide (2.2) for separation
    // Orientation mask per row
    rowCardOrientations: [
      ['d', 'v', 'd'],
      ['d', 'v', 'v', 'v', 'v', 'v', 'd'],
      ['d', 'd', 'v', 'v', 'd', 'd'],
      ['v', 'v', 'v'],
    ],
    // Per-card Y offsets for arc effect (positive = lower)
    // Row 0: center card up, edges down slightly
    // Row 1: center cards level, edges drop down for arc
    // Row 2: center level, edges drop down EVEN MORE for arc
    // Row 3: no offset (bottom row)
    rowCardYOffsets: [
      [-15, -30, -15], // Row 0: center up more
      [35, 10, 0, -5, 0, 10, 35], // Row 1: edges down for arc
      [65, 35, 0, 0, 35, 65], // Row 2: edges down MUCH more (65px)
      [0, 0, 0], // Row 3: no offset
    ],
    // We'll rotate only the diagonal cards (per-card) using these as max edge angles per row
    rotatedRows: [0, 1, 2],
    // Use "fan" math but only on 'd' cards; verticals remain 0 rotation
    fanRotationRows: [0, 1, 2],
    rowRotations: [
      Math.PI / 4.2, // row 0 (top): stronger
      Math.PI / 5.2, // row 1: medium
      Math.PI / 6.2, // row 2: slightly softer
      0, // row 3: verticals
    ],
    // Z-order: top rows behind, bottom rows in front
    behindRows: [0, 1, 2],
  },
};

/**
 * TriPeaks solitaire layout configuration for Creative Mode.
 * Based on Solitaire Home Story by SOFTGAMES.
 */
export const TRIPEAKS_CONFIG = {
  // Card dimensions
  /** Card scale relative to spritesheet texture */
  cardScale: 0.58,

  // Default layout (can be changed at runtime)
  defaultLayout: 'hexagon' as TableauLayoutType,

  // Tableau position
  /** Tableau center X in design coordinates */
  tableauCenterX: 400,
  /** Tableau top Y in design coordinates */
  tableauTopY: 115,

  // Player area (stock + waste)
  /** Stock pile X position */
  stockX: 160,
  /** Waste pile X position */
  wasteX: 400,
  /** Player area Y position */
  playerAreaY: 485,

  // Stock pile visual
  /** Number of visible stacked cards in stock pile */
  stockVisibleCards: 5,
  /** Offset between stacked stock cards */
  stockStackOffset: 2,

  // Shadow (reuse from literal mode)
  shadow: {
    offsetX: 2,
    offsetY: 2,
    alpha: 0.3,
  },
};

/**
 * Runtime settings state - preserved between scene visits if keepSettings is true
 */
export interface AceOfShadowsState {
  interval: number;
  duration: number;
  motionBlur: number;
  arcHeightA: number;
  arcHeightB: number;
  realisticShadows: boolean;
  animationMode: 'linear' | 'spiral';
  keepSettings: boolean;
  activeDeck: 'left' | 'right';
}

/** Singleton to hold preserved settings */
let preservedSettings: AceOfShadowsState | null = null;

/** Get preserved settings or null if none/not keeping */
export function getPreservedSettings(): AceOfShadowsState | null {
  return preservedSettings;
}

/** Save current settings for next visit */
export function saveSettings(settings: AceOfShadowsState): void {
  if (settings.keepSettings) {
    preservedSettings = { ...settings };
  } else {
    preservedSettings = null;
  }
}

/** Clear preserved settings */
export function clearPreservedSettings(): void {
  preservedSettings = null;
}

/** Get default settings */
export function getDefaultSettings(): AceOfShadowsState {
  return {
    interval: TIMING_DEFAULTS.interval,
    duration: TIMING_DEFAULTS.duration,
    motionBlur: TIMING_DEFAULTS.motionBlur,
    arcHeightA: ARC_DEFAULTS.heightA,
    arcHeightB: ARC_DEFAULTS.heightB,
    activeDeck: 'left',
    realisticShadows: TOGGLE_DEFAULTS.realisticShadows,
    animationMode: TOGGLE_DEFAULTS.animationMode,
    keepSettings: TOGGLE_DEFAULTS.keepSettings,
  };
}
