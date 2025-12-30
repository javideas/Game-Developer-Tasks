import { Container } from 'pixi.js';
import { GameSettingsPanel, type GameSettingsPanelConfig, type SettingsPanelContext } from '../../components/GameSettingsPanel';
import { Slider } from '../../components/Slider';
import { Dropdown } from '../../components/Dropdown';
import { Toggle } from '../../components/Toggle';
import { SettingsCell } from '../../components/SettingsPanel';
import type { DeviceState } from '../../scenes/BaseGameScene';
import { SCENE_LAYOUT } from '../../config/sharedSettings';
import {
  DIALOGUE_CONFIG,
  SETTINGS_PANEL_UI,
  PRESETS,
  type MagicWordsSettings,
  saveSettings,
  clearPreservedSettings,
} from '../../config/magicWordsSettings';

/**
 * Physical phone portrait UI multiplier for the settings panel.
 * Scales typography and layout dimensions together (even scaling).
 *
 * Keep this modest (e.g. 1.05–1.25) to avoid overflow on small phones.
 */
const PHYSICAL_PORTRAIT_UI_MULTIPLIER = 1.3;

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
  /** Called when fake lag changes */
  onFakeLagChange: (value: number) => void;
}

/**
 * MagicWordsSettingsPanel
 * 
 * Settings UI for Magic Words Literal mode.
 * Extends GameSettingsPanel for consistent styling and responsive behavior
 * (same architecture as Ace of Shadows' LiteralModeSettingsPanel).
 */
export class MagicWordsSettingsPanel extends GameSettingsPanel {
  private settings: MagicWordsSettings;
  private callbacks: MagicWordsSettingsCallbacks;
  
  // Control references
  private dialogSlider: Slider | null = null;
  private avatarSlider: Slider | null = null;
  private yOffsetSlider: Slider | null = null;
  private fakeLagSlider: Slider | null = null;
  private presetDropdown: Dropdown | null = null;
  private keepSettingsToggle: Toggle | null = null;

  /** Track physical orientation so we can rebuild even when effective DeviceState doesn't change (auto-rotate). */
  private lastPhysicalIsPortrait: boolean = window.innerHeight > window.innerWidth;
  
  constructor(
    config: GameSettingsPanelConfig,
    context: SettingsPanelContext,
    initialSettings: MagicWordsSettings,
    callbacks: MagicWordsSettingsCallbacks
  ) {
    // Store settings before super() calls buildControls()
    // We need to use a workaround since super() must be first
    (MagicWordsSettingsPanel as any)._tempSettings = initialSettings;
    (MagicWordsSettingsPanel as any)._tempCallbacks = callbacks;
    
    super(config, context);
    
    this.settings = initialSettings;
    this.callbacks = callbacks;
    
    // Clean up temp storage
    delete (MagicWordsSettingsPanel as any)._tempSettings;
    delete (MagicWordsSettingsPanel as any)._tempCallbacks;
  }
  
  protected buildControls(): void {
    // Get settings from temp storage (during construction) or instance
    const settings = this.settings ?? (MagicWordsSettingsPanel as any)._tempSettings;
    const callbacks = this.callbacks ?? (MagicWordsSettingsPanel as any)._tempCallbacks;
    
    if (!settings || !callbacks) return;
    
    this.buildControlsForState(this.currentDeviceState, settings, callbacks);
  }
  
  protected rebuildForDeviceState(state: DeviceState): void {
    this.buildControlsForState(state, this.settings, this.callbacks);
  }

  private rebuildForPhysicalOrientationChange(): void {
    // Update our tracker first to avoid loops
    this.lastPhysicalIsPortrait = window.innerHeight > window.innerWidth;

    // Rebuild using the *effective* device state (layout decision),
    // but controls use window dimensions to apply the portrait multiplier correctly.
    this.content.removeChildren();
    this.rebuildForDeviceState(this.context.getDeviceState());

    // Recompute background + centering after rebuild, then re-fit to screen.
    this.updatePanelBackground();
    this.centerPanelAtOrigin();
    this.scaleToFit();
  }
  
  /**
   * Build controls for a specific device state
   */
  private buildControlsForState(
    deviceState: DeviceState,
    settings: MagicWordsSettings,
    callbacks: MagicWordsSettingsCallbacks
  ): void {
    const { avatar, dialogBox } = DIALOGUE_CONFIG;
    const ui = SETTINGS_PANEL_UI;
    // Use window dimensions for physical detection (context.getScreenSize may be swapped when rotated)
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;
    const isPhone = Math.min(cssWidth, cssHeight) < SCENE_LAYOUT.phoneBreakpoint;
    // Physical portrait detection (important because Magic Words can auto-rotate content)
    const isPhysicalPhonePortrait = isPhone && cssHeight > cssWidth;
    const isLandscape = deviceState === 'phoneLandscape' || deviceState === 'desktop';
    const uiScale = isPhysicalPhonePortrait ? PHYSICAL_PORTRAIT_UI_MULTIPLIER : 1;
    
    // Font size (scale evenly with the panel to avoid text/button overlap)
    const baseFontSize = isPhone ? 24 : 18;
    const fontSize = Math.round(baseFontSize * uiScale);
    
    // Sizing:
    // - phonePortrait: bigger (easier to use)
    // - landscape/desktop: occupy more horizontal space via wider columns, NOT via scaling
    // Dropdown needs extra width to fit text with larger font sizes
    const baseSliderWidth = (() => {
      if (isPhone) return isPhysicalPhonePortrait ? 260 : 220;
      return isLandscape ? 240 : ui.sliderWidth;
    })();
    const baseDropdownExtra = 40;
    const sliderWidth = Math.round(baseSliderWidth * uiScale);
    const dropdownWidth = Math.round((baseSliderWidth + baseDropdownExtra) * uiScale);
    
    // Dialog Box Width slider
    this.dialogSlider = new Slider({
      label: 'Dialog Box',
      min: dialogBox.minWidth,
      max: dialogBox.maxWidth,
      value: settings.dialogBoxWidth,
      step: 20,
      unit: 'px',
      decimals: 0,
      width: sliderWidth,
      fontSize: fontSize,
      onChange: (value) => {
        this.settings.dialogBoxWidth = value;
        callbacks.onDialogBoxChange(value);
        this.persistIfEnabled();
      },
    });
    const dialogCell = new SettingsCell(this.dialogSlider, sliderWidth);
    
    // Avatar Size slider
    this.avatarSlider = new Slider({
      label: 'Avatar Size',
      min: avatar.minSize,
      max: avatar.maxSize,
      value: settings.avatarSize,
      step: 10,
      unit: 'px',
      decimals: 0,
      width: sliderWidth,
      fontSize: fontSize,
      onChange: (value) => {
        this.settings.avatarSize = value;
        callbacks.onAvatarSizeChange(value);
        this.persistIfEnabled();
      },
    });
    const avatarCell = new SettingsCell(this.avatarSlider, sliderWidth);
    
    // Avatar Y Offset slider
    this.yOffsetSlider = new Slider({
      label: 'Avatar Y Offset',
      min: -300,
      max: 300,
      value: settings.avatarYOffset,
      step: 50,
      unit: 'px',
      decimals: 0,
      width: sliderWidth,
      fontSize: fontSize,
      onChange: (value) => {
        this.settings.avatarYOffset = value;
        callbacks.onYOffsetChange(value);
        this.persistIfEnabled();
      },
    });
    const yOffsetCell = new SettingsCell(this.yOffsetSlider, sliderWidth);
    
    // Preset dropdown
    const presetOptions = Object.entries(PRESETS).map(([key, preset]) => ({
      label: preset.label,
      value: key,
    }));
    
    this.presetDropdown = new Dropdown({
      label: 'Preset',
      options: presetOptions,
      value: settings.preset,
      width: dropdownWidth,
      fontSize: fontSize,
      onChange: (value) => this.applyPreset(value),
    });
    const presetCell = new SettingsCell(this.presetDropdown, dropdownWidth);
    
    // Fake Lag slider (for debugging loading screen)
    this.fakeLagSlider = new Slider({
      label: 'Fake Lag',
      min: 0,
      max: 4,
      value: settings.fakeLag,
      step: 0.5,
      unit: 's',
      decimals: 1,
      width: sliderWidth,
      fontSize: fontSize,
      onChange: (value) => {
        this.settings.fakeLag = value;
        callbacks.onFakeLagChange(value);
        this.persistIfEnabled();
      },
    });
    const fakeLagCell = new SettingsCell(this.fakeLagSlider, sliderWidth);
    
    // Keep Settings toggle (horizontal layout - label and toggle on same line)
    this.keepSettingsToggle = new Toggle({
      label: 'Keep Settings',
      value: settings.keepSettings,
      horizontal: true,
      width: sliderWidth,
      fontSize: fontSize,
      onChange: (value) => {
        this.settings.keepSettings = value;
        if (value) {
          // Save current settings when enabled
          saveSettings(this.settings);
        } else {
          // Ensure it's really off: clear any preserved settings so next entry uses defaults
          clearPreservedSettings();
        }
      },
    });
    const keepCell = new SettingsCell(this.keepSettingsToggle, sliderWidth);
    
    // Layout:
    // - phonePortrait: single-column vertical
    // - phoneLandscape + desktop: 2-column horizontal (like AceOfShadows behavior)
    // Add all rows to content container
    const allRows: Container[] = [dialogCell, avatarCell, yOffsetCell, presetCell, fakeLagCell, keepCell];
    for (const row of allRows) this.content.addChild(row);
    
    // Fixed row heights for consistent visual spacing (scale evenly via uiScale)
    const sliderRowHeight = Math.round((isPhysicalPhonePortrait ? 70 : 58) * uiScale);
    const dropdownRowHeight = Math.round((isPhysicalPhonePortrait ? 85 : 72) * uiScale);
    const rowGapY = Math.round((isPhysicalPhonePortrait ? 18 : 12) * uiScale);
    const colGapX = isLandscape ? 30 : 40;               // reduced gap since items are wider now
    
    // Enable sorting on content (needed for dropdown row zIndex bump)
    this.content.sortableChildren = true;
    
    if (deviceState === 'phonePortrait') {
      // Single-column vertical - use dropdown width as max to center properly
      const maxWidth = Math.max(sliderWidth, dropdownWidth);
      const colX = -maxWidth / 2;
      dialogCell.x = colX; dialogCell.y = 0;
      avatarCell.x = colX; avatarCell.y = dialogCell.y + sliderRowHeight + rowGapY;
      yOffsetCell.x = colX; yOffsetCell.y = avatarCell.y + sliderRowHeight + rowGapY;
      
      presetCell.x = colX;
      presetCell.y = yOffsetCell.y + sliderRowHeight + rowGapY + 6;
      
      fakeLagCell.x = colX;
      fakeLagCell.y = presetCell.y + dropdownRowHeight + rowGapY;
      
      keepCell.x = colX;
      keepCell.y = fakeLagCell.y + sliderRowHeight + rowGapY + 10;
    } else {
      // Landscape/Desktop: Max 2 rows, distributed horizontally
      // Row 1: dialog, avatar, yOffset (3 sliders) + preset (dropdown - wider)
      // Row 2: fakeLag, keep (2 items, centered)
      
      // Calculate row 1 total width accounting for dropdown being wider
      const row1TotalWidth = sliderWidth * 3 + dropdownWidth + colGapX * 3;
      const row1StartX = -row1TotalWidth / 2;
      
      // Row 1: distribute items with proper spacing
      let xPos = row1StartX;
      dialogCell.x = xPos; dialogCell.y = 0;
      xPos += sliderWidth + colGapX;
      avatarCell.x = xPos; avatarCell.y = 0;
      xPos += sliderWidth + colGapX;
      yOffsetCell.x = xPos; yOffsetCell.y = 0;
      xPos += sliderWidth + colGapX;
      presetCell.x = xPos; presetCell.y = 0;
      
      // Row 2: fakeLag and keep, centered
      const row2Y = Math.max(sliderRowHeight, dropdownRowHeight) + rowGapY;
      const totalRow2Width = sliderWidth * 2 + colGapX;
      const row2StartX = -totalRow2Width / 2;
      
      fakeLagCell.x = row2StartX; fakeLagCell.y = row2Y;
      keepCell.x = row2StartX + sliderWidth + colGapX; keepCell.y = row2Y;
    }
    
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
  
  /**
   * Override scaleToFit to keep panel at fixed top position.
   * (Base class positions below game content, but Magic Words wants it at top)
   */
  public override scaleToFit(): void {
    // Scale behavior:
    // - phonePortrait: allow scaling UP so the panel is comfortably readable
    // - landscape/desktop: do NOT scale up; only scale down if needed (use layout width instead)
    const { width: screenW, height: screenH } = this.context.getScreenSize();
    
    // Determine padding based on screen size (match GameSettingsPanel behavior)
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;
    const useCompactPadding = Math.min(cssWidth, cssHeight) < SCENE_LAYOUT.largePaddingBreakpoint;
    const minPadding = useCompactPadding ? SCENE_LAYOUT.screenPaddingPhone : SCENE_LAYOUT.screenPadding;
    
    // Physical portrait detection (important because Magic Words can auto-rotate content)
    const isPhone = Math.min(cssWidth, cssHeight) < SCENE_LAYOUT.phoneBreakpoint;
    const isPhysicalPhonePortrait = isPhone && cssHeight > cssWidth;
    
    // Reset scale to measure actual size
    this.scale.set(1);
    
    // Get panel size in design coordinates
    const panelBounds = this.getLocalBounds();
    const panelDesignWidth = panelBounds.width;
    const panelDesignHeight = panelBounds.height;
    
    // Convert to screen coords using container scale
    const containerScale = this.context.getGameContainerScale();
    const panelScreenW = panelDesignWidth * containerScale;
    const panelScreenH = panelDesignHeight * containerScale;
    
    const availableWidth = screenW - minPadding.left - minPadding.right;
    // Keep it in the top portion but allow it to grow (especially on portrait)
    const availableHeight = screenH - minPadding.top - minPadding.bottom;
    
    const scaleX = availableWidth / panelScreenW;
    const scaleY = availableHeight / panelScreenH;
    
    // Even scaling: we already scale typography + layout via PHYSICAL_PORTRAIT_UI_MULTIPLIER.
    // Here we only scale-to-fit (no extra post-multiplier boost, which caused double-scaling).
    const uiScale = isPhysicalPhonePortrait ? PHYSICAL_PORTRAIT_UI_MULTIPLIER : 1;

    // Fit scale, accounting for the desired UI scale so we still stay within bounds.
    // We choose a base scale that, after multiplying by uiScale, still fits.
    const maxScale = 1.0; // never scale up beyond fit; avoid overflow on small phones
    const minScale = 0.65;
    const fitScale = Math.max(minScale, Math.min(scaleX / uiScale, scaleY / uiScale, maxScale));
    const appliedScale = fitScale * uiScale;
    
    this.scale.set(appliedScale);
    
    // Position:
    // IMPORTANT: The scene's `gameContainer` is vertically centered by BaseGameScene.
    // If we position using only design coords, the panel can never reach the screen top on tall portrait screens.
    // So we anchor the panel's *screen* top, then convert that to design coords using gameContainer.y + scale.
    this.x = this.config.designX;
    
    // Desired screen top padding (pixels from screen top). Keep it tight.
    const desiredScreenTop = SETTINGS_PANEL_UI.topOffset;
    const gameContainerY = this.context.getGameContainerY();
    
    // Convert desired screen top to design coordinates (parent space of this panel)
    const panelTopDesign = (desiredScreenTop - gameContainerY) / containerScale;
    // Panel is centered at origin; top edge in parent coords is y - (h/2)*scale
    const yTopAnchored = panelTopDesign + (panelDesignHeight / 2) * appliedScale;
    
    // Safety: keep the panel above the dialog bubble if it would overlap.
    // context.getContentBottomY() is the bubble's top edge (design coords) from the mode.
    const bubbleTop = this.context.getContentBottomY();
    // Larger margin in portrait to move panel higher (further from dialog)
    const margin = isPhysicalPhonePortrait ? 40 : 16;
    // Calculate bottom edge in design coords (accounting for scale)
    const panelBottomDesign = yTopAnchored + (panelDesignHeight / 2) * appliedScale;
    const yMaxToStayAboveBubble = (bubbleTop - margin) - (panelDesignHeight / 2) * appliedScale;
    
    // If top-anchored placement would overlap the bubble, shift up just enough.
    // Otherwise, stay top-anchored.
    const wouldOverlap = panelBottomDesign > (bubbleTop - margin);
    this.y = wouldOverlap ? yMaxToStayAboveBubble : yTopAnchored;
  }
  
  /**
   * Override onResize - panel stays at fixed position
   */
  public override onResize(): void {
    const physicalIsPortrait = window.innerHeight > window.innerWidth;
    if (physicalIsPortrait !== this.lastPhysicalIsPortrait) {
      this.rebuildForPhysicalOrientationChange();
      return;
    }
    this.scaleToFit();
  }
}
