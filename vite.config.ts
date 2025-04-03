import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin, ViteDevServer } from 'vite';

const addXRobotsTagHeader = (): Plugin => {
  return {
    name: 'add-x-robots-tag-header',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        res.setHeader('X-Robots-Tag', 'index, follow');
        next();
      });
    },
    configurePreviewServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        res.setHeader('X-Robots-Tag', 'index, follow');
        next();
      });
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), addXRobotsTagHeader()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    headers: {
      'X-Robots-Tag': 'index, follow',
    },
  },
});
