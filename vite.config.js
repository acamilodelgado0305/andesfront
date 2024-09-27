import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: ['https://fevaback.app.validaciondebachillerato.com.co'],
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  optimizeDeps: {
    include: ['jwt-decode'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Agrupar dependencias de node_modules en un chunk 'vendor'
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          // Puedes agregar más lógica aquí si es necesario
        },
      },
    },
    chunkSizeWarningLimit: 2000, // Aumentar el límite de advertencia del tamaño del chunk
  },
});
