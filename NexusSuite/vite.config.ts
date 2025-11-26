import { defineConfig, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// runtime error overlay is dev-only; dynamically import when not production

// ✅ Custom middleware plugin to fix CSS MIME type issue
function fixCssMimeType() {
  return {
    name: "fix-css-mime-type",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith(".css")) {
          res.setHeader("Content-Type", "text/css");
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.NODE_ENV !== "production"
      ? [
          (await import("@replit/vite-plugin-runtime-error-modal")).default(),
        ]
      : []),
    fixCssMimeType(), // 👈 added plugin
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer()),
          await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
        ]
      : []),
  ],

  css: {
    postcss: "./postcss.config.js", // ✅ ensure Vite knows where to look
  },

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },

  root: path.resolve(import.meta.dirname, "client"),

  build: {
    outDir: path.resolve(import.meta.dirname, "public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
          ui: ['@radix-ui/react-icons', 'lucide-react', 'recharts', 'framer-motion']
        }
      }
    }
  },

  // ✅ Unified server config (Vite + Express = one port)
  server: {
    port: 5173,
    strictPort: true,
    middlewareMode: false,
    hmr: {
      overlay: true,
    },
    fs: {
      strict: false,
      allow: ["."], // allow reading from all subfolders like /themes
    },
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            const setCookie = proxyRes.headers["set-cookie"] as unknown as string[] | undefined;
            if (Array.isArray(setCookie)) {
              proxyRes.headers["set-cookie"] = setCookie.map((cookie) => cookie.replace(/;\s*Domain=[^;]+/i, ""));
            }
          });
        },
      },
    },
  },
});
