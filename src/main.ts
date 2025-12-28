/**
 * BESTGAMES - Game Developer Tasks
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
import { AceOfShadowsScene } from './scenes/AceOfShadowsScene';
import { MagicWordsScene } from './scenes/MagicWordsScene';
import { PhoenixFlameScene } from './scenes/PhoenixFlameScene';

// Initialize application
const app = new Application();

/**
 * Navigate to the main menu
 */
function goToMainMenu(): void {
  const mainMenu = new MainMenuScene(app, {
    onGameSelect: (key) => {
      switch (key) {
        case 'ace':
          app.scenes.start(new AceOfShadowsScene(app, goToMainMenu));
          break;
        case 'magic':
          app.scenes.start(new MagicWordsScene(app, goToMainMenu));
          break;
        case 'phoenix':
          app.scenes.start(new PhoenixFlameScene(app, goToMainMenu));
          break;
      }
    },
  });
  app.scenes.start(mainMenu);
}

// Start with main menu
goToMainMenu();

console.log('BESTGAMES - Game Developer Tasks initialized');

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
