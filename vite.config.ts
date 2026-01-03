import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: [
      'pixi.js',
      '@pixi/core',
      '@pixi/display', 
      '@pixi/settings',
      '@pixi/events',
      '@pixi/graphics',
      '@pixi/mesh',
      '@pixi/text',
      '@pixi/assets',
      '@pixi/sprite',
      '@pixi/utils',
      '@esotericsoftware/spine-pixi-v7',
      '@esotericsoftware/spine-core',
    ],
  },
});

