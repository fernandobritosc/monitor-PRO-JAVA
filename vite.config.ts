
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  const timestamp = new Date().getTime();

  return {
    resolve: {
      alias: {
        'dompurify': 'dompurify/dist/purify.js'
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000 // Aumentado para 5MB para suportar o bundle de vendor
        },
        manifest: {
          name: 'MonitorPro AI',
          short_name: 'MonitorPro',
          description: 'AI-Powered Study Assistant',
          theme_color: '#0B0E14',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      '__SUPABASE_URL__': JSON.stringify(env.VITE_SUPABASE_URL || ""),
      '__SUPABASE_KEY__': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ""),
      // Injeta a chave API tentando várias fontes comuns
      'process.env.API_KEY': JSON.stringify(
        env.API_KEY ||
        env.VITE_GOOGLE_API_KEY ||
        env.GOOGLE_API_KEY ||
        env.VITE_GEMINI_API_KEY ||
        ""
      ),
      '__BUILD_TIMESTAMP__': JSON.stringify(timestamp),
      '__APP_VERSION__': JSON.stringify(pkg.version || '1.0.0'),
    },
    build: {
      rollupOptions: {
        // IMPORTANTE: Marca @google/genai como externo para usar o CDN do index.html
        external: ['@google/genai'],
        output: {
          entryFileNames: `assets/[name]-${timestamp}.js`,
          chunkFileNames: `assets/[name]-${timestamp}.js`,
          assetFileNames: `assets/[name]-${timestamp}.[ext]`,
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Se @google/genai estiver instalado, separa, mas o external acima tem prioridade
              if (id.includes('@google')) return 'vendor-ai';
              return 'vendor';
            }
          }
        }
      }
    }
  }
})
