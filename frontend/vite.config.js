import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Portas próprias (5180 aqui, 8010 no backend) pra não bater com outros
// projetos Vite/Django rodando ao mesmo tempo nas portas padrão.
export default defineConfig({
  plugins: [react()],
  server: { port: 5180 },
  preview: { port: 5181 },
})
