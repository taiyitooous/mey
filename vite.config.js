import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      '/proxy-3c': {
        target: 'https://app.3c.plus',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/proxy-3c/, ''),
      },
    },
  },
})
