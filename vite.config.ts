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
      'Content-Security-Policy': "default-src 'self'; connect-src 'self' http://localhost:* https://localhost:* https://kefcxvcbpadksfizrckw.supabase.co https://pokeapi.co https://beta.pokeapi.co https://api.pokemontcg.io https://*.supabase.co https://*.google.com https://*.googleapis.com; img-src 'self' https://raw.githubusercontent.com https://images.pokemontcg.io https://*.googleusercontent.com data:; style-src 'self' 'sha256-Nqnn8clbgv+5l0PgxcTOldg8mkMKrFn4TvPL+rYUUGg=' 'sha256-13vrThxdyT64GcXoTNGVoRRoL0a7EGBmOJ+lemEWyws=' 'sha256-QZ52fjvWgIOIOPr+gRIJZ7KjzNeTBm50Z+z9dH4N1/8=' 'sha256-yOU6eaJ75xfag0gVFUvld5ipLRGUy94G17B1uL683EU=' 'sha256-OpTmykz0m3o5HoX53cykwPhUeU4OECxHQlKXpB0QJPQ=' 'sha256-SSIM0kI/u45y4gqkri9aH+la6wn2R+xtcBj3Lzh7qQo=' 'sha256-ZH/+PJIjvP1BctwYxclIuiMu1wItb0aasjpXYXOmU0Y=' 'sha256-58jqDtherY9NOM+ziRgSqQY0078tAZ+qtTBjMgbM9po=' 'sha256-7Ri/I+PfhgtpcL7hT4A0VJKI6g3pK0ZvIN09RQV4ZhI=' 'sha256-uEvq29Gia+5yISklLH7mdEEjErdiBONR1Jd+xZ6k+3E=' 'sha256-O+dNMIawgFeaXkzGkCpSH4HBc/bMAuZg/3E7NFwYHyA='; script-src 'self' 'sha256-Z2/iFzh9VMlVkEOar1f/oSHWwQk3ve1qk/C2WdsC4Xk='; font-src 'self' data:; frame-src 'self' http://localhost:* https://localhost:* https://*.supabase.co https://*.google.com;",
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
      'Content-Security-Policy': "default-src 'self'; connect-src 'self' http://localhost:* https://localhost:* https://kefcxvcbpadksfizrckw.supabase.co https://pokeapi.co https://beta.pokeapi.co https://api.pokemontcg.io https://*.supabase.co https://*.google.com https://*.googleapis.com; img-src 'self' https://raw.githubusercontent.com https://images.pokemontcg.io https://*.googleusercontent.com data:; style-src 'self' 'sha256-Nqnn8clbgv+5l0PgxcTOldg8mkMKrFn4TvPL+rYUUGg=' 'sha256-13vrThxdyT64GcXoTNGVoRRoL0a7EGBmOJ+lemEWyws=' 'sha256-QZ52fjvWgIOIOPr+gRIJZ7KjzNeTBm50Z+z9dH4N1/8=' 'sha256-yOU6eaJ75xfag0gVFUvld5ipLRGUy94G17B1uL683EU=' 'sha256-OpTmykz0m3o5HoX53cykwPhUeU4OECxHQlKXpB0QJPQ=' 'sha256-SSIM0kI/u45y4gqkri9aH+la6wn2R+xtcBj3Lzh7qQo=' 'sha256-ZH/+PJIjvP1BctwYxclIuiMu1wItb0aasjpXYXOmU0Y=' 'sha256-58jqDtherY9NOM+ziRgSqQY0078tAZ+qtTBjMgbM9po=' 'sha256-7Ri/I+PfhgtpcL7hT4A0VJKI6g3pK0ZvIN09RQV4ZhI=' 'sha256-uEvq29Gia+5yISklLH7mdEEjErdiBONR1Jd+xZ6k+3E=' 'sha256-O+dNMIawgFeaXkzGkCpSH4HBc/bMAuZg/3E7NFwYHyA='; script-src 'self' 'sha256-Z2/iFzh9VMlVkEOar1f/oSHWwQk3ve1qk/C2WdsC4Xk='; font-src 'self' data:; frame-src 'self' http://localhost:* https://localhost:* https://*.supabase.co https://*.google.com;",
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
