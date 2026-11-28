import { defineConfig } from 'vite';

// GitHub Pages serves the game from /cat-wizard/, while Vercel previews
// serve it from the domain root. Keep both deployment targets working.
const base = process.env.VERCEL ? '/' : '/cat-wizard/';

export default defineConfig({
  base,
  build: { target: 'es2022', outDir: 'dist', assetsDir: 'assets', sourcemap: false, emptyOutDir: true },
  server: { host: '0.0.0.0', port: 5173 }
});
