import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  test: {
    // Test-only origin: suites must not depend on a developer's .env or CI secrets.
    env: { VITE_API_BASE_URL: 'http://cointrail.test' },
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
