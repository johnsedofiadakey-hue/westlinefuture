// AUTHORITATIVE BUILD CONFIG — always build from this worktree, deploy from main project root.
// Deploy command: cd /Users/truth/Developer/glasstechfab && bash deploy.sh
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  build: {
    outDir: '/Users/truth/Developer/glasstechfab/dist',
    emptyOutDir: true,
  },
  plugins: [
    react(),
  ],
})
