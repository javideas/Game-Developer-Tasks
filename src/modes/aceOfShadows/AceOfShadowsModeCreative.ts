import { Container, Text, TextStyle } from 'pixi.js';
import type { GameMode, GameModeContext } from '../GameMode';
import type { DeviceState } from '../../scenes/BaseGameScene';
import { DESIGN_BOUNDS } from '../../config/aceOfShadowsSettings';

/**
 * AceOfShadowsModeCreative
 * 
 * Creative interpretation of Task 1.
 * TODO: Implement your unique card animation idea here!
 */
export class AceOfShadowsModeCreative implements GameMode {
  private context: GameModeContext;
  private content: Container | null = null;
  
  constructor(context: GameModeContext) {
    this.context = context;
  }
  
  // ============================================================
  // GameMode Interface
  // ============================================================
  
  start(): void {
    this.content = new Container();
    this.context.container.addChild(this.content);
    
    // Placeholder UI - with word wrap to fit within design bounds
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
      wordWrapWidth: 500, // Fits within 600px design width with padding
    });
    
    const placeholder = new Text(
      '✨ Creative Mode\n\nYour unique card animation idea goes here!\n\n(Coming soon)',
      style
    );
    placeholder.resolution = 2;
    placeholder.anchor.set(0.5);
    // Center within design bounds (DESIGN_BOUNDS.creative: x:100, width:600 → center at 400)
    placeholder.x = 400;
    placeholder.y = 300;
    this.content.addChild(placeholder);
    
    // Set design bounds and layout
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
    // Override if creative mode has responsive UI
  }
  
  onDeviceStateChange(_newState: DeviceState, _oldState: DeviceState): void {
    // Override if creative mode needs different layouts per device
  }
}

