import { Container, Text, TextStyle } from 'pixi.js';
import type { GameMode, GameModeContext } from '../GameMode';
import type { DeviceState } from '../../scenes/BaseGameScene';
import { DESIGN_BOUNDS } from '../../config/magicWordsSettings';

/**
 * MagicWordsModeCreative
 * 
 * Creative interpretation of Task 2.
 * TODO: Implement your unique text+emoji idea here!
 */
export class MagicWordsModeCreative implements GameMode {
  private context: GameModeContext;
  private content: Container | null = null;
  
  constructor(context: GameModeContext) {
    this.context = context;
  }
  
  start(): void {
    this.content = new Container();
    this.context.container.addChild(this.content);
    
    // Placeholder UI
    const style = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 28,
      fill: '#ffffff',
      align: 'center',
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowDistance: 2,
      wordWrap: true,
      wordWrapWidth: 500,
    });
    
    const placeholder = new Text(
      '✨ Creative Mode\n\nYour unique text + emoji idea goes here!\n\n(Coming soon)',
      style
    );
    placeholder.resolution = 2;
    placeholder.anchor.set(0.5);
    placeholder.x = 400;
    placeholder.y = 300;
    this.content.addChild(placeholder);
    
    // Set design bounds
    this.context.setDesignBounds(DESIGN_BOUNDS.creative);
    this.context.requestLayout();
  }
  
  stop(): void {
    if (this.content) {
      this.content.destroy({ children: true });
      this.content = null;
    }
  }
  
  onResize(): void {
    // Override if needed
  }
  
  onDeviceStateChange(_newState: DeviceState, _oldState: DeviceState): void {
    // Override if needed
  }
}

