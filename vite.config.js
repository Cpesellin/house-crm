import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',
    // Sourcemaps inflan dist/ y se sirven al navegador. Mantener para Sentry/debug,
    // pero deshabilitar si nunca los usás:
    //   sourcemap: false,
    // Supabase SDK se sirve desde CDN (window.supabase), no está en npm bundle.
    // Subo el límite del warning para no contaminar la salida ahora que sabemos
    // qué hay dentro del bundle principal.
    chunkSizeWarningLimit: 700,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
