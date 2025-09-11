import { marked } from 'marked'
import { db } from '@/stores/db' // Keep for read-only
import { repository } from '@/stores/repository'
import type { Prompt, PromptVersion } from '@/types/prompt'
import DiffMatchPatch from 'diff-match-patch'

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true
})

const dmp = new DiffMatchPatch()

/**
 * 创建新的版本记录
 */
export async function createVersion(
  promptId: string, 
  content: string, 
  note?: string,
  parentVersionId?: string | null
): Promise<PromptVersion> {
  const result = await repository.createVersion(promptId, content, note, parentVersionId)
  if (result.ok && result.data) {
    return result.data
  }
  throw result.error || new Error('Failed to create version')
}

/**
 * 获取 Prompt 的所有版本历史
 */
export async function getVersionHistory(promptId: string): Promise<PromptVersion[]> {
  const versions = await db.prompt_versions
    .where('promptId')
    .equals(promptId)
    .toArray()
  
  // 手动按创建时间降序排序（最新的在前）
  return versions.sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * 获取最新版本
 */
export async function getLatestVersion(promptId: string): Promise<PromptVersion | null> {
  const versions = await getVersionHistory(promptId)
  return versions.length > 0 ? versions[versions.length - 1] : null
}

/**
 * 比较两个版本的差异
 */
export async function compareVersions(oldContent: string, newContent: string) {
  const diffs = dmp.diff_main(oldContent, newContent)
  dmp.diff_cleanupSemantic(diffs)
  
  const htmlDiff = dmp.diff_prettyHtml(diffs)
  const markdownHtml = await renderDiffAsMarkdown(diffs)
  
  return {
    diffs,
    html: htmlDiff,
    markdownHtml,
    stats: {
      additions: diffs.filter(d => d[0] === 1).reduce((acc, d) => acc + d[1].length, 0),
      deletions: diffs.filter(d => d[0] === -1).reduce((acc, d) => acc + d[1].length, 0),
      unchanged: diffs.filter(d => d[0] === 0).reduce((acc, d) => acc + d[1].length, 0)
    }
  }
}

/**
 * 将差异渲染为 Markdown HTML
 */
async function renderDiffAsMarkdown(diffs: any[]): Promise<string> {
  let html = ''
  
  for (const [op, text] of diffs) {
    const renderedText = await marked.parse(text)
    
    if (op === 1) { // 添加
      html += `<div class="diff-addition">${renderedText}</div>`
    } else if (op === -1) { // 删除
      html += `<div class="diff-deletion">${renderedText}</div>`
    } else { // 不变
      html += `<div class="diff-unchanged">${renderedText}</div>`
    }
  }
  
  return html
}

/**
 * 恢复到指定版本
 */
export async function revertToVersion(promptId: string, versionId: string, currentUnsavedContent: string): Promise<void> {
  const { ok, error } = await repository.revertToVersion(promptId, versionId, currentUnsavedContent)
  if (!ok) {
    throw error || new Error('Failed to revert to version')
  }
}

/**
 * 删除版本（保留最新版本）
 */
export async function deleteVersion(versionId: string): Promise<void> {
  const { ok, error } = await repository.deleteVersion(versionId)
  if (!ok) {
    throw error || new Error('Failed to delete version')
  }
}

/**
 * 清理旧版本（保留最近 N 个版本）
 */
export async function cleanupOldVersions(promptId: string, keepCount: number = 10): Promise<void> {
  const versions = await getVersionHistory(promptId)
  
  if (versions.length <= keepCount) {
    return
  }
  
  const toDelete = versions.slice(0, versions.length - keepCount)
  const deleteIds = toDelete.map(v => v.id)
  
  await db.prompt_versions.bulkDelete(deleteIds)
}

/**
 * 获取版本统计信息
 */
export async function getVersionStats(promptId: string) {
  const versions = await getVersionHistory(promptId)
  
  if (versions.length === 0) {
    return {
      totalVersions: 0,
      firstCreated: null,
      lastModified: null,
      totalChanges: 0
    }
  }
  
  return {
    totalVersions: versions.length,
    firstCreated: versions[0].createdAt,
    lastModified: versions[versions.length - 1].createdAt,
    totalChanges: versions.length - 1
  }
}