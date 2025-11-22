// ../NexusSuite/client/vite.config.js
import { defineConfig, loadEnv } from "file:///D:/Nexus%20suite%20database/NexusSuite%20Main/NexusSuite/client/node_modules/vite/dist/node/index.js";
import path from "path";
import react from "file:///D:/Nexus%20suite%20database/NexusSuite%20Main/NexusSuite/client/node_modules/@vitejs/plugin-react/dist/index.js";
var __vite_injected_original_dirname = "D:\\Nexus suite database\\NexusSuite Main\\NexusSuite\\client";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__vite_injected_original_dirname, ".."), "");
  const apiUrl = env.VITE_API_URL || "http://localhost:3000";
  return {
    plugins: [react()],
    // Read env from parent directory (NexusSuite/.env)
    envDir: path.resolve(__vite_injected_original_dirname, ".."),
    server: {
      port: 3e3,
      strictPort: true,
      proxy: {
        "/api": {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          ws: false
        }
      }
    },
    resolve: {
      alias: {
        "@": "/src",
        // Allow frontend to import shared types/schemas from the monorepo shared folder
        "@shared": path.resolve(__vite_injected_original_dirname, "../shared")
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vTmV4dXNTdWl0ZS9jbGllbnQvdml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxOZXh1cyBzdWl0ZSBkYXRhYmFzZVxcXFxOZXh1c1N1aXRlIE1haW5cXFxcTmV4dXNTdWl0ZVxcXFxjbGllbnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXE5leHVzIHN1aXRlIGRhdGFiYXNlXFxcXE5leHVzU3VpdGUgTWFpblxcXFxOZXh1c1N1aXRlXFxcXGNsaWVudFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovTmV4dXMlMjBzdWl0ZSUyMGRhdGFiYXNlL05leHVzU3VpdGUlMjBNYWluL05leHVzU3VpdGUvY2xpZW50L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSdcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJyksICcnKVxuICBjb25zdCBhcGlVcmwgPSBlbnYuVklURV9BUElfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnXG5cbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gICAgLy8gUmVhZCBlbnYgZnJvbSBwYXJlbnQgZGlyZWN0b3J5IChOZXh1c1N1aXRlLy5lbnYpXG4gICAgZW52RGlyOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nKSxcbiAgICBzZXJ2ZXI6IHtcbiAgICAgIHBvcnQ6IDMwMDAsXG4gICAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgICAgcHJveHk6IHtcbiAgICAgICAgJy9hcGknOiB7XG4gICAgICAgICAgdGFyZ2V0OiBhcGlVcmwsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgICAgd3M6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgICdAJzogJy9zcmMnLFxuICAgICAgICAvLyBBbGxvdyBmcm9udGVuZCB0byBpbXBvcnQgc2hhcmVkIHR5cGVzL3NjaGVtYXMgZnJvbSB0aGUgbW9ub3JlcG8gc2hhcmVkIGZvbGRlclxuICAgICAgICAnQHNoYXJlZCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9zaGFyZWQnKVxuICAgICAgfVxuICAgIH1cbiAgfVxufSkiXSwKICAibWFwcGluZ3MiOiAiO0FBQTZXLFNBQVMsY0FBYyxlQUFlO0FBQ25aLE9BQU8sVUFBVTtBQUNqQixPQUFPLFdBQVc7QUFGbEIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxLQUFLLFFBQVEsa0NBQVcsSUFBSSxHQUFHLEVBQUU7QUFDM0QsUUFBTSxTQUFTLElBQUksZ0JBQWdCO0FBRW5DLFNBQU87QUFBQSxJQUNMLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQTtBQUFBLElBRWpCLFFBQVEsS0FBSyxRQUFRLGtDQUFXLElBQUk7QUFBQSxJQUNwQyxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixZQUFZO0FBQUEsTUFDWixPQUFPO0FBQUEsUUFDTCxRQUFRO0FBQUEsVUFDTixRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsVUFDZCxRQUFRO0FBQUEsVUFDUixJQUFJO0FBQUEsUUFDTjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLO0FBQUE7QUFBQSxRQUVMLFdBQVcsS0FBSyxRQUFRLGtDQUFXLFdBQVc7QUFBQSxNQUNoRDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
