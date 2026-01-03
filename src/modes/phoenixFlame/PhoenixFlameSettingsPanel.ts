import { Container, Text, TextStyle } from 'pixi.js';

import {
  GameSettingsPanel,
  type GameSettingsPanelConfig,
  type SettingsPanelContext,
} from '../../components/GameSettingsPanel';
import { Slider } from '../../components/Slider';
import { Toggle } from '../../components/Toggle';
import { PARTICLE_CONFIG } from '../../config/phoenixFlameSettings';
import { SCENE_LAYOUT } from '../../config/sharedSettings';
import type { DeviceState } from '../../scenes/BaseGameScene';

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
  spawnHeightRange: number;
  gravity: number;
  angleThreshold: number;
  speedThreshold: number;
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
  onSpawnHeightRangeChange: (value: number) => void;
  onGravityChange: (value: number) => void;
  onAngleThresholdChange: (value: number) => void;
  onSpeedThresholdChange: (value: number) => void;
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
  private gravitySlider: Slider | null = null;
  private angleThresholdSlider: Slider | null = null;
  private speedThresholdSlider: Slider | null = null;
  private bigFlamePivotSlider: Slider | null = null;
  private pivotMarkerToggle: Toggle | null = null;
  private spawnHeightRangeSlider: Slider | null = null;
  private spriteCounterText: Text | null = null;

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
      onChange: value => {
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
      onChange: value => {
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
      onChange: value => {
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
      onChange: value => {
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
      onChange: value => {
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
      onChange: value => {
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
      onChange: value => {
        this.settings.landingPause = value;
        this.callbacks.onLandingPauseChange(value);
      },
    });

    // Gravity slider (acceleration when falling)
    this.gravitySlider = new Slider({
      label: 'Gravity',
      value: this.settings.gravity,
      min: PARTICLE_CONFIG.gravityMin,
      max: PARTICLE_CONFIG.gravityMax,
      step: 50,
      unit: '',
      decimals: 0,
      width: sliderWidth,
      fontSize,
      onChange: value => {
        this.settings.gravity = value;
        this.callbacks.onGravityChange(value);
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
      onChange: value => {
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
      onChange: value => {
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
      onChange: value => {
        this.settings.showPivotMarker = value;
        this.callbacks.onShowPivotMarkerChange(value);
      },
    });

    // Spawn height range slider (how far up from pivot particles can spawn)
    this.spawnHeightRangeSlider = new Slider({
      label: 'Spawn Range',
      value: this.settings.spawnHeightRange,
      min: PARTICLE_CONFIG.spawnHeightRangeMin,
      max: PARTICLE_CONFIG.spawnHeightRangeMax,
      step: 10,
      unit: 'px',
      decimals: 0,
      width: sliderWidth,
      fontSize,
      onChange: value => {
        this.settings.spawnHeightRange = value;
        this.callbacks.onSpawnHeightRangeChange(value);
      },
    });

    // Angle threshold slider (0 = disabled, forces variety in angles)
    this.angleThresholdSlider = new Slider({
      label: 'Angle Thresh',
      value: this.settings.angleThreshold,
      min: PARTICLE_CONFIG.angleThresholdMin,
      max: PARTICLE_CONFIG.angleThresholdMax,
      step: 5,
      unit: '°',
      decimals: 0,
      width: sliderWidth,
      fontSize,
      onChange: value => {
        this.settings.angleThreshold = value;
        this.callbacks.onAngleThresholdChange(value);
      },
    });

    // Speed threshold slider (0 = disabled, forces variety in speeds)
    this.speedThresholdSlider = new Slider({
      label: 'Speed Thresh',
      value: this.settings.speedThreshold,
      min: PARTICLE_CONFIG.speedThresholdMin,
      max: PARTICLE_CONFIG.speedThresholdMax,
      step: 5,
      unit: '',
      decimals: 0,
      width: sliderWidth,
      fontSize,
      onChange: value => {
        this.settings.speedThreshold = value;
        this.callbacks.onSpeedThresholdChange(value);
      },
    });

    // Layout: 5 rows grid + counter row
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

    const cell11 = new Container();
    cell11.addChild(this.spawnHeightRangeSlider!);
    this.content.addChild(cell11);

    const cell12 = new Container();
    cell12.addChild(this.gravitySlider!);
    this.content.addChild(cell12);

    const cell13 = new Container();
    cell13.addChild(this.angleThresholdSlider!);
    this.content.addChild(cell13);

    const cell14 = new Container();
    cell14.addChild(this.speedThresholdSlider!);
    this.content.addChild(cell14);

    // Position controls in 5 rows x 3 cols grid + counter row
    const cols = 3;
    const totalWidth = sliderWidth * cols + gapX * (cols - 1);
    const row1Y = 0;
    const row2Y = gapY;
    const row3Y = gapY * 2;
    const row4Y = gapY * 3;
    const row5Y = gapY * 4;
    const counterRowY = gapY * 4.7; // Smaller gap for counter row

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

    // Row 4: Spawn Range, Gravity, Show Pivot
    cell11.x = -totalWidth / 2;
    cell11.y = row4Y;
    cell12.x = -totalWidth / 2 + sliderWidth + gapX;
    cell12.y = row4Y;
    cell10.x = -totalWidth / 2 + (sliderWidth + gapX) * 2;
    cell10.y = row4Y;

    // Row 5: Angle Thresh, Speed Thresh
    cell13.x = -totalWidth / 2;
    cell13.y = row5Y;
    cell14.x = -totalWidth / 2 + sliderWidth + gapX;
    cell14.y = row5Y;

    // Sprite counter text (Row 6 - full width, left aligned)
    const counterStyle = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: fontSize,
      fontWeight: 'bold',
      fill: 0x44ff44,
      stroke: 0x000000,
      strokeThickness: 2,
    });
    this.spriteCounterText = new Text('Sprites: 1/10 (0 fly + 0 land + 1 main)', counterStyle);
    this.spriteCounterText.anchor.set(0, 0.5);
    this.spriteCounterText.x = -totalWidth / 2;
    this.spriteCounterText.y = counterRowY;
    this.content.addChild(this.spriteCounterText);
  }

  /**
   * Update the sprite counter display
   * @param total - Total visible sprite instances (main flame + flying + landed)
   * @param flying - Number of flying particles
   * @param landed - Number of landed/shrinking particles
   */
  public updateSpriteCounter(total: number, flying: number, landed: number): void {
    if (!this.spriteCounterText) return;

    // Color code based on usage (green = good, yellow = high, red = at limit)
    const color = total >= 10 ? 0xff4444 : total >= 8 ? 0xffaa00 : 0x44ff44;
    this.spriteCounterText.style.fill = color;
    this.spriteCounterText.text = `Sprites: ${total}/10 (${flying} fly + ${landed} land + 1 main)`;
  }

  /**
   * Override scaleToFit to position under the Back button (top-left)
   */
  public override scaleToFit(): void {
    const { width: screenW, height: screenH } = this.context.getScreenSize();

    // Reset scale to measure
    this.scale.set(1);

    // Place panel in the design top-left, under the floating back button.
    // Back button uses ~10px padding and ~36px height; add a little extra separation.
    const marginLeft = 10;
    const marginTop = 10 + 36 + 10; // padding + buttonHeight + gap

    // Scale for phones
    const isPhone = Math.min(screenW, screenH) < SCENE_LAYOUT.phoneBreakpoint;
    const panelScale = isPhone ? 1.05 : 1.0;
    this.scale.set(panelScale);

    // Recompute bounds after scaling for correct clamping
    const scaledBounds = this.getLocalBounds();

    // This panel is centered at its (x,y), so place its top-left at (marginLeft, marginTop)
    let targetX = marginLeft + scaledBounds.width / 2;
    let targetY = marginTop + scaledBounds.height / 2;

    // Clamp to screen bounds so it stays attached to the screen (even on tiny screens)
    const padding = 8;
    targetX = Math.max(
      padding + scaledBounds.width / 2,
      Math.min(screenW - padding - scaledBounds.width / 2, targetX)
    );
    targetY = Math.max(
      padding + scaledBounds.height / 2,
      Math.min(screenH - padding - scaledBounds.height / 2, targetY)
    );

    this.x = targetX;
    this.y = targetY;
  }
}
