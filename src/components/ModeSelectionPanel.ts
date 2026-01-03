import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Button } from './Button';

/**
 * Configuration for a mode button
 */
export interface ModeButtonConfig {
  /** Button label text */
  label: string;
  /** Button background color */
  backgroundColor: number;
  /** Callback when button is clicked */
  onClick: () => void;
}

/**
 * Configuration for ModeSelectionPanel
 */
export interface ModeSelectionPanelConfig {
  /** Panel title */
  title: string;
  /** Optional task description (displayed below title) */
  description?: string;
  /** Array of mode buttons */
  buttons: ModeButtonConfig[];
  /** Panel center X position */
  centerX?: number;
  /** Panel center Y position */
  centerY?: number;
  /** Horizontal padding around content */
  paddingX?: number;
  /** Vertical padding around content */
  paddingY?: number;
  /** Gap between title and description */
  descriptionGap?: number;
  /** Gap between description/title and first button */
  titleGap?: number;
  /** Gap between buttons */
  buttonGap?: number;
  /** Button width */
  buttonWidth?: number;
  /** Button height */
  buttonHeight?: number;
  /** Panel corner radius */
  radius?: number;
  /** Panel background color */
  backgroundColor?: number;
  /** Panel background opacity */
  backgroundAlpha?: number;
  /** Title font size */
  titleFontSize?: number;
  /** Description font size */
  descriptionFontSize?: number;
  /** Button font size */
  buttonFontSize?: number;
  /** Button corner radius */
  buttonRadius?: number;
  /** Max width for description text wrapping */
  descriptionMaxWidth?: number;
}

/**
 * ModeSelectionPanel
 * 
 * A reusable panel for selecting between different modes (e.g., "Literal Task" vs "Creative Take").
 * Features:
 * - Centered title with configurable text
 * - Vertically stacked buttons with custom labels/colors/callbacks
 * - Auto-sizing background panel
 * - Returns design bounds for responsive layout
 */
export class ModeSelectionPanel extends Container {
  private config: Required<ModeSelectionPanelConfig>;
  private panelBg: Graphics;
  private contentContainer: Container;
  private panelWidth = 0;
  private panelHeight = 0;

  constructor(config: ModeSelectionPanelConfig) {
    super();

    // Apply defaults with balanced spacing
    this.config = {
      title: config.title,
      description: config.description ?? '',
      buttons: config.buttons,
      centerX: config.centerX ?? 400,
      centerY: config.centerY ?? 220,
      paddingX: config.paddingX ?? 50,
      paddingY: config.paddingY ?? 40,
      descriptionGap: config.descriptionGap ?? 20,
      titleGap: config.titleGap ?? 30,
      buttonGap: config.buttonGap ?? 18,
      buttonWidth: config.buttonWidth ?? 320,
      buttonHeight: config.buttonHeight ?? 56,
      radius: config.radius ?? 24,
      backgroundColor: config.backgroundColor ?? 0x000000,
      backgroundAlpha: config.backgroundAlpha ?? 0.6,
      titleFontSize: config.titleFontSize ?? 36,
      descriptionFontSize: config.descriptionFontSize ?? 17,
      buttonFontSize: config.buttonFontSize ?? 22,
      buttonRadius: config.buttonRadius ?? 14,
      descriptionMaxWidth: config.descriptionMaxWidth ?? 400,
    };

    // Position panel at center
    this.x = this.config.centerX;
    this.y = this.config.centerY;

    // Create content container
    this.contentContainer = new Container();
    this.addChild(this.contentContainer);

    // Create background (drawn after content is measured)
    this.panelBg = new Graphics();
    this.addChildAt(this.panelBg, 0);

    this.buildContent();
  }

  /**
   * Build the panel content (title + description + buttons)
   */
  private buildContent(): void {
    const {
      title,
      description,
      buttons,
      descriptionGap,
      titleGap,
      buttonGap,
      buttonWidth,
      buttonHeight,
      paddingX,
      paddingY,
      radius,
      backgroundColor,
      backgroundAlpha,
      titleFontSize,
      descriptionFontSize,
      buttonFontSize,
      buttonRadius,
      descriptionMaxWidth,
    } = this.config;

    // Title
    const titleStyle = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: titleFontSize,
      fontWeight: 'bold',
      fill: '#ffffff',
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowDistance: 2,
    });

    const titleText = new Text(title, titleStyle);
    titleText.resolution = 2;
    titleText.anchor.set(0.5, 0);
    titleText.x = 0;
    titleText.y = 0;
    this.contentContainer.addChild(titleText);

    let currentY = titleText.height;

    // Description (if provided)
    if (description) {
      currentY += descriptionGap;

      const descStyle = new TextStyle({
        fontFamily: 'Arial, sans-serif',
        fontSize: descriptionFontSize,
        fill: '#e0e0e0',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: descriptionMaxWidth,
        lineHeight: descriptionFontSize * 1.4,
      });

      const descText = new Text(description, descStyle);
      descText.resolution = 2;
      descText.anchor.set(0.5, 0);
      descText.x = 0;
      descText.y = currentY;
      this.contentContainer.addChild(descText);

      currentY += descText.height;
    }

    // Gap before buttons
    currentY += titleGap;

    // Buttons
    for (const btnConfig of buttons) {
      const btn = new Button({
        label: btnConfig.label,
        width: buttonWidth,
        height: buttonHeight,
        backgroundColor: btnConfig.backgroundColor,
        fontSize: buttonFontSize,
        radius: buttonRadius,
        onClick: btnConfig.onClick,
      });
      btn.x = 0;
      btn.y = currentY;
      this.contentContainer.addChild(btn);

      currentY += buttonHeight + buttonGap;
    }

    // Measure content bounds and center it
    const bounds = this.contentContainer.getLocalBounds();
    this.contentContainer.x = -bounds.x - bounds.width / 2;
    this.contentContainer.y = -bounds.y - bounds.height / 2;

    // Calculate panel size from content + padding
    this.panelWidth = bounds.width + paddingX * 2;
    this.panelHeight = bounds.height + paddingY * 2;

    // Draw panel background
    this.panelBg.clear();
    this.panelBg.beginFill(backgroundColor, backgroundAlpha);
    this.panelBg.drawRoundedRect(
      -this.panelWidth / 2,
      -this.panelHeight / 2,
      this.panelWidth,
      this.panelHeight,
      radius
    );
    this.panelBg.endFill();
  }

  /**
   * Get the design bounds for this panel (for responsive layout)
   */
  getDesignBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.config.centerX - this.panelWidth / 2,
      y: this.config.centerY - this.panelHeight / 2,
      width: this.panelWidth,
      height: this.panelHeight,
    };
  }

  /**
   * Get panel dimensions
   */
  getPanelSize(): { width: number; height: number } {
    return {
      width: this.panelWidth,
      height: this.panelHeight,
    };
  }
}

