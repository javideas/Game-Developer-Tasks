import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface ButtonOptions {
  /** Button label text */
  label: string;
  /** Button width */
  width?: number;
  /** Button height */
  height?: number;
  /** Background color */
  backgroundColor?: number;
  /** Text color */
  textColor?: string;
  /** Font size */
  fontSize?: number;
  /** Corner radius */
  radius?: number;
  /** Click callback */
  onClick: () => void;
}

/**
 * Button
 * 
 * A simple, reusable button component with hover effects.
 */
export class Button extends Container {
  private bg: Graphics;
  private label: Text;
  private options: Required<ButtonOptions>;

  constructor(options: ButtonOptions) {
    super();

    // Defaults
    this.options = {
      label: options.label,
      width: options.width ?? 200,
      height: options.height ?? 50,
      backgroundColor: options.backgroundColor ?? 0x4a90d9,
      textColor: options.textColor ?? '#ffffff',
      fontSize: options.fontSize ?? 18,
      radius: options.radius ?? 12,
      onClick: options.onClick,
    };

    const { width, height, backgroundColor, textColor, fontSize, radius, label } = this.options;

    // Make interactive
    this.eventMode = 'static';
    this.cursor = 'pointer';

    // Background
    this.bg = new Graphics();
    this.bg.beginFill(backgroundColor);
    this.bg.drawRoundedRect(-width / 2, -height / 2, width, height, radius);
    this.bg.endFill();
    this.addChild(this.bg);

    // Label
    const style = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize,
      fontWeight: 'bold',
      fill: textColor,
    });
    this.label = new Text(label, style);
    this.label.resolution = 2;
    this.label.anchor.set(0.5);
    this.addChild(this.label);

    // Events
    this.on('pointerover', this.onPointerOver);
    this.on('pointerout', this.onPointerOut);
    this.on('pointerdown', this.onPointerDown);
    this.on('pointerup', this.onPointerUp);
  }

  private onPointerOver = (): void => {
    this.alpha = 0.85;
    this.scale.set(1.02);
  };

  private onPointerOut = (): void => {
    this.alpha = 1;
    this.scale.set(1);
  };

  private onPointerDown = (): void => {
    this.scale.set(0.98);
  };

  private onPointerUp = (): void => {
    this.scale.set(1);
    this.options.onClick();
  };
}

