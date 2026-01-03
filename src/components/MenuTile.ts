import { Container, Graphics, Sprite, Text, TextStyle, Rectangle } from 'pixi.js';

import { DESIGN, ACCENT_ORANGE } from '../config/design';

/**
 * "CLICK TO PLAY" icon SVG (orange gamepad)
 */
const CLICK_TO_PLAY_ICON_SVG = `<svg width="28" height="16" viewBox="0 0 28 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.2352 8.88234C12.2352 9.1305 12.0422 9.32351 11.7941 9.32351H9.147V11.9706C9.147 12.2187 8.95399 12.4117 8.70583 12.4117H6.94112C6.69296 12.4117 6.49994 12.2187 6.49994 11.9706V9.32351H3.85288C3.60472 9.32351 3.41171 9.1305 3.41171 8.88234V7.11763C3.41171 6.86947 3.60472 6.67646 3.85288 6.67646H6.49994V4.0294C6.49994 3.78124 6.69296 3.58822 6.94112 3.58822H8.70583C8.95399 3.58822 9.147 3.78124 9.147 4.0294V6.67646H11.7941C12.0422 6.67646 12.2352 6.86947 12.2352 7.11763V8.88234ZM20.1764 9.76469C20.1764 10.7436 19.3906 11.5294 18.4117 11.5294C17.4328 11.5294 16.647 10.7436 16.647 9.76469C16.647 8.78583 17.4328 7.99998 18.4117 7.99998C19.3906 7.99998 20.1764 8.78583 20.1764 9.76469ZM23.7058 6.23528C23.7058 7.21414 22.92 7.99998 21.9411 7.99998C20.9623 7.99998 20.1764 7.21414 20.1764 6.23528C20.1764 5.25642 20.9623 4.47057 21.9411 4.47057C22.92 4.47057 23.7058 5.25642 23.7058 6.23528ZM27.2352 7.99998C27.2352 4.09833 24.0781 0.941162 20.1764 0.941162H7.82347C3.92182 0.941162 0.764648 4.09833 0.764648 7.99998C0.764648 11.9016 3.92182 15.0588 7.82347 15.0588C9.61575 15.0588 11.2426 14.3833 12.4834 13.2941H15.5165C16.7573 14.3833 18.3841 15.0588 20.1764 15.0588C24.0781 15.0588 27.2352 11.9016 27.2352 7.99998Z" fill="${ACCENT_ORANGE}"/></svg>`;

const CLICK_TO_PLAY_ICON_URL = `data:image/svg+xml,${encodeURIComponent(CLICK_TO_PLAY_ICON_SVG)}`;

export interface MenuTileOptions {
  /** Display label (used for accessibility, not rendered on tile) */
  label: string;
  /** URL to the thumbnail image */
  thumbnailUrl: string;
  /** Callback when tile is clicked */
  onClick: () => void;
}

/**
 * MenuTile
 *
 * A clickable game thumbnail tile with:
 * - Rounded corners
 * - Drop shadow
 * - Hover overlay with "CLICK TO PLAY" pill
 */
export class MenuTile extends Container {
  private hoverOverlay: Container;

  constructor(options: MenuTileOptions) {
    super();

    const { thumbnailUrl, onClick } = options;
    const w = DESIGN.tile.width;
    const h = DESIGN.tile.height;
    const r = DESIGN.tile.radius;

    // Make interactive
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new Rectangle(-w / 2, 0, w, h);

    // Shadow
    const shadow = new Graphics();
    shadow.beginFill(0x000000, 0.12);
    shadow.drawRoundedRect(-w / 2 + 4, 6, w, h, r);
    shadow.endFill();
    this.addChild(shadow);

    // Rounded rect mask
    const mask = new Graphics();
    mask.beginFill(0xffffff);
    mask.drawRoundedRect(-w / 2, 0, w, h, r);
    mask.endFill();
    this.addChild(mask);

    // Thumbnail image
    const img = Sprite.from(thumbnailUrl);
    img.x = -w / 2;
    img.y = 0;
    img.width = w;
    img.height = h;
    img.mask = mask;
    this.addChild(img);

    // Hover overlay
    this.hoverOverlay = this.createHoverOverlay(w, h, r, mask);
    this.addChild(this.hoverOverlay);

    // Event handlers
    this.on('pointerover', this.onPointerOver);
    this.on('pointerout', this.onPointerOut);
    this.on('pointerdown', this.onPointerDown);
    this.on('pointerup', () => {
      this.scale.set(1);
      onClick();
    });
  }

  /**
   * Create the "CLICK TO PLAY" hover overlay
   */
  private createHoverOverlay(w: number, h: number, r: number, mask: Graphics): Container {
    const hover = new Container();
    hover.alpha = 0;

    // Dimming layer
    const dim = new Graphics();
    dim.beginFill(0x000000, 0.35);
    dim.drawRoundedRect(-w / 2, 0, w, h, r);
    dim.endFill();
    dim.mask = mask;
    hover.addChild(dim);

    // White pill button
    const pillW = Math.min(340, w - 48);
    const pillH = DESIGN.tile.overlayButtonHeight;
    const pill = new Graphics();
    pill.beginFill(0xffffff, 0.95);
    pill.drawRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, pillH / 2);
    pill.endFill();
    pill.y = h / 2;
    hover.addChild(pill);

    // Text
    const playStyle = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 16,
      fill: ACCENT_ORANGE,
      fontWeight: 'bold',
      letterSpacing: 1,
    });
    const playText = new Text('CLICK TO PLAY', playStyle);

    // Icon + Text container
    const content = new Container();
    content.y = h / 2;
    hover.addChild(content);

    const icon = Sprite.from(CLICK_TO_PLAY_ICON_URL);
    icon.anchor.set(0.5);
    content.addChild(icon);

    playText.anchor.set(0, 0.5);
    content.addChild(playText);

    // Layout helper
    const iconTargetH = 14;
    const gap = 12;
    const layoutContent = () => {
      icon.height = iconTargetH;
      icon.scale.x = icon.scale.y; // Preserve aspect ratio

      const contentW = icon.width + gap + playText.width;
      icon.x = -contentW / 2 + icon.width / 2;
      icon.y = 0;
      playText.x = icon.x + icon.width / 2 + gap;
      playText.y = 0;
    };

    layoutContent();
    icon.texture.baseTexture.once('loaded', layoutContent);

    return hover;
  }

  private onPointerOver = (): void => {
    this.hoverOverlay.alpha = 1;
    this.scale.set(1.01);
  };

  private onPointerOut = (): void => {
    this.hoverOverlay.alpha = 0;
    this.scale.set(1);
  };

  private onPointerDown = (): void => {
    this.scale.set(0.99);
  };
}
