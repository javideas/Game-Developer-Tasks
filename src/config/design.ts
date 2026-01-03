/**
 * Design Constants
 *
 * Centralized configuration for UI dimensions, spacing, and styling.
 * All values are in pixels at base scale (the menu container scales to fit).
 */

export const DESIGN = {
  /** Padding around the menu container */
  padding: 40,

  /** Title bar (orange BESTGAMES banner) */
  title: {
    fontSize: 42,
    paddingX: 20,
    paddingY: 10,
    marginBottom: 10,
  },

  /** Subtitle text */
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
  },

  /** Game thumbnail tiles */
  tile: {
    width: 420,
    height: 300,
    radius: 18,
    gap: 26,
    titleFontSize: 22,
    titlePaddingX: 18,
    titlePaddingY: 10,
    overlayButtonWidth: 220,
    overlayButtonHeight: 44,
  },
} as const;

/** Orange brand color used for title bar and accents */
export const BRAND_ORANGE = 0xf7941d;

/** Orange color for "CLICK TO PLAY" text/icon */
export const ACCENT_ORANGE = '#FF671D';
