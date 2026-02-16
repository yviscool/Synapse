/**
 * Navigation API 类型定义
 * 用于 SPA 路由切换检测（现代浏览器 Navigation API）
 */
export type NavigationApi = {
  addEventListener: (type: 'navigatesuccess', listener: () => void) => void
  removeEventListener: (type: 'navigatesuccess', listener: () => void) => void
}

/**
 * 从 window 获取 Navigation API（类型安全）
 */
export function getNavigationApi(): NavigationApi | undefined {
  return (window as Window & { navigation?: NavigationApi }).navigation
}
