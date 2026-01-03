import { Container, Text, TextStyle, Sprite, Assets, Texture } from 'pixi.js';

/**
 * RichText Options
 */
export interface RichTextOptions {
  /** The text containing {emojiName} placeholders */
  text: string;
  /** Map of emoji names to URLs */
  emojiMap: Map<string, string>;
  /** Font size for text */
  fontSize?: number;
  /** Text color */
  color?: string;
  /** Max width before word wrap */
  maxWidth?: number;
  /** Emoji size (height, maintains aspect ratio) */
  emojiSize?: number;
  /** Font family */
  fontFamily?: string;
}

/**
 * Parsed segment - either text or emoji placeholder
 */
interface Segment {
  type: 'text' | 'emoji';
  content: string;
}

/**
 * RichText Component
 *
 * Renders text with inline emoji images.
 * Parses {emojiName} patterns and replaces them with sprites.
 */
export class RichText extends Container {
  private options: Required<RichTextOptions>;
  private loadedTextures = new Map<string, Texture>();
  private segments: Segment[] = [];
  private isBuilt = false;

  constructor(options: RichTextOptions) {
    super();
    this.options = {
      fontSize: 20,
      color: '#ffffff',
      maxWidth: 500,
      emojiSize: 24,
      fontFamily: 'Arial, sans-serif',
      ...options,
    };

    // Parse text immediately
    this.segments = this.parseText(this.options.text);

    // Start async build
    this.build();
  }

  /**
   * Check if content is fully built (emojis loaded)
   */
  public get ready(): boolean {
    return this.isBuilt;
  }

  /**
   * Build the rich text content
   */
  private async build(): Promise<void> {
    // Preload emojis first
    await this.preloadEmojis();

    // Clear and rebuild
    this.removeChildren();
    this.layoutContent();
    this.isBuilt = true;
  }

  /**
   * Synchronous layout after textures are loaded
   */
  private layoutContent(): void {
    const { fontSize, color, maxWidth, emojiSize, fontFamily } = this.options;

    const textStyle = new TextStyle({
      fontFamily,
      fontSize,
      fill: color,
      wordWrap: true,
      wordWrapWidth: maxWidth,
    });

    // Simple approach: render entire text with placeholders for emojis
    // Then overlay emoji sprites at the correct positions

    let x = 0;
    let y = 0;
    const lineHeight = fontSize * 1.4;
    const spaceWidth = fontSize * 0.35;

    for (const segment of this.segments) {
      if (segment.type === 'text') {
        // Split text into words for wrapping
        const words = segment.content.split(/\s+/).filter(w => w.length > 0);

        for (const word of words) {
          // Create text to measure
          const wordText = new Text(word, textStyle);
          wordText.resolution = 2;

          // Check if we need to wrap (always check, even at line start for very long words)
          if (x + wordText.width > maxWidth && x > 0) {
            x = 0;
            y += lineHeight;
          }

          wordText.x = x;
          wordText.y = y;
          this.addChild(wordText);

          x += wordText.width + spaceWidth;
        }
      } else if (segment.type === 'emoji') {
        const texture = this.loadedTextures.get(segment.content);
        const emojiWidth = texture ? emojiSize * (texture.width / texture.height) : emojiSize;

        // Check wrap before emoji
        if (x + emojiWidth > maxWidth && x > 0) {
          x = 0;
          y += lineHeight;
        }

        if (texture) {
          const emoji = new Sprite(texture);
          emoji.height = emojiSize;
          emoji.scale.x = emoji.scale.y; // Maintain aspect ratio
          emoji.x = x;
          emoji.y = y + (lineHeight - emojiSize) / 2 - fontSize * 0.1; // Vertically center
          this.addChild(emoji);
          x += emoji.width + spaceWidth;
        } else {
          // Emoji not found - show placeholder
          const placeholder = new Text(`[${segment.content}]`, {
            ...textStyle,
            fill: '#888888',
            fontSize: fontSize * 0.8,
          });
          placeholder.resolution = 2;

          // Check wrap for placeholder too
          if (x + placeholder.width > maxWidth && x > 0) {
            x = 0;
            y += lineHeight;
          }

          placeholder.x = x;
          placeholder.y = y;
          this.addChild(placeholder);
          x += placeholder.width + spaceWidth;
        }
      }
    }
  }

  /**
   * Parse text into segments
   */
  private parseText(text: string): Segment[] {
    const segments: Segment[] = [];
    const regex = /\{(\w+)\}/g;

    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before emoji
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
        });
      }

      // Add emoji
      segments.push({
        type: 'emoji',
        content: match[1],
      });

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex),
      });
    }

    return segments;
  }

  /** Base URL for auto-generating emoji URLs */
  private static readonly DICEBEAR_BASE = 'https://api.dicebear.com/9.x/fun-emoji/png?seed=';

  /**
   * Preload emoji textures
   */
  private async preloadEmojis(): Promise<void> {
    const emojiNames = this.segments.filter(s => s.type === 'emoji').map(s => s.content);

    const uniqueNames = [...new Set(emojiNames)];

    const loadPromises = uniqueNames.map(async name => {
      // First check if URL is in the provided map
      let url = this.options.emojiMap.get(name);

      // If not found, auto-generate using DiceBear API
      if (!url) {
        url = `${RichText.DICEBEAR_BASE}${name}`;
      }

      try {
        const texture = await Assets.load({
          src: url,
          loadParser: 'loadTextures',
        });
        this.loadedTextures.set(name, texture);
      } catch (e) {
        console.warn(`Failed to load emoji: ${name}`, e);
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Wait for content to be ready
   */
  public async waitForReady(): Promise<void> {
    while (!this.isBuilt) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Update max width and re-layout content
   */
  public setMaxWidth(maxWidth: number): void {
    if (this.options.maxWidth === maxWidth) return;
    this.options.maxWidth = maxWidth;

    // Only re-layout if already built (textures loaded)
    if (this.isBuilt) {
      this.removeChildren();
      this.layoutContent();
    }
  }
}
