import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import fs from 'fs'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000'

  return {
    plugins: [
      react(),
      {
        name: 'dev-cors-headers',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
            if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }
            if (req.url === '/' || req.url === '') {
              const indexPath = path.resolve(__dirname, 'index.html')
              let html = fs.readFileSync(indexPath, 'utf-8')
              server.transformIndexHtml(req.url, html)
                .then((transformed) => {
                  res.statusCode = 200
                  res.setHeader('Content-Type', 'text/html')
                  res.end(transformed)
                })
                .catch((err) => next(err))
              return
            }
            next()
          })
        }
      }
    ],
    // Read env from parent directory (NexusSuite/.env)
    envDir: path.resolve(__dirname, '..'),
    server: {
      port: 5173,
      strictPort: true,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      },
      fs: {
        allow: [path.resolve(__dirname, '..')]
      },
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': '/src',
        // Allow frontend to import shared types/schemas from the monorepo shared folder
        '@shared': path.resolve(__dirname, '../shared')
      }
    }
  }
})
