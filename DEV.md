# AI Prompt Manager 开发文档（简版）

## 架构
- background（MV3 Service Worker）
  - 处理快捷键 chrome.commands、右键菜单、下载导出、消息中转
- content
  - 按 “/” 打开 Shadow DOM 面板，插入到输入框；接收 OPEN_PANEL/INSERT_PROMPT
  - 引入 outline/OutlineGenerator 按域名自适配生成大纲
- popup
  - 一键打开面板（向活动页发 OPEN_PANEL）
- options
  - 设置示例 + 导出 JSON（Dexie 全量导出）
- stores（Dexie）
  - prompts/prompt_versions/categories/tags/settings
- utils
  - messaging：消息常量
  - inputAdapter：通用输入框定位与插入

## 消息协议
- background -> content
  - APM/OPEN_PANEL：打开面板
  - APM/INSERT_PROMPT：插入文本
- 任意 -> background
  - APM/DOWNLOAD_FILE：下载导出文件

## 数据模型（Dexie）
- prompts: { id, title, content, categoryIds[], tagIds[], currentVersionId?, favorite?, createdAt, updatedAt }
- prompt_versions: { id, promptId, content, note?, parentVersionId?, createdAt }
- categories: { id, name, sort? }
- tags: { id, name }
- settings: { id:'global', hotkeyOpen, enableSlash, enableSites, panelPos, theme, outlineEnabled }

## 站点支持（大纲）
在 src/outline/OutlineGenerator.ts 中按域名映射到具体生成器，新增站点只需继承 BaseOutlineGenerator 并登记映射。

## 快捷键
- 全局 Alt+K：manifest.commands.open_panel（可在扩展管理页修改）
- 输入框 “/”：content 捕获后弹出面板（可在 settings 做开关，当前为默认开启）

## 开发
- 本地调试
  - npm run build:extension
  - Chrome 加载 dist
  - 修改代码后重新 build:extension 并在 chrome://extensions 点击“重新加载”
- 多页面入口（vite.config.ts）
  - popup.html / options.html / src/content/index.ts / src/background/index.ts
  - 输出：dist/{popup.js, options.js, content.js, background.js}

## 扩展点
- 面板 UI：在 src/content/PanelApp.vue 内扩展搜索、列表、CRUD
- Prompt CRUD：在 options/popup 内接入 Dexie，完成增删改与版本管理
- 输入框适配：utils/inputAdapter 提供通用策略，可在 options 定义站点自定义选择器

## 待办（下一步）
- 面板内接入 Dexie + Fuse 搜索，完成 Prompt 列表/筛选/插入
- 版本管理视图（diff-match-patch 对比、回滚/派生）
- settings.enableSlash 等设置与 content 行为打通
- 导入 JSON（冲突策略）