import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        // Garantindo resolução absoluta consistente para o sistema de arquivos
        return path.resolve(process.cwd(), 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  // Alterado para "./" para suportar caminhos relativos no GitHub Pages e Vercel
  base: './',
  
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  assetsInclude: ['**/*.svg', '**/*.csv'],
})