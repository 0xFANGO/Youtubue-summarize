import { defineConfig } from 'tsup'

export default defineConfig([
  // Library build
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    shims: true,
    target: 'node16',
    outDir: 'dist'
  },
  // CLI build
  {
    entry: ['src/cli.ts'],
    format: ['cjs'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    shims: true,
    target: 'node16',
    outDir: 'dist',
    banner: {
      js: '#!/usr/bin/env node'
    },
    external: ['./index.js'] // 避免打包 index.ts 的内容
  }
])
