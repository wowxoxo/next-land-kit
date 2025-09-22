import { dependencies, peerDependencies } from './package.json'

import { defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Include the necessary Node.js built-ins
      include: ['url', 'fs', 'path', 'buffer'],
    }),
    dts({
      include: ['src/**/*'],
      exclude: ['src/**/*.test.ts', 'src/**/*.stories.tsx'],
    }),
    visualizer({ open: false }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        ...Object.keys(peerDependencies || {}),
        ...Object.keys(dependencies || {}),
      ],
      output: {
        preserveModules: true,
        exports: 'named',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    target: 'esnext',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})