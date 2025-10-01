/**
 * 智能截取文本
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大长度
 * @returns {string} 截取后的文本
 */
export function _smartTruncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;

    // 尝试在句号、问号、感叹号处截断
    const sentenceEnd = text.substring(0, maxLength).match(/[。？！.?!]/g);
    if (sentenceEnd) {
        const lastIndex = text.substring(0, maxLength).lastIndexOf(sentenceEnd[sentenceEnd.length - 1]);
        if (lastIndex > maxLength * 0.6) {
            return text.substring(0, lastIndex + 1);
        }
    }

    // 尝试在逗号、分号处截断
    const clauseEnd = text.substring(0, maxLength).match(/[，；,;]/g);
    if (clauseEnd) {
        const lastIndex = text.substring(0, maxLength).lastIndexOf(clauseEnd[clauseEnd.length - 1]);
        if (lastIndex > maxLength * 0.7) {
            return text.substring(0, lastIndex + 1);
        }
    }

    // 尝试在空格处截断
    const spaceIndex = text.substring(0, maxLength).lastIndexOf(' ');
    if (spaceIndex > maxLength * 0.8) {
        return text.substring(0, spaceIndex) + '...';
    }

    // 默认截断
    return text.substring(0, maxLength - 3) + '...';
}

const ICONS = {
  question: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  code: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
  explain: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
  help: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
  translate: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
  summarize: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path><polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon></svg>',
  analyze: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
  default: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
}

/**
 * 根据消息内容获取合适的图标
 * @param {string} title - 消息标题
 * @returns {string} 图标字符
 */
export function _getMessageIcon(title: string): string {
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('问') || lowerTitle.includes('?') || lowerTitle.includes('？')) {
        return ICONS.question;
    } else if (lowerTitle.includes('代码') || lowerTitle.includes('code') || lowerTitle.includes('编程')) {
        return ICONS.code;
    } else if (lowerTitle.includes('解释') || lowerTitle.includes('说明') || lowerTitle.includes('什么是')) {
        return ICONS.explain;
    } else if (lowerTitle.includes('帮助') || lowerTitle.includes('help') || lowerTitle.includes('如何')) {
        return ICONS.help;
    } else if (lowerTitle.includes('翻译') || lowerTitle.includes('translate')) {
        return ICONS.translate;
    } else if (lowerTitle.includes('总结') || lowerTitle.includes('概括')) {
        return ICONS.summarize;
    } else if (lowerTitle.includes('分析') || lowerTitle.includes('analyze')) {
        return ICONS.analyze;
    } else {
        return ICONS.default;
    }
}