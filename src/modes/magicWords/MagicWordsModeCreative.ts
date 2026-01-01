import { Container, Text, TextStyle, Graphics, Sprite, Assets, Texture, Spritesheet, BlurFilter } from 'pixi.js';
import gsap from 'gsap';
import type { GameMode, GameModeContext } from '../GameMode';
import type { DeviceState } from '../../scenes/BaseGameScene';
import { RichText } from '../../components/RichText';
import { SpeechBubble } from '../../components/SpeechBubble';
import dialogBubbleImage from '../../assets/sprites/dialog/dialog-bubble.png';

// Import spritesheets
import bigbangChars0Json from '../../assets/sprites/bigbang-chars/bigbang-chars-0.json';
import bigbangChars0Png from '../../assets/sprites/bigbang-chars/bigbang-chars-0.png';
import bigbangChars1Json from '../../assets/sprites/bigbang-chars/bigbang-chars-1.json';
import bigbangChars1Png from '../../assets/sprites/bigbang-chars/bigbang-chars-1.png';

// Background image
import bigbangBgPng from '../../assets/sprites/bigbang-bg/bigbang-bg.png';

import {
  API_URL,
  DIALOGUE_CONFIG,
  type MagicWordsData,
  type DialogueLine,
} from '../../config/magicWordsSettings';

// ============================================================
// Character & Dialogue Types
// ============================================================

interface CharacterDef {
  name: string;
  spriteKey: string;  // Key in the spritesheet (e.g., 'sheldon.png')
  position: 'left' | 'right';
  color: number;      // Name badge color
}

// ============================================================
// Character Definitions (Big Bang Theory cast)
// Maps API speaker names to local spritesheet characters
// ============================================================

const CHARACTERS: CharacterDef[] = [
  { name: 'Sheldon', spriteKey: 'sheldon.png', position: 'left', color: 0x6dbb58 },
  { name: 'Leonard', spriteKey: 'leonard.png', position: 'left', color: 0xf3b63a },
  { name: 'Penny', spriteKey: 'penny.png', position: 'right', color: 0xf55d81 },
  { name: 'Neighbour', spriteKey: 'neighbour.png', position: 'right', color: 0x9b59b6 },
];

// ============================================================
// MagicWordsModeCreative Class
// ============================================================

/**
 * MagicWordsModeCreative
 * 
 * Creative interpretation of Task 2 using Big Bang Theory characters
 * from local spritesheets instead of API-loaded avatars.
 */
export class MagicWordsModeCreative implements GameMode {
  private context: GameModeContext;
  private content: Container | null = null;
  
  /** Character textures by name */
  private characterTextures: Map<string, Texture> = new Map();
  
  /** Character definitions by name */
  private characterDefs: Map<string, CharacterDef> = new Map();
  
  /** Emoji map for RichText */
  private emojiMap: Map<string, string> = new Map();
  
  /** Dialogue data from API */
  private dialogueData: DialogueLine[] = [];
  
  /** Current dialogue index */
  private currentIndex = 0;
  
  /** Is currently animating */
  private isAnimating = false;
  
  /** Is dialogue complete */
  private isComplete = false;
  
  /** UI Elements */
  private leftAvatar: Sprite | null = null;
  private rightAvatar: Sprite | null = null;
  private bubbleContainer: Container | null = null;
  private speechBubble: SpeechBubble | null = null;
  private currentRichText: RichText | null = null;
  private nameBadge: Container | null = null;
  private advanceIndicator: Text | null = null;
  private endText: Text | null = null;
  
  /** Current speaker side */
  private currentSpeakerIsLeft = true;
  
  /** Current bubble width */
  private currentBubbleWidth = 800;
  
  /** Avatar size */
  private avatarSize = 380;
  
  /** Background sprite */
  private background: Sprite | null = null;
  
  /** Design dimensions */
  private designWidth = 1280;
  private designHeight = 720;
  
  constructor(context: GameModeContext) {
    this.context = context;
    
    // Build character definitions map
    for (const char of CHARACTERS) {
      this.characterDefs.set(char.name, char);
    }
  }
  
  // ============================================================
  // GameMode Interface
  // ============================================================
  
  async start(): Promise<void> {
    this.content = new Container();
    this.context.container.addChild(this.content);
    
    // Set design bounds for full screen visual novel
    this.context.setDesignBounds({
      x: 0,
      y: 0,
      width: this.designWidth,
      height: this.designHeight,
    });
    this.context.requestLayout();
    
    // Show loading
    this.showLoading();
    
    try {
      // Load character spritesheets and fetch dialogue in parallel
      const [, apiData] = await Promise.all([
        this.loadCharacterSpritesheets(),
        this.fetchDialogueData(),
      ]);
      
      // Store dialogue data
      this.dialogueData = apiData.dialogue;
      
      // Build emoji map from API data
      this.buildEmojiMap(apiData);
      
      this.hideLoading();
      this.buildUI();
      this.showDialogue(0);
    } catch (error) {
      this.hideLoading();
      this.showError('Failed to load data');
      console.error('Load Error:', error);
    }
  }
  
  /**
   * Fetch dialogue data from the API
   */
  private async fetchDialogueData(): Promise<MagicWordsData> {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  }
  
  stop(): void {
    gsap.globalTimeline.clear();
    
    if (this.content) {
      this.content.destroy({ children: true });
      this.content = null;
    }
    
    this.characterTextures.clear();
    this.emojiMap.clear();
    this.dialogueData = [];
    this.currentIndex = 0;
    this.isComplete = false;
    this.currentBubbleWidth = 800;
    this.background = null;
    this.leftAvatar = null;
    this.rightAvatar = null;
    this.bubbleContainer = null;
    this.speechBubble = null;
    this.currentSpeakerIsLeft = true;
    this.currentRichText = null;
    this.nameBadge = null;
    this.advanceIndicator = null;
    this.endText = null;
  }
  
  onResize(): void {
    // Layout is handled by the scene's scale-to-fit
  }
  
  onDeviceStateChange(_newState: DeviceState, _oldState: DeviceState): void {
    // Could add responsive adjustments here
  }
  
  // ============================================================
  // Asset Loading
  // ============================================================
  
  private async loadCharacterSpritesheets(): Promise<void> {
    // Load both spritesheet textures
    const baseTexture0 = await Assets.load(bigbangChars0Png);
    const baseTexture1 = await Assets.load(bigbangChars1Png);
    
    // Create spritesheets
    const spritesheet0 = new Spritesheet(baseTexture0, bigbangChars0Json);
    const spritesheet1 = new Spritesheet(baseTexture1, bigbangChars1Json);
    
    // Parse spritesheets
    await spritesheet0.parse();
    await spritesheet1.parse();
    
    // Extract textures for each character
    // Spritesheet 0: Sheldon, Neighbour
    // Spritesheet 1: Leonard, Penny
    
    const sheldonTexture = spritesheet0.textures['sheldon.png'];
    const neighbourTexture = spritesheet0.textures['neighbour.png'];
    const leonardTexture = spritesheet1.textures['leonard.png'];
    const pennyTexture = spritesheet1.textures['penny.png'];
    
    if (sheldonTexture) this.characterTextures.set('Sheldon', sheldonTexture);
    if (neighbourTexture) this.characterTextures.set('Neighbour', neighbourTexture);
    if (leonardTexture) this.characterTextures.set('Leonard', leonardTexture);
    if (pennyTexture) this.characterTextures.set('Penny', pennyTexture);
    
    console.log('Loaded character textures:', [...this.characterTextures.keys()]);
  }
  
  private buildEmojiMap(data: MagicWordsData): void {
    this.emojiMap.clear();
    for (const emoji of data.emojies) {
      this.emojiMap.set(emoji.name, emoji.url);
    }
  }
  
  // ============================================================
  // UI Building
  // ============================================================
  
  private showLoading(): void {
    if (!this.content) return;
    
    const { bubble } = DIALOGUE_CONFIG;
    
    const bubbleY = this.designHeight - bubble.height - bubble.bottomMargin;
    const bubbleCenterY = bubbleY + bubble.height / 2;
    
    const loadingContainer = new Container();
    loadingContainer.name = 'loading';
    this.content.addChild(loadingContainer);
    
    // Theatrical loading message
    const mainStyle = new TextStyle({
      fontFamily: 'Georgia, serif',
      fontSize: 42,
      fill: '#f5e6c8',
      align: 'center',
      fontStyle: 'italic',
    });
    
    const mainText = new Text('🎬 Loading the cast...', mainStyle);
    mainText.resolution = 2;
    mainText.anchor.set(0.5);
    mainText.x = this.designWidth / 2;
    mainText.y = bubbleCenterY - 15;
    loadingContainer.addChild(mainText);
    
    // Subtitle
    const subStyle = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 18,
      fill: '#888888',
      align: 'center',
    });
    
    const subText = new Text('Preparing the Big Bang...', subStyle);
    subText.resolution = 2;
    subText.anchor.set(0.5);
    subText.x = this.designWidth / 2;
    subText.y = bubbleCenterY + 30;
    loadingContainer.addChild(subText);
    
    // Fade in
    loadingContainer.alpha = 0;
    gsap.to(loadingContainer, {
      alpha: 1,
      duration: 0.5,
      ease: 'power2.out',
    });
    
    // Pulse animation
    gsap.to(mainText, {
      alpha: 0.6,
      duration: 1.2,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: -1,
    });
  }
  
  private hideLoading(): void {
    if (!this.content) return;
    const loading = this.content.getChildByName('loading');
    if (loading) {
      loading.destroy();
    }
  }
  
  private showError(message: string): void {
    if (!this.content) return;
    
    const style = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 24,
      fill: '#ff6666',
      align: 'center',
    });
    
    const error = new Text(`❌ ${message}`, style);
    error.resolution = 2;
    error.anchor.set(0.5);
    error.x = this.designWidth / 2;
    error.y = this.designHeight / 2;
    this.content.addChild(error);
  }
  
  private buildUI(): void {
    if (!this.content) return;
    
    const { bubble } = DIALOGUE_CONFIG;
    
    // Add background (scales to width, anchored at bottom)
    this.background = new Sprite();
    this.background.anchor.set(0.5, 1); // Center-bottom anchor
    this.background.x = this.designWidth / 2;
    this.background.y = this.designHeight; // Position at screen bottom
    this.content.addChild(this.background);
    
    // Add blur filter to background
    const bgBlur = new BlurFilter(3, 4); // (blur strength, quality)
    this.background.filters = [bgBlur];
    
    // Load and set background texture
    Assets.load(bigbangBgPng).then((texture) => {
      if (this.background) {
        this.background.texture = texture;
        // Scale to width only (maintain aspect ratio)
        const scale = this.designWidth / texture.width;
        this.background.scale.set(scale);
      }
    });
    
    // Dialog box centered
    const bubbleWidth = this.currentBubbleWidth;
    const bubbleX = (this.designWidth - bubbleWidth) / 2;
    const bubbleY = this.designHeight - bubble.height - bubble.bottomMargin;
    
    // Avatar positions at screen edges, growing from bottom of screen
    const avatarVisibleWidth = this.avatarSize * 0.7;
    const leftAvatarX = avatarVisibleWidth / 2;
    const rightAvatarX = this.designWidth - avatarVisibleWidth / 2;
    const avatarY = this.designHeight; // Bottom of screen (legs hidden below)
    
    // Create avatar slots
    this.leftAvatar = new Sprite();
    this.leftAvatar.anchor.set(0.5, 1); // Anchor at bottom-center
    this.leftAvatar.x = leftAvatarX;
    this.leftAvatar.y = avatarY;
    this.leftAvatar.alpha = 0;
    this.content.addChild(this.leftAvatar);
    
    this.rightAvatar = new Sprite();
    this.rightAvatar.anchor.set(0.5, 1); // Anchor at bottom-center
    this.rightAvatar.x = rightAvatarX;
    this.rightAvatar.y = avatarY;
    this.rightAvatar.alpha = 0;
    this.content.addChild(this.rightAvatar);
    
    // Create speech bubble container
    this.bubbleContainer = new Container();
    this.bubbleContainer.x = bubbleX;
    this.bubbleContainer.y = bubbleY;
    this.content.addChild(this.bubbleContainer);
    
    // Speech bubble using 9-slice image
    this.speechBubble = new SpeechBubble({
      width: bubbleWidth,
      height: bubble.height,
      texture: dialogBubbleImage,
      sliceMargins: [120, 150, 120, 120],
      borderScale: 0.4,
      textureDefaultTailSide: 'left',
      tailTip: { x: 18 * 0.4, y: 12 * 0.4 },
      tailSide: this.currentSpeakerIsLeft ? 'left' : 'right',
    });
    this.bubbleContainer.addChild(this.speechBubble);
    
    // Advance indicator (chevron)
    this.advanceIndicator = new Text('▼', new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 20,
      fill: '#c4a574',
      fontWeight: 'bold',
    }));
    this.advanceIndicator.resolution = 2;
    this.advanceIndicator.anchor.set(0.5);
    this.advanceIndicator.x = bubbleWidth - bubble.paddingX - 15;
    this.advanceIndicator.y = bubble.height - bubble.paddingY - 10;
    this.bubbleContainer.addChild(this.advanceIndicator);
    
    // Animate chevron
    const baseY = bubble.height - bubble.paddingY - 10;
    gsap.to(this.advanceIndicator, {
      y: baseY - 5,
      duration: 0.5,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: -1,
    });
    
    // Name badge container
    this.nameBadge = new Container();
    this.bubbleContainer.addChild(this.nameBadge);
    
    // Click to advance
    this.content.eventMode = 'static';
    this.content.cursor = 'pointer';
    this.content.hitArea = { contains: () => true };
    this.content.on('pointerdown', () => this.advanceDialogue());
  }
  
  // ============================================================
  // Dialogue Display
  // ============================================================
  
  private async showDialogue(index: number): Promise<void> {
    if (!this.content || !this.bubbleContainer || !this.nameBadge || !this.speechBubble) return;
    if (index >= this.dialogueData.length) {
      this.onDialogueComplete();
      return;
    }
    
    this.isAnimating = true;
    this.currentIndex = index;
    const line = this.dialogueData[index];
    
    const { bubble, nameBadge, text, animation } = DIALOGUE_CONFIG;
    
    // Get character info
    const charDef = this.characterDefs.get(line.name);
    const isLeft = charDef?.position === 'left';
    
    // Update speaker side and bubble tail
    this.currentSpeakerIsLeft = isLeft;
    this.speechBubble.setTailSide(isLeft ? 'left' : 'right');
    
    // Update avatars
    this.updateAvatars(line.name, isLeft);
    
    // Clear old text
    if (this.currentRichText) {
      this.currentRichText.destroy();
      this.currentRichText = null;
    }
    
    // Update name badge
    this.nameBadge.removeChildren();
    
    const nameText = new Text(line.name, new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: nameBadge.fontSize,
      fill: nameBadge.textColor,
      fontWeight: 'bold',
    }));
    nameText.resolution = 2;
    nameText.anchor.set(0.5);
    
    const badgeWidth = nameText.width + nameBadge.paddingX * 2;
    const badgeHeight = nameText.height + nameBadge.paddingY * 2;
    
    // Use character-specific color or default
    const speakerColor = charDef?.color ?? nameBadge.bgColor;
    
    const badgeBg = new Graphics();
    badgeBg.lineStyle(nameBadge.borderWidth ?? 2, nameBadge.borderColor ?? 0x1f1f1f, 1);
    badgeBg.beginFill(speakerColor);
    badgeBg.drawRoundedRect(-badgeWidth / 2, -badgeHeight / 2, badgeWidth, badgeHeight, nameBadge.radius);
    badgeBg.endFill();
    
    this.nameBadge.addChild(badgeBg);
    this.nameBadge.addChild(nameText);
    
    // Position badge
    if (isLeft) {
      this.nameBadge.x = nameBadge.marginX;
    } else {
      this.nameBadge.x = this.currentBubbleWidth - nameBadge.marginX;
    }
    this.nameBadge.y = nameBadge.marginY;
    
    // Create rich text for dialogue
    const textMargin = 40;
    const textMaxWidth = this.currentBubbleWidth - (bubble.paddingX * 2) - textMargin;
    
    this.currentRichText = new RichText({
      text: line.text,
      emojiMap: this.emojiMap,
      fontSize: text.fontSize,
      color: text.color,
      maxWidth: textMaxWidth,
      emojiSize: text.emojiSize,
      fontFamily: text.fontFamily,
    });
    
    await this.currentRichText.waitForReady();
    
    this.currentRichText.x = bubble.paddingX;
    this.currentRichText.y = bubble.paddingY;
    this.currentRichText.alpha = 0;
    this.bubbleContainer.addChild(this.currentRichText);
    
    // Animate text appearing
    gsap.to(this.currentRichText, {
      alpha: 1,
      duration: animation.textDuration,
      ease: 'power2.out',
      onComplete: () => {
        this.isAnimating = false;
      },
    });
  }
  
  private updateAvatars(speakerName: string, isLeft: boolean): void {
    if (!this.leftAvatar || !this.rightAvatar) return;
    
    const { animation } = DIALOGUE_CONFIG;
    const texture = this.characterTextures.get(speakerName);
    
    // Determine which avatar slot to use
    const activeAvatar = isLeft ? this.leftAvatar : this.rightAvatar;
    const inactiveAvatar = isLeft ? this.rightAvatar : this.leftAvatar;
    
    // Update texture
    if (texture) {
      activeAvatar.texture = texture;
      activeAvatar.width = this.avatarSize;
      activeAvatar.height = this.avatarSize;
    }
    
    // Kill existing tweens
    gsap.killTweensOf(activeAvatar);
    gsap.killTweensOf(activeAvatar.scale);
    gsap.killTweensOf(inactiveAvatar);
    gsap.killTweensOf(inactiveAvatar.scale);
    
    // Calculate base scale
    const activeBaseScale = texture ? this.avatarSize / texture.width : 1;
    const inactiveBaseScale = inactiveAvatar.texture ? this.avatarSize / inactiveAvatar.texture.width : 1;
    
    // Animation multipliers
    const ACTIVE_MULT = 1.08;
    const BOUNCE_START = 0.85;
    
    // Tint values for active/inactive states (darken instead of fade)
    const ACTIVE_TINT = 0xffffff;   // Full brightness
    const INACTIVE_TINT = 0x666666; // Darkened
    
    // Bounce the active avatar
    if (texture) {
      const startScale = activeBaseScale * ACTIVE_MULT * BOUNCE_START;
      const targetScale = activeBaseScale * ACTIVE_MULT;
      
      activeAvatar.scale.set(startScale, startScale);
      activeAvatar.alpha = 1;
      activeAvatar.tint = ACTIVE_TINT; // Full brightness for speaker
      
      gsap.to(activeAvatar.scale, {
        x: targetScale,
        y: targetScale,
        duration: animation.avatarDuration * 1.2,
        ease: 'back.out(2)',
      });
    } else {
      gsap.to(activeAvatar, {
        alpha: 1,
        duration: animation.avatarDuration,
        ease: 'power2.out',
      });
      activeAvatar.tint = ACTIVE_TINT;
    }
    
    // Handle inactive avatar
    const shouldDisappear = !inactiveAvatar.texture;
    const isCurrentlyVisible = inactiveAvatar.alpha > 0.5;
    
    if (shouldDisappear && isCurrentlyVisible) {
      const shrinkScale = inactiveBaseScale * 0.7;
      gsap.to(inactiveAvatar.scale, {
        x: shrinkScale,
        y: shrinkScale,
        duration: animation.avatarDuration,
        ease: 'back.in(1.7)',
        onComplete: () => {
          inactiveAvatar.alpha = 0;
          inactiveAvatar.scale.set(inactiveBaseScale, inactiveBaseScale);
        },
      });
    } else if (inactiveAvatar.texture) {
      // Darken inactive speaker (keep full alpha, use tint)
      inactiveAvatar.alpha = 1;
      inactiveAvatar.tint = INACTIVE_TINT;
      gsap.to(inactiveAvatar.scale, {
        x: inactiveBaseScale,
        y: inactiveBaseScale,
        duration: animation.avatarDuration,
        ease: 'power2.out',
      });
    }
  }
  
  private advanceDialogue(): void {
    if (this.isAnimating) {
      // Skip animation
      gsap.globalTimeline.progress(1);
      this.isAnimating = false;
      return;
    }
    
    if (this.isComplete) {
      this.restartDialogue();
      return;
    }
    
    this.showDialogue(this.currentIndex + 1);
  }
  
  private restartDialogue(): void {
    this.isComplete = false;
    
    if (this.endText) {
      this.endText.destroy();
      this.endText = null;
    }
    
    // Show advance indicator again
    if (this.advanceIndicator) {
      this.advanceIndicator.alpha = 1;
      gsap.to(this.advanceIndicator, {
        y: DIALOGUE_CONFIG.bubble.height - 20,
        duration: 0.5,
        ease: 'power1.inOut',
        yoyo: true,
        repeat: -1,
      });
    }
    
    this.currentIndex = 0;
    this.showDialogue(0);
  }
  
  private onDialogueComplete(): void {
    if (!this.bubbleContainer) return;
    
    this.isComplete = true;
    
    if (this.currentRichText) {
      this.currentRichText.destroy();
      this.currentRichText = null;
    }
    
    if (this.nameBadge) {
      this.nameBadge.removeChildren();
    }
    
    const { bubble } = DIALOGUE_CONFIG;
    
    this.endText = new Text('— Click to restart —', new TextStyle({
      fontFamily: 'Georgia, serif',
      fontSize: 24,
      fill: '#666666',
      fontStyle: 'italic',
    }));
    this.endText.resolution = 2;
    this.endText.anchor.set(0.5);
    this.endText.x = this.currentBubbleWidth / 2;
    this.endText.y = bubble.height / 2;
    this.bubbleContainer.addChild(this.endText);
    
    // Hide advance indicator
    if (this.advanceIndicator) {
      gsap.killTweensOf(this.advanceIndicator);
      this.advanceIndicator.alpha = 0;
    }
  }
}
