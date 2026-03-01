// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/Users/uniao/OneDrive/Desktop/Projetos/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/uniao/OneDrive/Desktop/Projetos/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///C:/Users/uniao/OneDrive/Desktop/Projetos/node_modules/vite-plugin-pwa/dist/index.js";
import { createRequire } from "module";
var __vite_injected_original_import_meta_url = "file:///C:/Users/uniao/OneDrive/Desktop/Projetos/vite.config.ts";
var require2 = createRequire(__vite_injected_original_import_meta_url);
var pkg = require2("./package.json");
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const timestamp = (/* @__PURE__ */ new Date()).getTime();
  return {
    resolve: {
      alias: {
        "dompurify": "dompurify/dist/purify.es.mjs"
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "pwa-192x192.png", "pwa-512x512.png"],
        manifest: {
          name: "MonitorPro AI",
          short_name: "MonitorPro",
          description: "AI-Powered Study Assistant",
          theme_color: "#0B0E14",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png"
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
            }
          ]
        }
      })
    ],
    define: {
      "__SUPABASE_URL__": JSON.stringify(env.VITE_SUPABASE_URL || ""),
      "__SUPABASE_KEY__": JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ""),
      // Injeta a chave API tentando várias fontes comuns
      "process.env.API_KEY": JSON.stringify(
        env.API_KEY || env.VITE_GOOGLE_API_KEY || env.GOOGLE_API_KEY || env.VITE_GEMINI_API_KEY || ""
      ),
      "__BUILD_TIMESTAMP__": JSON.stringify(timestamp),
      "__APP_VERSION__": JSON.stringify(pkg.version || "1.0.0")
    },
    build: {
      rollupOptions: {
        // IMPORTANTE: Marca @google/genai como externo para usar o CDN do index.html
        external: ["@google/genai"],
        output: {
          entryFileNames: `assets/[name]-${timestamp}.js`,
          chunkFileNames: `assets/[name]-${timestamp}.js`,
          assetFileNames: `assets/[name]-${timestamp}.[ext]`,
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("@google")) return "vendor-ai";
              return "vendor";
            }
          }
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx1bmlhb1xcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXFByb2pldG9zXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx1bmlhb1xcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXFByb2pldG9zXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy91bmlhby9PbmVEcml2ZS9EZXNrdG9wL1Byb2pldG9zL3ZpdGUuY29uZmlnLnRzXCI7XHJcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgbG9hZEVudiB9IGZyb20gJ3ZpdGUnXHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSdcclxuaW1wb3J0IHsgY3JlYXRlUmVxdWlyZSB9IGZyb20gJ21vZHVsZSc7XHJcblxyXG5jb25zdCByZXF1aXJlID0gY3JlYXRlUmVxdWlyZShpbXBvcnQubWV0YS51cmwpO1xyXG5jb25zdCBwa2cgPSByZXF1aXJlKCcuL3BhY2thZ2UuanNvbicpO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xyXG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgKHByb2Nlc3MgYXMgYW55KS5jd2QoKSwgJycpO1xyXG4gIGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgcmVzb2x2ZToge1xyXG4gICAgICBhbGlhczoge1xyXG4gICAgICAgICdkb21wdXJpZnknOiAnZG9tcHVyaWZ5L2Rpc3QvcHVyaWZ5LmVzLm1qcydcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgcmVhY3QoKSxcclxuICAgICAgVml0ZVBXQSh7XHJcbiAgICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXHJcbiAgICAgICAgaW5jbHVkZUFzc2V0czogWydmYXZpY29uLmljbycsICdwd2EtMTkyeDE5Mi5wbmcnLCAncHdhLTUxMng1MTIucG5nJ10sXHJcbiAgICAgICAgbWFuaWZlc3Q6IHtcclxuICAgICAgICAgIG5hbWU6ICdNb25pdG9yUHJvIEFJJyxcclxuICAgICAgICAgIHNob3J0X25hbWU6ICdNb25pdG9yUHJvJyxcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQUktUG93ZXJlZCBTdHVkeSBBc3Npc3RhbnQnLFxyXG4gICAgICAgICAgdGhlbWVfY29sb3I6ICcjMEIwRTE0JyxcclxuICAgICAgICAgIGljb25zOiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzcmM6ICdwd2EtMTkyeDE5Mi5wbmcnLFxyXG4gICAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXHJcbiAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZydcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHNyYzogJ3B3YS01MTJ4NTEyLnBuZycsXHJcbiAgICAgICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcclxuICAgICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgc3JjOiAncHdhLTUxMng1MTIucG5nJyxcclxuICAgICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxyXG4gICAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxyXG4gICAgICAgICAgICAgIHB1cnBvc2U6ICdhbnkgbWFza2FibGUnXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIF1cclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICBdLFxyXG4gICAgZGVmaW5lOiB7XHJcbiAgICAgICdfX1NVUEFCQVNFX1VSTF9fJzogSlNPTi5zdHJpbmdpZnkoZW52LlZJVEVfU1VQQUJBU0VfVVJMIHx8IFwiXCIpLFxyXG4gICAgICAnX19TVVBBQkFTRV9LRVlfXyc6IEpTT04uc3RyaW5naWZ5KGVudi5WSVRFX1NVUEFCQVNFX0FOT05fS0VZIHx8IFwiXCIpLFxyXG4gICAgICAvLyBJbmpldGEgYSBjaGF2ZSBBUEkgdGVudGFuZG8gdlx1MDBFMXJpYXMgZm9udGVzIGNvbXVuc1xyXG4gICAgICAncHJvY2Vzcy5lbnYuQVBJX0tFWSc6IEpTT04uc3RyaW5naWZ5KFxyXG4gICAgICAgIGVudi5BUElfS0VZIHx8XHJcbiAgICAgICAgZW52LlZJVEVfR09PR0xFX0FQSV9LRVkgfHxcclxuICAgICAgICBlbnYuR09PR0xFX0FQSV9LRVkgfHxcclxuICAgICAgICBlbnYuVklURV9HRU1JTklfQVBJX0tFWSB8fFxyXG4gICAgICAgIFwiXCJcclxuICAgICAgKSxcclxuICAgICAgJ19fQlVJTERfVElNRVNUQU1QX18nOiBKU09OLnN0cmluZ2lmeSh0aW1lc3RhbXApLFxyXG4gICAgICAnX19BUFBfVkVSU0lPTl9fJzogSlNPTi5zdHJpbmdpZnkocGtnLnZlcnNpb24gfHwgJzEuMC4wJyksXHJcbiAgICB9LFxyXG4gICAgYnVpbGQ6IHtcclxuICAgICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICAgIC8vIElNUE9SVEFOVEU6IE1hcmNhIEBnb29nbGUvZ2VuYWkgY29tbyBleHRlcm5vIHBhcmEgdXNhciBvIENETiBkbyBpbmRleC5odG1sXHJcbiAgICAgICAgZXh0ZXJuYWw6IFsnQGdvb2dsZS9nZW5haSddLFxyXG4gICAgICAgIG91dHB1dDoge1xyXG4gICAgICAgICAgZW50cnlGaWxlTmFtZXM6IGBhc3NldHMvW25hbWVdLSR7dGltZXN0YW1wfS5qc2AsXHJcbiAgICAgICAgICBjaHVua0ZpbGVOYW1lczogYGFzc2V0cy9bbmFtZV0tJHt0aW1lc3RhbXB9LmpzYCxcclxuICAgICAgICAgIGFzc2V0RmlsZU5hbWVzOiBgYXNzZXRzL1tuYW1lXS0ke3RpbWVzdGFtcH0uW2V4dF1gLFxyXG4gICAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XHJcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHtcclxuICAgICAgICAgICAgICAvLyBTZSBAZ29vZ2xlL2dlbmFpIGVzdGl2ZXIgaW5zdGFsYWRvLCBzZXBhcmEsIG1hcyBvIGV4dGVybmFsIGFjaW1hIHRlbSBwcmlvcmlkYWRlXHJcbiAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdAZ29vZ2xlJykpIHJldHVybiAndmVuZG9yLWFpJztcclxuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvcic7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn0pXHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxTQUFTLGNBQWMsZUFBZTtBQUN0QyxPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBQ3hCLFNBQVMscUJBQXFCO0FBSnFLLElBQU0sMkNBQTJDO0FBTXBQLElBQU1BLFdBQVUsY0FBYyx3Q0FBZTtBQUM3QyxJQUFNLE1BQU1BLFNBQVEsZ0JBQWdCO0FBR3BDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBQ3hDLFFBQU0sTUFBTSxRQUFRLE1BQU8sUUFBZ0IsSUFBSSxHQUFHLEVBQUU7QUFDcEQsUUFBTSxhQUFZLG9CQUFJLEtBQUssR0FBRSxRQUFRO0FBRXJDLFNBQU87QUFBQSxJQUNMLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLGFBQWE7QUFBQSxNQUNmO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFFBQ2QsZUFBZSxDQUFDLGVBQWUsbUJBQW1CLGlCQUFpQjtBQUFBLFFBQ25FLFVBQVU7QUFBQSxVQUNSLE1BQU07QUFBQSxVQUNOLFlBQVk7QUFBQSxVQUNaLGFBQWE7QUFBQSxVQUNiLGFBQWE7QUFBQSxVQUNiLE9BQU87QUFBQSxZQUNMO0FBQUEsY0FDRSxLQUFLO0FBQUEsY0FDTCxPQUFPO0FBQUEsY0FDUCxNQUFNO0FBQUEsWUFDUjtBQUFBLFlBQ0E7QUFBQSxjQUNFLEtBQUs7QUFBQSxjQUNMLE9BQU87QUFBQSxjQUNQLE1BQU07QUFBQSxZQUNSO0FBQUEsWUFDQTtBQUFBLGNBQ0UsS0FBSztBQUFBLGNBQ0wsT0FBTztBQUFBLGNBQ1AsTUFBTTtBQUFBLGNBQ04sU0FBUztBQUFBLFlBQ1g7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLE1BQ0YsQ0FBQztBQUFBLElBQ0g7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOLG9CQUFvQixLQUFLLFVBQVUsSUFBSSxxQkFBcUIsRUFBRTtBQUFBLE1BQzlELG9CQUFvQixLQUFLLFVBQVUsSUFBSSwwQkFBMEIsRUFBRTtBQUFBO0FBQUEsTUFFbkUsdUJBQXVCLEtBQUs7QUFBQSxRQUMxQixJQUFJLFdBQ0osSUFBSSx1QkFDSixJQUFJLGtCQUNKLElBQUksdUJBQ0o7QUFBQSxNQUNGO0FBQUEsTUFDQSx1QkFBdUIsS0FBSyxVQUFVLFNBQVM7QUFBQSxNQUMvQyxtQkFBbUIsS0FBSyxVQUFVLElBQUksV0FBVyxPQUFPO0FBQUEsSUFDMUQ7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLGVBQWU7QUFBQTtBQUFBLFFBRWIsVUFBVSxDQUFDLGVBQWU7QUFBQSxRQUMxQixRQUFRO0FBQUEsVUFDTixnQkFBZ0IsaUJBQWlCLFNBQVM7QUFBQSxVQUMxQyxnQkFBZ0IsaUJBQWlCLFNBQVM7QUFBQSxVQUMxQyxnQkFBZ0IsaUJBQWlCLFNBQVM7QUFBQSxVQUMxQyxhQUFhLElBQUk7QUFDZixnQkFBSSxHQUFHLFNBQVMsY0FBYyxHQUFHO0FBRS9CLGtCQUFJLEdBQUcsU0FBUyxTQUFTLEVBQUcsUUFBTztBQUNuQyxxQkFBTztBQUFBLFlBQ1Q7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbInJlcXVpcmUiXQp9Cg==
