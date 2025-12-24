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
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (_proxyReq, _req, _res) => {
            console.log('Sending Request to the Target:', _req.method, _req.url);
          });
          proxy.on('proxyRes', (proxyRes, _req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, _req.url);
          });
        },
      },
      // Proxy GraphQL requests to avoid CORS issues in development
      '/api/graphql': {
        target: 'https://beta.pokeapi.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/graphql/, '/graphql/v1beta'),
      },
      '/api/pokemontcg': {
        target: 'https://api.pokemontcg.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pokemontcg/, '/v2'),
        headers: {
          'X-Api-Key': env.VITE_POKEMONTCG_API_KEY || '',
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('❌ Pokemon TCG API proxy error:', err.message);
          });
          proxy.on('proxyReq', (_proxyReq, _req, _res) => {
            console.log('🎴 Proxying Pokemon TCG request:', _req.url);
          });
          proxy.on('proxyRes', (proxyRes, _req, _res) => {
            console.log('📦 Pokemon TCG response:', proxyRes.statusCode);
          });
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
    // Use proxy endpoint in development to avoid CORS issues
    'import.meta.env.VITE_API_GRAPHQL_URL': JSON.stringify(
      mode === 'development' ? 'http://localhost:64444/api/graphql' : env.VITE_API_GRAPHQL_URL
    ),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
    // Define process.env for browser compatibility with Upstash Redis
    'process.env': JSON.stringify({}),
    'global': 'globalThis',
  },
};
});
