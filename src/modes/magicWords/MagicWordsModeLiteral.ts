import { Container, Text, TextStyle, Graphics, Sprite, Assets, Texture } from 'pixi.js';
import gsap from 'gsap';
import type { GameMode, GameModeContext } from '../GameMode';
import type { DeviceState } from '../../scenes/BaseGameScene';
import { RichText } from '../../components/RichText';
import { SpeechBubble } from '../../components/SpeechBubble';
import { MagicWordsSettingsPanel } from './MagicWordsSettingsPanel';
import type { GameSettingsPanelConfig, SettingsPanelContext } from '../../components/GameSettingsPanel';
import { ErrorHandler, killTweensRecursive } from '../../core';
import dialogBubbleImage from '../../assets/sprites/dialog/dialog-bubble.png';
import {
  API_URL,
  DIALOGUE_CONFIG,
  SETTINGS_PANEL_UI,
  getDefaultSettings,
  getPreservedSettings,
  type MagicWordsData,
  type DialogueLine,
  type AvatarDef,
} from '../../config/magicWordsSettings';
import { SCENE_LAYOUT } from '../../config/sharedSettings';

/**
 * MagicWordsModeLiteral
 * 
 * Visual novel-style dialogue display:
 * - Full screen layout with avatars
 * - Speech bubble at bottom with name badge
 * - Click/touch anywhere to advance
 */
export class MagicWordsModeLiteral implements GameMode {
  private context: GameModeContext;
  private content: Container | null = null;
  
  /** GSAP context for scoped animation cleanup (no global clear) */
  private gsapCtx: gsap.Context | null = null;
  
  /** Current dialogue data */
  private dialogueData: DialogueLine[] = [];
  
  /** Current dialogue index */
  private currentIndex = 0;
  
  /** Is currently animating */
  private isAnimating = false;
  
  /** Avatar textures by name */
  private avatarTextures: Map<string, Texture> = new Map();
  
  /** Avatar definitions by name */
  private avatarDefs: Map<string, AvatarDef> = new Map();
  
  /** Emoji map for RichText */
  private emojiMap: Map<string, string> = new Map();
  
  /** UI Elements */
  private leftAvatar: Sprite | null = null;
  private rightAvatar: Sprite | null = null;
  private bubbleContainer: Container | null = null;
  private speechBubble: SpeechBubble | null = null;
  private currentRichText: RichText | null = null;
  private nameBadge: Container | null = null;
  private advanceIndicator: Text | null = null;
  private settingsPanel: MagicWordsSettingsPanel | null = null;
  private endText: Text | null = null;
  
  /** Current avatar size (configurable) */
  private avatarSize: number;
  
  /** Current avatar Y offset (configurable) */
  private avatarYOffset: number;
  
  /** Current dialog box width (configurable) */
  private dialogBoxWidth: number;
  
  /** Current bubble width (set from dialogBoxWidth) */
  private currentBubbleWidth: number = 0;
  
  /** Current speaker side (controls bubble tail side) */
  private currentSpeakerIsLeft = true;
  
  /** Is dialogue complete (for restart) */
  private isComplete = false;
  
  /** Fake lag for debugging loading screen (seconds) */
  private fakeLag = 0;
  
  /** Design width/height for layout */
  private designWidth = 1280;
  private designHeight = 720;
  
  constructor(context: GameModeContext) {
    this.context = context;
    
    // Initialize settings from preserved or defaults
    const defaults = getDefaultSettings();
    const preserved = getPreservedSettings();
    
    this.dialogBoxWidth = preserved?.dialogBoxWidth ?? defaults.dialogBoxWidth;
    this.avatarSize = preserved?.avatarSize ?? defaults.avatarSize;
    this.avatarYOffset = preserved?.avatarYOffset ?? defaults.avatarYOffset;
    this.fakeLag = preserved?.fakeLag ?? defaults.fakeLag;
  }
  
  // ============================================================
  // GameMode Interface
  // ============================================================
  
  async start(): Promise<void> {
    // Initialize GSAP context for scoped animation cleanup
    this.gsapCtx = gsap.context(() => {});
    
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
    
    // Fetch and display data
    try {
      const data = await this.fetchData();
      
      // Generate avatars for speakers not in the API response
      const allAvatars = this.ensureAllSpeakersHaveAvatars(data.dialogue, data.avatars);
      
      await this.loadAvatars(allAvatars);
      this.buildEmojiMap(data);
      this.dialogueData = data.dialogue;
      
      // Apply fake lag if set (for debugging loading screen)
      if (this.fakeLag > 0) {
        await new Promise(resolve => setTimeout(resolve, this.fakeLag * 1000));
      }
      
      this.hideLoading();
      this.buildUI();
      this.showDialogue(0);
    } catch (error) {
      this.hideLoading();
      this.showError('Failed to load dialogue data');
      console.error('API Error:', error);
    }
  }
  
  stop(): void {
    // Kill ALL GSAP animations recursively on all content and its descendants
    if (this.content) {
      killTweensRecursive(this.content);
    }
    
    // Also revert context if it tracked anything
    this.gsapCtx?.revert();
    this.gsapCtx = null;
    
    if (this.content) {
      this.content.destroy({ children: true });
      this.content = null;
    }
    
    this.avatarTextures.clear();
    this.avatarDefs.clear();
    this.emojiMap.clear();
    this.dialogueData = [];
    this.currentIndex = 0;
    this.isComplete = false;
    this.currentBubbleWidth = 0;
    this.leftAvatar = null;
    this.rightAvatar = null;
    this.bubbleContainer = null;
    this.speechBubble = null;
    this.currentSpeakerIsLeft = true;
    this.currentRichText = null;
    this.nameBadge = null;
    this.advanceIndicator = null;
    this.settingsPanel = null;
    this.endText = null;
  }
  
  onResize(): void {
    // Forward to settings panel (it does its own scale-to-fit logic)
    this.settingsPanel?.onResize();
  }
  
  onDeviceStateChange(_newState: DeviceState, _oldState: DeviceState): void {
    // Forward to settings panel so it can rebuild for portrait/landscape
    this.settingsPanel?.onDeviceStateChange?.(_newState);
  }
  
  // ============================================================
  // Data Fetching & Loading
  // ============================================================
  
  private async fetchData(): Promise<MagicWordsData> {
    return ErrorHandler.retry(
      async () => {
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
      },
      'magic-words-api-fetch',
      3,  // 3 attempts
      500 // 500ms initial delay
    );
  }
  
  private async loadAvatars(avatars: AvatarDef[]): Promise<void> {
    const loadPromises = avatars.map(async (avatar) => {
      try {
        const texture = await Assets.load({
          src: avatar.url,
          loadParser: 'loadTextures',
        });
        this.avatarTextures.set(avatar.name, texture);
        this.avatarDefs.set(avatar.name, avatar);
      } catch (e) {
        console.warn(`Failed to load avatar: ${avatar.name}`, e);
      }
    });
    
    await Promise.all(loadPromises);
  }
  
  private buildEmojiMap(data: MagicWordsData): void {
    for (const emoji of data.emojies) {
      this.emojiMap.set(emoji.name, emoji.url);
    }
  }
  
  /**
   * Ensure all speakers in the dialogue have avatar definitions.
   * Generates random DiceBear avatars for speakers not in the API response.
   */
  private ensureAllSpeakersHaveAvatars(dialogue: DialogueLine[], avatars: AvatarDef[]): AvatarDef[] {
    // Get all unique speaker names from dialogue
    const speakerNames = new Set(dialogue.map(line => line.name));
    
    // Find speakers without avatars
    const existingNames = new Set(avatars.map(a => a.name));
    const missingNames = [...speakerNames].filter(name => !existingNames.has(name));
    
    if (missingNames.length === 0) {
      return avatars;
    }
    
    // Generate avatars for missing speakers
    const generatedAvatars = missingNames.map((name, index) => {
      return this.generateRandomAvatar(name, index);
    });
    
    if (import.meta.env.DEV) console.log(`Generated avatars for: ${missingNames.join(', ')}`);
    
    return [...avatars, ...generatedAvatars];
  }
  
  /**
   * Generate a random DiceBear Personas avatar URL based on speaker name.
   * Uses the name as a seed for consistent results.
   * Only uses validated options that work with the DiceBear API.
   */
  private generateRandomAvatar(name: string, index: number): AvatarDef {
    // Use name hash for deterministic randomness
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Validated avatar options (from working API examples)
    const bodies = ['squared', 'checkered'];
    const eyes = ['open', 'happy', 'glasses'];
    const hairs = ['buzzcut', 'shortCombover', 'extraLong'];
    const mouths = ['smile', 'smirk', 'surprise'];
    const noses = ['smallRound', 'mediumRound'];
    
    // Clothing colors (distinct for each generated avatar)
    const clothingColors = ['9b59b6', '1abc9c', 'e74c3c', '3498db', 'f39c12'];
    
    // Pick options based on hash
    const body = bodies[hash % bodies.length];
    const eye = eyes[(hash + 1) % eyes.length];
    const hair = hairs[(hash + 2) % hairs.length];
    const mouth = mouths[(hash + 3) % mouths.length];
    const nose = noses[(hash + 4) % noses.length];
    const clothingColor = clothingColors[(hash + index) % clothingColors.length];
    
    // Validated hair and skin colors
    const hairColors = ['362c47', '6c4545', 'f29c65'];
    const skinColors = ['e5a07e', 'd78774'];
    const hairColor = hairColors[(hash + 5) % hairColors.length];
    const skinColor = skinColors[(hash + 6) % skinColors.length];
    
    const url = `https://api.dicebear.com/9.x/personas/png?body=${body}&clothingColor=${clothingColor}&eyes=${eye}&hair=${hair}&hairColor=${hairColor}&mouth=${mouth}&nose=${nose}&skinColor=${skinColor}`;
    
    // Alternate position based on index (even = left, odd = right)
    const position = index % 2 === 0 ? 'left' : 'right';
    
    return { name, url, position };
  }
  
  // ============================================================
  // UI Building
  // ============================================================
  
  private showLoading(): void {
    if (!this.content) return;
    
    const { bubble } = DIALOGUE_CONFIG;
    
    // Calculate bubble center Y position (where the bubble will appear)
    const bubbleY = this.designHeight - bubble.height - bubble.bottomMargin;
    const bubbleCenterY = bubbleY + bubble.height / 2;
    
    // Create loading container for all loading elements
    const loadingContainer = new Container();
    loadingContainer.name = 'loading';
    this.content.addChild(loadingContainer);
    
    // Main message - theatrical style
    const mainStyle = new TextStyle({
      fontFamily: 'Georgia, serif',
      fontSize: 42,
      fill: '#f5e6c8',
      align: 'center',
      fontStyle: 'italic',
    });
    
    const mainText = new Text('The show is about to start', mainStyle);
    mainText.resolution = 2;
    mainText.anchor.set(0.5);
    mainText.x = this.designWidth / 2;
    mainText.y = bubbleCenterY - 15;
    loadingContainer.addChild(mainText);
    
    // Subtitle with loading dots
    const subStyle = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 18,
      fill: '#888888',
      align: 'center',
    });
    
    const subText = new Text('Loading dialogue...', subStyle);
    subText.resolution = 2;
    subText.anchor.set(0.5);
    subText.x = this.designWidth / 2;
    subText.y = bubbleCenterY + 30;
    loadingContainer.addChild(subText);
    
    // Fade in animation
    loadingContainer.alpha = 0;
    gsap.to(loadingContainer, {
      alpha: 1,
      duration: 0.5,
      ease: 'power2.out',
    });
    
    // Pulsing animation on main text
    gsap.to(mainText, {
      alpha: 0.6,
      duration: 1.2,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: -1,
    });
    
    // Show settings panel immediately during loading
    this.settingsPanel = this.createSettingsPanel();
    this.content.addChild(this.settingsPanel);
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
    
    // Dialog box is centered, width controlled by dialogBoxWidth
    const bubbleWidth = this.dialogBoxWidth;
    const bubbleX = (this.designWidth - bubbleWidth) / 2;
    const bubbleY = this.designHeight - bubble.height - bubble.bottomMargin;
    
    // Store bubble width for later use
    this.currentBubbleWidth = bubbleWidth;
    
    // Avatar positions: fixed at screen edges (bubble can overlap them)
    const avatarVisibleWidth = this.avatarSize * 0.7;
    const leftAvatarX = avatarVisibleWidth / 2;
    const rightAvatarX = this.designWidth - avatarVisibleWidth / 2;
    
    // Create avatar slots (initially hidden) - positioned at screen edges
    const avatarY = this.designHeight - bubble.bottomMargin + this.avatarYOffset;
    
    this.leftAvatar = new Sprite();
    this.leftAvatar.anchor.set(0.5, 1);
    this.leftAvatar.x = leftAvatarX;
    this.leftAvatar.y = avatarY;
    this.leftAvatar.alpha = 0;
    this.content.addChild(this.leftAvatar);
    
    this.rightAvatar = new Sprite();
    this.rightAvatar.anchor.set(0.5, 1);
    this.rightAvatar.x = rightAvatarX;
    this.rightAvatar.y = avatarY;
    this.rightAvatar.alpha = 0;
    this.content.addChild(this.rightAvatar);
    
    // Create speech bubble container (between avatars)
    this.bubbleContainer = new Container();
    this.bubbleContainer.x = bubbleX;
    this.bubbleContainer.y = bubbleY;
    this.content.addChild(this.bubbleContainer);
    
    // Speech bubble component using 9-slice image
    // The texture is 597x436 with tail at top-left (tip at ~x:18, y:12, edge at y:28)
    // We use borderScale < 1 to make the border appear thinner by rendering
    // at a larger internal size and scaling down.
    this.speechBubble = new SpeechBubble({
      width: bubbleWidth,
      height: bubble.height,
      texture: dialogBubbleImage,
      // [left, top, right, bottom] - protect tail area and rounded corners
      sliceMargins: [120, 150, 120, 120],
      // Scale down to make borders appear thinner (0.4 = 40% of original thickness)
      borderScale: 0.4,
      textureDefaultTailSide: 'left',
      // Tail tip measured from the PNG (approx): scaled by borderScale
      tailTip: { x: 18 * 0.4, y: 12 * 0.4 },
      tailSide: this.currentSpeakerIsLeft ? 'left' : 'right',
    });
    this.bubbleContainer.addChild(this.speechBubble);
    
    // Advance indicator (chevron at bottom right of bubble)
    this.advanceIndicator = new Text('▼', new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 20,
      fill: '#c4a574',
      fontWeight: 'bold',
    }));
    this.advanceIndicator.resolution = 2;
    this.advanceIndicator.anchor.set(0.5);
    // Position at bottom right, accounting for padding
    this.advanceIndicator.x = bubbleWidth - bubble.paddingX - 15;
    this.advanceIndicator.y = bubble.height - bubble.paddingY - 10;
    this.bubbleContainer.addChild(this.advanceIndicator);
    
    // Animate chevron (bouncing)
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
    
    // Settings panel (only create if not already created during loading)
    if (!this.settingsPanel) {
      this.settingsPanel = this.createSettingsPanel();
      this.content.addChild(this.settingsPanel);
    }
    
    // Click anywhere to advance
    this.content.eventMode = 'static';
    this.content.cursor = 'pointer';
    this.content.hitArea = { contains: () => true };
    this.content.on('pointerdown', () => this.advanceDialogue());
  }
  
  private createSettingsPanel(): MagicWordsSettingsPanel {
    const defaults = getDefaultSettings();
    const preserved = getPreservedSettings();
    const ui = SETTINGS_PANEL_UI;
    
    // GameSettingsPanelConfig - same pattern as Ace of Shadows
    const config: GameSettingsPanelConfig = {
      paddingX: ui.paddingX,
      paddingY: ui.paddingTop,
      radius: ui.radius,
      backgroundAlpha: ui.backgroundAlpha,
      backgroundColor: 0x333333,  // Dark grey background
      designX: this.designWidth / 2,  // Center horizontally (panel is centered at this X)
      designY: ui.topOffset + 180,    // Center Y of panel (top + ~half panel height)
    };
    
    // SettingsPanelContext - provides responsive behavior hooks
    const context: SettingsPanelContext = {
      getDeviceState: () => this.context.getDeviceState(),
      getScreenSize: () => this.context.getScreenSize(),
      getGameContainerScale: () => this.context.gameContainer.scale.x,
      getGameContainerY: () => this.context.gameContainer.y,
      getContentBottomY: () => {
        // For Magic Words, content bottom is near the bubble
        const { bubble } = DIALOGUE_CONFIG;
        return this.designHeight - bubble.height - bubble.bottomMargin;
      },
    };
    
    return new MagicWordsSettingsPanel(
      config,
      context,
      {
        dialogBoxWidth: this.dialogBoxWidth,
        avatarSize: this.avatarSize,
        avatarYOffset: this.avatarYOffset,
        preset: preserved?.preset ?? defaults.preset,
        keepSettings: preserved?.keepSettings ?? defaults.keepSettings,
        fakeLag: this.fakeLag,
      },
      {
        onDialogBoxChange: (value) => {
          this.dialogBoxWidth = value;
          this.updateDialogBoxSize();
        },
        onAvatarSizeChange: (value) => {
          this.avatarSize = value;
          this.updateAvatarSizes();
        },
        onYOffsetChange: (value) => {
          this.avatarYOffset = value;
          this.updateAvatarYPosition();
        },
        onFakeLagChange: (value) => {
          this.fakeLag = value;
        },
      }
    );
  }
  
  private updateAvatarSizes(): void {
    if (!this.leftAvatar || !this.rightAvatar) return;
    
    // Avatars stay fixed at screen edges (based on avatar size only)
    const avatarVisibleWidth = this.avatarSize * 0.7;
    const leftAvatarX = avatarVisibleWidth / 2;
    const rightAvatarX = this.designWidth - avatarVisibleWidth / 2;
    
    // Update avatar positions
    this.leftAvatar.x = leftAvatarX;
    this.rightAvatar.x = rightAvatarX;
    
    // Update sizes if textures are loaded
    if (this.leftAvatar.texture) {
      this.leftAvatar.width = this.avatarSize;
      this.leftAvatar.height = this.avatarSize;
    }
    if (this.rightAvatar.texture) {
      this.rightAvatar.width = this.avatarSize;
      this.rightAvatar.height = this.avatarSize;
    }
  }
  
  private updateAvatarYPosition(): void {
    if (!this.leftAvatar || !this.rightAvatar) return;
    
    const { bubble } = DIALOGUE_CONFIG;
    const avatarY = this.designHeight - bubble.bottomMargin + this.avatarYOffset;
    
    this.leftAvatar.y = avatarY;
    this.rightAvatar.y = avatarY;
  }
  
  private updateDialogBoxSize(): void {
    if (!this.bubbleContainer || !this.speechBubble) return;
    
    const { bubble } = DIALOGUE_CONFIG;
    
    // Update bubble width and center it
    const bubbleWidth = this.dialogBoxWidth;
    const bubbleX = (this.designWidth - bubbleWidth) / 2;
    
    this.bubbleContainer.x = bubbleX;
    this.currentBubbleWidth = bubbleWidth;
    this.speechBubble.setSize(bubbleWidth, bubble.height);
    this.speechBubble.setTailSide(this.currentSpeakerIsLeft ? 'left' : 'right');
    
    // Update advance indicator position
    if (this.advanceIndicator) {
      this.advanceIndicator.x = bubbleWidth - bubble.paddingX - 15;
      const baseY = bubble.height - bubble.paddingY - 10;
      gsap.killTweensOf(this.advanceIndicator);
      gsap.to(this.advanceIndicator, {
        y: baseY - 5,
        duration: 0.5,
        ease: 'power1.inOut',
        yoyo: true,
        repeat: -1,
      });
    }
    
    // Update name badge position (at top edge of bubble)
    if (this.nameBadge) {
      const { nameBadge: badgeConfig } = DIALOGUE_CONFIG;
      if (this.currentSpeakerIsLeft) {
        this.nameBadge.x = badgeConfig.marginX;
      } else {
        this.nameBadge.x = bubbleWidth - badgeConfig.marginX;
      }
      this.nameBadge.y = badgeConfig.marginY;
    }
    
    // Re-layout text to fit new bubble width
    if (this.currentRichText) {
      const textMargin = 20;
      const textMaxWidth = bubbleWidth - (bubble.paddingX * 2) - textMargin;
      this.currentRichText.setMaxWidth(textMaxWidth);
    }
    // Avatars stay fixed - bubble can overlap them
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
    
    // Get avatar info for this speaker
    const avatarDef = this.avatarDefs.get(line.name);
    const isLeft = avatarDef?.position === 'left';
    
    // Update speaker side and redraw bubble tail to match
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
    
    // Check if we're on phone for font scaling (1.5x bigger)
    const { width: screenW, height: screenH } = this.context.getScreenSize();
    const isPhone = Math.min(screenW, screenH) < SCENE_LAYOUT.phoneBreakpoint;
    const badgeFontSize = isPhone ? Math.round(nameBadge.fontSize * 1.5) : nameBadge.fontSize;
    
    const nameText = new Text(line.name, new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: badgeFontSize,
      fill: nameBadge.textColor,
      fontWeight: 'bold',
    }));
    nameText.resolution = 2;
    nameText.anchor.set(0.5);
    
    const badgeWidth = nameText.width + nameBadge.paddingX * 2;
    const badgeHeight = nameText.height + nameBadge.paddingY * 2;
    
    // Get speaker-specific color or fall back to default
    const speakerColor = nameBadge.speakerColors[line.name] ?? nameBadge.bgColor;
    
    const badgeBg = new Graphics();
    badgeBg.lineStyle(nameBadge.borderWidth ?? 2, nameBadge.borderColor ?? 0x1f1f1f, 1);
    badgeBg.beginFill(speakerColor);
    badgeBg.drawRoundedRect(-badgeWidth / 2, -badgeHeight / 2, badgeWidth, badgeHeight, nameBadge.radius);
    badgeBg.endFill();
    
    this.nameBadge.addChild(badgeBg);
    this.nameBadge.addChild(nameText);
    
    // Position badge at the top edge of bubble (sitting on the edge, half in half out)
    // For left speaker: near left corner; for right speaker: near right corner
    if (isLeft) {
      this.nameBadge.x = nameBadge.marginX;
    } else {
      this.nameBadge.x = this.currentBubbleWidth - nameBadge.marginX;
    }
    this.nameBadge.y = nameBadge.marginY;
    
    // Create rich text for dialogue
    // Text max width must account for bubble padding and extra safety margin
    // Keep consistent font size regardless of device (bubble is already scaled)
    const textMargin = 40; // Extra safety margin to keep text inside bubble
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
    const texture = this.avatarTextures.get(speakerName);
    
    // Determine which avatar slot to use
    const activeAvatar = isLeft ? this.leftAvatar : this.rightAvatar;
    const inactiveAvatar = isLeft ? this.rightAvatar : this.leftAvatar;
    
    // Update texture if we have it (use current avatarSize)
    if (texture) {
      activeAvatar.texture = texture;
      activeAvatar.width = this.avatarSize;
      activeAvatar.height = this.avatarSize;
    }
    
    // Kill any existing tweens
    gsap.killTweensOf(activeAvatar);
    gsap.killTweensOf(activeAvatar.scale);
    gsap.killTweensOf(inactiveAvatar);
    gsap.killTweensOf(inactiveAvatar.scale);
    
    // Calculate base scale from avatarSize (what width/height would set internally)
    // This is the scale needed to display at this.avatarSize pixels
    const activeBaseScale = texture ? this.avatarSize / texture.width : 1;
    const inactiveBaseScale = inactiveAvatar.texture ? this.avatarSize / inactiveAvatar.texture.width : 1;
    
    // Multipliers for active/inactive states
    const ACTIVE_MULT = 1.08;   // Speaking avatar 8% larger
    const BOUNCE_START = 0.85;  // Start bounce at 85% of target
    
    // Tint values for active/inactive states (darken instead of fade)
    const ACTIVE_TINT = 0xffffff;   // Full brightness
    const INACTIVE_TINT = 0x666666; // Darkened
    
    // Bounce the active avatar every time they speak
    if (texture) {
      // Start smaller for bounce effect
      const startScale = activeBaseScale * ACTIVE_MULT * BOUNCE_START;
      const targetScale = activeBaseScale * ACTIVE_MULT;
      
      activeAvatar.scale.set(startScale, startScale);
      activeAvatar.alpha = 1;
      activeAvatar.tint = ACTIVE_TINT; // Full brightness for speaker
      
      // Bounce to active scale (slightly bigger than rest)
      gsap.to(activeAvatar.scale, {
        x: targetScale,
        y: targetScale,
        duration: animation.avatarDuration * 1.2,
        ease: 'back.out(2)',
      });
    } else {
      // No texture, just fade in
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
      // Bounce out when disappearing completely
      const shrinkScale = inactiveBaseScale * 0.7;
      gsap.to(inactiveAvatar.scale, {
        x: shrinkScale,
        y: shrinkScale,
        duration: animation.avatarDuration,
        ease: 'back.in(1.7)',
        onComplete: () => {
          inactiveAvatar.alpha = 0;
          // Restore to rest scale for next appearance
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
      // Skip animation and show full text immediately
      gsap.globalTimeline.progress(1);
      this.isAnimating = false;
      return;
    }
    
    // If dialogue is complete, restart
    if (this.isComplete) {
      this.restartDialogue();
      return;
    }
    
    // Move to next dialogue
    this.showDialogue(this.currentIndex + 1);
  }
  
  private restartDialogue(): void {
    this.isComplete = false;
    
    // Remove end text if exists
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
    
    // Reset and start from beginning
    this.currentIndex = 0;
    this.showDialogue(0);
  }
  
  private onDialogueComplete(): void {
    if (!this.bubbleContainer) return;
    
    this.isComplete = true;
    
    // Show "End of dialogue" message
    if (this.currentRichText) {
      this.currentRichText.destroy();
      this.currentRichText = null;
    }
    
    // Clear name badge and pointer
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
