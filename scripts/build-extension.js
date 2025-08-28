/* eslint-disable no-console */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const dist = resolve(root, 'dist')

if (!existsSync(dist)) mkdirSync(dist, { recursive: true })

// 复制 manifest.json 到 dist
const srcManifest = resolve(root, 'manifest.json')
const outManifest = resolve(dist, 'manifest.json')

try {
  const raw = readFileSync(srcManifest, 'utf-8')
  const json = JSON.parse(raw)

  // 确保 service_worker 文件名与 Vite 输出一致
  json.background = json.background || {}
  json.background.service_worker = 'background.js'
  json.background.type = 'module'

  // 写入
  writeFileSync(outManifest, JSON.stringify(json, null, 2), 'utf-8')
  console.log('✔ manifest.json written to dist/')
} catch (e) {
  console.error('✘ Failed to write manifest.json:', e)
  process.exit(1)
}

// 可选：拷贝图标（Vite 会从 public 自动复制，此处作为兜底）
const icons = [
  ['public/icons/icon-16.png', 'icons/icon-16.png'],
  ['public/icons/icon-32.png', 'icons/icon-32.png'],
  ['public/icons/icon-48.png', 'icons/icon-48.png'],
  ['public/icons/icon-128.png', 'icons/icon-128.png'],
]
for (const [from, to] of icons) {
  const src = resolve(root, from)
  const dst = resolve(dist, to)
  try {
    if (existsSync(src)) {
      const dir = resolve(dst, '..')
      mkdirSync(dir, { recursive: true })
      copyFileSync(src, dst)
    }
  } catch {}
}

console.log('✔ build-extension done')