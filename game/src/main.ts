import './style.css';
import { Application, Text, TextStyle, Graphics, Container, Sprite, Rectangle } from 'pixi.js';

/**
 * SOFTGAMES Assignment - Main Entry Point
 * 
 * A unified PixiJS application with 3 interactive demos:
 * 1. Ace of Shadows - Card stack animation
 * 2. Magic Words - Text + emoji system
 * 3. Phoenix Flame - Particle fire effect
 */

// ============================================================================
// FPS Counter (HTML overlay for consistent visibility)
// ============================================================================
const fpsElement = document.createElement('div');
fpsElement.id = 'fps-counter';
fpsElement.textContent = 'FPS: --';
document.body.appendChild(fpsElement);

// ============================================================================
// Initialize PixiJS Application
// ============================================================================
const app = new Application({
  background: '#ffffff',
  resizeTo: window,
  antialias: true,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
});

document.body.appendChild(app.view as HTMLCanvasElement);

// ============================================================================
// FPS Tracking
// ============================================================================
let lastTime = performance.now();
let frameCount = 0;

app.ticker.add(() => {
  frameCount++;
  const currentTime = performance.now();
  
  if (currentTime - lastTime >= 1000) {
    fpsElement.textContent = `FPS: ${frameCount}`;
    frameCount = 0;
    lastTime = currentTime;
  }
});

// ============================================================================
// Design Constants (base design)
// ============================================================================
const DESIGN = {
  padding: 40,
  title: {
    fontSize: 42,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
  },
  tile: {
    width: 420,
    height: 300,
    radius: 18,
    gap: 26,
    titleFontSize: 22,
    titlePaddingX: 18,
    titlePaddingY: 10,
    overlayButtonWidth: 220,
    overlayButtonHeight: 44,
  },
};

// ============================================================================
// Menu Container (scaled as a unit)
// ============================================================================
const menuContainer = new Container();
app.stage.addChild(menuContainer);

// ============================================================================
// Menu UI Elements
// ============================================================================
let title: Text;
let subtitle: Text;
const tileContainers: Container[] = [];

// Vite will bundle these assets and give us URLs.
// Using imports keeps everything versioned alongside the code.
import aceThumbUrl from './assets/sprites/thumbnails/ace-of-shadows-miniature.png';
import magicThumbUrl from './assets/sprites/thumbnails/magic-words-miniature.png';
import phoenixThumbUrl from './assets/sprites/thumbnails/phoenix-flames-miniature.png';

const menuTilesData = [
  { key: 'ace', label: 'Ace of Shadows', thumbnailUrl: aceThumbUrl },
  { key: 'magic', label: 'Magic Words', thumbnailUrl: magicThumbUrl },
  { key: 'phoenix', label: 'Phoenix Flame', thumbnailUrl: phoenixThumbUrl },
] as const;

// SOFTGAMES-like "CLICK TO PLAY" icon (orange gamepad)
const clickToPlayIconSvg = `<svg width="28" height="16" viewBox="0 0 28 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.2352 8.88234C12.2352 9.1305 12.0422 9.32351 11.7941 9.32351H9.147V11.9706C9.147 12.2187 8.95399 12.4117 8.70583 12.4117H6.94112C6.69296 12.4117 6.49994 12.2187 6.49994 11.9706V9.32351H3.85288C3.60472 9.32351 3.41171 9.1305 3.41171 8.88234V7.11763C3.41171 6.86947 3.60472 6.67646 3.85288 6.67646H6.49994V4.0294C6.49994 3.78124 6.69296 3.58822 6.94112 3.58822H8.70583C8.95399 3.58822 9.147 3.78124 9.147 4.0294V6.67646H11.7941C12.0422 6.67646 12.2352 6.86947 12.2352 7.11763V8.88234ZM20.1764 9.76469C20.1764 10.7436 19.3906 11.5294 18.4117 11.5294C17.4328 11.5294 16.647 10.7436 16.647 9.76469C16.647 8.78583 17.4328 7.99998 18.4117 7.99998C19.3906 7.99998 20.1764 8.78583 20.1764 9.76469ZM23.7058 6.23528C23.7058 7.21414 22.92 7.99998 21.9411 7.99998C20.9623 7.99998 20.1764 7.21414 20.1764 6.23528C20.1764 5.25642 20.9623 4.47057 21.9411 4.47057C22.92 4.47057 23.7058 5.25642 23.7058 6.23528ZM27.2352 7.99998C27.2352 4.09833 24.0781 0.941162 20.1764 0.941162H7.82347C3.92182 0.941162 0.764648 4.09833 0.764648 7.99998C0.764648 11.9016 3.92182 15.0588 7.82347 15.0588C9.61575 15.0588 11.2426 14.3833 12.4834 13.2941H15.5165C16.7573 14.3833 18.3841 15.0588 20.1764 15.0588C24.0781 15.0588 27.2352 11.9016 27.2352 7.99998Z" fill="#FF671D"/></svg>`;
const clickToPlayIconUrl = `data:image/svg+xml,${encodeURIComponent(clickToPlayIconSvg)}`;

function createMenuTile(opts: { label: string; thumbnailUrl: string; onClick: () => void }): Container {
  const { thumbnailUrl, onClick } = opts;
  const w = DESIGN.tile.width;
  const h = DESIGN.tile.height;
  const r = DESIGN.tile.radius;

  const tile = new Container();
  tile.eventMode = 'static';
  tile.cursor = 'pointer';
  tile.hitArea = new Rectangle(-w / 2, 0, w, h);

  // Shadow (simple and dependency-free)
  const shadow = new Graphics();
  shadow.beginFill(0x000000, 0.12);
  shadow.drawRoundedRect(-w / 2 + 4, 6, w, h, r);
  shadow.endFill();
  tile.addChild(shadow);

  // Rounded rect mask
  const mask = new Graphics();
  mask.beginFill(0xffffff);
  mask.drawRoundedRect(-w / 2, 0, w, h, r);
  mask.endFill();
  tile.addChild(mask);

  // Image sprite (fills tile)
  const img = Sprite.from(thumbnailUrl);
  img.x = -w / 2;
  img.y = 0;
  img.width = w;
  img.height = h;
  img.mask = mask;
  tile.addChild(img);

  // Note: per-tile title strip removed (miniature already contains branding/title artwork)

  // Hover overlay (CLICK TO PLAY)
  const hover = new Container();
  hover.alpha = 0;
  hover.visible = true;

  const dim = new Graphics();
  dim.beginFill(0x000000, 0.35);
  dim.drawRoundedRect(-w / 2, 0, w, h, r);
  dim.endFill();
  dim.mask = mask;
  hover.addChild(dim);

  const pillW = Math.min(340, w - 48);
  const pillH = DESIGN.tile.overlayButtonHeight;
  const pill = new Graphics();
  pill.beginFill(0xffffff, 0.95);
  pill.drawRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, pillH / 2);
  pill.endFill();
  pill.y = h / 2;
  hover.addChild(pill);

  const playStyle = new TextStyle({
    fontFamily: 'Arial, sans-serif',
    fontSize: 16,
    fill: '#FF671D',
    fontWeight: 'bold',
    letterSpacing: 1,
  });
  const playText = new Text('CLICK TO PLAY', playStyle);

  // Icon + Text group centered inside the pill
  const content = new Container();
  content.y = h / 2;
  hover.addChild(content);

  const icon = Sprite.from(clickToPlayIconUrl);
  icon.anchor.set(0.5);
  content.addChild(icon);

  playText.anchor.set(0, 0.5);
  content.addChild(playText);

  const iconTargetH = 14;
  const gap = 12;
  const layoutPillContent = () => {
    // Ensure SVG keeps aspect ratio (avoid stretch)
    icon.height = iconTargetH;
    icon.scale.x = icon.scale.y;

    const contentW = icon.width + gap + playText.width;
    icon.x = -contentW / 2 + icon.width / 2;
    icon.y = 0;
    playText.x = icon.x + icon.width / 2 + gap;
    playText.y = 0;
  };

  // Layout now and again after texture load (data-URI SVG can async decode)
  layoutPillContent();
  icon.texture.baseTexture.once('loaded', layoutPillContent);

  // IMPORTANT: hover overlay must start at y=0, otherwise dim only covers half the tile
  hover.x = 0;
  hover.y = 0;
  tile.addChild(hover);

  tile.on('pointerover', () => {
    hover.alpha = 1;
    tile.scale.set(1.01);
  });
  tile.on('pointerout', () => {
    hover.alpha = 0;
    tile.scale.set(1);
  });
  tile.on('pointerdown', () => {
    tile.scale.set(0.99);
  });
  tile.on('pointerup', () => {
    tile.scale.set(1);
    onClick();
  });

  return tile;
}

/**
 * Build the menu UI at the base design size
 * The entire container will be scaled to fit the screen
 */
function buildMenuUI(): void {
  menuContainer.removeChildren();
  tileContainers.length = 0;
  
  let currentY = 0;

  // ---- Title (SOFTGAMES style: orange box with white text) ----
  const titleContainer = new Container();

  const titleStyle = new TextStyle({
    fontFamily: 'Arial, sans-serif',
    fontSize: DESIGN.title.fontSize,
    fontWeight: 'bold',
    fill: '#ffffff',
    letterSpacing: 2,
  });

  title = new Text('SOFTGAMES', titleStyle);
  title.anchor.set(0.5);

  // Orange background box
  const titlePaddingX = 20;
  const titlePaddingY = 10;
  const titleBg = new Graphics();
  titleBg.beginFill(0xF7941D); // SOFTGAMES orange
  titleBg.drawRect(
    -title.width / 2 - titlePaddingX,
    -title.height / 2 - titlePaddingY,
    title.width + titlePaddingX * 2,
    title.height + titlePaddingY * 2
  );
  titleBg.endFill();

  titleContainer.addChild(titleBg);
  titleContainer.addChild(title);
  titleContainer.y = currentY + title.height / 2 + titlePaddingY;
  menuContainer.addChild(titleContainer);
  currentY += title.height + titlePaddingY * 2 + DESIGN.title.marginBottom;
  
  // ---- Subtitle ----
  const subtitleStyle = new TextStyle({
    fontFamily: 'Arial, sans-serif',
    fontSize: DESIGN.subtitle.fontSize,
    fill: '#666666',
  });
  
  subtitle = new Text('Game Developer Assignment by Javier Moreno', subtitleStyle);
  subtitle.anchor.set(0.5, 0);
  subtitle.x = 0;
  subtitle.y = currentY;
  menuContainer.addChild(subtitle);
  currentY += subtitle.height + DESIGN.subtitle.marginBottom;
  
  // ---- Tiles (SOFTGAMES-like miniatures) ----
  const gap = DESIGN.tile.gap;
  const w = DESIGN.tile.width;
  const h = DESIGN.tile.height;

  // Two-column layout if there's room; otherwise one column.
  // (We rebuild the UI on resize, so this is responsive.)
  const canDoTwoCols = app.screen.width >= 900;
  const cols = canDoTwoCols ? 2 : 1;
  const colX = cols === 2 ? [-w / 2 - gap / 2, w / 2 + gap / 2] : [0];

  const lastIndex = menuTilesData.length - 1;
  const hasOddLastRow = cols === 2 && (menuTilesData.length % 2 === 1);

  menuTilesData.forEach((tileData, idx) => {
    const tile = createMenuTile({
      label: tileData.label,
      thumbnailUrl: tileData.thumbnailUrl,
      onClick: () => console.log(`Clicked: ${tileData.key}`),
    });

    const row = cols === 2 ? Math.floor(idx / 2) : idx;
    const col = cols === 2 ? idx % 2 : 0;

    // If the last row has a single tile (odd number of tiles), center it.
    if (hasOddLastRow && idx === lastIndex) {
      tile.x = 0;
    } else {
      tile.x = colX[col] ?? 0;
    }
    tile.y = currentY + row * (h + gap);

    tileContainers.push(tile);
    menuContainer.addChild(tile);
  });

  const rows = Math.ceil(menuTilesData.length / cols);
  currentY += rows * h + (rows - 1) * gap;
  
  // Store the natural height of the menu
  menuContainer.pivot.set(0, 0);
}

/**
 * Scale and position the menu container to fit the screen
 */
function layoutMenu(): void {
  const screenW = app.screen.width;
  const screenH = app.screen.height;
  
  // Available space with padding
  const availableW = screenW - DESIGN.padding * 2;
  const availableH = screenH - DESIGN.padding * 2;
  
  // Get the bounds of the menu at scale 1
  menuContainer.scale.set(1);
  const bounds = menuContainer.getLocalBounds();
  const contentW = bounds.width;
  const contentH = bounds.height;
  
  // Calculate scale to fit
  const scaleX = availableW / contentW;
  const scaleY = availableH / contentH;
  
  // Use the smaller scale, but cap at 1.2 (don't scale up too much)
  const scale = Math.min(scaleX, scaleY, 1.2);
  
  menuContainer.scale.set(scale);
  
  // Center the container (account for bounds offsets)
  menuContainer.x = screenW / 2 - (bounds.x + bounds.width / 2) * scale;
  menuContainer.y = (screenH - contentH * scale) / 2 - bounds.y * scale;
}

// ============================================================================
// Resize Handler
// ============================================================================
let resizeTimeout: ReturnType<typeof setTimeout>;

function onResize(): void {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    buildMenuUI();
    layoutMenu();
  }, 50);
}

window.addEventListener('resize', onResize);

// ============================================================================
// Initialize
// ============================================================================
buildMenuUI();
layoutMenu();

console.log('🎮 SOFTGAMES Assignment initialized');
console.log(`📐 Screen: ${app.screen.width}x${app.screen.height}`);
