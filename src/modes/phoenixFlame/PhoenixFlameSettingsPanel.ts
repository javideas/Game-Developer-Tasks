import { Container } from 'pixi.js';
import { GameSettingsPanel, type GameSettingsPanelConfig, type SettingsPanelContext } from '../../components/GameSettingsPanel';
import { Slider } from '../../components/Slider';
import { Toggle } from '../../components/Toggle';
import type { DeviceState } from '../../scenes/BaseGameScene';
import { SCENE_LAYOUT } from '../../config/sharedSettings';
import { PARTICLE_CONFIG } from '../../config/phoenixFlameSettings';

/**
 * Settings for Phoenix Flame mode
 */
export interface PhoenixFlameSettings {
  scale: number;
  particleMaxScale: number;
  height: number;
  spread: number;
  floorOffset: number;
  flameYOffset: number;
  landingPause: number;
  shrinkOffset: number;
  bigFlamePivotOffset: number;
  showPivotMarker: boolean;
}

/**
 * Callbacks for settings changes
 */
export interface PhoenixFlameSettingsCallbacks {
  onScaleChange: (value: number) => void;
  onParticleMaxScaleChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onSpreadChange: (value: number) => void;
  onFloorOffsetChange: (value: number) => void;
  onFlameYOffsetChange: (value: number) => void;
  onLandingPauseChange: (value: number) => void;
  onShrinkOffsetChange: (value: number) => void;
  onBigFlamePivotOffsetChange: (value: number) => void;
  onShowPivotMarkerChange: (value: boolean) => void;
}

/**
 * PhoenixFlameSettingsPanel
 * 
 * Settings UI for Phoenix Flame literal mode.
 * Positioned at the bottom of the screen.
 */
export class PhoenixFlameSettingsPanel extends GameSettingsPanel {
  private settings: PhoenixFlameSettings;
  private callbacks: PhoenixFlameSettingsCallbacks;
  
  private scaleSlider: Slider | null = null;
  private particleScaleSlider: Slider | null = null;
  private heightSlider: Slider | null = null;
  private spreadSlider: Slider | null = null;
  private floorOffsetSlider: Slider | null = null;
  private flameYOffsetSlider: Slider | null = null;
  private landingPauseSlider: Slider | null = null;
  private shrinkOffsetSlider: Slider | null = null;
  private bigFlamePivotSlider: Slider | null = null;
  private pivotMarkerToggle: Toggle | null = null;

  constructor(
    config: GameSettingsPanelConfig,
    context: SettingsPanelContext,
    settings: PhoenixFlameSettings,
    callbacks: PhoenixFlameSettingsCallbacks
  ) {
    super(config, context);
    
    this.settings = settings;
    this.callbacks = callbacks;
    
    // Rebuild now that settings are properly assigned
    this.content.removeChildren();
    this.buildControlsForState(context.getDeviceState());
    this.updatePanelBackground();
    this.centerPanelAtOrigin();
  }

  protected buildControls(): void {
    // Initial build - settings may not be assigned yet
    // Real build happens in constructor after super()
    if (!this.settings) return;
    this.buildControlsForState(this.context.getDeviceState());
  }

  protected rebuildForDeviceState(_state: DeviceState): void {
    this.buildControlsForState(_state);
  }

  private buildControlsForState(_state: DeviceState): void {
    this.content.removeChildren();
    
    const { width: screenW, height: screenH } = this.context.getScreenSize();
    const isPhone = Math.min(screenW, screenH) < SCENE_LAYOUT.phoneBreakpoint;
    
    const fontSize = isPhone ? 16 : 12;
    const sliderWidth = isPhone ? 160 : 130;
    const gapX = 15;
    const gapY = isPhone ? 55 : 45;
    
    // Main flame scale slider (HQ flames are large, so smaller scale values)
    this.scaleSlider = new Slider({
      label: 'Big Flame',
      value: this.settings.scale,
      min: 0.1,
      max: 1.5,
      step: 0.05,
      unit: '×',
      decimals: 2,
      width: sliderWidth,
      fontSize,
      onChange: (value) => {
        this.settings.scale = value;
        this.callbacks.onScaleChange(value);
      },
    });
    
    // Particle max scale slider
    this.particleScaleSlider = new Slider({
      label: 'Particle Scale',
      value: this.settings.particleMaxScale,
      min: PARTICLE_CONFIG.peakScaleMin,
      max: PARTICLE_CONFIG.peakScaleMax,
      step: 0.1,
      unit: '×',
      decimals: 1,
      width: sliderWidth,
      fontSize,
      onChange: (value) => {
        this.settings.particleMaxScale = value;
        this.callbacks.onParticleMaxScaleChange(value);
      },
    });
    
    // Height slider
    this.heightSlider = new Slider({
      label: 'Height',
      value: this.settings.height,
      min: PARTICLE_CONFIG.heightMultiplierMin,
      max: PARTICLE_CONFIG.heightMultiplierMax,
      step: 0.1,
      unit: '×',
      decimals: 1,
      width: sliderWidth,
      fontSize,
      onChange: (value) => {
        this.settings.height = value;
        this.callbacks.onHeightChange(value);
      },
    });
    
    // Spread slider
    this.spreadSlider = new Slider({
      label: 'Spread',
      value: this.settings.spread,
      min: PARTICLE_CONFIG.angleSpreadMin,
      max: PARTICLE_CONFIG.angleSpreadMax,
      step: 10,
      unit: '°',
      decimals: 0,
      width: sliderWidth,
      fontSize,
      onChange: (value) => {
        this.settings.spread = value;
        this.callbacks.onSpreadChange(value);
      },
    });
    
    // Floor offset slider
    this.floorOffsetSlider = new Slider({
      label: 'Floor Offset',
      value: this.settings.floorOffset,
      min: PARTICLE_CONFIG.floorOffsetMin,
      max: PARTICLE_CONFIG.floorOffsetMax,
      step: 10,
      unit: 'px',
      decimals: 0,
      width: sliderWidth,
      fontSize,
      onChange: (value) => {
        this.settings.floorOffset = value;
        this.callbacks.onFloorOffsetChange(value);
      },
    });
    
    // Flame Y offset slider
    this.flameYOffsetSlider = new Slider({
      label: 'Flame Y Pos',
      value: this.settings.flameYOffset,
      min: PARTICLE_CONFIG.flameYOffsetMin,
      max: PARTICLE_CONFIG.flameYOffsetMax,
      step: 10,
      unit: 'px',
      decimals: 0,
      width: sliderWidth,
      fontSize,
      onChange: (value) => {
        this.settings.flameYOffset = value;
        this.callbacks.onFlameYOffsetChange(value);
      },
    });
    
    // Landing pause slider
    this.landingPauseSlider = new Slider({
      label: 'Land Pause',
      value: this.settings.landingPause,
      min: PARTICLE_CONFIG.landingPauseMin,
      max: PARTICLE_CONFIG.landingPauseMax,
      step: 0.1,
      unit: 's',
      decimals: 1,
      width: sliderWidth,
      fontSize,
      onChange: (value) => {
        this.settings.landingPause = value;
        this.callbacks.onLandingPauseChange(value);
      },
    });
    
    // Shrink offset slider (adjusts where the shrink pivot is)
    this.shrinkOffsetSlider = new Slider({
      label: 'Shrink Offset',
      value: this.settings.shrinkOffset,
      min: PARTICLE_CONFIG.shrinkOffsetMin,
      max: PARTICLE_CONFIG.shrinkOffsetMax,
      step: 10,
      unit: 'px',
      decimals: 0,
      width: sliderWidth,
      fontSize,
      onChange: (value) => {
        this.settings.shrinkOffset = value;
        this.callbacks.onShrinkOffsetChange(value);
      },
    });
    
    // Big flame pivot offset slider (adjusts where big flame scales from)
    this.bigFlamePivotSlider = new Slider({
      label: 'Flame Pivot',
      value: this.settings.bigFlamePivotOffset,
      min: PARTICLE_CONFIG.bigFlamePivotOffsetMin,
      max: PARTICLE_CONFIG.bigFlamePivotOffsetMax,
      step: 5,
      unit: 'px',
      decimals: 0,
      width: sliderWidth,
      fontSize,
      onChange: (value) => {
        this.settings.bigFlamePivotOffset = value;
        this.callbacks.onBigFlamePivotOffsetChange(value);
      },
    });
    
    // Pivot marker toggle (debug visualization)
    this.pivotMarkerToggle = new Toggle({
      label: 'Show Pivot',
      value: this.settings.showPivotMarker,
      horizontal: true,
      width: sliderWidth,
      fontSize,
      onChange: (value) => {
        this.settings.showPivotMarker = value;
        this.callbacks.onShowPivotMarkerChange(value);
      },
    });
    
    // Layout: 3 rows grid + toggle
    const cell1 = new Container();
    cell1.addChild(this.scaleSlider);
    this.content.addChild(cell1);
    
    const cell2 = new Container();
    cell2.addChild(this.particleScaleSlider);
    this.content.addChild(cell2);
    
    const cell3 = new Container();
    cell3.addChild(this.heightSlider);
    this.content.addChild(cell3);
    
    const cell4 = new Container();
    cell4.addChild(this.spreadSlider);
    this.content.addChild(cell4);
    
    const cell5 = new Container();
    cell5.addChild(this.floorOffsetSlider);
    this.content.addChild(cell5);
    
    const cell6 = new Container();
    cell6.addChild(this.flameYOffsetSlider);
    this.content.addChild(cell6);
    
    const cell7 = new Container();
    cell7.addChild(this.landingPauseSlider);
    this.content.addChild(cell7);
    
    const cell8 = new Container();
    cell8.addChild(this.shrinkOffsetSlider!);
    this.content.addChild(cell8);
    
    const cell9 = new Container();
    cell9.addChild(this.bigFlamePivotSlider!);
    this.content.addChild(cell9);
    
    const cell10 = new Container();
    cell10.addChild(this.pivotMarkerToggle!);
    this.content.addChild(cell10);
    
    // Position sliders in 3x3 grid (3 columns, 3 rows) + toggle row
    const cols = 3;
    const totalWidth = sliderWidth * cols + gapX * (cols - 1);
    const row1Y = 0;
    const row2Y = gapY;
    const row3Y = gapY * 2;
    const toggleRowY = gapY * 2.7; // Smaller gap for toggle row
    
    // Row 1: Big Flame, Flame Pivot, Particle Scale
    cell1.x = -totalWidth / 2;
    cell1.y = row1Y;
    cell9.x = -totalWidth / 2 + sliderWidth + gapX;
    cell9.y = row1Y;
    cell2.x = -totalWidth / 2 + (sliderWidth + gapX) * 2;
    cell2.y = row1Y;
    
    // Row 2: Height, Spread, Floor Offset
    cell3.x = -totalWidth / 2;
    cell3.y = row2Y;
    cell4.x = -totalWidth / 2 + sliderWidth + gapX;
    cell4.y = row2Y;
    cell5.x = -totalWidth / 2 + (sliderWidth + gapX) * 2;
    cell5.y = row2Y;
    
    // Row 3: Flame Y Pos, Land Pause, Shrink Offset
    cell6.x = -totalWidth / 2;
    cell6.y = row3Y;
    cell7.x = -totalWidth / 2 + sliderWidth + gapX;
    cell7.y = row3Y;
    cell8.x = -totalWidth / 2 + (sliderWidth + gapX) * 2;
    cell8.y = row3Y;
    
    // Row 4: Toggle (centered under Flame Pivot)
    cell10.x = -totalWidth / 2 + sliderWidth + gapX;
    cell10.y = toggleRowY;
  }

  /**
   * Override scaleToFit to position at bottom of screen
   */
  public override scaleToFit(): void {
    const { width: screenW, height: screenH } = this.context.getScreenSize();
    
    // Reset scale to measure
    this.scale.set(1);
    
    const bounds = this.getLocalBounds();
    
    // Position near bottom of design area
    const bottomMargin = 40;
    const designHeight = 720; // From DESIGN_BOUNDS
    
    this.y = designHeight - bounds.height / 2 - bottomMargin;
    this.x = this.config.designX;
    
    // Scale for phones
    const isPhone = Math.min(screenW, screenH) < SCENE_LAYOUT.phoneBreakpoint;
    const panelScale = isPhone ? 1.2 : 1.0;
    this.scale.set(panelScale);
  }
}
