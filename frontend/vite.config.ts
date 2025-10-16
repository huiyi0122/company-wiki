import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '192.168.0.44', // 👈 改成这个IP
    port: 5173,
  },
})
