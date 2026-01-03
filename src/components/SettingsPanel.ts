import { Container, Graphics } from 'pixi.js';

/**
 * Configuration for SettingsPanel
 */
export interface SettingsPanelConfig {
  /** Horizontal padding around content */
  paddingX?: number;
  /** Vertical padding around content */
  paddingY?: number;
  /** Corner radius of panel background */
  radius?: number;
  /** Background color */
  backgroundColor?: number;
  /** Background opacity */
  backgroundAlpha?: number;
  /** Gap between cells */
  gap?: number;
  /** Row height */
  rowHeight?: number;
}

/**
 * A cell in the settings panel that centers its child
 */
export class SettingsCell extends Container {
  private cellWidth: number;
  private child: Container;

  constructor(child: Container, cellWidth: number) {
    super();
    this.child = child;
    this.cellWidth = cellWidth;
    this.addChild(child);
    this.relayout();
  }

  /**
   * Re-center the child within the cell.
   * Call this after the child's content changes (e.g., label text updates).
   */
  relayout(): void {
    const b = this.child.getLocalBounds();
    this.child.x = this.cellWidth / 2 - (b.x + b.width / 2);
    this.child.y = 0;
  }

  /**
   * Get the cell width
   */
  getWidth(): number {
    return this.cellWidth;
  }
}

/**
 * Row layout mode
 */
export type RowLayout = 'horizontal' | 'grid';

/**
 * Row definition for grid layout
 */
interface RowDefinition {
  cells: SettingsCell[];
  cellWidths: number[];
  yOffset: number;
}

/**
 * SettingsPanel
 *
 * A reusable PixiJS container for settings controls (sliders, toggles, buttons).
 * Features:
 * - Auto-sizing background panel
 * - Cell-based layout with automatic centering
 * - Responsive support for portrait/landscape
 * - Scale-to-fit functionality
 */
export class SettingsPanel extends Container {
  private config: Required<SettingsPanelConfig>;
  private panel: Graphics;
  private content: Container;
  private rows: RowDefinition[] = [];
  private currentRowIndex = 0;

  constructor(config: SettingsPanelConfig = {}) {
    super();

    this.config = {
      paddingX: config.paddingX ?? 13,
      paddingY: config.paddingY ?? 13,
      radius: config.radius ?? 12,
      backgroundColor: config.backgroundColor ?? 0x000000,
      backgroundAlpha: config.backgroundAlpha ?? 0.7,
      gap: config.gap ?? 8,
      rowHeight: config.rowHeight ?? 45,
    };

    // Background panel (drawn behind content)
    this.panel = new Graphics();
    this.addChild(this.panel);

    // Content container
    this.content = new Container();
    this.addChild(this.content);
  }

  /**
   * Create a cell with a centered child control
   */
  createCell(child: Container, cellWidth: number): SettingsCell {
    return new SettingsCell(child, cellWidth);
  }

  /**
   * Add a row of cells with specified widths
   * Cells are centered horizontally in the panel
   */
  addRow(cells: SettingsCell[], yPosition: number): void {
    const { gap } = this.config;

    // Calculate total row width
    const cellWidths = cells.map(c => c.getWidth());
    const totalWidth = cellWidths.reduce((a, b) => a + b, 0) + gap * (cells.length - 1);

    // Position cells horizontally (centered)
    let x = -totalWidth / 2;
    for (let i = 0; i < cells.length; i++) {
      cells[i].x = x;
      cells[i].y = yPosition;
      this.content.addChild(cells[i]);
      x += cellWidths[i] + gap;
    }

    // Store row definition
    this.rows.push({
      cells,
      cellWidths,
      yOffset: yPosition,
    });
    this.currentRowIndex++;

    // Redraw panel
    this.updatePanel();
  }

  /**
   * Add multiple rows for portrait layout (2-column grid)
   * @param cellPairs Array of [leftCell, rightCell] pairs
   * @param cellWidth Width of each cell
   */
  addPortraitGrid(cellPairs: [SettingsCell, SettingsCell][], cellWidth: number): void {
    const { gap, rowHeight } = this.config;

    // Calculate column positions
    const col1X = -(gap / 2 + cellWidth);
    const col2X = gap / 2;

    // Center vertically
    const totalHeight = rowHeight * cellPairs.length;
    const yOffset = -totalHeight / 2 + rowHeight / 2;

    for (let i = 0; i < cellPairs.length; i++) {
      const [left, right] = cellPairs[i];
      const y = yOffset + i * rowHeight;

      left.x = col1X;
      left.y = y;
      this.content.addChild(left);

      right.x = col2X;
      right.y = y;
      this.content.addChild(right);

      this.rows.push({
        cells: [left, right],
        cellWidths: [cellWidth, cellWidth],
        yOffset: y,
      });
    }

    this.updatePanel();
  }

  /**
   * Update the panel background to fit content
   */
  updatePanel(): void {
    const { paddingX, paddingY, radius, backgroundColor, backgroundAlpha } = this.config;
    const b = this.content.getLocalBounds();

    this.panel.clear();
    this.panel.beginFill(backgroundColor, backgroundAlpha);
    this.panel.drawRoundedRect(
      b.x - paddingX,
      b.y - paddingY,
      b.width + paddingX * 2,
      b.height + paddingY * 2,
      radius
    );
    this.panel.endFill();
  }

  /**
   * Get the current configuration
   */
  getConfig(): Required<SettingsPanelConfig> {
    return { ...this.config };
  }

  /**
   * Clear all rows and reset the panel
   */
  clear(): void {
    this.content.removeChildren();
    this.rows = [];
    this.currentRowIndex = 0;
    this.panel.clear();
  }

  /**
   * Trigger relayout on all cells (useful after content changes)
   */
  relayoutAll(): void {
    for (const row of this.rows) {
      for (const cell of row.cells) {
        cell.relayout();
      }
    }
    this.updatePanel();
  }
}
