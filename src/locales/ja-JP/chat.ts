import enChat from "../en/chat";

export default {
  ...enChat,
  title: "チャット履歴",

  platforms: {
    all: "すべてのプラットフォーム",
    chatgpt: "ChatGPT",
    claude: "Claude",
    gemini: "Gemini",
    deepseek: "DeepSeek",
    kimi: "Kimi",
    doubao: "Doubao",
    qianwen: "Qwen",
    yuanbao: "Tencent Yuanbao",
    grok: "Grok",
    copilot: "Copilot",
    other: "その他",
  },

  sidebar: {
    all: "すべて",
    starred: "お気に入り",
    tags: "タグ",
    clearTags: "タグフィルターをクリア",
    noTags: "タグはまだありません",
    conversations: "{count} 件の会話",
  },

  list: {
    empty: "会話はまだありません",
    emptyHint: "AIプラットフォームから収集した会話がここに表示されます",
    searchPlaceholder: "会話を検索...",
    sortBy: "並び替え",
    sortOptions: {
      updatedAt: "更新日時",
      createdAt: "作成日時",
      collectedAt: "収集日時",
      title: "タイトル",
      messageCount: "メッセージ数",
    },
    messages: "{count} 件のメッセージ",
    collected: "収集済み",
  },

  detail: {
    noSelection: "会話を選択して詳細を表示",
    messages: "メッセージ",
    note: "メモ",
    notePlaceholder: "メモを追加...",
    tags: "タグ",
    tagsPlaceholder: "タグを入力してEnter",
    link: "元のリンク",
    openLink: "元の会話を開く",
    thinking: "思考プロセス",
    editTitle: "タイトルを編集",
    thinkingLabel: "思考",
    thinkingTime: "{seconds}秒",
    edit: "編集",
    copy: "コピー",
    copied: "コピー済み",
    mermaidChart: "チャート",
    mermaidCode: "コード",
    mermaidCopy: "コピー",
    mermaidDownload: "ダウンロード",
    mermaidFullscreen: "全画面",
    deleteMessage: "メッセージを削除",
    edited: "編集済み",
    user: "ユーザー",
  },

  actions: {
    star: "お気に入り",
    unstar: "お気に入り解除",
    export: "エクスポート",
    delete: "削除",
    deleteConfirm: "この会話を削除しますか？この操作は元に戻せません。",
    batchDelete: "一括削除",
    batchDeleteConfirm: "選択した{count}件の会話を削除しますか？",
    selectAll: "すべて選択",
    deselectAll: "選択解除",
    collect: "チャットを収集",
  },

  export: {
    title: "会話をエクスポート",
    format: "形式",
    preview: "プレビュー",
    formats: {
      json: "JSON",
      markdown: "Markdown",
      txt: "プレーンテキスト",
      html: "HTML",
    },
    options: {
      includeMetadata: "メタデータを含む",
      includeTimestamps: "タイムスタンプを含む",
      includeThinking: "思考プロセスを含む",
    },
    download: "ダウンロード",
    copy: "内容をコピー",
  },

  roles: {
    user: "ユーザー",
    assistant: "アシスタント",
    system: "システム",
  },

  toast: {
    saveSuccess: "保存しました",
    saveFailed: "保存に失敗しました",
    deleteSuccess: "削除しました",
    deleteFailed: "削除に失敗しました",
    exportSuccess: "エクスポートしました",
    exportFailed: "エクスポートに失敗しました",
    copySuccess: "クリップボードにコピーしました",
    copyFailed: "コピーに失敗しました",
    starAdded: "お気に入りに追加しました",
    starRemoved: "お気に入りから削除しました",
    collectSuccess: "収集しました",
    collectFailed: "収集に失敗しました",
  },

  outline: {
    title: "アウトライン",
    empty: "質問はまだありません",
  },

  empty: {
    title: "AI会話の収集を始めましょう",
    description: "ChatGPT、Claude、Geminiなど主要なAIプラットフォームに対応",
    features: {
      collect: "ワンクリックで会話を収集",
      manage: "マルチプラットフォームの統合管理",
      search: "全文検索で素早くアクセス",
      export: "複数形式でエクスポート・共有",
    },
  },
};
