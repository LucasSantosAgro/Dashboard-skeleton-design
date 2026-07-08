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
        // Garantindo resolução absoluta consistente para o sistema de arquivos da Vercel
        return path.resolve(process.cwd(), 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  // Mantido em "/" para garantir que a Vercel sirva os arquivos da raiz do domínio
  base: '/',
  
  plugins: [
    figmaAssetResolver(),
    // Os plugins React e Tailwind são necessários para o funcionamento do Make
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ para o diretório src
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Tipos de arquivos para suporte a imports raw
  assetsInclude: ['**/*.svg', '**/*.csv'],
})