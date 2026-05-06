import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  /** Onde o dev server encaminha /api (sua VM). Não use prefixo VITE_ (não vai pro bundle). */
  const apiProxyTarget =
    env.OMNISYNC_DEV_API_PROXY || env.VITE_DEV_API_PROXY || 'https://omnisync.site'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
