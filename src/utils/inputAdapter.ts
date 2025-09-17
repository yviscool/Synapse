/**
 * 输入目标类型定义
 * 支持两种输入元素：textarea 和 contenteditable 元素
 */
type InputTarget =
  | { kind: 'textarea'; el: HTMLTextAreaElement }
  | { kind: 'contenteditable'; el: HTMLElement }

/**
 * 常用的输入元素选择器
 * 用于查找页面中可输入的元素
 */
const COMMON_SELECTORS = [
  'textarea',                    // 标准文本域
  '[contenteditable="true"]',    // 可编辑内容元素
  '[role="textbox"]',           // 具有文本框角色的元素
] as const

/**
 * 查找当前活跃的输入元素
 * @param customSelectors 自定义选择器数组，用于扩展查找范围
 * @returns 返回找到的输入目标，如果没有找到则返回 null
 */
export function findActiveInput(customSelectors: string[] = []): InputTarget | null {
  // 获取当前焦点元素
  const active = document.activeElement as HTMLElement | null
  
  // 合并自定义选择器和常用选择器
  const selectors = [...customSelectors, ...COMMON_SELECTORS]
  
  // 候选元素列表
  const candidates: HTMLElement[] = []
  
  // 如果有焦点元素，优先考虑
  if (active) candidates.push(active)
  
  // 查找所有匹配选择器的元素并添加到候选列表
  document.querySelectorAll<HTMLElement>(selectors.join(',')).forEach(el => candidates.push(el))
  
  // 遍历候选元素，找到第一个有效的输入元素
  for (const el of candidates) {
    // 检查元素是否连接到DOM且可见
    if (!el.isConnected || el.offsetParent === null) continue
    
    // 检查是否为 textarea 元素
    if (el.tagName === 'TEXTAREA') return { kind: 'textarea', el: el as HTMLTextAreaElement }
    
    // 检查是否为可编辑内容元素
    if (el.getAttribute('contenteditable') === 'true' || el.getAttribute('role') === 'textbox')
      return { kind: 'contenteditable', el }
  }
  
  return null
}

/**
 * 在光标位置插入文本
 * 支持 textarea 和 contenteditable 两种元素类型
 * @param target 目标输入元素
 * @param text 要插入的文本内容
 * @param replaceTrigger 如果为 true，则在插入前删除一个字符（用于替换触发符如'/'）
 */
export function insertAtCursor(target: InputTarget, text: string, replaceTrigger = false) {
  // 确保元素获得焦点
  target.el.focus()

  // 如果需要，先删除触发符
  if (replaceTrigger) {
    if (target.kind === 'textarea') {
      const ta = target.el
      const start = ta.selectionStart ?? ta.value.length
      if (start > 0) {
        ta.value = ta.value.slice(0, start - 1) + ta.value.slice(ta.selectionEnd ?? start)
        ta.selectionStart = ta.selectionEnd = start - 1
      }
    } else {
      // 对于 contenteditable，模拟一次退格键是更健壮的方式
      // 这会让富文本编辑器自己去处理删除操作，而不是我们手动操作DOM
      const backspaceEvent = new KeyboardEvent('keydown', {
        key: 'Backspace',
        code: 'Backspace',
        keyCode: 8,
        which: 8,
        bubbles: true,
        cancelable: true
      });
      target.el.dispatchEvent(backspaceEvent);
    }
  }

  // 处理 textarea 元素
  if (target.kind === 'textarea') {
    const ta = target.el
    
    // 获取当前选择范围的起始和结束位置
    const start = ta.selectionStart ?? ta.value.length
    const end = ta.selectionEnd ?? ta.value.length
    
    // 分割原文本：选择前的部分 + 插入文本 + 选择后的部分
    const before = ta.value.slice(0, start)
    const after = ta.value.slice(end)
    ta.value = before + text + after
    
    // 设置光标位置到插入文本的末尾
    const pos = start + text.length
    ta.selectionStart = ta.selectionEnd = pos
    
    // 触发 input 事件，通知其他监听器文本已改变
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    return
  }
  
  // 处理 contenteditable 元素
  const el = target.el
  
  const sel = window.getSelection()
  if (!sel) return
  
  // 如果没有选择范围，创建一个在元素末尾的范围
  if (sel.rangeCount === 0) {
    const r = document.createRange()
    r.selectNodeContents(el)
    r.collapse(false) // 折叠到末尾
    sel.addRange(r)
  }
  
  const range = sel.getRangeAt(0)
  
  // 删除当前选中的内容
  range.deleteContents()
  
  // 创建文本节点并插入
  const textNode = document.createTextNode(text)
  range.insertNode(textNode)
  
  // 将光标移动到插入文本的末尾
  range.setStartAfter(textNode)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
  
  // 清理可能产生的空段落标签（修复回车上屏问题）
  // cleanupEmptyParagraphs(el) // 注意：execCommand('delete') 可能已经处理了，可以观察是否还需要
  
  // 触发 input 事件，通知页面文本已改变
  el.dispatchEvent(new InputEvent('input', { 
    bubbles: true, 
    data: text, 
    inputType: 'insertText' 
  }))
}

/**
 * 清理 contenteditable 元素中的空段落标签
 * 修复某些网站回车后产生多余空行的问题
 * @param el contenteditable 元素
 */
function cleanupEmptyParagraphs(el: HTMLElement) {
  try {
    // 查找所有空的 p 标签（只包含 <br> 或完全为空）
    const emptyParagraphs = el.querySelectorAll('p')
    let hasContent = false
    
    emptyParagraphs.forEach(p => {
      const content = p.textContent?.trim() || ''
      const hasOnlyBr = p.innerHTML.trim() === '<br>' || p.innerHTML.trim() === ''
      
      if (content === '' && hasOnlyBr) {
        // 如果已经有内容了，移除多余的空段落
        if (hasContent) {
          p.remove()
        } else {
          // 保留第一个空段落，但确保它不会影响显示
          p.innerHTML = ''
        }
      } else if (content !== '') {
        hasContent = true
      }
    })
    
    // 如果元素完全为空，确保有一个基本的结构
    if (el.textContent?.trim() === '' && el.children.length === 0) {
      el.innerHTML = ''
    }
  } catch (error) {
    // 如果清理过程出错，不影响主要功能
    console.warn('清理空段落时出错:', error)
  }
}

/**
 * 检测是否正在进行输入法组合输入
 * @returns 是否正在组合输入状态
 */
export function isComposing(): boolean {
  // 简单检测：IME 组合态常见时机，外部可自行维护标记
  // 这里留接口给调用方设置，可以根据实际需要扩展
  // 例如：监听 compositionstart/compositionend 事件来维护状态
  return false
}