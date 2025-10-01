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

/**
 * 根据消息内容获取合适的图标
 * @param {string} title - 消息标题
 * @returns {string} 图标字符
 */
export function _getMessageIcon(title: string): string {
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('问') || lowerTitle.includes('?') || lowerTitle.includes('？')) {
        return '❓';
    } else if (lowerTitle.includes('代码') || lowerTitle.includes('code') || lowerTitle.includes('编程')) {
        return '💻';
    } else if (lowerTitle.includes('解释') || lowerTitle.includes('说明') || lowerTitle.includes('什么是')) {
        return '📖';
    } else if (lowerTitle.includes('帮助') || lowerTitle.includes('help') || lowerTitle.includes('如何')) {
        return '🆘';
    } else if (lowerTitle.includes('翻译') || lowerTitle.includes('translate')) {
        return '🌐';
    } else if (lowerTitle.includes('总结') || lowerTitle.includes('概括')) {
        return '📝';
    } else if (lowerTitle.includes('分析') || lowerTitle.includes('analyze')) {
        return '🔍';
    } else {
        return '💬';
    }
}