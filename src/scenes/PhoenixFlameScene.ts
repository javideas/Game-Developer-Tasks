import { Text, TextStyle } from 'pixi.js';
import type { Application } from '../core/Application';
import { BaseGameScene } from './BaseGameScene';

/**
 * PhoenixFlameScene
 * 
 * Task 3: Make a particle-effect demo showing a great fire effect.
 * Keep the number of images at max 10 sprites on screen at the same time.
 */
export class PhoenixFlameScene extends BaseGameScene {
  constructor(app: Application, onBack: () => void) {
    super(app, {
      title: 'Phoenix Flame',
      onBack,
    });
  }

  protected buildContent(): void {
    // Placeholder text (will be replaced with actual game content)
    const style = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 32,
      fill: '#333333',
      align: 'center',
    });

    const placeholder = new Text(
      '🔥 Phoenix Flame\n\nParticle fire effect (max 10 sprites)\n\n(Coming soon)',
      style
    );
    placeholder.anchor.set(0.5);
    placeholder.x = 400;
    placeholder.y = 300;

    this.gameContainer.addChild(placeholder);
  }
}
