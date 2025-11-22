// NexusSuite/client/vite.config.js
import { defineConfig, loadEnv } from "file:///D:/Nexus%20suite%20database/NexusSuite%20Main/NexusSuite/client/node_modules/vite/dist/node/index.js";
import path from "path";
import react from "file:///D:/Nexus%20suite%20database/NexusSuite%20Main/NexusSuite/client/node_modules/@vitejs/plugin-react/dist/index.js";
var __vite_injected_original_dirname = "D:\\Nexus suite database\\NexusSuite Main\\NexusSuite\\client";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__vite_injected_original_dirname, ".."), "");
  const apiUrl = "http://localhost:3000";
  return {
    plugins: [react()],
    // Read env from parent directory (NexusSuite/.env)
    envDir: path.resolve(__vite_injected_original_dirname, ".."),
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          ws: true
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiTmV4dXNTdWl0ZS9jbGllbnQvdml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxOZXh1cyBzdWl0ZSBkYXRhYmFzZVxcXFxOZXh1c1N1aXRlIE1haW5cXFxcTmV4dXNTdWl0ZVxcXFxjbGllbnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXE5leHVzIHN1aXRlIGRhdGFiYXNlXFxcXE5leHVzU3VpdGUgTWFpblxcXFxOZXh1c1N1aXRlXFxcXGNsaWVudFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovTmV4dXMlMjBzdWl0ZSUyMGRhdGFiYXNlL05leHVzU3VpdGUlMjBNYWluL05leHVzU3VpdGUvY2xpZW50L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSdcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJyksICcnKVxuICBjb25zdCBhcGlVcmwgPSAnaHR0cDovL2xvY2FsaG9zdDozMDAwJ1xuXG4gIHJldHVybiB7XG4gICAgcGx1Z2luczogW3JlYWN0KCldLFxuICAgIC8vIFJlYWQgZW52IGZyb20gcGFyZW50IGRpcmVjdG9yeSAoTmV4dXNTdWl0ZS8uZW52KVxuICAgIGVudkRpcjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJyksXG4gICAgc2VydmVyOiB7XG4gICAgICBwb3J0OiA1MTczLFxuICAgICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgICAgIHByb3h5OiB7XG4gICAgICAgICcvYXBpJzoge1xuICAgICAgICAgIHRhcmdldDogYXBpVXJsLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICAgIHdzOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgICdAJzogJy9zcmMnLFxuICAgICAgICAvLyBBbGxvdyBmcm9udGVuZCB0byBpbXBvcnQgc2hhcmVkIHR5cGVzL3NjaGVtYXMgZnJvbSB0aGUgbW9ub3JlcG8gc2hhcmVkIGZvbGRlclxuICAgICAgICAnQHNoYXJlZCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9zaGFyZWQnKVxuICAgICAgfVxuICAgIH1cbiAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNlcsU0FBUyxjQUFjLGVBQWU7QUFDblosT0FBTyxVQUFVO0FBQ2pCLE9BQU8sV0FBVztBQUZsQixJQUFNLG1DQUFtQztBQUt6QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN4QyxRQUFNLE1BQU0sUUFBUSxNQUFNLEtBQUssUUFBUSxrQ0FBVyxJQUFJLEdBQUcsRUFBRTtBQUMzRCxRQUFNLFNBQVM7QUFFZixTQUFPO0FBQUEsSUFDTCxTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUE7QUFBQSxJQUVqQixRQUFRLEtBQUssUUFBUSxrQ0FBVyxJQUFJO0FBQUEsSUFDcEMsUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sWUFBWTtBQUFBLE1BQ1osT0FBTztBQUFBLFFBQ0wsUUFBUTtBQUFBLFVBQ04sUUFBUTtBQUFBLFVBQ1IsY0FBYztBQUFBLFVBQ2QsUUFBUTtBQUFBLFVBQ1IsSUFBSTtBQUFBLFFBQ047QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSztBQUFBO0FBQUEsUUFFTCxXQUFXLEtBQUssUUFBUSxrQ0FBVyxXQUFXO0FBQUEsTUFDaEQ7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
