![main menu view](screenshots/main-menu-view.png)

# BESTGAMES - Game Developer Tasks

A unified PixiJS application featuring three interactive demos, built as a technical assessment for Senior HTML5 Game Developer.

**Author:** Javier Moreno

## 🎮 Live Demo

👉 **[Play the Demo](https://javideas.github.io/Game-Developer-Tasks/)** *(coming soon)*

---

## 🕹️ The Three Tasks

| # | Name | Description | Status |
|---|------|-------------|--------|
| 1 | **Ace of Shadows** | 144 animated cards + TriPeaks solitaire creative mode | ✅ Complete |
| 2 | **Magic Words** | Visual novel dialogue with Big Bang Theory creative mode | ✅ Complete |
| 3 | **Phoenix Flame** | Particle fire with evolving flame-to-egg creative mode | ✅ Complete |

All three tasks feature **Literal** and **Creative** modes accessible via an in-game menu with FPS counter.

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| PixiJS | v7.4.3 | WebGL 2D rendering |
| TypeScript | 5.9 | Type-safe code |
| GSAP | 3.14 | Smooth animations |
| Vite | 7.2 | Build tool |

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/javideas/Game-Developer-Tasks.git
cd Game-Developer-Tasks

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📁 File Architecture

```
src/
├── main.ts                          # Entry point, scene navigation
├── style.css                        # Global styles (fullscreen canvas, FPS)
│
├── config/
│   ├── design.ts                    # Main menu UI constants
│   ├── sharedSettings.ts            # Cross-task responsive breakpoints
│   ├── aceOfShadowsSettings.ts      # Task 1: Ace of Shadows config
│   ├── magicWordsSettings.ts        # Task 2: Magic Words config
│   └── phoenixFlameSettings.ts      # Task 3: Phoenix Flame config
│
├── core/
│   ├── index.ts                     # Barrel exports
│   ├── Application.ts               # PixiJS wrapper, resize handling
│   ├── SceneManager.ts              # Scene lifecycle (start, stop, update)
│   └── FPSCounter.ts                # FPS display (HTML overlay, top-right)
│
├── components/
│   ├── Button.ts                    # Reusable button with hover effects
│   ├── MenuTile.ts                  # Game thumbnail tile with hover overlay
│   ├── Slider.ts                    # Value slider control
│   ├── Toggle.ts                    # Boolean toggle control
│   ├── Dropdown.ts                  # Dropdown menu control
│   ├── SettingsPanel.ts             # Cell-based settings layout
│   ├── GameSettingsPanel.ts         # Abstract base for game settings UI
│   ├── ModeSelectionPanel.ts        # Mode selection UI component
│   ├── RichText.ts                  # Text with inline emoji images
│   └── SpeechBubble.ts              # 9-slice speech bubble component
│
├── scenes/
│   ├── BaseGameScene.ts             # Abstract base class for game scenes
│   ├── MainMenuScene.ts             # Main menu with game tiles
│   ├── AceOfShadowsScene.ts         # Task 1: Scene coordinator
│   ├── MagicWordsScene.ts           # Task 2: Scene coordinator
│   └── PhoenixFlameScene.ts         # Task 3: Particle fire effect
│
├── modes/
│   ├── GameMode.ts                  # Interface for game mode implementations
│   ├── aceOfShadows/
│   │   ├── index.ts                 # Barrel exports
│   │   ├── AceOfShadowsModeLiteral.ts   # 144 cards with 3D shadows
│   │   ├── AceOfShadowsModeCreative.ts  # TriPeaks solitaire game
│   │   └── LiteralModeSettingsPanel.ts  # Literal mode settings UI
│   │
│   ├── magicWords/
│   │   ├── index.ts                 # Barrel exports
│   │   ├── MagicWordsModeLiteral.ts     # Visual novel with API avatars
│   │   ├── MagicWordsModeCreative.ts    # Big Bang Theory characters
│   │   └── MagicWordsSettingsPanel.ts   # Dialogue settings UI
│   │
│   └── phoenixFlame/
│       ├── index.ts                 # Barrel exports
│       ├── PhoenixFlameModeLiteral.ts   # Particle fire (max 10 sprites)
│       ├── PhoenixFlameModeCreative.ts  # Phoenix + evolving eggs
│       ├── PhoenixFlameSettingsPanel.ts # Flame settings UI
│       ├── FlyingParticlePool.ts        # Object-pooled particle system
│       ├── LandedSpriteManager.ts       # Floor landing animations
│       └── EvolvingLandedManager.ts     # Click-to-evolve egg system
│
└── assets/
    ├── fonts/
    └── sprites/
        ├── thumbnails/              # Game preview images
        ├── dialog/                  # Speech bubble assets
        ├── ultimate-minimalist-card-asset/  # Card spritesheet
        ├── bigbang-chars/           # Big Bang Theory character spritesheets
        ├── bigbang-bg/              # Living room background
        ├── flame-hq/                # HQ flame animation spritesheet
        ├── flame-egg-levels/        # Evolving flame-to-egg spritesheet
        └── phoenix/                 # Phoenix Spine animation
```

---

## 🏗️ Core Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              main.ts                                    │
│                           (Entry Point)                                 │
│                                 │                                       │
│                                 ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                         Application                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐    │  │
│  │  │ PixiJS App  │  │ FPSCounter  │  │     SceneManager        │    │  │
│  │  │  (canvas)   │  │ (top-right) │  │ (lifecycle management)  │    │  │
│  │  └─────────────┘  └─────────────┘  └───────────┬─────────────┘    │  │
│  └────────────────────────────────────────────────┼──────────────────┘  │
│                                                   │                     │
│                                                   ▼                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                       Scene Interface                             │  │
│  │  • container: Container     • onStart(): Promise<void>            │  │
│  │  • onStop(): void           • onResize(): void                    │  │
│  │  • onUpdate(delta): void    • destroy(): void                     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│              ┌─────────────────────┬────────────────────┐               │
│              ▼                     ▼                    ▼               │
│     ┌──────────────┐    ┌─────────────────────┐  ┌──────────────┐       │
│     │  MainMenu    │    │   BaseGameScene     │  │ (more scenes)│       │
│     │   Scene      │    │     (abstract)      │  │              │       │
│     │              │    │ • gameContainer     │  │              │       │
│     │ • MenuTiles  │    │ • responsive layout │  │              │       │
│     │ • Title bar  │    │ • device detection  │  │              │       │
│     └──────────────┘    │ • back button       │  └──────────────┘       │
│                         │ • auto-rotation     │                         │
│                         └──────────┬──────────┘                         │
│                                    │                                    │
│              ┌─────────────────────┼─────────────────────┐              │
│              ▼                     ▼                     ▼              │
│     ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │
│     │ AceOfShadows   │  │  MagicWords    │  │ PhoenixFlame   │          │
│     │    Scene       │  │    Scene       │  │    Scene       │          │
│     │  (coordinator) │  │                │  │                │          │
│     └───────┬────────┘  └────────────────┘  └────────────────┘          │
│             │                                                           │
│             ▼                                                           │
│     ┌───────────────────────────────────────────────────────┐           │
│     │                  Mode Composition                     │           │
│     │  ┌─────────────────┐    ┌─────────────────────────┐   │           │
│     │  │   GameMode      │    │  GameModeContext        │   │           │
│     │  │   Interface     │◀─ │  (shared resources)     │   │           │
│     │  │ • start()       │    │  • container            │   │           │
│     │  │ • stop()        │    │  • spritesheet          │   │           │
│     │  │ • onResize()    │    │  • gameContainer        │   │           │
│     │  │ • onDeviceState │    │  • requestLayout()      │   │           │
│     │  └────────┬────────┘    └─────────────────────────┘   │           │
│     │           │                                           │           │
│     │     ┌─────┴─────┐                                     │           │
│     │     ▼           ▼                                     │           │
│     │ ┌─────────┐ ┌─────────┐                               │           │
│     │ │ Literal │ │Creative │                               │           │
│     │ │  Mode   │ │  Mode   │                               │           │
│     │ └─────────┘ └─────────┘                               │           │
│     └───────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Ace of Shadows

![ace-of-shadows-mode-selection](screenshots/ace-of-shadows-mode-selection.png)

![ace-of-shadows-mode-literal](screenshots/ace-of-shadows-mode-literal.png)

### Mode Composition Pattern

The Ace of Shadows scene uses a **Mode Composition Pattern** where the scene acts as a coordinator and delegates game logic to separate mode classes:

```
AceOfShadowsScene (coordinator, ~270 lines)
├── Loads shared resources (spritesheet, background)
├── Displays mode selection UI
├── Creates GameModeContext for mode instances
└── Forwards lifecycle events to active mode

AceOfShadowsModeLiteral (~1000 lines)
├── 144 cards in two stacks
├── Animation system (linear/spiral modes)
├── 3D shadow system (floor + stack shadows)
└── Settings panel (delegates to LiteralModeSettingsPanel)

AceOfShadowsModeCreative (~1600 lines)
├── TriPeaks solitaire layout (3 pyramids)
├── Stock pile with draw mechanics
├── ±1 rank matching rules
├── Card reveal with blocking logic
├── Multiple tableau layouts (Classic, Wide, Tight)
└── Win/lose detection with restart
```

### Settings Panel Hierarchy

```
GameSettingsPanel (abstract base)
├── Auto-sizing background panel
├── Responsive scaling to screen space
├── Device state handling (phone/tablet/desktop)
│
└── LiteralModeSettingsPanel (extends GameSettingsPanel)
    ├── Sliders: Interval, Duration, Blur, Arc A→B, Arc B→A
    ├── Toggles: 3D Shadows, Spiral, Keep Settings
    └── Deck toggle buttons: Deck A, Deck B
```

### Animation Modes

| Mode | Description |
|------|-------------|
| **Linear** | Cards move in straight line between stacks |
| **Spiral** | Cards arc upward and flip mid-air (face ↔ back) |

### 3D Shadow System

```
Moving Card
    │
    ├── Floor Shadow (behind everything)
    │   • Always at floor level
    │   • Follows card X position
    │   • Shrinks/expands with card flip
    │
    └── Stack Shadow (on top card of stack)
        • Masked by card shape
        • Only visible when card is above stack
```

### Responsive Behavior

| Device State | Settings Layout |
|--------------|-----------------|
| Desktop/Tablet | 2 rows × 5 columns |
| Phone Landscape | 2 rows × 5 columns (larger) |
| Phone Portrait | 5 rows × 2 columns |

---

## 💬 Magic Words

![magic-words-mode-literal](screenshots/magic-words-mode-literal.png)

### Visual Novel Dialogue System

Task 2 implements a visual novel-style dialogue system that fetches data from an API and renders text with inline emoji images.

```
MagicWordsScene (coordinator, ~220 lines)
├── Loads nothing upfront (API-driven)
├── Displays mode selection UI
├── Creates GameModeContext for mode instances
├── preferredOrientation: 'landscape' (auto-rotates on portrait phones)
└── Forwards lifecycle events to active mode

MagicWordsModeLiteral (~900 lines)
├── API data fetching (dialogue, emojis, avatars)
├── Visual novel layout (avatars + speech bubble)
├── RichText component for inline emojis
├── Click-to-advance dialogue system
├── Avatar bounce animations (appear/disappear/active speaker)
├── Dynamic avatar generation (DiceBear API for unknown speakers)
└── Settings panel (delegates to MagicWordsSettingsPanel)

MagicWordsSettingsPanel (~450 lines)
├── Extends GameSettingsPanel
├── Dialog box width, avatar size, Y offset sliders
├── Preset dropdown (A/B configurations)
├── Fake lag slider (debug loading screen)
├── Keep Settings toggle with persistence
├── Physical portrait UI multiplier (1.3×)
└── Responsive layout (vertical on portrait, horizontal on landscape)

MagicWordsModeCreative (~700 lines)
├── Big Bang Theory character spritesheets
├── Blurred living room background
├── Same API dialogue data as Literal mode
├── Characters grow from bottom (legs hidden)
└── Darkened inactive speaker (tint vs opacity)
```

### Key Components

| Component | Purpose |
|-----------|---------|
| `RichText` | Parses `{emoji}` placeholders and renders inline images |
| `SpeechBubble` | 9-slice scalable bubble with configurable tail direction |
| `MagicWordsSettingsPanel` | Dialog/avatar size, Y offset, presets, fake lag |

### Responsive Behavior

| Device State | Settings Layout | UI Scale |
|--------------|-----------------|----------|
| Desktop/Tablet | 2 rows horizontal | 1.0× |
| Phone Landscape | 2 rows horizontal | 1.0× |
| Phone Portrait (physical) | Single column vertical | 1.3× |

Note: "Physical portrait" means the device is physically held in portrait, even though game content is rotated to landscape.

### API Integration

```typescript
// Fetches from API endpoint
const data = await fetch(API_URL).then(r => r.json());
// { dialogue: [...], emojies: [...], avatars: [...] }

// Dynamic avatar generation for missing speakers
generateAvatarUrl(name, color, position) // → DiceBear Personas URL
```

### Dialogue Flow

```
┌─────────────────────────────────────────────────┐
│                    Screen                       │
│                                                 │
│  ┌────────┐                        ┌────────┐   │
│  │ Avatar │                        │ Avatar │   │
│  │ (left) │                        │(right) │   │
│  │        │                        │        │   │
│  └────────┘                        └────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ [Speaker Name]                          │    │
│  │                                         │    │
│  │ "Dialogue text with {emoji} inline..."  │    │
│  │                                     ▼   │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Click anywhere to advance                      │
└─────────────────────────────────────────────────┘
```

### Settings Persistence

Like Ace of Shadows, Magic Words supports "Keep Settings" toggle:

```typescript
// Config exports
getDefaultSettings()      // Default values
getPreservedSettings()    // Saved values (or null)
saveSettings(partial)     // Persist to singleton
clearPreservedSettings()  // Reset
```

### Auto-Rotation for Portrait Devices

Magic Words is designed for landscape viewing. When played on a phone in portrait mode, the game content auto-rotates 90° while keeping UI overlays (back button, FPS counter) pinned to physical screen corners:

![mode landscape](screenshots/landscape-mode.png)
![mode portrait](screenshots/portrait-mode.png)

The settings panel also scales up by 1.3× in physical portrait mode for easier touch interaction.

---

## 🔥 Phoenix Flame

### Particle Fire Effect (Task 3)

Task 3 implements a particle-based fire effect with a strict **10 sprite maximum** constraint.

```
PhoenixFlameScene (coordinator, ~270 lines)
├── Displays mode selection UI
├── Creates GameModeContext for mode instances
├── preferredOrientation: 'landscape'
└── Forwards lifecycle events to active mode

PhoenixFlameModeLiteral (~830 lines)
├── Object-pooled FlyingParticlePool (6 max flying)
├── LandedSpriteManager (3 max landed + shrinking)
├── HQ animated flame spritesheet
├── Physics-based trajectories with gravity
├── Settings panel for real-time tuning
└── Total: 1 main flame + 6 flying + 3 landed = 10 sprites max

PhoenixFlameModeCreative (~940 lines)
├── Extends PhoenixFlameModeLiteral (reuses particle physics)
├── Phoenix Spine character (animated)
├── Evolving flame-to-egg system (4 levels)
├── Click-to-evolve mechanics (3 clicks per level)
├── EvolvingLandedManager for egg progression
├── Egg counter UI with animated icon
└── Shadow system for Phoenix character
```

### Sprite Budget Compliance

| Component | Count | Purpose |
|-----------|-------|---------|
| Main Flame | 1 | Central animated flame |
| Flying Particles | 6 max | Emitted particles in flight |
| Landed Sprites | 3 max | Shrinking on floor |
| **Total** | **10 max** | ✅ Within budget |

### Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Object pooling | No create/destroy during gameplay |
| Validate before spawn | Never spawn then kill |
| TrajectorySlotManager | Pre-calculated paths for spacing |
| GSAP for death | Smooth shrink animations |

### Evolving Flame System (Creative Mode)

```
┌──────────────┐    3 clicks    ┌──────────────┐    3 clicks    ┌──────────────┐    3 clicks    ┌──────────────┐
│   Level 1    │ ────────────▶ │   Level 2    │ ────────────▶ │   Level 3    │ ────────────▶ │   Level 4    │
│  (flame)     │                │ (evolving 1) │                │ (evolving 2) │                │   (egg)      │
└──────────────┘                └──────────────┘                └──────────────┘                └──────────────┘
```

Eggs stay permanently until collected, with animated counter UI.

---

## 📦 Key Components

### Core Classes

| Class | File | Responsibility |
|-------|------|----------------|
| `Application` | `core/Application.ts` | PixiJS init, resize, FPS, scenes |
| `SceneManager` | `core/SceneManager.ts` | Scene lifecycle management |
| `BaseGameScene` | `scenes/BaseGameScene.ts` | Abstract base with responsive layout, auto-rotation |

### Scene Classes

| Class | File | Responsibility |
|-------|------|----------------|
| `MainMenuScene` | `scenes/MainMenuScene.ts` | Menu UI with game tiles |
| `AceOfShadowsScene` | `scenes/AceOfShadowsScene.ts` | Task 1 coordinator |
| `MagicWordsScene` | `scenes/MagicWordsScene.ts` | Task 2 coordinator, auto-rotates to landscape |
| `PhoenixFlameScene` | `scenes/PhoenixFlameScene.ts` | Task 3 coordinator, particle fire |

### Mode Classes

| Class | File | Responsibility |
|-------|------|----------------|
| `GameMode` | `modes/GameMode.ts` | Interface for mode implementations |
| `AceOfShadowsModeLiteral` | `modes/aceOfShadows/` | 144 cards with 3D shadow animation |
| `AceOfShadowsModeCreative` | `modes/aceOfShadows/` | TriPeaks solitaire game |
| `LiteralModeSettingsPanel` | `modes/aceOfShadows/` | Ace of Shadows settings UI |
| `MagicWordsModeLiteral` | `modes/magicWords/` | Visual novel with API avatars |
| `MagicWordsModeCreative` | `modes/magicWords/` | Big Bang Theory characters |
| `MagicWordsSettingsPanel` | `modes/magicWords/` | Magic Words settings UI |
| `PhoenixFlameModeLiteral` | `modes/phoenixFlame/` | Particle fire (max 10 sprites) |
| `PhoenixFlameModeCreative` | `modes/phoenixFlame/` | Phoenix + evolving eggs |
| `PhoenixFlameSettingsPanel` | `modes/phoenixFlame/` | Phoenix Flame settings UI |
| `FlyingParticlePool` | `modes/phoenixFlame/` | Object-pooled particles |
| `LandedSpriteManager` | `modes/phoenixFlame/` | Floor landing animations |
| `EvolvingLandedManager` | `modes/phoenixFlame/` | Click-to-evolve egg system |

### UI Components

| Class | File | Responsibility |
|-------|------|----------------|
| `Button` | `components/Button.ts` | Reusable button with hover |
| `Slider` | `components/Slider.ts` | Value slider, rotation-aware input |
| `Toggle` | `components/Toggle.ts` | Boolean toggle, horizontal layout |
| `Dropdown` | `components/Dropdown.ts` | Dropdown menu, z-order handling |
| `RichText` | `components/RichText.ts` | Text with inline emoji images |
| `SpeechBubble` | `components/SpeechBubble.ts` | 9-slice speech bubble |
| `GameSettingsPanel` | `components/GameSettingsPanel.ts` | Abstract settings panel base |
| `ModeSelectionPanel` | `components/ModeSelectionPanel.ts` | Mode selection UI |

---

## 🔄 Scene Flow

```
┌──────────────────┐   click tile    ┌──────────────────────────┐
│                  │ ──────────────▶│                          │
│    MainMenu      │                 │   Game Scene             │
│    Scene         │                 │   (fullscreen)           │
│                  │ ◀──────────────│                          │
└──────────────────┘   ← Menu btn    └────────────┬─────────────┘
                                                  │
                                                  ▼
                                     ┌────────────────────────┐
                                     │   Mode Selection       │
                                     │   (Literal/Creative)   │
                                     └────────────┬───────────┘
                                                  │
                              ┌───────────────────┼───────────────────┐
                              ▼                                       ▼
                    ┌─────────────────┐                    ┌─────────────────┐
                    │  Literal Mode   │                    │  Creative Mode  │
                    │  (full game)    │                    │  (coming soon)  │
                    └─────────────────┘                    └─────────────────┘
```

---

## 🎨 Design System

Configuration is split across three files for separation of concerns:

### Main Menu UI (`config/design.ts`)

| Constant | Value | Usage |
|----------|-------|-------|
| `DESIGN.padding` | 40px | Menu container padding |
| `DESIGN.tile.width` | 420px | Game thumbnail width |
| `DESIGN.tile.height` | 300px | Game thumbnail height |
| `DESIGN.tile.radius` | 18px | Thumbnail corner radius |
| `BRAND_ORANGE` | `0xF7941D` | Title bar background |
| `ACCENT_ORANGE` | `#FF671D` | Click-to-play accent |

### Responsive Layout (`config/sharedSettings.ts`)

| Constant | Value | Usage |
|----------|-------|-------|
| `SCENE_LAYOUT.phoneBreakpoint` | 500px | Phone detection threshold |
| `SCENE_LAYOUT.largePaddingBreakpoint` | 850px | Desktop padding threshold |
| `SCENE_LAYOUT.screenPaddingPhone` | 24px | Phone screen edge padding |
| `SCENE_LAYOUT.screenPadding` | 200px L/R, 40px T/B | Desktop screen padding |
| `SCENE_LAYOUT.maxScale` | 2.25 | Max responsive scale |

### Auto-Rotation (`BaseGameScene`)

Games can specify a preferred orientation. When the device doesn't match, content auto-rotates:

| Option | Behavior |
|--------|----------|
| `preferredOrientation: 'landscape'` | Rotates content 90° when device is in portrait |
| `preferredOrientation: 'portrait'` | Rotates content 90° when device is in landscape |
| `preferredOrientation: 'any'` | No auto-rotation (default) |

UI elements (back button, FPS counter) remain pinned to physical screen corners.

### Task 1 Config (`config/aceOfShadowsSettings.ts`)

| Category | Settings |
|----------|----------|
| Card Stack | `totalCards: 144`, `scale: 0.5`, `stackOffset: 0.5` |
| Animation | `interval: 1s`, `duration: 2s`, `motionBlur: 0-10` |
| Spiral Mode | `arcHeightA: 80`, `arcHeightB: 120` |
| Shadow | `offsetX: 3`, `offsetY: 3`, `alpha: 0.35` |
| Panel UI | Cell widths, padding, row positions |

### Task 2 Config (`config/magicWordsSettings.ts`)

| Category | Settings |
|----------|----------|
| API | `API_URL` for dialogue data |
| Bubble | `bgColor`, `borderColor`, `radius`, `padding`, `height` |
| Name Badge | `fontSize`, `speakerColors` map, `marginX/Y` |
| Avatar | `size: 500`, `minSize: 200`, `maxSize: 500`, `yOffset` |
| Dialog Box | `width: 800`, `minWidth: 500`, `maxWidth: 1100` |
| Presets | `A` (default), `B` (compact) with `label` |
| Panel UI | `sliderWidth`, `paddingX`, `gap`, `topOffset` |
| Persistence | `getPreservedSettings()`, `saveSettings()` |

### Task 3 Config (`config/phoenixFlameSettings.ts`)

| Category | Settings |
|----------|----------|
| Sprite Budget | `max: 10`, `flames: 1`, `flying: 6`, `landed: 3` |
| Flame Animation | `animationSpeed: 0.15`, `scale: 1.10`, `anchor: (0.5, 1.0)` |
| Particles | `maxFlyingParticles: 6`, `maxLandedSprites: 3`, `spawnRate: 3` |
| Physics | `speed: 280`, `speedVariation: 80`, `gravity: 800` |
| Trajectory | `angleSpread: 150°`, `lifetime: 2.5s` |
| Landing | `landingPause: 0.3s`, `shrinkDuration: 400ms` |
| Scaling | `initialScale: 0.05`, `peakScale: 0.2` |

---

## 🛠️ How It Was Made

### Card Assets
Cards from [Ultimate Minimalist Card Asset Set](https://oxxonpic.itch.io/ultimate-minimalist-card-asset-set)

### Tools Used

**Sprite Splitter** - [Spriters Resource Tool](https://tools.spriters-resource.com/#sprite-splitter)
![Spriters resource tool](screenshots/spriters-resource-tool.png)

**Spritesheet Packer** - [Free Texture Packer](https://free-tex-packer.com/app/)
![Free texture packer](screenshots/free-texture-packer.png)

https://visualgpt.io/background-remover

![bg-ai-remover](screenshots/bg-ai-remover.png)
---

## 📄 License

MIT License

Copyright 2025 JAVIER MORENO

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
