import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    root: process.cwd(),
  },
})
