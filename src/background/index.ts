import { MSG, type RuntimeMessage } from '@/utils/messaging'

async function getActiveTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab?.id ?? null
}

async function sendToActiveTab(message: RuntimeMessage) {
  const tabId = await getActiveTabId()
  if (tabId != null) await chrome.tabs.sendMessage(tabId, message).catch(() => {})
}

chrome.runtime.onInstalled.addListener(() => {
  // Context menus
  chrome.contextMenus.create({
    id: 'apm.openPanel',
    title: 'APM: 打开 Prompt 面板',
    contexts: ['all'],
  })
  chrome.contextMenus.create({
    id: 'apm.quickSave',
    title: 'APM: 快速保存当前输入为 Prompt',
    contexts: ['editable'],
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'apm.openPanel') {
    if (tab?.id != null) chrome.tabs.sendMessage(tab.id, { type: MSG.OPEN_PANEL })
  }
  if (info.menuItemId === 'apm.quickSave') {
    if (tab?.id != null) {
      chrome.tabs.sendMessage(tab.id, { type: MSG.INSERT_PROMPT, data: '{# 快速保存占位 #}' })
    }
  }
})

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open_panel' || command === 'toggle-panel') {
    await sendToActiveTab({ type: MSG.OPEN_PANEL })
  }
})

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message?.type === MSG.DOWNLOAD_FILE) {
    const { name, content } = message.data as { name: string; content: string }
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    chrome.downloads.download({ url, filename: name, saveAs: true }, () => {
      URL.revokeObjectURL(url)
    })
    sendResponse({ ok: true })
    return true
  }
  if (message?.type === MSG.INSERT_PROMPT) {
    // 转发到活动页
    getActiveTabId().then((tabId) => {
      if (tabId != null) chrome.tabs.sendMessage(tabId, message)
    })
    sendResponse({ ok: true })
    return true
  }
  return false
})