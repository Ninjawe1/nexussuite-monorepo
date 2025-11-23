import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "NexusSuite", "client", "src"),
      "@shared": path.resolve(process.cwd(), "NexusSuite", "shared"),
      "@assets": path.resolve(process.cwd(), "NexusSuite", "attached_assets"),
    },
  },
  root: path.resolve(process.cwd(), "NexusSuite", "client"),
  build: {
    outDir: path.resolve(process.cwd(), "NexusSuite", "server", "public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});


