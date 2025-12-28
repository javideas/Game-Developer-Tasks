import { Text, TextStyle } from 'pixi.js';
import type { Application } from '../core/Application';
import { BaseGameScene } from './BaseGameScene';

/**
 * MagicWordsScene
 * 
 * Task 2: Create a system that combines text and images like custom emojis.
 * Render a dialogue between characters with data from the API endpoint.
 */
export class MagicWordsScene extends BaseGameScene {
  constructor(app: Application, onBack: () => void) {
    super(app, {
      title: 'Magic Words',
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
      '💬 Magic Words\n\nDialogue with inline custom emojis\n\n(Coming soon)',
      style
    );
    placeholder.anchor.set(0.5);
    placeholder.x = 400;
    placeholder.y = 300;

    this.gameContainer.addChild(placeholder);
  }
}
