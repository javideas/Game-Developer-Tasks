import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GameSettingsPanel, type GameSettingsPanelConfig, type SettingsPanelContext } from '../../components/GameSettingsPanel';
import { Slider } from '../../components/Slider';
import { Toggle } from '../../components/Toggle';
import { SettingsCell } from '../../components/SettingsPanel';
import type { DeviceState } from '../../scenes/BaseGameScene';
import {
  TIMING_SLIDER,
  BLUR_SLIDER,
  ARC_SLIDER,
  PANEL_UI,
  SCENE_LAYOUT,
} from '../../config/aceOfShadowsSettings';

/** Animation mode type */
type AnimationMode = 'linear' | 'spiral';

/**
 * Current settings values
 */
export interface LiteralModeSettings {
  moveInterval: number;
  moveDuration: number;
  motionBlurStrength: number;
  arcHeightA: number;
  arcHeightB: number;
  realisticShadows: boolean;
  animationMode: AnimationMode;
  keepSettings: boolean;
  activeDeck: 'left' | 'right';
}

/**
 * Callbacks from settings panel to mode
 */
export interface LiteralModeSettingsCallbacks {
  /** Called when interval changes (needs animation restart) */
  onIntervalChange: (value: number) => void;
  /** Called when duration changes */
  onDurationChange: (value: number) => void;
  /** Called when blur strength changes */
  onBlurChange: (value: number) => void;
  /** Called when arc A height changes */
  onArcAChange: (value: number) => void;
  /** Called when arc B height changes */
  onArcBChange: (value: number) => void;
  /** Called when 3D shadows toggle changes */
  onShadowsChange: (value: boolean) => void;
  /** Called when spiral toggle changes */
  onSpiralChange: (value: boolean) => void;
  /** Called when keep settings toggle changes */
  onKeepSettingsChange: (value: boolean) => void;
  /** Called when deck reset button is pressed */
  onResetDeck: (target: 'left' | 'right') => void;
}

/**
 * LiteralModeSettingsPanel
 * 
 * Settings UI specific to the Literal mode of Ace of Shadows.
 * Extends GameSettingsPanel for consistent styling and responsive behavior.
 */
export class LiteralModeSettingsPanel extends GameSettingsPanel {
  private settings: LiteralModeSettings;
  private callbacks: LiteralModeSettingsCallbacks;
  
  // Control references for relayout
  private deckABtn: Container | null = null;
  private deckBBtn: Container | null = null;
  
  constructor(
    config: GameSettingsPanelConfig,
    context: SettingsPanelContext,
    initialSettings: LiteralModeSettings,
    callbacks: LiteralModeSettingsCallbacks
  ) {
    // Store settings before super() calls buildControls()
    // We need to use a workaround since super() must be first
    (LiteralModeSettingsPanel as any)._tempSettings = initialSettings;
    (LiteralModeSettingsPanel as any)._tempCallbacks = callbacks;
    
    super(config, context);
    
    this.settings = initialSettings;
    this.callbacks = callbacks;
    
    // Clean up temp storage
    delete (LiteralModeSettingsPanel as any)._tempSettings;
    delete (LiteralModeSettingsPanel as any)._tempCallbacks;
  }
  
  protected buildControls(): void {
    // Get settings from temp storage (during construction) or instance
    const settings = this.settings ?? (LiteralModeSettingsPanel as any)._tempSettings;
    const callbacks = this.callbacks ?? (LiteralModeSettingsPanel as any)._tempCallbacks;
    
    if (!settings || !callbacks) return;
    
    this.buildControlsForState(this.currentDeviceState, settings, callbacks);
  }
  
  protected rebuildForDeviceState(state: DeviceState): void {
    this.buildControlsForState(state, this.settings, this.callbacks);
  }
  
  /**
   * Build controls for a specific device state
   */
  private buildControlsForState(
    deviceState: DeviceState,
    settings: LiteralModeSettings,
    callbacks: LiteralModeSettingsCallbacks
  ): void {
    const { width: screenW, height: screenH } = this.context.getScreenSize();
    const isPhone = Math.min(screenW, screenH) < SCENE_LAYOUT.phoneBreakpoint;
    const isPhonePortrait = deviceState === 'phonePortrait';
    
    const { deckButtonWidth, deckButtonHeight } = PANEL_UI;
    
    const phoneScale = isPhone ? 1.3 : 1;
    const gap = isPhone ? 14 : 8;
    const sliderWidth = isPhone ? (isPhonePortrait ? 115 : 130) : 90;
    const rowHeight = isPhone ? 52 : 45;
    const cellWidth = isPhone ? 155 : 130;
    
    // Create all controls
    let intervalCell!: SettingsCell;
    const intervalSlider = new Slider({
      label: 'Interval',
      value: settings.moveInterval,
      min: TIMING_SLIDER.min,
      max: TIMING_SLIDER.max,
      step: TIMING_SLIDER.step,
      unit: 's',
      width: sliderWidth,
      onChange: (value) => {
        this.settings.moveInterval = value;
        callbacks.onIntervalChange(value);
        intervalCell.relayout();
        this.updatePanelBackground();
      }
    });
    
    let durationCell!: SettingsCell;
    const durationSlider = new Slider({
      label: 'Duration',
      value: settings.moveDuration,
      min: TIMING_SLIDER.min,
      max: TIMING_SLIDER.max,
      step: TIMING_SLIDER.step,
      unit: 's',
      width: sliderWidth,
      onChange: (value) => {
        this.settings.moveDuration = value;
        callbacks.onDurationChange(value);
        durationCell.relayout();
        this.updatePanelBackground();
      }
    });
    
    let blurCell!: SettingsCell;
    const blurSlider = new Slider({
      label: 'Blur',
      value: settings.motionBlurStrength,
      min: BLUR_SLIDER.min,
      max: BLUR_SLIDER.max,
      step: BLUR_SLIDER.step,
      unit: '',
      decimals: 0,
      width: sliderWidth,
      onChange: (value) => {
        this.settings.motionBlurStrength = value;
        callbacks.onBlurChange(value);
        blurCell.relayout();
        this.updatePanelBackground();
      }
    });
    
    const shadowToggle = new Toggle({
      label: '3D Shadows',
      value: settings.realisticShadows,
      onChange: (value) => {
        this.settings.realisticShadows = value;
        callbacks.onShadowsChange(value);
      }
    });
    
    const spiralToggle = new Toggle({
      label: 'Spiral',
      value: settings.animationMode === 'spiral',
      onChange: (value) => {
        this.settings.animationMode = value ? 'spiral' : 'linear';
        callbacks.onSpiralChange(value);
      }
    });
    
    let arcACell!: SettingsCell;
    const arcASlider = new Slider({
      label: 'Arc A→B',
      value: settings.arcHeightA,
      min: ARC_SLIDER.min,
      max: ARC_SLIDER.max,
      step: ARC_SLIDER.step,
      unit: '',
      decimals: 0,
      width: sliderWidth,
      onChange: (value) => {
        this.settings.arcHeightA = value;
        callbacks.onArcAChange(value);
        arcACell.relayout();
        this.updatePanelBackground();
      }
    });
    
    let arcBCell!: SettingsCell;
    const arcBSlider = new Slider({
      label: 'Arc B→A',
      value: settings.arcHeightB,
      min: ARC_SLIDER.min,
      max: ARC_SLIDER.max,
      step: ARC_SLIDER.step,
      unit: '',
      decimals: 0,
      width: sliderWidth,
      onChange: (value) => {
        this.settings.arcHeightB = value;
        callbacks.onArcBChange(value);
        arcBCell.relayout();
        this.updatePanelBackground();
      }
    });
    
    const keepSettingsToggle = new Toggle({
      label: 'Keep Settings',
      value: settings.keepSettings,
      onChange: (value) => {
        this.settings.keepSettings = value;
        callbacks.onKeepSettingsChange(value);
      }
    });
    
    this.deckABtn = this.createDeckToggleButton(
      'Deck A',
      deckButtonWidth * phoneScale,
      deckButtonHeight * phoneScale,
      settings.activeDeck === 'left',
      () => {
        this.settings.activeDeck = 'left';
        callbacks.onResetDeck('left');
        this.updateDeckToggleButtons();
      }
    );
    
    this.deckBBtn = this.createDeckToggleButton(
      'Deck B',
      deckButtonWidth * phoneScale,
      deckButtonHeight * phoneScale,
      settings.activeDeck === 'right',
      () => {
        this.settings.activeDeck = 'right';
        callbacks.onResetDeck('right');
        this.updateDeckToggleButtons();
      }
    );
    
    // Layout based on device state
    if (isPhonePortrait) {
      // 2 columns × 5 rows, centered
      const col1Width = cellWidth;
      const col2Width = cellWidth;
      
      const child1CenterX = -(gap / 2 + col1Width / 2);
      const child2CenterX = +(gap / 2 + col2Width / 2);
      const col1X = child1CenterX - col1Width / 2;
      const col2X = child2CenterX - col2Width / 2;
      
      const totalHeight = rowHeight * 5;
      const yOffset = -totalHeight / 2 + rowHeight / 2;
      
      // Row 1
      intervalCell = new SettingsCell(intervalSlider, col1Width);
      intervalCell.x = col1X; intervalCell.y = yOffset;
      this.content.addChild(intervalCell);
      
      durationCell = new SettingsCell(durationSlider, col2Width);
      durationCell.x = col2X; durationCell.y = yOffset;
      this.content.addChild(durationCell);
      
      // Row 2
      blurCell = new SettingsCell(blurSlider, col1Width);
      blurCell.x = col1X; blurCell.y = yOffset + rowHeight;
      this.content.addChild(blurCell);
      
      const shadowCell = new SettingsCell(shadowToggle, col2Width);
      shadowCell.x = col2X; shadowCell.y = yOffset + rowHeight;
      this.content.addChild(shadowCell);
      
      // Row 3
      arcACell = new SettingsCell(arcASlider, col1Width);
      arcACell.x = col1X; arcACell.y = yOffset + rowHeight * 2;
      this.content.addChild(arcACell);
      
      arcBCell = new SettingsCell(arcBSlider, col2Width);
      arcBCell.x = col2X; arcBCell.y = yOffset + rowHeight * 2;
      this.content.addChild(arcBCell);
      
      // Row 4
      const spiralCell = new SettingsCell(spiralToggle, col1Width);
      spiralCell.x = col1X; spiralCell.y = yOffset + rowHeight * 3;
      this.content.addChild(spiralCell);
      
      const keepCell = new SettingsCell(keepSettingsToggle, col2Width);
      keepCell.x = col2X; keepCell.y = yOffset + rowHeight * 3;
      this.content.addChild(keepCell);
      
      // Row 5
      const deckACell = new SettingsCell(this.deckABtn, col1Width);
      deckACell.x = col1X; deckACell.y = yOffset + rowHeight * 4;
      this.content.addChild(deckACell);
      
      const deckBCell = new SettingsCell(this.deckBBtn, col2Width);
      deckBCell.x = col2X; deckBCell.y = yOffset + rowHeight * 4;
      this.content.addChild(deckBCell);
      
    } else {
      // Desktop/landscape: 2 rows × 5 columns
      const { row1CellWidths, row2CellWidths, row1Y, row2Y } = PANEL_UI;
      
      const phoneLandscapeScale = deviceState === 'phoneLandscape' ? 1.35 : 1;
      const scaledRow1Widths = row1CellWidths.map(w => w * phoneLandscapeScale);
      const scaledRow2Widths = row2CellWidths.map(w => w * phoneLandscapeScale);
      const scaledGap = gap;
      
      // Row 1
      const row1TotalWidth = scaledRow1Widths.reduce((a, b) => a + b, 0) + scaledGap * (scaledRow1Widths.length - 1);
      let row1X = -row1TotalWidth / 2;
      
      intervalCell = new SettingsCell(intervalSlider, scaledRow1Widths[0]);
      intervalCell.x = row1X; intervalCell.y = row1Y;
      this.content.addChild(intervalCell);
      row1X += scaledRow1Widths[0] + scaledGap;
      
      durationCell = new SettingsCell(durationSlider, scaledRow1Widths[1]);
      durationCell.x = row1X; durationCell.y = row1Y;
      this.content.addChild(durationCell);
      row1X += scaledRow1Widths[1] + scaledGap;
      
      blurCell = new SettingsCell(blurSlider, scaledRow1Widths[2]);
      blurCell.x = row1X; blurCell.y = row1Y;
      this.content.addChild(blurCell);
      row1X += scaledRow1Widths[2] + scaledGap;
      
      const shadowCell = new SettingsCell(shadowToggle, scaledRow1Widths[3]);
      shadowCell.x = row1X; shadowCell.y = row1Y - 5;
      this.content.addChild(shadowCell);
      row1X += scaledRow1Widths[3] + scaledGap;
      
      const spiralCell = new SettingsCell(spiralToggle, scaledRow1Widths[4]);
      spiralCell.x = row1X; spiralCell.y = row1Y - 5;
      this.content.addChild(spiralCell);
      
      // Row 2
      const row2TotalWidth = scaledRow2Widths.reduce((a, b) => a + b, 0) + scaledGap * (scaledRow2Widths.length - 1);
      let row2X = -row2TotalWidth / 2;
      
      arcACell = new SettingsCell(arcASlider, scaledRow2Widths[0]);
      arcACell.x = row2X; arcACell.y = row2Y;
      this.content.addChild(arcACell);
      row2X += scaledRow2Widths[0] + scaledGap;
      
      arcBCell = new SettingsCell(arcBSlider, scaledRow2Widths[1]);
      arcBCell.x = row2X; arcBCell.y = row2Y;
      this.content.addChild(arcBCell);
      row2X += scaledRow2Widths[1] + scaledGap;
      
      const keepCell = new SettingsCell(keepSettingsToggle, scaledRow2Widths[2]);
      keepCell.x = row2X; keepCell.y = row2Y;
      this.content.addChild(keepCell);
      row2X += scaledRow2Widths[2] + scaledGap;
      
      const deckACell = new SettingsCell(this.deckABtn, scaledRow2Widths[3]);
      deckACell.x = row2X; deckACell.y = row2Y + 5;
      this.content.addChild(deckACell);
      row2X += scaledRow2Widths[3] + scaledGap;
      
      const deckBCell = new SettingsCell(this.deckBBtn, scaledRow2Widths[4]);
      deckBCell.x = row2X; deckBCell.y = row2Y + 5;
      this.content.addChild(deckBCell);
    }
  }
  
  /**
   * Create a deck toggle button
   */
  private createDeckToggleButton(
    label: string,
    width: number,
    height: number,
    isActive: boolean,
    onClick: () => void
  ): Container {
    const btn = new Container();
    
    const bg = new Graphics();
    bg.beginFill(isActive ? 0xF7941D : 0x444444);
    bg.drawRoundedRect(-width / 2, -height / 2, width, height, 6);
    bg.endFill();
    btn.addChild(bg);
    
    const text = new Text(label, new TextStyle({
      fontSize: 12,
      fontFamily: 'Arial',
      fill: 0xFFFFFF,
      fontWeight: 'bold'
    }));
    text.resolution = 2;
    text.anchor.set(0.5);
    btn.addChild(text);
    
    (btn as any).bgGraphics = bg;
    (btn as any).isActive = isActive;
    
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    
    btn.on('pointerover', () => {
      if (!(btn as any).isActive) {
        bg.tint = 0x888888;
      }
    });
    btn.on('pointerout', () => {
      bg.tint = 0xFFFFFF;
    });
    btn.on('pointerdown', onClick);
    
    return btn;
  }
  
  /**
   * Update deck toggle button visuals
   */
  private updateDeckToggleButtons(): void {
    if (!this.deckABtn || !this.deckBBtn) return;
    
    const updateBtn = (btn: Container, isActive: boolean) => {
      (btn as any).isActive = isActive;
      const bg = (btn as any).bgGraphics as Graphics;
      const width = 55;
      const height = 28;
      bg.clear();
      bg.beginFill(isActive ? 0xF7941D : 0x444444);
      bg.drawRoundedRect(-width / 2, -height / 2, width, height, 6);
      bg.endFill();
      bg.tint = 0xFFFFFF;
    };
    
    updateBtn(this.deckABtn, this.settings.activeDeck === 'left');
    updateBtn(this.deckBBtn, this.settings.activeDeck === 'right');
  }
  
  /**
   * Get current settings values
   */
  public getSettings(): LiteralModeSettings {
    return { ...this.settings };
  }
}

