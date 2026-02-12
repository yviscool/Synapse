export default {
  title: "对话记录",

  // 平台
  platforms: {
    all: "全部平台",
    chatgpt: "ChatGPT",
    claude: "Claude",
    gemini: "Gemini",
    deepseek: "DeepSeek",
    kimi: "Kimi",
    doubao: "豆包",
    yuanbao: "腾讯元宝",
    grok: "Grok",
    copilot: "Copilot",
    other: "其他",
  },

  // 侧边栏
  sidebar: {
    all: "全部",
    starred: "收藏",
    tags: "标签",
    clearTags: "清除标签筛选",
    noTags: "暂无标签",
    conversations: "{count} 条对话",
  },

  // 列表
  list: {
    empty: "暂无对话记录",
    emptyHint: "从 AI 平台采集对话后将显示在这里",
    searchPlaceholder: "搜索对话...",
    sortBy: "排序",
    sortOptions: {
      updatedAt: "更新时间",
      createdAt: "创建时间",
      collectedAt: "采集时间",
      title: "标题",
      messageCount: "消息数",
    },
    messages: "{count} 条消息",
    collected: "采集于",
  },

  // 详情
  detail: {
    noSelection: "选择一个对话查看详情",
    messages: "消息",
    note: "备注",
    notePlaceholder: "添加备注...",
    tags: "标签",
    tagsPlaceholder: "输入标签，按回车添加",
    link: "原始链接",
    openLink: "打开原始对话",
    thinking: "思考过程",
    editTitle: "编辑标题",
    thinkingLabel: "已思考",
    thinkingTime: "{seconds}秒",
    edit: "编辑",
    copy: "复制",
    deleteMessage: "删除消息",
    edited: "已编辑",
  },

  // 操作
  actions: {
    star: "收藏",
    unstar: "取消收藏",
    export: "导出",
    delete: "删除",
    deleteConfirm: "确定要删除这条对话记录吗？此操作不可撤销。",
    batchDelete: "批量删除",
    batchDeleteConfirm: "确定要删除选中的 {count} 条对话记录吗？",
    selectAll: "全选",
    deselectAll: "取消全选",
    collect: "采集对话",
  },

  // 导出
  export: {
    title: "导出对话",
    format: "格式",
    preview: "预览",
    formats: {
      json: "JSON",
      markdown: "Markdown",
      txt: "纯文本",
      html: "HTML",
    },
    options: {
      includeMetadata: "包含元数据",
      includeTimestamps: "包含时间戳",
      includeThinking: "包含思考过程",
    },
    download: "下载",
    copy: "复制内容",
  },

  // 消息角色
  roles: {
    user: "用户",
    assistant: "助手",
    system: "系统",
  },

  // Toast 消息
  toast: {
    saveSuccess: "保存成功",
    saveFailed: "保存失败",
    deleteSuccess: "删除成功",
    deleteFailed: "删除失败",
    exportSuccess: "导出成功",
    exportFailed: "导出失败",
    copySuccess: "已复制到剪贴板",
    copyFailed: "复制失败",
    starAdded: "已添加收藏",
    starRemoved: "已取消收藏",
    collectSuccess: "采集成功",
    collectFailed: "采集失败",
  },

  // 大纲
  outline: {
    title: "大纲",
    empty: "暂无提问",
  },

  // 空状态
  empty: {
    title: "开始采集你的 AI 对话",
    description: "支持 ChatGPT、Claude、Gemini 等主流 AI 平台",
    features: {
      collect: "一键采集对话内容",
      manage: "统一管理多平台对话",
      search: "全文搜索快速定位",
      export: "多格式导出分享",
    },
  },
};
