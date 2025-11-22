// ../NexusSuite/client/vite.config.js
import { defineConfig } from "file:///D:/Nexus%20suite%20database/NexusSuite%20Main/NexusSuite/client/node_modules/vite/dist/node/index.js";
import path from "path";
import react from "file:///D:/Nexus%20suite%20database/NexusSuite%20Main/NexusSuite/client/node_modules/@vitejs/plugin-react/dist/index.js";
var __vite_injected_original_dirname = "D:\\Nexus suite database\\NexusSuite Main\\NexusSuite\\client";
var vite_config_default = defineConfig({
  plugins: [react()],
  server: {
    port: 3e3,
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.API_URL || "http://localhost:3001",
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
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vTmV4dXNTdWl0ZS9jbGllbnQvdml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxOZXh1cyBzdWl0ZSBkYXRhYmFzZVxcXFxOZXh1c1N1aXRlIE1haW5cXFxcTmV4dXNTdWl0ZVxcXFxjbGllbnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXE5leHVzIHN1aXRlIGRhdGFiYXNlXFxcXE5leHVzU3VpdGUgTWFpblxcXFxOZXh1c1N1aXRlXFxcXGNsaWVudFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovTmV4dXMlMjBzdWl0ZSUyMGRhdGFiYXNlL05leHVzU3VpdGUlMjBNYWluL05leHVzU3VpdGUvY2xpZW50L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDMwMDAsXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogcHJvY2Vzcy5lbnYuQVBJX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDozMDAxJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICB3czogZmFsc2UsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiAnL3NyYycsXG4gICAgICAvLyBBbGxvdyBmcm9udGVuZCB0byBpbXBvcnQgc2hhcmVkIHR5cGVzL3NjaGVtYXMgZnJvbSB0aGUgbW9ub3JlcG8gc2hhcmVkIGZvbGRlclxuICAgICAgJ0BzaGFyZWQnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vc2hhcmVkJylcbiAgICB9XG4gIH1cbn0pIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE2VyxTQUFTLG9CQUFvQjtBQUMxWSxPQUFPLFVBQVU7QUFDakIsT0FBTyxXQUFXO0FBRmxCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRLFFBQVEsSUFBSSxXQUFXO0FBQUEsUUFDL0IsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLFFBQ1IsSUFBSTtBQUFBLE1BQ047QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSztBQUFBO0FBQUEsTUFFTCxXQUFXLEtBQUssUUFBUSxrQ0FBVyxXQUFXO0FBQUEsSUFDaEQ7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
