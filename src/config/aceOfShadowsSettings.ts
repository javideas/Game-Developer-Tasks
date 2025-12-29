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
    x: 140,      // Fallback left edge
    y: 70,       // Fallback top edge
    width: 520,  // Fallback width
    height: 300, // Fallback height
  },
  /** Literal mode: card stacks + settings panel + arc height */
  literal: {
    x: 100,      // Left edge (left deck at x=200, minus some margin)
    y: 80,       // Top edge (accounts for arc height ~140 above deck top)
    width: 600,  // Content width (decks at 200 and 600, plus margins)
    height: 520, // Content height (from arc peak to settings panel bottom)
  },
  /** Creative mode: placeholder content (centered at 400,300) */
  creative: {
    x: 100,      // Left edge (center 400 - half width 300)
    y: 150,      // Top edge
    width: 600,  // Content width (enough for wrapped text)
    height: 300, // Content height
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

