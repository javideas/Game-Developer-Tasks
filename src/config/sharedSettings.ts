/**
 * Shared Settings Configuration
 *
 * Contains settings used across multiple scenes/tasks.
 * Task-specific settings should be in their own config files.
 */

/**
 * Scene layout configuration (used by BaseGameScene layout logic)
 *
 * These values control responsive behavior across all game scenes.
 */
export const SCENE_LAYOUT = {
  /**
   * Phone detection breakpoint (CSS pixels).
   * If min(screenWidth, screenHeight) < this value, device is considered a phone.
   * Used for phone-specific UI layouts (e.g., 2-column settings panel).
   */
  phoneBreakpoint: 500,

  /**
   * Large padding breakpoint (CSS pixels).
   * If min(screenWidth, screenHeight) < this value, use compact padding.
   * If >= this value, use generous desktop/tablet padding.
   */
  largePaddingBreakpoint: 850,

  /**
   * Minimum padding between scene content and screen edges for phones.
   * Phones need tighter padding to maximize screen usage.
   */
  screenPaddingPhone: {
    left: 24,
    right: 24,
    top: 24,
    bottom: 24,
  },

  /**
   * Minimum padding between scene content and screen edges for desktop/tablet.
   * Larger screens can afford more generous padding.
   */
  screenPadding: {
    left: 200,
    right: 200,
    top: 40,
    bottom: 40,
  },

  /**
   * Max scale clamp for the responsive container.
   * Prevents content from scaling up too much on large screens.
   *
   * Recommended: 1.5-2.5 (2.25 is a good balance)
   */
  maxScale: 2.25,
};

/** Type for screen padding configuration */
export interface ScreenPadding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
