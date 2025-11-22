// NexusSuite/client/vite.config.js
import { defineConfig, loadEnv } from "file:///D:/Nexus%20suite%20database/NexusSuite%20Main/NexusSuite/client/node_modules/vite/dist/node/index.js";
import path from "path";
import fs from "fs";
import react from "file:///D:/Nexus%20suite%20database/NexusSuite%20Main/NexusSuite/client/node_modules/@vitejs/plugin-react/dist/index.js";
var __vite_injected_original_dirname = "D:\\Nexus suite database\\NexusSuite Main\\NexusSuite\\client";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__vite_injected_original_dirname, ".."), "");
  const apiUrl = env.VITE_API_URL || "http://localhost:3000";
  return {
    plugins: [
      react(),
      {
        name: "dev-cors-headers",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
            if (req.method === "OPTIONS") {
              res.statusCode = 204;
              res.end();
              return;
            }
            if (req.url === "/" || req.url === "") {
              const indexPath = path.resolve(__vite_injected_original_dirname, "index.html");
              let html = fs.readFileSync(indexPath, "utf-8");
              server.transformIndexHtml(req.url, html).then((transformed) => {
                res.statusCode = 200;
                res.setHeader("Content-Type", "text/html");
                res.end(transformed);
              }).catch((err) => next(err));
              return;
            }
            next();
          });
        }
      }
    ],
    // Read env from parent directory (NexusSuite/.env)
    envDir: path.resolve(__vite_injected_original_dirname, ".."),
    server: {
      port: 5173,
      strictPort: true,
      cors: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
      },
      fs: {
        allow: [path.resolve(__vite_injected_original_dirname, "..")]
      },
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiTmV4dXNTdWl0ZS9jbGllbnQvdml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxOZXh1cyBzdWl0ZSBkYXRhYmFzZVxcXFxOZXh1c1N1aXRlIE1haW5cXFxcTmV4dXNTdWl0ZVxcXFxjbGllbnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXE5leHVzIHN1aXRlIGRhdGFiYXNlXFxcXE5leHVzU3VpdGUgTWFpblxcXFxOZXh1c1N1aXRlXFxcXGNsaWVudFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovTmV4dXMlMjBzdWl0ZSUyMGRhdGFiYXNlL05leHVzU3VpdGUlMjBNYWluL05leHVzU3VpdGUvY2xpZW50L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSdcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgZnMgZnJvbSAnZnMnXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJyksICcnKVxuICBjb25zdCBhcGlVcmwgPSBlbnYuVklURV9BUElfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnXG5cbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICByZWFjdCgpLFxuICAgICAge1xuICAgICAgICBuYW1lOiAnZGV2LWNvcnMtaGVhZGVycycsXG4gICAgICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKVxuICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdHRVQsUE9TVCxQVVQsREVMRVRFLE9QVElPTlMnKVxuICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24sIFgtUmVxdWVzdGVkLVdpdGgnKVxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdPUFRJT05TJykgeyByZXMuc3RhdHVzQ29kZSA9IDIwNDsgcmVzLmVuZCgpOyByZXR1cm4gfVxuICAgICAgICAgICAgaWYgKHJlcS51cmwgPT09ICcvJyB8fCByZXEudXJsID09PSAnJykge1xuICAgICAgICAgICAgICBjb25zdCBpbmRleFBhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnaW5kZXguaHRtbCcpXG4gICAgICAgICAgICAgIGxldCBodG1sID0gZnMucmVhZEZpbGVTeW5jKGluZGV4UGF0aCwgJ3V0Zi04JylcbiAgICAgICAgICAgICAgc2VydmVyLnRyYW5zZm9ybUluZGV4SHRtbChyZXEudXJsLCBodG1sKVxuICAgICAgICAgICAgICAgIC50aGVuKCh0cmFuc2Zvcm1lZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSAyMDBcbiAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICd0ZXh0L2h0bWwnKVxuICAgICAgICAgICAgICAgICAgcmVzLmVuZCh0cmFuc2Zvcm1lZClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiBuZXh0KGVycikpXG4gICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV4dCgpXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIF0sXG4gICAgLy8gUmVhZCBlbnYgZnJvbSBwYXJlbnQgZGlyZWN0b3J5IChOZXh1c1N1aXRlLy5lbnYpXG4gICAgZW52RGlyOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nKSxcbiAgICBzZXJ2ZXI6IHtcbiAgICAgIHBvcnQ6IDUxNzMsXG4gICAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgICAgY29yczogdHJ1ZSxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnR0VULFBPU1QsUFVULERFTEVURSxPUFRJT05TJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uLCBYLVJlcXVlc3RlZC1XaXRoJyxcbiAgICAgIH0sXG4gICAgICBmczoge1xuICAgICAgICBhbGxvdzogW3BhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicpXVxuICAgICAgfSxcbiAgICAgIHByb3h5OiB7XG4gICAgICAgICcvYXBpJzoge1xuICAgICAgICAgIHRhcmdldDogYXBpVXJsLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICAgIHdzOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgICdAJzogJy9zcmMnLFxuICAgICAgICAvLyBBbGxvdyBmcm9udGVuZCB0byBpbXBvcnQgc2hhcmVkIHR5cGVzL3NjaGVtYXMgZnJvbSB0aGUgbW9ub3JlcG8gc2hhcmVkIGZvbGRlclxuICAgICAgICAnQHNoYXJlZCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9zaGFyZWQnKVxuICAgICAgfVxuICAgIH1cbiAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNlcsU0FBUyxjQUFjLGVBQWU7QUFDblosT0FBTyxVQUFVO0FBQ2pCLE9BQU8sUUFBUTtBQUNmLE9BQU8sV0FBVztBQUhsQixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN4QyxRQUFNLE1BQU0sUUFBUSxNQUFNLEtBQUssUUFBUSxrQ0FBVyxJQUFJLEdBQUcsRUFBRTtBQUMzRCxRQUFNLFNBQVMsSUFBSSxnQkFBZ0I7QUFFbkMsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ047QUFBQSxRQUNFLE1BQU07QUFBQSxRQUNOLGdCQUFnQixRQUFRO0FBQ3RCLGlCQUFPLFlBQVksSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTO0FBQ3pDLGdCQUFJLFVBQVUsK0JBQStCLEdBQUc7QUFDaEQsZ0JBQUksVUFBVSxnQ0FBZ0MsNkJBQTZCO0FBQzNFLGdCQUFJLFVBQVUsZ0NBQWdDLCtDQUErQztBQUM3RixnQkFBSSxJQUFJLFdBQVcsV0FBVztBQUFFLGtCQUFJLGFBQWE7QUFBSyxrQkFBSSxJQUFJO0FBQUc7QUFBQSxZQUFPO0FBQ3hFLGdCQUFJLElBQUksUUFBUSxPQUFPLElBQUksUUFBUSxJQUFJO0FBQ3JDLG9CQUFNLFlBQVksS0FBSyxRQUFRLGtDQUFXLFlBQVk7QUFDdEQsa0JBQUksT0FBTyxHQUFHLGFBQWEsV0FBVyxPQUFPO0FBQzdDLHFCQUFPLG1CQUFtQixJQUFJLEtBQUssSUFBSSxFQUNwQyxLQUFLLENBQUMsZ0JBQWdCO0FBQ3JCLG9CQUFJLGFBQWE7QUFDakIsb0JBQUksVUFBVSxnQkFBZ0IsV0FBVztBQUN6QyxvQkFBSSxJQUFJLFdBQVc7QUFBQSxjQUNyQixDQUFDLEVBQ0EsTUFBTSxDQUFDLFFBQVEsS0FBSyxHQUFHLENBQUM7QUFDM0I7QUFBQSxZQUNGO0FBQ0EsaUJBQUs7QUFBQSxVQUNQLENBQUM7QUFBQSxRQUNIO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBRUEsUUFBUSxLQUFLLFFBQVEsa0NBQVcsSUFBSTtBQUFBLElBQ3BDLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLFlBQVk7QUFBQSxNQUNaLE1BQU07QUFBQSxNQUNOLFNBQVM7QUFBQSxRQUNQLCtCQUErQjtBQUFBLFFBQy9CLGdDQUFnQztBQUFBLFFBQ2hDLGdDQUFnQztBQUFBLE1BQ2xDO0FBQUEsTUFDQSxJQUFJO0FBQUEsUUFDRixPQUFPLENBQUMsS0FBSyxRQUFRLGtDQUFXLElBQUksQ0FBQztBQUFBLE1BQ3ZDO0FBQUEsTUFDQSxPQUFPO0FBQUEsUUFDTCxRQUFRO0FBQUEsVUFDTixRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsVUFDZCxRQUFRO0FBQUEsVUFDUixJQUFJO0FBQUEsUUFDTjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLO0FBQUE7QUFBQSxRQUVMLFdBQVcsS0FBSyxRQUFRLGtDQUFXLFdBQVc7QUFBQSxNQUNoRDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
