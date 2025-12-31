import { Container, Text, TextStyle } from 'pixi.js';
import type { GameMode, GameModeContext } from '../GameMode';
import { DESIGN_BOUNDS } from '../../config/phoenixFlameSettings';

/**
 * PhoenixFlameModeCreative
 * 
 * Creative implementation placeholder for Task 3.
 * This mode can explore more advanced particle effects while
 * still respecting the 10-sprite constraint.
 */
export class PhoenixFlameModeCreative implements GameMode {
  private readonly context: GameModeContext;
  private content: Container | null = null;

  private readonly designWidth = DESIGN_BOUNDS.width;
  private readonly designHeight = DESIGN_BOUNDS.height;

  constructor(context: GameModeContext) {
    this.context = context;
  }

  start(): void {
    // Set design bounds
    this.context.setDesignBounds({
      x: 0,
      y: 0,
      width: this.designWidth,
      height: this.designHeight,
    });
    this.context.requestLayout();

    // Create content container
    this.content = new Container();
    this.context.container.addChild(this.content);

    // Placeholder message
    const style = new TextStyle({
      fontFamily: 'Georgia, serif',
      fontSize: 28,
      fill: '#ffffff',
      align: 'center',
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowDistance: 2,
    });

    const text = new Text(
      '✨ Creative Mode ✨\n\n' +
      'Enhanced fire effects coming soon!\n\n' +
      '• Layered flames\n' +
      '• Sparks & embers\n' +
      '• Interactive controls',
      style
    );
    text.anchor.set(0.5);
    text.x = this.designWidth / 2;
    text.y = this.designHeight / 2;
    this.content.addChild(text);
  }

  stop(): void {
    if (this.content) {
      this.content.destroy({ children: true });
      this.content = null;
    }
  }

  onResize(): void {
    // No special resize handling needed
  }
}


