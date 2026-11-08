import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // react-native / expo native modules are absent on Node; the hooks are
    // written to degrade gracefully, so no jsdom/dom mock is required.
    globals: true
  }
})