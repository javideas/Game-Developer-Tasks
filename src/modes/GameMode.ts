import type { Container, Spritesheet, Texture } from 'pixi.js';
import type { DeviceState } from '../scenes/BaseGameScene';

/**
 * Design bounds for responsive layout
 */
export interface DesignBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Shared context passed from parent scene to game modes.
 * Provides access to scene resources without tight coupling.
 */
export interface GameModeContext {
  /** Container for mode content (child of scene's gameContainer) */
  readonly container: Container;
  
  /** Loaded spritesheet with card/game textures (optional - some modes load their own) */
  readonly spritesheet?: Spritesheet;
  
  /** Scene's gameContainer for coordinate conversions and scaling */
  readonly gameContainer: Container;
  
  /** Get current device state (phonePortrait, phoneLandscape, desktop) */
  getDeviceState(): DeviceState;
  
  /** Request scene to perform layout after bounds change */
  requestLayout(): void;
  
  /** Set design bounds for responsive scaling */
  setDesignBounds(bounds: DesignBounds): void;
  
  /** Get screen dimensions */
  getScreenSize(): { width: number; height: number };
  
  /** Generate texture from Graphics (for shadows, etc.) */
  generateTexture(graphics: Container): Texture;
}

/**
 * Interface for game mode implementations.
 * Each mode handles its own UI, logic, and cleanup.
 * 
 * Usage:
 * - Scene creates mode instance with context
 * - Scene calls start() when user selects mode
 * - Scene forwards resize/device events
 * - Scene calls stop() when user navigates back
 */
export interface GameMode {
  /**
   * Start the mode - build UI, initialize state, start animations.
   * Called when user selects this mode from the selection screen.
   */
  start(): void;
  
  /**
   * Stop the mode - cleanup resources, kill animations.
   * Called when user navigates back to selection screen.
   * Must clean up ALL resources to prevent memory leaks.
   */
  stop(): void;
  
  /**
   * Handle window resize events.
   * Called by parent scene's onResize().
   * Optional - implement if mode has responsive UI.
   */
  onResize?(): void;
  
  /**
   * Handle device state changes (phone/tablet/desktop, portrait/landscape).
   * Called by parent scene's onDeviceStateChange().
   * Optional - implement if mode needs to rebuild UI for different devices.
   */
  onDeviceStateChange?(newState: DeviceState, oldState: DeviceState): void;
}

