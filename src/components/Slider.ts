import { Container, Graphics, Text, TextStyle, type FederatedPointerEvent } from 'pixi.js';

export interface SliderOptions {
  /** Slider label */
  label: string;
  /** Current value */
  value: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Step increment */
  step: number;
  /** Unit suffix (e.g., 's' for seconds) */
  unit?: string;
  /** Decimal places to show */
  decimals?: number;
  /** Width of the slider track */
  width?: number;
  /** Font size for label (default: 12) */
  fontSize?: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
}

/**
 * Slider
 *
 * A PixiJS-based slider component for controlling numeric values.
 */
export class Slider extends Container {
  private options: Required<SliderOptions>;
  private track: Graphics;
  private fill: Graphics;
  private handle: Graphics;
  private labelText: Text;
  private currentValue: number;
  private isDragging = false;

  /** Track dimensions */
  private readonly trackHeight = 6;
  private readonly handleRadius = 10;

  constructor(options: SliderOptions) {
    super();

    this.options = {
      label: options.label,
      value: options.value,
      min: options.min,
      max: options.max,
      step: options.step,
      unit: options.unit ?? '',
      decimals: options.decimals ?? 1,
      width: options.width ?? 120,
      fontSize: options.fontSize ?? 12,
      onChange: options.onChange,
    };

    this.currentValue = options.value;

    // Create components
    this.track = new Graphics();
    this.fill = new Graphics();
    this.handle = new Graphics();
    const fontSize = options.fontSize ?? 12;
    this.labelText = new Text(
      '',
      new TextStyle({
        fontFamily: 'Arial, sans-serif',
        fontSize: fontSize,
        fill: '#ffffff',
        fontWeight: 'bold',
      })
    );
    this.labelText.resolution = 2;

    this.addChild(this.track);
    this.addChild(this.fill);
    this.addChild(this.handle);
    this.addChild(this.labelText);

    this.drawSlider();
    this.updateLabel();
    this.setupInteraction();
  }

  /**
   * Draw the slider components
   */
  private drawSlider(): void {
    const { width } = this.options;

    // Track background
    this.track.clear();
    this.track.beginFill(0x333333);
    this.track.drawRoundedRect(0, -this.trackHeight / 2, width, this.trackHeight, 3);
    this.track.endFill();

    // Position label above track
    this.labelText.anchor.set(0.5, 1);
    this.labelText.x = width / 2;
    this.labelText.y = -15;

    this.updateFillAndHandle();
  }

  /**
   * Update fill bar and handle position based on current value
   */
  private updateFillAndHandle(): void {
    const { width, min, max } = this.options;
    const ratio = (this.currentValue - min) / (max - min);
    const handleX = ratio * width;

    // Fill bar
    this.fill.clear();
    this.fill.beginFill(0xff671d);
    this.fill.drawRoundedRect(0, -this.trackHeight / 2, handleX, this.trackHeight, 3);
    this.fill.endFill();

    // Handle
    this.handle.clear();
    this.handle.beginFill(0xffffff);
    this.handle.drawCircle(0, 0, this.handleRadius);
    this.handle.endFill();
    this.handle.x = handleX;
  }

  /**
   * Update the label text
   */
  private updateLabel(): void {
    const { label, unit, decimals } = this.options;
    this.labelText.text = `${label}: ${this.currentValue.toFixed(decimals)}${unit}`;
  }

  /**
   * Setup mouse/touch interaction
   */
  private setupInteraction(): void {
    // Make the entire slider interactive
    this.eventMode = 'static';
    this.cursor = 'pointer';

    // Create hit area that covers track and handle
    const hitArea = new Graphics();
    hitArea.beginFill(0x000000, 0.001); // Nearly invisible
    hitArea.drawRect(
      -this.handleRadius,
      -this.handleRadius - 20,
      this.options.width + this.handleRadius * 2,
      this.handleRadius * 2 + 25
    );
    hitArea.endFill();
    this.addChildAt(hitArea, 0);

    this.on('pointerdown', this.onDragStart);
    this.on('globalpointermove', this.onDragMove);
    this.on('pointerup', this.onDragEnd);
    this.on('pointerupoutside', this.onDragEnd);
  }

  private onDragStart = (event: FederatedPointerEvent): void => {
    this.isDragging = true;
    this.updateValueFromPosition(event.global.x, event.global.y);
  };

  private onDragMove = (event: FederatedPointerEvent): void => {
    if (!this.isDragging) return;
    this.updateValueFromPosition(event.global.x, event.global.y);
  };

  private onDragEnd = (): void => {
    this.isDragging = false;
  };

  /**
   * Update value based on pointer position
   */
  private updateValueFromPosition(globalX: number, globalY: number): void {
    const { width, min, max, step } = this.options;

    // Convert global position to local
    // Important: use both x/y so this works when the slider (or parent scene) is rotated.
    const localPos = this.toLocal({ x: globalX, y: globalY });

    // Calculate ratio (clamped to 0-1)
    const ratio = Math.max(0, Math.min(1, localPos.x / width));

    // Calculate raw value
    let newValue = min + ratio * (max - min);

    // Snap to step
    newValue = Math.round(newValue / step) * step;

    // Clamp to range
    newValue = Math.max(min, Math.min(max, newValue));

    if (newValue !== this.currentValue) {
      this.currentValue = newValue;
      this.updateFillAndHandle();
      this.updateLabel();
      this.options.onChange(newValue);
    }
  }

  /**
   * Get current value
   */
  get value(): number {
    return this.currentValue;
  }

  /**
   * Set value programmatically
   */
  set value(val: number) {
    this.currentValue = Math.max(this.options.min, Math.min(this.options.max, val));
    this.updateFillAndHandle();
    this.updateLabel();
  }
}
