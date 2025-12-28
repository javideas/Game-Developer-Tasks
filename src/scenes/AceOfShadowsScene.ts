import { Text, TextStyle } from 'pixi.js';
import type { Application } from '../core/Application';
import { BaseGameScene } from './BaseGameScene';

/**
 * AceOfShadowsScene
 * 
 * Task 1: Create 144 sprites stacked like cards in a deck.
 * Every 1 second, the top card moves to a different stack
 * with a 2-second animation.
 */
export class AceOfShadowsScene extends BaseGameScene {
  constructor(app: Application, onBack: () => void) {
    super(app, {
      title: 'Ace of Shadows',
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
      '🃏 Ace of Shadows\n\n144 cards moving between two stacks\n\n(Coming soon)',
      style
    );
    placeholder.anchor.set(0.5);
    placeholder.x = 400;
    placeholder.y = 300;

    this.gameContainer.addChild(placeholder);
  }
}
