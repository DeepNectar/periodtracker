import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vercel serves the contents of "dist" as static files.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
});
