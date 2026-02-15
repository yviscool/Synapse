# Synapse - 你的 AI 助手工具箱

> **提示詞管理 · 對話採集 · 程式碼片段 —— 一站式 AI 使用體驗**

Synapse 是一款圍繞 AI 使用場景打造的瀏覽器擴充功能，集提示詞管理、對話採集、程式碼片段三大模組於一體。提示詞支援版本追溯、全文搜尋與一鍵注入；對話採集覆蓋 ChatGPT、Claude、Gemini、DeepSeek 等 12+ 主流平台，支援即時同步與多格式匯出；內建長對話大綱導航，快速定位關鍵內容。告別碎片化，讓每一次 AI 互動都有跡可循。

## ✨ 核心功能

### 📝 提示詞管理

* 集中建立、編輯、分類、搜尋提示詞，隨時調用
* 所見即所得的 Markdown 編輯器，即時預覽排版效果
* 自動儲存提示詞的歷史版本，隨時回溯與還原
* 在 AI 網站輸入框旁一鍵注入提示詞（`Alt + K` 呼出選擇器）
* `Ctrl + Shift + S` 快速儲存選取文字 / 右鍵選單直接儲存
* 全文搜尋，快速定位所需內容

### 💬 對話採集與管理

* 一鍵採集 AI 平台對話紀錄，支援手動採集與即時同步兩種模式
* 支援 12+ 平台：ChatGPT、Claude、Gemini、AI Studio、DeepSeek、Kimi、豆包、騰訊元寶、Grok、Copilot、MiniMax、智譜清言等
* 按平台、標籤、收藏篩選，多維度排序（更新時間、建立時間、採集時間、標題、訊息數）
* 對話詳情檢視，完整保留程式碼高亮、數學公式（KaTeX）、Mermaid 圖表渲染
* 支援大綱導航快速跳轉
* 支援匯出為 JSON / Markdown / TXT / HTML / PDF 多種格式

### 🧩 程式碼片段管理

* 資料夾樹狀組織 + 標籤分類，靈活管理程式碼片段
* 支援 30+ 種語言高亮：JavaScript、TypeScript、Python、Java、C/C++、C#、Go、Rust、Ruby、PHP、Swift、Kotlin、Dart 等
* 收藏、搜尋、多維排序，快速定位常用片段
* 一鍵複製並自動記錄使用次數

### 🔖 長對話大綱

* 智慧分析對話，產生結構化大綱
* 支援頂部 / 中部 / 底部快速跳轉，搭配圖示分類（問題、程式碼、解釋…）
* 大綱介面可拖曳，即時更新，適配深色/淺色主題

### ☁️ 資料與同步

* 資料本地安全儲存，支援匯入/匯出備份
* 支援 Google Drive 雲端同步，後續將持續增加其他雲端儲存服務
* 資料匯入合併，方便遷移和整合

---

## 📸 Demo 截圖

### 提示詞管理

![提示詞列表](../demo/prompt1.png)
![提示詞分類](../demo/prompt2.png)
![提示詞選擇器](../demo/3.png)

### 提示詞選擇器注入（AI 輸入框）

![提示詞編輯](../demo/prompt_content1.png)
![提示詞預覽](../demo/prompt_content2.png)
![版本歷史](../demo/prompt_content3.png)

### 對話採集與管理

![對話列表](../demo/chat1.png)
![對話詳情](../demo/chat2.png)
![對話渲染](../demo/chat4.png)
![對話匯出](../demo/chat3.png)

### AI 網站大綱產生

![AI 大綱產生 1](../demo/5.png)
![AI 大綱產生 2](../demo/6.png)
![AI 大綱產生 3](../demo/7.png)

### 程式碼片段管理

![片段編輯器](../demo/tool1.png)
![片段預覽](../demo/tool2.png)

---

## 🌐 支援平台

ChatGPT · Claude · Gemini · AI Studio · DeepSeek · Kimi · 豆包 · 騰訊元寶 · Grok · Copilot · MiniMax · 智譜清言 等

## 🚀 使用指南

* 在 **AI 網站輸入框** 輸入 `/p` 或按 `Alt + K` 呼出 **提示詞選擇器**
* 快速儲存提示詞：`Ctrl + Shift + S` 或選取文字 → 右鍵 → 儲存為提示詞
* 在 AI 網站側邊面板中一鍵採集當前對話，或開啟即時同步
* 開啟擴充功能後台頁面管理提示詞、對話紀錄和程式碼片段

---

## 📦 安裝指南

### Chrome 商店下載
[點擊前往 Chrome 商店安裝](https://chromewebstore.google.com/detail/synapse/mdnfmfgnnbeodhpfnkeobmhifodhhjcj?authuser=0&hl=zh-TW)

### Releases 手動安裝
1. 前往 [Releases](https://github.com/yviscool/synapse/releases) 頁面
2. 下載 `extension-版本號.zip`
3. 開啟瀏覽器擴充功能管理頁面，啟用 **開發者模式**
4. 將 `extension-版本號.zip` 拖曳安裝
5. 點擊工具列 Synapse 圖示開始使用，或直接造訪 AI 網站體驗

---

## 📜 開源授權

本專案基於 [MIT License](../LICENSE) 開源
