import { defineConfig } from 'vite';

// Deux pages : le jeu (index.html) et la scène d'essai du rendu 3D (demo.html).
export default defineConfig({
  build: {
    rollupOptions: {
      input: { main: 'index.html', demo: 'demo.html' },
    },
  },
});
