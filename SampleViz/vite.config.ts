import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.CLIENT_ID': JSON.stringify(env.CLIENT_ID),
      'process.env.CLIENT_SECRET': JSON.stringify(env.CLIENT_SECRET),
    },
    server: {
      proxy: {
        '/api/spotify-token': {
          target: 'https://accounts.spotify.com/api/token',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/spotify-token/, ''),
        }
      }
    }
  }
})
