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
  question:  'i-ph-question-bold',
  code:      'i-ph-code-bold',
  explain:   'i-ph-book-open-bold',
  help:      'i-ph-info-bold',
  translate: 'i-carbon-language',
  summarize: 'i-ph-note-pencil-bold',
  analyze:   'i-ph-magnifying-glass-bold',
  default:   'i-ph-chat-teardrop-text-bold',
}

/**
 * 根据消息内容获取合适的图标类名
 * @param {string} title - 消息标题
 * @returns {string} 图标的 CSS 类名
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