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
