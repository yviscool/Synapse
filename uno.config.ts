import { defineConfig, presetWind4, presetIcons, presetTypography, presetAttributify, transformerDirectives } from 'unocss'

export default defineConfig({
  presets: [
    // 预设Wind4 - 提供Tailwind CSS v4兼容的工具类
    presetWind4(),
    // 预设Icons - 支持图标类名，可以直接使用图标
    presetIcons(),
    // 预设Attributify - 支持属性化模式，可以将工具类写在HTML属性中
    presetAttributify(),
    // 预设Typography - 提供排版相关的工具类
    presetTypography(),
  ],
  transformers: [
    // 转换器Directives - 支持@apply等CSS指令
    transformerDirectives(),
  ],
  safelist: [
    'i-ph-chat-teardrop-text',      // 默认对话
    'i-ph-question',                // 提问
    'i-ph-info',                    // 寻求帮助
    'i-ph-binoculars',              // 搜索/查找
    'i-ph-magnifying-glass',      // 通用分析
    'i-ph-scales',                  // 对比/权衡
    'i-ph-lightbulb',               // 头脑风暴/想法
    'i-ph-code',                    // 编程/代码
    'i-ph-bug',                     // 调试/修复Bug
    'i-ph-rocket-launch',           // 优化/重构
    'i-ph-shield-check',            // 安全/漏洞
    'i-ph-file-code',               // 格式化/转换
    'i-ph-tree-structure',          // 结构/架构
    'i-ph-terminal-window',         // 命令行/脚本
    'i-ph-database',                // 数据库/存储
    'i-ph-cloud-arrow-up',          // 部署/发布
    'i-ph-globe-hemisphere-west',   // 网络/API
    'i-ph-gauge',                   // 性能/基准测试
    'i-ph-chart-bar',               // 图表/可视化
    'i-ph-currency-circle-dollar',  // 金融/财务
    'i-ph-gavel',                   // 法律/条款
    'i-ph-presentation-chart',      // 报告/演示
    'i-ph-megaphone',               // SEO/市场营销
    'i-ph-path',                    // 商业策略/规划
    'i-ph-users-three',             // 团队/项目管理
    'i-mdi-bullhorn-outline',       // 市场营销活动
    'i-ph-sparkle',                 // 通用创作/生成
    'i-ph-note-pencil',             // 总结/摘要
    'i-ph-book-open',               // 解释/阐述
    'i-carbon-language',            // 翻译
    'i-ph-pen',                       // 编辑/修改
    'i-mdi-palette-swatch',         // 风格/设计
    'i-ph-pencil-line',             // 专指写作/撰写
    'i-ph-book-bookmark',           // 故事/叙事
    'i-ph-flask',                   // 科学研究/实验
    'i-ph-student',                 // 学习/辅导
    'i-ph-article',                 // 论文/文献
    'i-ph-function',                // 数学/公式
    'i-ph-paint-brush',             // 通用设计
    'i-ph-image',                   // 图像生成/处理
    'i-ph-video-camera',            // 视频脚本/概念
    'i-ph-speaker-high',            // 音频/播客/音乐
    'i-ph-heartbeat',               // 健康/医疗/健身
    'i-ph-airplane-takeoff',        // 旅行规划
    'i-ph-bowl-food',               // 食物/菜谱
    'i-ph-users',                   // 社交媒体内容
    'i-ph-envelope-simple',         // 撰写邮件
  ]
})