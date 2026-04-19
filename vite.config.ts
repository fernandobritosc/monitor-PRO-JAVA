
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
        includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png', 'robots.txt', 'apple-touch-icon.png'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 ano
                }
              }
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'supabase-data',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 // 24 horas
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        manifest: {
          name: 'MonitorPro AI - Estudo Inteligente',
          short_name: 'MonitorPro',
          description: 'Seu copiloto de estudos avançado com IA e analytics.',
          theme_color: '#0B0E14',
          background_color: '#0B0E14',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          categories: ['education', 'productivity', 'utilities'],
          shortcuts: [
            {
              name: 'Registrar Estudo',
              short_name: 'Estudar',
              description: 'Registrar novo tempo de estudo ou questões',
              url: '/registrar',
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
            },
            {
              name: 'Ver Dashboard',
              short_name: 'Dashboard',
              description: 'Analisar meu progresso e estatísticas',
              url: '/dashboard',
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
            }
          ],
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
      // Em produção, remove TODOS os console.* e debugger do bundle final
      // O logger centralizado já captura tudo em sessionStorage
      ...(mode === 'production' ? { minify: 'esbuild' } : {}),
    },
    esbuild: {
      // Remove console.* e debugger em produção
      ...(mode === 'production' ? { drop: ['console', 'debugger'] } : {}),
    }
  }
})
