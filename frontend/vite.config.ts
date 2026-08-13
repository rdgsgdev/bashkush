import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy optionnel : décommenter pour faire pointer /api vers le backend local
    // sans avoir à configurer VITE_API_URL.
    // proxy: { '/api': 'http://localhost:4000' },
  },
});
