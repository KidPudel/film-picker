import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' + hash routing → the build works from any GitHub Pages sub-path
// (https://<user>.github.io/<repo>/) without knowing the repo name.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173 },
});
