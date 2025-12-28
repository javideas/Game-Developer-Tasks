/**
 * Game Developer Tasks - Entry Point
 * 
 * A unified PixiJS application showcasing 3 interactive demos:
 * 1. Ace of Shadows - Card stack animation
 * 2. Magic Words - Text + emoji system
 * 3. Phoenix Flame - Particle fire effect
 * 
 * @author Javier Moreno
 */

import './style.css';
import { Application } from './core';
import { MainMenuScene } from './scenes/MainMenuScene';

// Initialize application
const app = new Application();

// Start with main menu
const mainMenu = new MainMenuScene(app, {
  onGameSelect: (key) => {
    console.log(`Starting game: ${key}`);
    // TODO: Switch to game scene based on key
    // app.scenes.start(new AceOfShadowsScene(app));
    // app.scenes.start(new MagicWordsScene(app));
    // app.scenes.start(new PhoenixFlameScene(app));
  },
});

app.scenes.start(mainMenu);

console.log('Game Developer Tasks initialized');

/**
 * Vite HMR (Hot Module Replacement) Cleanup
 * 
 * During development, Vite hot-reloads modules on file save. Without proper
 * cleanup, the old PixiJS application remains in memory, causing:
 * - WebGL context accumulation (browsers limit active contexts)
 * - "WebGL context was lost" errors
 * - Memory leaks from orphaned event listeners
 * 
 * This disposal handler destroys the previous app instance before the new
 * module loads. The `import.meta.hot` check ensures this code is tree-shaken
 * from production builds.
 */
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    app.destroy();
  });
}
