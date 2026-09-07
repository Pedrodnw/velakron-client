import { defineConfig } from 'vitest/config'
import { transformWithEsbuild } from 'vite'

export default defineConfig({
  plugins: [{ name: 'component-jsx', enforce: 'pre', async transform(code, id) { if (/\/components\/.*\.js$/.test(id)) return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' }) } }],
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
})
