import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

declare const process: { env: Record<string, string | undefined> };

// base: './' + hash routing → the build works from any GitHub Pages sub-path
// (https://<user>.github.io/<repo>/) without knowing the repo name.
export default defineConfig({
  base: './',
  plugins: [react()],
  // PORT lets a preview tool assign a free port; 5173 otherwise.
  server: { port: Number(process.env.PORT) || 5173 },
});
