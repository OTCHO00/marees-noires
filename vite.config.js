import { defineConfig } from 'vite';

// Trois pages : le jeu (index.html), la scène d'essai du rendu 3D (demo.html)
// et les essais de mer (eau.html).
export default defineConfig({
  build: {
    rollupOptions: {
      input: { main: 'index.html', demo: 'demo.html', eau: 'eau.html' },
    },
  },
});
