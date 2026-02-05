
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  const timestamp = new Date().getTime();

  return {
    plugins: [react()],
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
        output: {
          entryFileNames: `assets/[name]-${timestamp}.js`,
          chunkFileNames: `assets/[name]-${timestamp}.js`,
          assetFileNames: `assets/[name]-${timestamp}.[ext]`,
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@google')) return 'vendor-ai';
              return 'vendor'; 
            }
          }
        }
      }
    }
  }
})
