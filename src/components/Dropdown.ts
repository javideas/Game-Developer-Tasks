import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface DropdownOption {
  label: string;
  value: string;
}

export interface DropdownOptions {
  /** Label shown above dropdown */
  label?: string;
  /** Available options */
  options: DropdownOption[];
  /** Currently selected value */
  value: string;
  /** Width of the dropdown */
  width?: number;
  /** Callback when selection changes */
  onChange: (value: string) => void;
}

/**
 * Dropdown Component
 * 
 * A PixiJS-based dropdown/select component.
 */
export class Dropdown extends Container {
  private options: Required<DropdownOptions>;
  private selectedIndex: number;
  private isOpen = false;
  
  private labelText: Text | null = null;
  private button: Container;
  private buttonBg: Graphics;
  private buttonText: Text;
  private arrow: Text;
  private menu: Container | null = null;
  
  private readonly itemHeight = 28;
  
  constructor(options: DropdownOptions) {
    super();
    
    this.options = {
      label: options.label ?? '',
      options: options.options,
      value: options.value,
      width: options.width ?? 150,
      onChange: options.onChange,
    };
    
    // Find initial selected index
    this.selectedIndex = this.options.options.findIndex(o => o.value === options.value);
    if (this.selectedIndex < 0) this.selectedIndex = 0;
    
    // Create label if provided
    if (this.options.label) {
      this.labelText = new Text(this.options.label, new TextStyle({
        fontFamily: 'Arial, sans-serif',
        fontSize: 12,
        fill: '#ffffff',
      }));
      this.labelText.resolution = 2;
      this.labelText.y = -18;
      this.addChild(this.labelText);
    }
    
    // Create button
    this.button = new Container();
    this.addChild(this.button);
    
    this.buttonBg = new Graphics();
    this.drawButtonBg(false);
    this.button.addChild(this.buttonBg);
    
    this.buttonText = new Text(this.getSelectedLabel(), new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 12,
      fill: '#ffffff',
    }));
    this.buttonText.resolution = 2;
    this.buttonText.x = 10;
    this.buttonText.y = (this.itemHeight - this.buttonText.height) / 2;
    this.button.addChild(this.buttonText);
    
    // Arrow
    this.arrow = new Text('▼', new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 10,
      fill: '#ffffff',
    }));
    this.arrow.resolution = 2;
    this.arrow.x = this.options.width - 20;
    this.arrow.y = (this.itemHeight - this.arrow.height) / 2;
    this.button.addChild(this.arrow);
    
    // Interaction
    this.button.eventMode = 'static';
    this.button.cursor = 'pointer';
    this.button.on('pointerdown', (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });
  }
  
  private drawButtonBg(hover: boolean): void {
    this.buttonBg.clear();
    this.buttonBg.beginFill(hover ? 0x555555 : 0x444444);
    this.buttonBg.lineStyle(1, 0x666666);
    this.buttonBg.drawRoundedRect(0, 0, this.options.width, this.itemHeight, 6);
    this.buttonBg.endFill();
  }
  
  private getSelectedLabel(): string {
    return this.options.options[this.selectedIndex]?.label ?? '';
  }
  
  private toggleMenu(): void {
    if (this.isOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }
  
  private openMenu(): void {
    if (this.menu) return;
    
    this.isOpen = true;
    this.arrow.text = '▲';
    
    this.menu = new Container();
    this.menu.y = this.itemHeight + 2;
    
    const menuBg = new Graphics();
    menuBg.beginFill(0x333333);
    menuBg.lineStyle(1, 0x666666);
    menuBg.drawRoundedRect(0, 0, this.options.width, this.options.options.length * this.itemHeight, 6);
    menuBg.endFill();
    this.menu.addChild(menuBg);
    
    this.options.options.forEach((option, index) => {
      const item = this.createMenuItem(option, index);
      item.y = index * this.itemHeight;
      this.menu!.addChild(item);
    });
    
    this.addChild(this.menu);
    
    // Close when clicking outside (next frame to avoid immediate close)
    setTimeout(() => {
      const closeHandler = () => {
        this.closeMenu();
        window.removeEventListener('pointerdown', closeHandler);
      };
      window.addEventListener('pointerdown', closeHandler);
    }, 0);
  }
  
  private closeMenu(): void {
    if (this.menu) {
      this.removeChild(this.menu);
      this.menu.destroy({ children: true });
      this.menu = null;
    }
    this.isOpen = false;
    this.arrow.text = '▼';
  }
  
  private createMenuItem(option: DropdownOption, index: number): Container {
    const item = new Container();
    
    const isSelected = index === this.selectedIndex;
    
    const bg = new Graphics();
    bg.beginFill(isSelected ? 0xFF671D : 0x333333);
    bg.drawRect(0, 0, this.options.width, this.itemHeight);
    bg.endFill();
    item.addChild(bg);
    
    const text = new Text(option.label, new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 12,
      fill: '#ffffff',
    }));
    text.resolution = 2;
    text.x = 10;
    text.y = (this.itemHeight - text.height) / 2;
    item.addChild(text);
    
    item.eventMode = 'static';
    item.cursor = 'pointer';
    
    item.on('pointerover', () => {
      if (!isSelected) {
        bg.clear();
        bg.beginFill(0x555555);
        bg.drawRect(0, 0, this.options.width, this.itemHeight);
        bg.endFill();
      }
    });
    
    item.on('pointerout', () => {
      bg.clear();
      bg.beginFill(isSelected ? 0xFF671D : 0x333333);
      bg.drawRect(0, 0, this.options.width, this.itemHeight);
      bg.endFill();
    });
    
    item.on('pointerdown', (e) => {
      e.stopPropagation();
      this.selectOption(index);
    });
    
    return item;
  }
  
  private selectOption(index: number): void {
    this.selectedIndex = index;
    this.buttonText.text = this.getSelectedLabel();
    this.closeMenu();
    this.options.onChange(this.options.options[index].value);
  }
  
  /** Get current value */
  get value(): string {
    return this.options.options[this.selectedIndex]?.value ?? '';
  }
  
  /** Set value programmatically */
  set value(val: string) {
    const index = this.options.options.findIndex(o => o.value === val);
    if (index >= 0 && index !== this.selectedIndex) {
      this.selectedIndex = index;
      this.buttonText.text = this.getSelectedLabel();
    }
  }
}

