import { defineConfig } from 'vite';
export default defineConfig({
  base: '/cat-wizard/',
  build: { target: 'es2022', outDir: 'dist', assetsDir: 'assets', sourcemap: false, emptyOutDir: true },
  server: { host: '0.0.0.0', port: 5173 }
});
