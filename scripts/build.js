import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
const root = process.cwd()
const dist = resolve(root, 'dist')
// 1. Clean dist directory
console.log('🧹 清理 dist 目录...')
rmSync(dist, { recursive: true, force: true })
// 2. Build main extension files (popup, options, background)
console.log('🚀 构建主扩展文件...')
execSync('vite build --config vite.config.ts', { stdio: 'inherit' })
// 3. Build content script as a single file
console.log('📦 构建内容脚本...')
execSync('vite build --config vite.config.content.ts', { stdio: 'inherit' })
// 4. Run post-build script to copy manifest, etc.
console.log('📝 运行构建后脚本...')
execSync('node scripts/build-extension.js', { stdio: 'inherit' })
console.log('✅ 完整构建过程完成。')