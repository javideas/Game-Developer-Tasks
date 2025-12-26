# SOFTGAMES - Game Developer Assignment by Javier Moreno

A unified PixiJS application featuring three interactive demos, built as a technical assessment for the Senior HTML5 Game Developer position at SOFTGAMES.

## 🎮 Live Demo

👉 **[Play the Demo](https://javideas.github.io/softgames-assignment/)** *(coming soon)*

---

## 🕹️ The Three Tasks

| # | Name | Description |
|---|------|-------------|
| 1 | **Ace of Shadows** | 144 animated cards moving between two stacks |
| 2 | **Magic Words** | Text + emoji rendering system with API integration |
| 3 | **Phoenix Flame** | Particle-based fire effect (max 10 sprites) |

All tasks are accessible via an in-game menu with FPS counter.

---
v
## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| PixiJS | v7.4.2 | WebGL 2D rendering |
| TypeScript | 5.6 | Type-safe code |
| GSAP | 3.12 | Smooth animations |
| Vite | 5.4 | Build tool |

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/javideas/Game-Developer-Tasks.git
cd Game-Developer-Tasks

# Navigate to game folder and install
cd game
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📁 Project Structure

```
├── game/                   # PixiJS application
│   ├── src/
│   │   ├── core/           # App framework (SceneManager, FPS)
│   │   ├── scenes/         # Menu + 3 task scenes
│   │   ├── components/     # Reusable game components
│   │   └── assets/         # Sprites, fonts
│   └── package.json
├── docs/                   # Documentation
└── README.md
```

---

## 📖 Documentation

See the [`docs/`](./docs/) folder for:
- Architecture decisions
- Component documentation
- Performance notes

---

## 👤 Author

**Javier Moreno**

---

## 📄 License

This project was created as part of a job application technical assessment.

