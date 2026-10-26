import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import seoPlugin from './seo-plugin.mjs'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    seoPlugin({ fallbackUrl: 'https://care-platform.vercel.app' }),
  ],
})