/**
 * Magic Words Settings Configuration
 * 
 * Task 2: Text + inline emoji rendering system
 */

/** API endpoint for dialogue data */
export const API_URL = 'https://private-624120-softgamesassignment.apiary-mock.com/v2/magicwords';

/** Design bounds for Magic Words modes */
export const DESIGN_BOUNDS = {
  /** Selection screen */
  selection: {
    x: 140,
    y: 70,
    width: 520,
    height: 300,
  },
  /** Literal mode: full screen visual novel (set dynamically in mode) */
  literal: {
    x: 0,
    y: 0,
    width: 1280,
    height: 720,
  },
  /** Creative mode */
  creative: {
    x: 100,
    y: 150,
    width: 600,
    height: 300,
  },
};

/** Scene-specific screen padding (smaller than Ace of Shadows for more space) */
export const SCENE_PADDING = {
  /** Padding from screen edges */
  horizontal: 10,
  vertical: 10,
};

/** Visual Novel Dialogue display settings */
export const DIALOGUE_CONFIG = {
  /** Speech bubble settings */
  bubble: {
    /** Background color (cream/beige like screenshots) */
    bgColor: 0xfff8e7,
    /** Border/outline color */
    borderColor: 0xc4a574,
    /** Border width */
    borderWidth: 3,
    /** Corner radius */
    radius: 20,
    /** Padding inside bubble (accounts for 9-slice visual margins) */
    paddingX: 60,
    paddingY: 50,
    /** Height of the bubble area */
    height: 200,
    /** Bottom margin from screen edge */
    bottomMargin: 15,
    /** Margin from avatars (bubble sits between avatars) */
    avatarGap: 15,
    /** Curved tail (\"ear\") like reference image */
    tail: {
      /** Width of the tail base (where it connects to bubble side) */
      baseWidth: 40,
      /** How far the tail tip extends outward (x) */
      tipOutX: 35,
      /** How far the tail tip extends upward (y) */
      tipUpY: 30,
      /** Distance from top edge where tail starts */
      topOffset: 15,
    },
  },
  /** Name badge settings */
  nameBadge: {
    /** Default badge background color (blue) */
    bgColor: 0x3498db,
    /** Text color */
    textColor: '#ffffff',
    /** Font size */
    fontSize: 22,
    /** Padding inside badge */
    paddingX: 25,
    paddingY: 8,
    /** Border radius (pill shape) */
    radius: 20,
    /** Distance from bubble edge (X position) */
    marginX: 120,
    /** Vertical offset from bubble top edge (0 = centered on edge, negative = higher) */
    marginY: 10,
    /** Speaker-specific colors (name -> hex color) */
    speakerColors: {
      'Sheldon': 0x6dbb58,   // Green (matches his shirt)
      'Leonard': 0xf3b63a,   // Orange/Yellow (matches his shirt)
      'Penny': 0xf55d81,     // Pink (matches her outfit)
      'Neighbour': 0x9b59b6, // Purple (distinct)
    } as Record<string, number>,
  },
  /** Text settings */
  text: {
    /** Text color */
    color: '#333333',
    /** Font size */
    fontSize: 26,
    /** Font family */
    fontFamily: 'Georgia, serif',
    /** Line height */
    lineHeight: 1.4,
    /** Emoji size */
    emojiSize: 32,
  },
  /** Avatar settings */
  avatar: {
    /** Default size of avatar image */
    size: 500,
    /** Min size for slider */
    minSize: 200,
    /** Max size for slider */
    maxSize: 500,
    /** Y position from bottom */
    bottomOffset: 180,
    /** X offset from edges (minimal for edge positioning) */
    sideOffset: 5,
    /** Y offset for avatar position (0 = default, negative = up, positive = down) */
    yOffset: 0,
  },
  /** Dialog box size settings */
  dialogBox: {
    /** Default width of dialog box */
    width: 800,
    /** Min width for slider */
    minWidth: 500,
    /** Max width for slider */
    maxWidth: 1100,
  },
  /** Skip button */
  skip: {
    fontSize: 24,
    color: '#ffffff',
    padding: 20,
  },
  /** Animation settings */
  animation: {
    /** Duration for text appearing */
    textDuration: 0.3,
    /** Duration for avatar transition */
    avatarDuration: 0.25,
  },
};

/** Selection panel (same pattern as Ace of Shadows) */
export const SELECTION_PANEL = {
  paddingX: 40,
  paddingY: 30,
  titleGap: 55,
  buttonGap: 20,
  buttonWidth: 280,
  buttonHeight: 55,
  centerX: 400,
  centerY: 220,
  radius: 20,
  backgroundAlpha: 0.5,
  titleFontSize: 32,
  buttonFontSize: 20,
  buttonRadius: 12,
};

// ============================================================
// Settings Panel UI
// ============================================================

/** Settings panel UI configuration */
export const SETTINGS_PANEL_UI = {
  /** Width of slider controls */
  sliderWidth: 180,
  /** Horizontal padding inside panel */
  paddingX: 25,
  /** Top padding inside panel */
  paddingTop: 25,
  /** Vertical gap between controls */
  gap: 45,
  /** Panel corner radius */
  radius: 12,
  /** Panel background opacity */
  backgroundAlpha: 0.6,
  /** Panel Y position from top */
  topOffset: 30,
};

// ============================================================
// Presets
// ============================================================

/** Preset configuration for quick settings */
export interface DialoguePreset {
  dialogBox: number;
  avatarSize: number;
  yOffset: number;
  label: string;
}

/** Available presets */
export const PRESETS: Record<string, DialoguePreset> = {
  A: { 
    dialogBox: 800, 
    avatarSize: 500, 
    yOffset: 0, 
    label: 'Option A (Default)' 
  },
  B: { 
    dialogBox: 1040, 
    avatarSize: 360, 
    yOffset: -150, 
    label: 'Option B (Compact)' 
  },
};

// ============================================================
// Settings Persistence
// ============================================================

/** Current settings state (persisted across scene visits) */
export interface MagicWordsSettings {
  dialogBoxWidth: number;
  avatarSize: number;
  avatarYOffset: number;
  preset: string;
  keepSettings: boolean;
}

/** Default settings values */
export function getDefaultSettings(): MagicWordsSettings {
  return {
    dialogBoxWidth: DIALOGUE_CONFIG.dialogBox.width,
    avatarSize: DIALOGUE_CONFIG.avatar.size,
    avatarYOffset: DIALOGUE_CONFIG.avatar.yOffset,
    preset: 'A',
    keepSettings: false,
  };
}

/** Singleton for preserved settings (persists across scene visits) */
let preservedSettings: Partial<MagicWordsSettings> | null = null;

/** Get preserved settings if "Keep Settings" was enabled */
export function getPreservedSettings(): Partial<MagicWordsSettings> | null {
  return preservedSettings;
}

/** Save current settings (called when "Keep Settings" is on) */
export function saveSettings(settings: Partial<MagicWordsSettings>): void {
  preservedSettings = { ...preservedSettings, ...settings };
}

/** Clear preserved settings */
export function clearPreservedSettings(): void {
  preservedSettings = null;
}

// ============================================================
// API Response Types
// ============================================================

/** API response types */
export interface DialogueLine {
  name: string;
  text: string;
}

export interface EmojiDef {
  name: string;
  url: string;
}

export interface AvatarDef {
  name: string;
  url: string;
  position: 'left' | 'right';
}

export interface MagicWordsData {
  dialogue: DialogueLine[];
  emojies: EmojiDef[];
  avatars: AvatarDef[];
}

