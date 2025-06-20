/// <reference types="vitest" />

import { dependencies, peerDependencies } from './package.json'

import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/**/*'],
      exclude: ['**/*.test.ts', '**/*.stories.tsx'],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src', 'index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: [
        ...Object.keys(peerDependencies || {}),
        ...Object.keys(dependencies || {}),
      ],
      output: {
        preserveModules: true,
        exports: 'named',
      },
    },
    sourcemap: true,
    target: 'esnext',
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
