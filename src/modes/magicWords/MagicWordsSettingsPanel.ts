import { Container, Graphics } from 'pixi.js';
import { Slider } from '../../components/Slider';
import { Dropdown } from '../../components/Dropdown';
import { Toggle } from '../../components/Toggle';
import {
  DIALOGUE_CONFIG,
  SETTINGS_PANEL_UI,
  PRESETS,
  type MagicWordsSettings,
  saveSettings,
} from '../../config/magicWordsSettings';

/**
 * Callbacks from settings panel to mode
 */
export interface MagicWordsSettingsCallbacks {
  /** Called when dialog box width changes */
  onDialogBoxChange: (value: number) => void;
  /** Called when avatar size changes */
  onAvatarSizeChange: (value: number) => void;
  /** Called when avatar Y offset changes */
  onYOffsetChange: (value: number) => void;
}

/**
 * MagicWordsSettingsPanel
 * 
 * Extracted settings UI for Magic Words Literal mode.
 * Follows same pattern as LiteralModeSettingsPanel for Ace of Shadows.
 */
export class MagicWordsSettingsPanel extends Container {
  private settings: MagicWordsSettings;
  private callbacks: MagicWordsSettingsCallbacks;
  private designWidth: number;
  
  // Control references
  private dialogSlider: Slider | null = null;
  private avatarSlider: Slider | null = null;
  private yOffsetSlider: Slider | null = null;
  private presetDropdown: Dropdown | null = null;
  private keepSettingsToggle: Toggle | null = null;
  private background: Graphics | null = null;
  
  constructor(
    designWidth: number,
    initialSettings: MagicWordsSettings,
    callbacks: MagicWordsSettingsCallbacks
  ) {
    super();
    this.designWidth = designWidth;
    this.settings = { ...initialSettings };
    this.callbacks = callbacks;
    
    this.buildControls();
  }
  
  private buildControls(): void {
    const { avatar, dialogBox } = DIALOGUE_CONFIG;
    const ui = SETTINGS_PANEL_UI;
    
    // Calculate dimensions
    const dropdownRowY = ui.paddingTop + 15 + ui.gap * 3;
    const keepSettingsRowY = dropdownRowY + 50;
    const panelWidth = ui.sliderWidth + ui.paddingX * 2;
    const panelHeight = keepSettingsRowY + 40;
    const panelX = (this.designWidth - panelWidth) / 2;
    
    // Panel background
    this.background = new Graphics();
    this.background.beginFill(0x000000, ui.backgroundAlpha);
    this.background.drawRoundedRect(0, 0, panelWidth, panelHeight, ui.radius);
    this.background.endFill();
    this.addChild(this.background);
    
    // Dialog Box Width slider
    this.dialogSlider = new Slider({
      label: 'Dialog Box',
      min: dialogBox.minWidth,
      max: dialogBox.maxWidth,
      value: this.settings.dialogBoxWidth,
      step: 20,
      unit: 'px',
      decimals: 0,
      width: ui.sliderWidth,
      onChange: (value) => {
        this.settings.dialogBoxWidth = value;
        this.callbacks.onDialogBoxChange(value);
        this.persistIfEnabled();
      },
    });
    this.dialogSlider.x = ui.paddingX;
    this.dialogSlider.y = ui.paddingTop + 15;
    this.addChild(this.dialogSlider);
    
    // Avatar Size slider
    this.avatarSlider = new Slider({
      label: 'Avatar Size',
      min: avatar.minSize,
      max: avatar.maxSize,
      value: this.settings.avatarSize,
      step: 10,
      unit: 'px',
      decimals: 0,
      width: ui.sliderWidth,
      onChange: (value) => {
        this.settings.avatarSize = value;
        this.callbacks.onAvatarSizeChange(value);
        this.persistIfEnabled();
      },
    });
    this.avatarSlider.x = ui.paddingX;
    this.avatarSlider.y = ui.paddingTop + 15 + ui.gap;
    this.addChild(this.avatarSlider);
    
    // Avatar Y Offset slider
    this.yOffsetSlider = new Slider({
      label: 'Avatar Y Offset',
      min: -300,
      max: 300,
      value: this.settings.avatarYOffset,
      step: 50,
      unit: 'px',
      decimals: 0,
      width: ui.sliderWidth,
      onChange: (value) => {
        this.settings.avatarYOffset = value;
        this.callbacks.onYOffsetChange(value);
        this.persistIfEnabled();
      },
    });
    this.yOffsetSlider.x = ui.paddingX;
    this.yOffsetSlider.y = ui.paddingTop + 15 + ui.gap * 2;
    this.addChild(this.yOffsetSlider);
    
    // Preset dropdown
    const presetOptions = Object.entries(PRESETS).map(([key, preset]) => ({
      label: preset.label,
      value: key,
    }));
    
    this.presetDropdown = new Dropdown({
      label: 'Preset',
      options: presetOptions,
      value: this.settings.preset,
      width: ui.sliderWidth,
      onChange: (value) => this.applyPreset(value),
    });
    this.presetDropdown.x = ui.paddingX;
    this.presetDropdown.y = dropdownRowY;
    this.addChild(this.presetDropdown);
    
    // Keep Settings toggle
    this.keepSettingsToggle = new Toggle({
      label: 'Keep Settings',
      value: this.settings.keepSettings,
      onChange: (value) => {
        this.settings.keepSettings = value;
        if (value) {
          // Save current settings when enabled
          saveSettings(this.settings);
        }
      },
    });
    this.keepSettingsToggle.x = ui.paddingX;
    this.keepSettingsToggle.y = keepSettingsRowY;
    this.addChild(this.keepSettingsToggle);
    
    // Position panel centered horizontally
    this.x = panelX;
    this.y = ui.topOffset;
    
    // Stop click propagation (don't advance dialogue when clicking settings)
    this.eventMode = 'static';
    this.on('pointerdown', (e) => e.stopPropagation());
  }
  
  private applyPreset(presetKey: string): void {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    
    // Update settings
    this.settings.dialogBoxWidth = preset.dialogBox;
    this.settings.avatarSize = preset.avatarSize;
    this.settings.avatarYOffset = preset.yOffset;
    this.settings.preset = presetKey;
    
    // Update sliders
    if (this.dialogSlider) this.dialogSlider.value = preset.dialogBox;
    if (this.avatarSlider) this.avatarSlider.value = preset.avatarSize;
    if (this.yOffsetSlider) this.yOffsetSlider.value = preset.yOffset;
    
    // Trigger callbacks
    this.callbacks.onDialogBoxChange(preset.dialogBox);
    this.callbacks.onAvatarSizeChange(preset.avatarSize);
    this.callbacks.onYOffsetChange(preset.yOffset);
    
    this.persistIfEnabled();
  }
  
  private persistIfEnabled(): void {
    if (this.settings.keepSettings) {
      saveSettings(this.settings);
    }
  }
  
  /** Get current settings */
  public getSettings(): MagicWordsSettings {
    return { ...this.settings };
  }
  
  /** Update design width and reposition */
  public setDesignWidth(width: number): void {
    if (this.designWidth !== width) {
      this.designWidth = width;
      const panelWidth = SETTINGS_PANEL_UI.sliderWidth + SETTINGS_PANEL_UI.paddingX * 2;
      this.x = (width - panelWidth) / 2;
    }
  }
}

