import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface ToggleOptions {
  /** Toggle label */
  label: string;
  /** Initial state */
  value: boolean;
  /** Callback when toggled */
  onChange: (value: boolean) => void;
}

/**
 * Toggle
 * 
 * A PixiJS-based toggle/checkbox component.
 */
export class Toggle extends Container {
  private options: ToggleOptions;
  private bg: Graphics;
  private knob: Graphics;
  private labelText: Text;
  private currentValue: boolean;

  private readonly trackWidth = 40;
  private readonly trackHeight = 20;
  private readonly knobRadius = 8;

  constructor(options: ToggleOptions) {
    super();
    this.options = options;
    this.currentValue = options.value;

    // Create components
    this.bg = new Graphics();
    this.knob = new Graphics();
    this.labelText = new Text(options.label, new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 12,
      fill: '#ffffff',
      fontWeight: 'bold',
    }));
    this.labelText.resolution = 2;

    this.addChild(this.bg);
    this.addChild(this.knob);
    this.addChild(this.labelText);

    this.draw();
    this.setupInteraction();
  }

  private draw(): void {
    // Track background
    this.bg.clear();
    this.bg.beginFill(this.currentValue ? 0xFF671D : 0x333333);
    this.bg.drawRoundedRect(0, 0, this.trackWidth, this.trackHeight, this.trackHeight / 2);
    this.bg.endFill();

    // Knob
    this.knob.clear();
    this.knob.beginFill(0xffffff);
    this.knob.drawCircle(0, 0, this.knobRadius);
    this.knob.endFill();

    // Position knob
    const knobX = this.currentValue 
      ? this.trackWidth - this.knobRadius - 2 
      : this.knobRadius + 2;
    this.knob.x = knobX;
    this.knob.y = this.trackHeight / 2;

    // Position label above track
    this.labelText.anchor.set(0.5, 1);
    this.labelText.x = this.trackWidth / 2;
    this.labelText.y = -5;
  }

  private setupInteraction(): void {
    this.eventMode = 'static';
    this.cursor = 'pointer';

    // Hit area
    const hitArea = new Graphics();
    hitArea.beginFill(0x000000, 0.001);
    hitArea.drawRect(-10, -25, this.trackWidth + 20, this.trackHeight + 30);
    hitArea.endFill();
    this.addChildAt(hitArea, 0);

    this.on('pointerdown', this.onToggle);
  }

  private onToggle = (): void => {
    this.currentValue = !this.currentValue;
    this.draw();
    this.options.onChange(this.currentValue);
  };

  get value(): boolean {
    return this.currentValue;
  }

  set value(val: boolean) {
    this.currentValue = val;
    this.draw();
  }
}

