import enTools from "../en/tools";

export default {
  ...enTools,
  title: "コードスニペット",

  sidebar: {
    all: "すべて",
    starred: "お気に入り",
    recent: "最近",
    uncategorized: "未分類",
    folders: "フォルダ",
    tags: "タグ",
    newFolder: "新規フォルダ",
    newSnippet: "新規スニペット",
    clearAll: "クリア",
    clearTags: "タグフィルターをすべてクリア",
    noTags: "タグはまだありません",
  },

  list: {
    empty: "スニペットはまだありません",
    emptyHint: "上のボタンをクリックして最初のスニペットを作成",
    searchPlaceholder: "スニペットを検索...",
    sortBy: "並び替え",
    sortOptions: {
      updatedAt: "更新日時",
      createdAt: "作成日時",
      title: "タイトル",
      usedAt: "最終使用",
      useCount: "使用回数",
    },
    filterByLanguage: "言語でフィルター",
    clearFilters: "フィルターをクリア",
    items: "{count} 件のスニペット",
  },

  editor: {
    titlePlaceholder: "スニペットのタイトルを入力...",
    contentPlaceholder: "コードを入力...",
    language: "言語",
    tags: "タグ",
    tagsPlaceholder: "タグを入力してEnter",
    folder: "フォルダ",
    noFolder: "未分類",
    starred: "お気に入り",
    save: "保存",
    copy: "コピー",
    download: "ファイルをダウンロード",
    copySuccess: "クリップボードにコピーしました",
    delete: "削除",
    deleteConfirm: "このスニペットを削除しますか？この操作は元に戻せません。",
    preview: "プレビュー",
    edit: "編集",
    charCount: "{count} 文字",
    lineCount: "{count} 行",
    lastUsed: "最終使用",
    useCount: "使用回数",
    never: "未使用",
    times: "{count} 回",
  },

  preview: {
    title: "HTMLプレビュー",
    fullscreen: "全画面",
    exitFullscreen: "全画面を終了",
    externalLinks: "外部リンクを検出",
    externalLinksWarning: "このHTMLには拡張機能内で正しく読み込めない外部リソースが含まれています。",
    exportHtml: "HTMLをエクスポート",
    openInCodePen: "CodePenで開く",
    dependencies: "外部依存関係",
  },

  folder: {
    rename: "名前を変更",
    delete: "削除",
    deleteConfirm: "このフォルダを削除しますか？中のスニペットは未分類に移動されます。",
    newSubfolder: "新規サブフォルダ",
    moveTo: "移動先",
    maxDepthWarning: "フォルダは最大3階層までネストできます",
    namePlaceholder: "フォルダ名",
  },

  tag: {
    manage: "タグを管理",
    delete: "削除",
    deleteConfirm: "このタグを削除しますか？",
    rename: "名前を変更",
    color: "色",
  },

  languages: {
    ...enTools.languages,
    text: "プレーンテキスト",
  },

  toast: {
    saveSuccess: "スニペットを保存しました",
    saveFailed: "保存に失敗しました",
    deleteSuccess: "削除しました",
    deleteFailed: "削除に失敗しました",
    copySuccess: "クリップボードにコピーしました",
    copyFailed: "コピーに失敗しました",
    folderCreated: "フォルダを作成しました",
    folderDeleted: "フォルダを削除しました",
    tagDeleted: "タグを削除しました",
    movedToFolder: "フォルダに移動しました",
  },
};
