import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    reporters: ['default', 'junit'],
    outputFile: { junit: './junit.xml' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'drizzle/**',
        '**/*.config.*',
        '**/*.d.ts',
        'app/layout.tsx',
      ],
    },
  },
  resolve: {
    alias: { '@': resolve(process.cwd(), '.') },
  },
})
