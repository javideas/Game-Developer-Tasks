import { Container, Text, TextStyle, Graphics } from 'pixi.js';
import type { Scene } from '../core/SceneManager';
import type { Application } from '../core/Application';
import { DESIGN, BRAND_ORANGE } from '../config/design';
import { MenuTile } from '../components/MenuTile';

// Thumbnail imports (Vite bundles these)
import aceThumbUrl from '../assets/sprites/thumbnails/ace-of-shadows-thumbnail.png';
import magicThumbUrl from '../assets/sprites/thumbnails/magic-words-thumbnail.png';
import phoenixThumbUrl from '../assets/sprites/thumbnails/phoenix-flames-thumbnail.png';

/**
 * Menu tile data
 */
const MENU_TILES = [
  { key: 'ace', label: 'Ace of Shadows', thumbnailUrl: aceThumbUrl },
  { key: 'magic', label: 'Magic Words', thumbnailUrl: magicThumbUrl },
  { key: 'phoenix', label: 'Phoenix Flame', thumbnailUrl: phoenixThumbUrl },
] as const;

export type MenuTileKey = typeof MENU_TILES[number]['key'];

export interface MainMenuSceneOptions {
  /** Callback when a game tile is clicked */
  onGameSelect?: (key: MenuTileKey) => void;
}

/**
 * MainMenuScene
 * 
 * The main menu with:
 * - BESTGAMES-style orange title banner
 * - Subtitle
 * - Grid of game tiles with thumbnails
 * - Responsive layout (2 columns on wide screens, 1 on narrow)
 */
export class MainMenuScene implements Scene {
  public readonly container: Container;

  private app: Application;
  private options: MainMenuSceneOptions;
  private menuContainer: Container;
  private tiles: MenuTile[] = [];

  constructor(app: Application, options: MainMenuSceneOptions = {}) {
    this.app = app;
    this.options = options;
    this.container = new Container();
    this.menuContainer = new Container();
    this.container.addChild(this.menuContainer);
  }

  onStart(): void {
    this.buildUI();
  }

  onResize(): void {
    this.buildUI();
    this.layoutMenu();
  }

  /**
   * Build all UI elements
   */
  private buildUI(): void {
    this.menuContainer.removeChildren();
    this.tiles = [];

    let currentY = 0;

    // ---- Title (Orange banner with white text) ----
    const titleContainer = new Container();

    const titleStyle = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: DESIGN.title.fontSize,
      fontWeight: 'bold',
      fill: '#ffffff',
      letterSpacing: 2,
    });

    const title = new Text('BESTGAMES', titleStyle);
    title.anchor.set(0.5);

    const titleBg = new Graphics();
    titleBg.beginFill(BRAND_ORANGE);
    titleBg.drawRect(
      -title.width / 2 - DESIGN.title.paddingX,
      -title.height / 2 - DESIGN.title.paddingY,
      title.width + DESIGN.title.paddingX * 2,
      title.height + DESIGN.title.paddingY * 2
    );
    titleBg.endFill();

    titleContainer.addChild(titleBg);
    titleContainer.addChild(title);
    titleContainer.y = currentY + title.height / 2 + DESIGN.title.paddingY;
    this.menuContainer.addChild(titleContainer);
    currentY += title.height + DESIGN.title.paddingY * 2 + DESIGN.title.marginBottom;

    // ---- Subtitle ----
    const subtitleStyle = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: DESIGN.subtitle.fontSize,
      fill: '#666666',
    });

    const subtitle = new Text('Game Developer Tasks by Javier Moreno', subtitleStyle);
    subtitle.anchor.set(0.5, 0);
    subtitle.x = 0;
    subtitle.y = currentY;
    this.menuContainer.addChild(subtitle);
    currentY += subtitle.height + DESIGN.subtitle.marginBottom;

    // ---- Game Tiles ----
    const { width: w, height: h, gap } = DESIGN.tile;

    const screenW = this.app.width;
    const screenH = this.app.height;
    const isLandscape = screenW > screenH;
    const isSmallHeight = screenH < 600;

    // Layout modes:
    // - Landscape on mobile/tablet (small height): horizontal row (3 columns)
    // - Wide desktop (>= 900px): 2 columns
    // - Portrait/narrow: 1 column (vertical stack)
    let cols: number;
    if (isLandscape && isSmallHeight) {
      // Mobile/tablet landscape: arrange all tiles in a horizontal row
      cols = MENU_TILES.length;
    } else if (screenW >= 900) {
      cols = 2;
    } else {
      cols = 1;
    }

    // Calculate column X positions centered around 0
    const colX: number[] = [];
    const totalWidth = cols * w + (cols - 1) * gap;
    const startX = -totalWidth / 2 + w / 2;
    for (let i = 0; i < cols; i++) {
      colX.push(startX + i * (w + gap));
    }

    const lastIndex = MENU_TILES.length - 1;
    const hasOddLastRow = cols === 2 && MENU_TILES.length % 2 === 1;

    MENU_TILES.forEach((tileData, idx) => {
      const tile = new MenuTile({
        label: tileData.label,
        thumbnailUrl: tileData.thumbnailUrl,
        onClick: () => {
          if (import.meta.env.DEV) console.log(`Selected: ${tileData.key}`);
          this.options.onGameSelect?.(tileData.key);
        },
      });

      const row = Math.floor(idx / cols);
      const col = idx % cols;

      // Center last tile if odd number in 2-column layout
      if (hasOddLastRow && idx === lastIndex) {
        tile.x = 0;
      } else {
        tile.x = colX[col] ?? 0;
      }
      tile.y = currentY + row * (h + gap);

      this.tiles.push(tile);
      this.menuContainer.addChild(tile);
    });
  }

  /**
   * Scale and center the menu container to fit the screen
   */
  private layoutMenu(): void {
    const screenW = this.app.width;
    const screenH = this.app.height;

    const availableW = screenW - DESIGN.padding * 2;
    const availableH = screenH - DESIGN.padding * 2;

    // Get bounds at scale 1
    this.menuContainer.scale.set(1);
    const bounds = this.menuContainer.getLocalBounds();
    const contentW = bounds.width;
    const contentH = bounds.height;

    // Scale to fit (cap at 1.2)
    const scaleX = availableW / contentW;
    const scaleY = availableH / contentH;
    const scale = Math.min(scaleX, scaleY, 1.2);

    this.menuContainer.scale.set(scale);

    // Center
    this.menuContainer.x = screenW / 2 - (bounds.x + bounds.width / 2) * scale;
    this.menuContainer.y = (screenH - contentH * scale) / 2 - bounds.y * scale;
  }

  destroy(): void {
    this.tiles = [];
    this.menuContainer.removeChildren();
  }
}

