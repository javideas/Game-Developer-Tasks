import type { Application as PixiApplication, Container } from 'pixi.js';

/**
 * Scene Interface
 * 
 * All scenes must implement this interface to work with SceneManager.
 */
export interface Scene {
  /** The PixiJS container that holds all scene content */
  readonly container: Container;

  /** Called when the scene is added to the stage */
  onStart?(): void;

  /** Called when the scene is removed from the stage */
  onStop?(): void;

  /** Called when the window is resized */
  onResize?(): void;

  /** Called every frame (optional, for animations) */
  onUpdate?(delta: number): void;

  /** Clean up resources when scene is destroyed */
  destroy?(): void;
}

/**
 * SceneManager
 * 
 * Handles scene lifecycle:
 * - Loading/unloading scenes
 * - Resize propagation
 * - Frame updates
 */
export class SceneManager {
  private pixi: PixiApplication;
  private currentScene: Scene | null = null;

  constructor(pixi: PixiApplication) {
    this.pixi = pixi;

    // Set up update loop for scenes that need it
    this.pixi.ticker.add(this.update);
  }

  /**
   * Switch to a new scene
   */
  start(scene: Scene): void {
    // Stop and remove current scene
    if (this.currentScene) {
      this.currentScene.onStop?.();
      this.pixi.stage.removeChild(this.currentScene.container);
      this.currentScene.destroy?.();
    }

    // Set and start new scene
    this.currentScene = scene;
    this.pixi.stage.addChild(scene.container);
    scene.onStart?.();
    scene.onResize?.();
  }

  /**
   * Called when window resizes
   */
  onResize(): void {
    this.currentScene?.onResize?.();
  }

  /**
   * Called every frame
   */
  private update = (delta: number): void => {
    this.currentScene?.onUpdate?.(delta);
  };

  /**
   * Get the current scene
   */
  get current(): Scene | null {
    return this.currentScene;
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.currentScene) {
      this.currentScene.onStop?.();
      this.currentScene.destroy?.();
      this.currentScene = null;
    }
    this.pixi.ticker.remove(this.update);
  }
}

