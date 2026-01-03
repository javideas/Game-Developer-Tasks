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

// Initialize application
const app = new Application();

/**
 * Navigate to a specific game scene (lazy-loaded).
 * Each scene is loaded only when the user navigates to it,
 * enabling code splitting and reducing initial bundle size.
 */
async function goToGame(key: 'ace' | 'magic' | 'phoenix'): Promise<void> {
  switch (key) {
    case 'ace': {
      const { AceOfShadowsScene } = await import('./scenes/AceOfShadowsScene');
      await app.scenes.start(new AceOfShadowsScene(app, goToMainMenu));
      break;
    }
    case 'magic': {
      const { MagicWordsScene } = await import('./scenes/MagicWordsScene');
      await app.scenes.start(new MagicWordsScene(app, goToMainMenu));
      break;
    }
    case 'phoenix': {
      const { PhoenixFlameScene } = await import('./scenes/PhoenixFlameScene');
      await app.scenes.start(new PhoenixFlameScene(app, goToMainMenu));
      break;
    }
  }
}

/**
 * Navigate to the main menu
 */
function goToMainMenu(): void {
  const mainMenu = new MainMenuScene(app, {
    onGameSelect: key => {
      goToGame(key as 'ace' | 'magic' | 'phoenix');
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
