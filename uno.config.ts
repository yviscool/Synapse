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
})