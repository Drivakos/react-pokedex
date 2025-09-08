import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin, ViteDevServer } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

const addXRobotsTagHeader = (): Plugin => {
  return {
    name: 'add-x-robots-tag-header',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((_, res, next) => {
        res.setHeader('X-Robots-Tag', 'index, follow');
        next();
      });
    },
    configurePreviewServer(server: any) {
      server.middlewares.use((_: any, res: any, next: () => void) => {
        res.setHeader('X-Robots-Tag', 'index, follow');
        next();
      });
    },
  };
};
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  // For local development, we use unsafe-inline for styles and scripts
  // Production CSP is handled by netlify.toml

  return {
  plugins: [
    react(),
    addXRobotsTagHeader(),
    // Add bundle analyzer in analyze mode
    mode === 'analyze' && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    sourcemap: mode !== 'production',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    port: 64444,
    strictPort: true,
    proxy: {
      // Proxy external API requests to avoid CORS issues in development
      '/api/pokeapi': {
        target: 'https://pokeapi.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pokeapi/, '/api/v2'),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/api/pokemontcg': {
        target: 'https://api.pokemontcg.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pokemontcg/, '/v2'),
        headers: {
          'X-Api-Key': env.VITE_POKEMON_TCG_API_KEY || '',
        },
      },
    },
    headers: {
      'X-Robots-Tag': 'index, follow',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // Temporarily disable CSP for development testing
      // 'Content-Security-Policy': "default-src 'self'; connect-src 'self' http://localhost:* https://localhost:* https://kefcxvcbpadksfizrckw.supabase.co https://pokeapi.co https://beta.pokeapi.co https://api.pokemontcg.io https://*.supabase.co https://*.google.com https://*.googleapis.com; img-src 'self' https://raw.githubusercontent.com https://images.pokemontcg.io https://*.googleusercontent.com data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src 'self' http://localhost:* https://localhost:* https://*.supabase.co https://*.google.com;",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
    headers: {
      'X-Robots-Tag': 'index, follow',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // Temporarily disable CSP for development testing
      // 'Content-Security-Policy': "default-src 'self'; connect-src 'self' http://localhost:* https://localhost:* https://kefcxvcbpadksfizrckw.supabase.co https://pokeapi.co https://beta.pokeapi.co https://api.pokemontcg.io https://*.supabase.co https://*.google.com https://*.googleapis.com; img-src 'self' https://raw.githubusercontent.com https://images.pokemontcg.io https://*.googleusercontent.com data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src 'self' http://localhost:* https://localhost:* https://*.supabase.co https://*.google.com;",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
  },
};
});
