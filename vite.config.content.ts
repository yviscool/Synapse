import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import Components from 'unplugin-vue-components/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
    Components({
      // 自动扫描组件目录
      dirs: ['*/components'],
      // 支持的文件类型
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      dts: true,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  esbuild: {
    charset: 'ascii',
  },
  build: {
    emptyOutDir: false,
    outDir: 'dist',
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        name: 'SynapseContentScript',
        entryFileNames: 'content.js',
        assetFileNames: 'content.css',
      },
    },
  },
})
