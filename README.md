# BESTGAMES - Game Developer Tasks

A unified PixiJS application featuring three interactive demos, built as a technical assessment for Senior HTML5 Game Developer.

**Author:** Javier Moreno

## 🎮 Live Demo

👉 **[Play the Demo](https://javideas.github.io/Game-Developer-Tasks/)** *(coming soon)*

---

## 🕹️ The Three Tasks

| # |       Name         |                 Description                        |
|---|--------------------|----------------------------------------------------|
| 1 | **Ace of Shadows** | 144 animated cards moving between two stacks       |
| 2 | **Magic Words**    | Text + emoji rendering system with API integration |
| 3 | **Phoenix Flame**  | Particle-based fire effect (max 10 sprites)        |

All tasks are accessible via an in-game menu with FPS counter.

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
├── main.ts                      # Entry point (~30 lines)
├── style.css                    # Global styles (fullscreen canvas, FPS counter)
│
├── config/
│   └── design.ts                # Design constants (dimensions, colors, spacing)
│
├── core/
│   ├── index.ts                 # Barrel exports
│   ├── Application.ts           # PixiJS wrapper, resize handling
│   ├── SceneManager.ts          # Scene lifecycle (start, stop, update)
│   └── FPSCounter.ts            # FPS display (HTML overlay)
│
├── components/
│   └── MenuTile.ts              # Game thumbnail tile with hover overlay
│
├── scenes/
│   ├── MainMenuScene.ts         # Main menu with game tiles
│   ├── AceOfShadowsScene.ts     # Task 1 (TODO)
│   ├── MagicWordsScene.ts       # Task 2 (TODO)
│   └── PhoenixFlameScene.ts     # Task 3 (TODO)
│
└── assets/
    ├── fonts/
    └── sprites/
        └── thumbnails/          # Game preview images
```

---

## 🏗️ Logic Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         main.ts                                │
│                      (Entry Point)                             │
│                            │                                   │
│                            ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Application                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │ PixiJS App  │  │ FPSCounter  │  │  SceneManager   │  │   │
│  │  │  (canvas)   │  │ (HTML DOM)  │  │  (lifecycle)    │  │   │
│  │  └─────────────┘  └─────────────┘  └────────┬────────┘  │   │
│  └─────────────────────────────────────────────┼───────────┘   │
│                                                │               │
│                                                ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Scene Interface                      │   │
│  │  • container: Container                                 │   │
│  │  • onStart(): void                                      │   │
│  │  • onStop(): void                                       │   │
│  │  • onResize(): void                                     │   │
│  │  • onUpdate(delta): void                                │   │
│  │  • destroy(): void                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│         ┌──────────────┬──────────────┬──────────────┐         │
│         ▼              ▼              ▼              ▼         │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ MainMenu   │ │ AceOf      │ │ Magic      │ │ Phoenix    │   │
│  │ Scene      │ │ Shadows    │ │ Words      │ │ Flame      │   │
│  │            │ │ Scene      │ │ Scene      │ │ Scene      │   │
│  └──────┬─────┘ └────────────┘ └────────────┘ └────────────┘   │
│         │                                                      │
│         ▼                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Components                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │  MenuTile   │  │   Button    │  │  (future...)    │  │   │
│  │  │  (hover,    │  │             │  │                 │  │   │
│  │  │   click)    │  │             │  │                 │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   config/design.ts                      │   │
│  │  • DESIGN constants (padding, tile size, fonts)         │   │
│  │  • BRAND_ORANGE (0xF7941D)                              │   │
│  │  • ACCENT_ORANGE (#FF671D)                              │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Scene Flow

```
┌──────────────┐    onGameSelect()    ┌──────────────────┐
│   MainMenu   │ ──────────────────▶ │    Game Scene    │
│    Scene     │                      │   (Ace/Magic/    │
│              │◀──────────────────  │     Phoenix)     │
└──────────────┘    Back to Menu      └──────────────────┘
```

---

## 📦 Key Classes

| Class | File | Responsibility |
|-------|------|----------------|
| `Application` | `core/Application.ts` | PixiJS init, resize, FPS, scenes |
| `SceneManager` | `core/SceneManager.ts` | Scene lifecycle management |
| `FPSCounter` | `core/FPSCounter.ts` | FPS display as HTML overlay |
| `MainMenuScene` | `scenes/MainMenuScene.ts` | Menu UI with game tiles |
| `MenuTile` | `components/MenuTile.ts` | Clickable thumbnail with hover |

---

## 📐 Design System

All UI dimensions are defined in `src/config/design.ts`:

| Constant | Value | Usage |
|----------|-------|-------|
| `DESIGN.padding` | 40px | Screen edge padding |
| `DESIGN.tile.width` | 420px | Thumbnail width |
| `DESIGN.tile.height` | 300px | Thumbnail height |
| `DESIGN.tile.radius` | 18px | Corner rounding |
| `BRAND_ORANGE` | `0xF7941D` | Title bar background |
| `ACCENT_ORANGE` | `#FF671D` | Click-to-play text/icon |

---

## 📄 License

MIT License

Copyright 2025 JAVIER MORENO

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
