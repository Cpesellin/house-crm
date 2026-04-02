import { defineConfig } from 'vite';

export default defineConfig({
  server: { 
    port: 3000, 
    open: true,
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;"
    }
  },
  build: { 
    outDir: 'dist', 
    sourcemap: true,
    target: 'esnext'
  },
  resolve: { 
    alias: { 
      '@': '/src' 
    } 
  },
});