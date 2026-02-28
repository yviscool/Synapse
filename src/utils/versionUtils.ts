import { markedWithHighlight } from '@/utils/markdown'
import { db } from '@/stores/db' // Keep for read-only
import { repository } from '@/stores/repository'
import type { PromptVersion } from '@/types/prompt'
import DiffMatchPatch from 'diff-match-patch'

const dmp = new DiffMatchPatch()
type TextDiff = [number, string]

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
 * 比较两个版本的差异
 */
export async function compareVersions(oldContent: string, newContent: string) {
  const diffs = dmp.diff_main(oldContent, newContent) as TextDiff[]
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
async function renderDiffAsMarkdown(diffs: TextDiff[]): Promise<string> {
  let html = ''

  for (const [op, text] of diffs) {
    const renderedText = await markedWithHighlight.parse(text)

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
 * 应用指定版本：创建新版本（type: revert），内容为目标版本内容
 */
export async function applyVersion(promptId: string, versionId: string): Promise<void> {
  const { ok, error } = await repository.applyVersion(promptId, versionId)
  if (!ok) {
    throw error || new Error('Failed to apply version')
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

  // getVersionHistory() 已按 createdAt 降序（新 -> 旧）返回，保留前 keepCount 条即可
  const toDelete = versions.slice(keepCount)
  const deleteIds = toDelete.map(v => v.id)

  await db.prompt_versions.bulkDelete(deleteIds)
}
