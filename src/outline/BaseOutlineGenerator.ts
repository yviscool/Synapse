
export class BaseOutlineGenerator {
    constructor(config) {
        // 合并默认配置和用户配置
        this.config = {
            selectors: {
                userMessage: '',
                messageText: '',
                observeTarget: 'body',
                scrollContainer: window
            },
            options: {
                waitForContentLoaded: false,
                contentReadySelector: ''
            },
            ...config
        };

        // 初始化状态变量
        this.uiReady = false;             // UI是否已准备就绪
        this.outlineContainer = null;     // 大纲容器元素
        this.toggleButton = null;         // 切换按钮元素
        this.styleElement = null;         // 样式元素
        this.hintOverlay = null;          // 提示覆盖层
        this.searchInput = null;          // 搜索输入框
        this.lastUrl = window.location.href; // 上次URL，用于检测页面变化
        this.scrollTimer = null;          // 滚动定时器
        this.observer = null;             // DOM变化观察器
        this.isCollapsed = false;         // 是否折叠状态
        this.allItems = [];               // 所有大纲项目的缓存

        // 拖动功能相关状态
        this.isDragging = false;
        this.dragStartY = 0;
        this.initialTop = 0;

        // 预先绑定事件处理器，以便能正确移除监听器
        this._boundDragMove = this._dragMove.bind(this);
        this._boundDragEnd = this._dragEnd.bind(this);
    }

    /**
     * 添加样式到页面
     * 包含完整的CSS样式定义，支持亮色和暗色主题
     */
    _addStyles() {
        if (this.styleElement && document.head.contains(this.styleElement)) return;

        const css = `
              /* CSS变量定义 - 支持亮色和暗色主题 */
              :root {
                  --outline-primary: #00A9FF;
                  --outline-primary-hover: #0088CC;
                  --outline-success: #10B981;
                  --outline-warning: #F59E0B;
                  --outline-danger: #EF4444;

                  /* 亮色主题 */
                  --outline-bg-light: rgba(255, 255, 255, 0.85);
                  --outline-bg-secondary-light: rgba(248, 250, 252, 0.9);
                  --outline-hover-bg-light: rgba(240, 240, 240, 0.95);
                  --outline-text-light: #1f2937;
                  --outline-text-secondary-light: #6b7280;
                  --outline-border-light: rgba(0, 0, 0, 0.08);

                  /* 暗色主题 */
                  --outline-bg-dark: rgba(17, 24, 39, 0.85);
                  --outline-bg-secondary-dark: rgba(31, 41, 55, 0.9);
                  --outline-hover-bg-dark: rgba(55, 65, 81, 0.95);
                  --outline-text-dark: #f9fafb;
                  --outline-text-secondary-dark: #9ca3af;
                  --outline-border-dark: rgba(255, 255, 255, 0.1);

                  /* 阴影效果 */
                  --outline-shadow-light: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                  --outline-shadow-dark: 0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
              }

              /* 暗色主题样式 */
              .outline-container-wrapper.dark .outline-container {
                  background: var(--outline-bg-dark);
                  border: 1px solid var(--outline-border-dark);
                  box-shadow: var(--outline-shadow-dark);
              }

              .outline-container-wrapper.dark .outline-header {
                  background: var(--outline-bg-secondary-dark);
                  border-bottom-color: var(--outline-border-dark);
                  color: var(--outline-text-dark);
              }

              .outline-container-wrapper.dark .outline-item {
                  color: var(--outline-text-dark);
              }

              .outline-container-wrapper.dark .outline-item:hover {
                  background-color: var(--outline-hover-bg-dark);
              }

              .outline-container-wrapper.dark .outline-empty {
                  color: var(--outline-text-secondary-dark);
              }

              .outline-container-wrapper.dark .outline-search {
                  background: var(--outline-bg-secondary-dark);
                  border-color: var(--outline-border-dark);
                  color: var(--outline-text-dark);
              }

              .outline-container-wrapper.dark .outline-search::placeholder {
                  color: var(--outline-text-secondary-dark);
              }

              /* 主容器样式 */
              .outline-container {
                  position: fixed;
                  top: 80px;
                  right: 20px;
                  width: 320px;
                  max-height: calc(100vh - 100px);
                  border-radius: 16px;
                  z-index: 9999;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
                  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
                  overflow: hidden;
                  border: 1px solid var(--outline-border-light);
                  background: var(--outline-bg-light);
                  backdrop-filter: blur(20px);
                  -webkit-backdrop-filter: blur(20px);
                  box-shadow: var(--outline-shadow-light);
              }

              /* 折叠状态 */
              .outline-container.collapsed {
                  width: 60px;
                  height: 60px;
                  border-radius: 50%;
                  overflow: hidden;
                  cursor: grab; /* 改为抓取手势，表示可拖动 */
              }

              .outline-container.collapsed:active {
                  cursor: grabbing; /* 拖动时的手势 */
                  transform: scale(1.05);
              }

              .outline-container.collapsed .outline-header {
                  padding: 18px;
                  justify-content: center;
                  border-bottom: none;
                  height: 100%;
                  box-sizing: border-box;
              }

              .outline-container.collapsed .outline-title-text,
              .outline-container.collapsed .outline-controls,
              .outline-container.collapsed .outline-search,
              .outline-container.collapsed .outline-items,
              .outline-container.collapsed .outline-stats {
                  display: none;
              }

              .outline-container.collapsed .outline-title {
                  justify-content: center;
              }

              .outline-container.collapsed .outline-title-icon {
                  font-size: 24px;
                  transform: rotate(0deg);
              }

              .outline-container.collapsed:hover {
                  transform: scale(1.05);
                  box-shadow: 0 8px 25px rgba(0, 169, 255, 0.3);
              }

              .outline-container.collapsed:hover .outline-title-icon {
                  transform: rotate(15deg);
              }

              /* 拖动时给body添加样式 */
              body.outline-dragging {
                  cursor: grabbing !important;
                  user-select: none !important;
                  -webkit-user-select: none !important;
              }

              /* 头部样式 */
              .outline-header {
                  padding: 16px 20px;
                  font-weight: 600;
                  font-size: 16px;
                  border-bottom: 1px solid var(--outline-border-light);
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  position: sticky;
                  top: 0;
                  background: var(--outline-bg-secondary-light);
                  z-index: 2;
                  color: var(--outline-text-light);
              }

              .outline-title {
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  flex: 1;
              }

              .outline-title-icon {
                  font-size: 18px;
                  transition: transform 0.3s ease;
              }

              .outline-title-text {
                  font-weight: 600;
                  letter-spacing: -0.025em;
              }

              .outline-controls {
                  display: flex;
                  align-items: center;
                  gap: 8px;
              }

              .outline-control-btn {
                  width: 28px;
                  height: 28px;
                  border-radius: 6px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  font-size: 14px;
                  opacity: 0.7;
              }

              .outline-control-btn:hover {
                  opacity: 1;
                  background-color: var(--outline-hover-bg-light);
                  transform: scale(1.1);
              }

              .outline-container-wrapper.dark .outline-control-btn:hover {
                  background-color: var(--outline-hover-bg-dark);
              }

              /* 折叠按钮特殊样式 */
              .outline-control-btn.collapse-btn {
                  color: var(--outline-primary);
              }

              .outline-control-btn.collapse-btn:hover {
                  background-color: rgba(0, 169, 255, 0.1);
                  color: var(--outline-primary-hover);
              }

              /* 关闭按钮特殊样式 */
              .outline-control-btn.close-btn {
                  color: var(--outline-danger);
              }

              .outline-control-btn.close-btn:hover {
                  background-color: rgba(239, 68, 68, 0.1);
                  color: #dc2626;
              }

              /* 搜索框样式 */
              .outline-search {
                  margin: 12px 16px;
                  padding: 10px 12px;
                  border: 1px solid var(--outline-border-light);
                  border-radius: 8px;
                  font-size: 14px;
                  background: var(--outline-bg-secondary-light);
                  color: var(--outline-text-light);
                  transition: all 0.2s ease;
                  outline: none;
              }

              .outline-search:focus {
                  border-color: var(--outline-primary);
                  box-shadow: 0 0 0 3px rgba(0, 169, 255, 0.1);
              }

              .outline-search::placeholder {
                  color: var(--outline-text-secondary-light);
              }

              /* 项目列表样式 */
              .outline-items {
                  padding: 8px 12px;
                  list-style: none;
                  margin: 0;
                  overflow-y: auto;
                  max-height: calc(100vh - 220px);
                  scrollbar-width: thin;
                  scrollbar-color: var(--outline-primary) transparent;
              }

              .outline-items::-webkit-scrollbar {
                  width: 4px;
              }

              .outline-items::-webkit-scrollbar-track {
                  background: transparent;
              }

              .outline-items::-webkit-scrollbar-thumb {
                  background: var(--outline-primary);
                  border-radius: 2px;
              }

              /* 大纲项目样式 */
              .outline-item {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  padding: 12px 14px;
                  margin-bottom: 6px;
                  border-radius: 10px;
                  cursor: pointer;
                  font-size: 14px;
                  line-height: 1.4;
                  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                  border-left: 3px solid transparent;
                  color: var(--outline-text-light);
                  position: relative;
                  overflow: hidden;
              }

              .outline-item::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background: linear-gradient(135deg, var(--outline-primary), var(--outline-primary-hover));
                  opacity: 0;
                  transition: opacity 0.25s ease;
                  z-index: -1;
              }

              .outline-item:hover {
                  background-color: var(--outline-hover-bg-light);
                  transform: translateX(6px) scale(1.02);
                  box-shadow: 0 4px 12px rgba(0, 169, 255, 0.15);
              }

              .outline-item.active {
                  border-left-color: var(--outline-primary);
                  background-color: rgba(0, 169, 255, 0.08);
                  font-weight: 500;
                  transform: translateX(3px);
              }

              .outline-item.active::before {
                  opacity: 0.05;
              }

              .outline-item.hidden {
                  display: none;
              }

              .outline-item-icon {
                  color: var(--outline-primary);
                  flex-shrink: 0;
                  width: 20px;
                  text-align: center;
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  font-size: 16px;
              }

              .outline-item-text {
                  flex: 1;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  font-weight: 400;
              }

              .outline-item-number {
                  font-size: 12px;
                  color: var(--outline-text-secondary-light);
                  font-weight: 500;
                  min-width: 20px;
              }

              .outline-container-wrapper.dark .outline-item-number {
                  color: var(--outline-text-secondary-dark);
              }

              /* 空状态样式 */
              .outline-empty {
                  padding: 60px 20px;
                  text-align: center;
                  color: var(--outline-text-secondary-light);
                  font-size: 14px;
                  line-height: 1.6;
              }

              .outline-empty-icon {
                  font-size: 48px;
                  margin-bottom: 16px;
                  opacity: 0.5;
              }

              /* 切换按钮样式 */
              .outline-toggle {
                  position: fixed;
                  top: 80px;
                  right: 20px;
                  width: 56px;
                  height: 56px;
                  border-radius: 50%;
                  background: linear-gradient(135deg, var(--outline-primary), var(--outline-primary-hover));
                  color: white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  cursor: pointer;
                  z-index: 10000;
                  box-shadow: 0 8px 25px rgba(0, 169, 255, 0.4);
                  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                  font-size: 20px;
              }

              .outline-toggle:hover {
                  transform: scale(1.1) rotate(15deg);
                  box-shadow: 0 12px 35px rgba(0, 169, 255, 0.5);
              }

              .outline-toggle:active {
                  transform: scale(0.95);
              }

              /* 功能说明提示 */
              .outline-function-hint {
                  position: fixed;
                  top: 150px;
                  right: 20px;
                  background: rgba(0, 0, 0, 0.8);
                  color: white;
                  padding: 12px 16px;
                  border-radius: 8px;
                  font-size: 12px;
                  line-height: 1.4;
                  max-width: 200px;
                  z-index: 10001;
                  opacity: 0;
                  transform: translateY(-10px);
                  transition: all 0.3s ease;
                  pointer-events: none;
                  backdrop-filter: blur(10px);
                  -webkit-backdrop-filter: blur(10px);
              }

              .outline-function-hint.visible {
                  opacity: 1;
                  transform: translateY(0);
              }

              .outline-function-hint::before {
                  content: '';
                  position: absolute;
                  top: -6px;
                  right: 20px;
                  width: 0;
                  height: 0;
                  border-left: 6px solid transparent;
                  border-right: 6px solid transparent;
                  border-bottom: 6px solid rgba(0, 0, 0, 0.8);
              }

              .outline-hint-item {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  margin-bottom: 6px;
              }

              .outline-hint-item:last-child {
                  margin-bottom: 0;
              }

              .outline-hint-icon {
                  width: 16px;
                  text-align: center;
                  flex-shrink: 0;
              }

              .outline-hint-text {
                  flex: 1;
              }

              /* 滚动提示覆盖层 */
              .scroll-hint-overlay {
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  z-index: 9998;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  transition: opacity 0.25s ease;
                  opacity: 0;
                  pointer-events: none;
              }

              .scroll-hint-overlay.visible {
                  opacity: 1;
              }

              .scroll-hint-text {
                  color: white;
                  font-size: 18px;
                  font-weight: 600;
                  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                  padding: 16px 24px;
                  background: rgba(0, 0, 0, 0.75);
                  border-radius: 12px;
                  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                  backdrop-filter: blur(10px);
                  -webkit-backdrop-filter: blur(10px);
              }

              /* 高亮目标样式 */
              .outline-highlight-target {
                  transition: all 0.3s ease !important;
                  outline: 2px solid var(--outline-primary) !important;
                  outline-offset: 4px;
                  background-color: rgba(0, 169, 255, 0.05) !important;
                  border-radius: 8px !important;
              }

              /* 统计信息样式 */
              .outline-stats {
                  padding: 8px 16px;
                  font-size: 12px;
                  color: var(--outline-text-secondary-light);
                  border-top: 1px solid var(--outline-border-light);
                  background: var(--outline-bg-secondary-light);
                  text-align: center;
              }

              .outline-container-wrapper.dark .outline-stats {
                  color: var(--outline-text-secondary-dark);
                  border-top-color: var(--outline-border-dark);
                  background: var(--outline-bg-secondary-dark);
              }

              /* 响应式设计 */
              @media (max-width: 768px) {
                  .outline-container {
                      width: 280px;
                      right: 10px;
                      top: 60px;
                  }

                  .outline-toggle {
                      right: 10px;
                      top: 60px;
                      width: 48px;
                      height: 48px;
                  }
              }

              /* 动画效果 */
              @keyframes slideInRight {
                  from {
                      transform: translateX(100%);
                      opacity: 0;
                  }
                  to {
                      transform: translateX(0);
                      opacity: 1;
                  }
              }

              @keyframes fadeIn {
                  from {
                      opacity: 0;
                      transform: scale(0.9);
                  }
                  to {
                      opacity: 1;
                      transform: scale(1);
                  }
              }

              .outline-container {
                  animation: slideInRight 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
              }

              .outline-item {
                  animation: fadeIn 0.3s ease forwards;
              }
            `;

        this.styleElement = document.createElement('style');
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }

    /**
     * 创建用户界面
     * 构建完整的大纲UI结构
     */
    _createUI() {
        if (this.uiReady) return;

        // 创建主容器包装器
        const wrapper = document.createElement('div');
        wrapper.className = 'outline-container-wrapper';

        // 创建大纲容器
        this.outlineContainer = document.createElement('div');
        this.outlineContainer.className = 'outline-container';
        this.outlineContainer.style.display = 'none';

        // 创建头部
        const header = this._createHeader();

        // 创建搜索框
        const searchBox = this._createSearchBox();

        // 创建项目列表
        const itemsList = document.createElement('ul');
        itemsList.className = 'outline-items';

        // 创建统计信息
        const stats = document.createElement('div');
        stats.className = 'outline-stats';
        stats.textContent = '暂无对话';

        // 组装大纲容器
        this.outlineContainer.appendChild(header);
        this.outlineContainer.appendChild(searchBox);
        this.outlineContainer.appendChild(itemsList);
        this.outlineContainer.appendChild(stats);
        wrapper.appendChild(this.outlineContainer);

        // 创建切换按钮
        this.toggleButton = this._createToggleButton();
        wrapper.appendChild(this.toggleButton);

        // 创建提示覆盖层
        this.hintOverlay = this._createHintOverlay();
        wrapper.appendChild(this.hintOverlay);

        // 添加到页面
        document.body.appendChild(wrapper);
        this.uiReady = true;

        // 初始化拖动功能
        this._initDrag();
    }

    /**
     * 初始化拖动功能
     */
    _initDrag() {
        this.outlineContainer.addEventListener('mousedown', this._dragStart.bind(this));
        this.outlineContainer.addEventListener('touchstart', this._dragStart.bind(this), { passive: false });
    }

    /**
     * 开始拖动
     * @param {MouseEvent | TouchEvent} event - 事件对象
     */
    _dragStart(event) {
        // 仅在折叠状态下允许拖动
        if (!this.isCollapsed) return;

        // 阻止默认行为，如文本选择或页面滚动
        if (event.type === 'touchstart') {
            event.preventDefault();
        }

        this.isDragging = true;
        document.body.classList.add('outline-dragging');

        // 记录初始位置
        this.dragStartY = event.type === 'touchstart' ? event.touches[0].clientY : event.clientY;
        this.initialTop = this.outlineContainer.offsetTop;

        // 在document上添加移动和结束监听器，以确保拖动流畅
        document.addEventListener('mousemove', this._boundDragMove);
        document.addEventListener('mouseup', this._boundDragEnd);
        document.addEventListener('touchmove', this._boundDragMove, { passive: false });
        document.addEventListener('touchend', this._boundDragEnd);
    }

    /**
     * 拖动中
     * @param {MouseEvent | TouchEvent} event - 事件对象
     */
    _dragMove(event) {
        if (!this.isDragging) return;

        // 在触摸设备上阻止页面滚动
        if (event.type === 'touchmove') {
            event.preventDefault();
        }

        const currentY = event.type === 'touchmove' ? event.touches[0].clientY : event.clientY;
        const deltaY = currentY - this.dragStartY;
        let newTop = this.initialTop + deltaY;

        // 限制在视窗内垂直移动
        const containerHeight = this.outlineContainer.offsetHeight;
        const viewportHeight = window.innerHeight;
        newTop = Math.max(0, Math.min(newTop, viewportHeight - containerHeight));

        this.outlineContainer.style.top = `${newTop}px`;
    }

    /**
     * 结束拖动
     */
    _dragEnd() {
        if (!this.isDragging) return;

        this.isDragging = false;
        document.body.classList.remove('outline-dragging');

        // 移除document上的监听器
        document.removeEventListener('mousemove', this._boundDragMove);
        document.removeEventListener('mouseup', this._boundDragEnd);
        document.removeEventListener('touchmove', this._boundDragMove);
        document.removeEventListener('touchend', this._boundDragEnd);
    }


    /**
     * 创建头部区域
     */
    _createHeader() {
        const header = document.createElement('div');
        header.className = 'outline-header';

        // 标题区域
        const titleDiv = document.createElement('div');
        titleDiv.className = 'outline-title';

        const titleIcon = document.createElement('span');
        titleIcon.className = 'outline-title-icon';
        titleIcon.textContent = '💬';

        const titleText = document.createElement('span');
        titleText.className = 'outline-title-text';
        titleText.textContent = '对话大纲';

        titleDiv.appendChild(titleIcon);
        titleDiv.appendChild(titleText);

        // 为标题区域添加点击事件，用于在折叠状态下展开
        titleDiv.addEventListener('click', () => {
            if (this.isCollapsed) {
                this._toggleCollapse();
            }
        });

        // 控制按钮区域
        const controls = document.createElement('div');
        controls.className = 'outline-controls';

        // 折叠按钮 - 使用更清晰的图标
        const collapseButton = document.createElement('span');
        collapseButton.className = 'outline-control-btn collapse-btn';
        collapseButton.title = '折叠大纲 (隐藏内容但保持可见)';
        collapseButton.textContent = '⚊';
        collapseButton.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止事件冒泡
            this._toggleCollapse();
        });

        // 刷新按钮
        const refreshButton = document.createElement('span');
        refreshButton.className = 'outline-control-btn';
        refreshButton.title = '刷新大纲内容';
        refreshButton.textContent = '↻';
        refreshButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.generateOutlineItems();
        });

        // 关闭按钮 - 完全隐藏大纲
        const closeButton = document.createElement('span');
        closeButton.className = 'outline-control-btn close-btn';
        closeButton.title = '关闭大纲 (完全隐藏)';
        closeButton.textContent = '✖';
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hide();
        });

        controls.appendChild(collapseButton);
        controls.appendChild(refreshButton);
        // controls.appendChild(closeButton);

        header.appendChild(titleDiv);
        header.appendChild(controls);

        return header;
    }

    /**
     * 创建搜索框
     */
    _createSearchBox() {
        this.searchInput = document.createElement('input');
        this.searchInput.className = 'outline-search';
        this.searchInput.type = 'text';
        this.searchInput.placeholder = '搜索对话内容...';

        // 添加搜索功能
        this.searchInput.addEventListener('input', (e) => {
            this._filterItems(e.target.value);
        });

        return this.searchInput;
    }

    /**
     * 创建切换按钮
     */
    _createToggleButton() {
        const toggleButton = document.createElement('div');
        toggleButton.className = 'outline-toggle';
        toggleButton.title = '显示对话大纲';

        // 添加点击事件
        toggleButton.addEventListener('click', () => this.show());

        // 添加悬停提示功能
        let hintTimeout;
        toggleButton.addEventListener('mouseenter', () => {
            hintTimeout = setTimeout(() => {
                this._showFunctionHint();
            }, 800);
        });

        toggleButton.addEventListener('mouseleave', () => {
            if (hintTimeout) {
                clearTimeout(hintTimeout);
            }
            this._hideFunctionHint();
        });

        const toggleIcon = document.createElement('span');
        toggleIcon.textContent = '📋';
        toggleButton.appendChild(toggleIcon);

        return toggleButton;
    }

    /**
     * 显示功能说明提示
     */
    _showFunctionHint() {
        // 如果已经有提示框，先移除
        this._hideFunctionHint();

        const hint = document.createElement('div');
        hint.className = 'outline-function-hint visible';
        hint.id = 'outline-function-hint';

        hint.innerHTML = `
              <div class="outline-hint-item">
                  <span class="outline-hint-icon">📋</span>
                  <span class="outline-hint-text">点击显示完整大纲</span>
              </div>
              <div class="outline-hint-item">
                  <span class="outline-hint-icon">⚊</span>
                  <span class="outline-hint-text">折叠 = 隐藏内容保持可见</span>
              </div>
              <div class="outline-hint-item">
                  <span class="outline-hint-icon">✖</span>
                  <span class="outline-hint-text">关闭 = 完全隐藏大纲</span>
              </div>
            `;

        document.body.appendChild(hint);
    }

    /**
     * 隐藏功能说明提示
     */
    _hideFunctionHint() {
        const hint = document.getElementById('outline-function-hint');
        if (hint) {
            hint.remove();
        }
    }

    /**
     * 创建提示覆盖层
     */
    _createHintOverlay() {
        const hintOverlay = document.createElement('div');
        hintOverlay.className = 'scroll-hint-overlay';

        const hintText = document.createElement('span');
        hintText.className = 'scroll-hint-text';
        hintOverlay.appendChild(hintText);

        return hintOverlay;
    }

    /**
     * 切换折叠状态
     * 折叠：隐藏内容但保持大纲可见，显示为小圆圈
     * 展开：显示完整内容
     */
    _toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        if (this.outlineContainer) {
            this.outlineContainer.classList.toggle('collapsed', this.isCollapsed);

            // 更新折叠按钮的图标和提示
            const collapseBtn = this.outlineContainer.querySelector('.collapse-btn');
            if (collapseBtn) {
                if (this.isCollapsed) {
                    collapseBtn.textContent = '⚏';
                    collapseBtn.title = '展开大纲 (显示完整内容)';
                } else {
                    collapseBtn.textContent = '⚊';
                    collapseBtn.title = '折叠大纲 (隐藏内容但保持可见)';
                }
            }
        }
    }

    /**
     * 过滤大纲项目
     * @param {string} searchTerm - 搜索关键词
     */
    _filterItems(searchTerm) {
        if (!this.outlineContainer) return;

        const items = this.outlineContainer.querySelectorAll('.outline-item');
        let visibleCount = 0;

        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            const isVisible = text.includes(searchTerm.toLowerCase());

            item.classList.toggle('hidden', !isVisible);
            if (isVisible) visibleCount++;
        });

        // 更新统计信息
        this._updateStats(visibleCount, items.length);
    }

    /**
     * 更新统计信息
     * @param {number} visible - 可见项目数
     * @param {number} total - 总项目数
     */
    _updateStats(visible, total) {
        if (!this.outlineContainer) return;

        const stats = this.outlineContainer.querySelector('.outline-stats');
        if (stats) {
            if (total === 0) {
                stats.textContent = '暂无对话';
            } else if (visible === total) {
                stats.textContent = `共 ${total} 条对话`;
            } else {
                stats.textContent = `显示 ${visible} / ${total} 条对话`;
            }
        }
    }

    /**
     * 设置项目容器消息
     * @param {string} message - 要显示的消息
     */
    _setItemsContainerMessage(message) {
        const itemsContainer = this.outlineContainer?.querySelector('.outline-items');
        if (!itemsContainer) return;

        // 清空现有内容
        while (itemsContainer.firstChild) {
            itemsContainer.removeChild(itemsContainer.firstChild);
        }

        // 创建空状态显示
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'outline-empty';

        const emptyIcon = document.createElement('div');
        emptyIcon.className = 'outline-empty-icon';
        emptyIcon.textContent = '💭';

        const emptyText = document.createElement('div');
        emptyText.textContent = message;

        emptyDiv.appendChild(emptyIcon);
        emptyDiv.appendChild(emptyText);
        itemsContainer.appendChild(emptyDiv);

        // 更新统计信息
        this._updateStats(0, 0);
    }
    /**
     * 生成大纲项目
     * 扫描页面中的用户消息并生成对应的大纲项目
     */
    generateOutlineItems() {
        if (!this.uiReady) return;

        const userMessages = document.querySelectorAll(this.config.selectors.userMessage);

        if (userMessages.length === 0) {
            this._setItemsContainerMessage('当前页面没有找到对话内容\n请确保页面已完全加载');
            return;
        }

        const itemsContainer = this.outlineContainer?.querySelector('.outline-items');
        if (!itemsContainer) return;

        // 清空现有内容
        while (itemsContainer.firstChild) {
            itemsContainer.removeChild(itemsContainer.firstChild);
        }

        // 重置缓存
        this.allItems = [];

        // 为每个用户消息创建大纲项目
        userMessages.forEach((message, index) => {
            const textEl = message.querySelector(this.config.selectors.messageText) || message;
            let title = (textEl.textContent || '').trim();

            if (!title) return;

            // 智能截取标题，保持完整性
            title = this._smartTruncate(title, 35);

            const item = this._createOutlineItem(message, index, title);
            itemsContainer.appendChild(item);
            this.allItems.push({
                element: item,
                message,
                title
            });
        });

        // 更新统计信息
        this._updateStats(userMessages.length, userMessages.length);

        // 高亮当前可见的项目
        this.highlightVisibleItem();
    }

    /**
     * 智能截取文本
     * @param {string} text - 原始文本
     * @param {number} maxLength - 最大长度
     * @returns {string} 截取后的文本
     */
    _smartTruncate(text, maxLength) {
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
     * 创建大纲项目元素
     * @param {Element} message - 消息元素
     * @param {number} index - 索引
     * @param {string} title - 标题
     * @returns {Element} 大纲项目元素
     */
    _createOutlineItem(message, index, title) {
        const item = document.createElement('li');
        item.className = 'outline-item';
        item.dataset.index = index.toString();

        // 项目编号
        const numberSpan = document.createElement('span');
        numberSpan.className = 'outline-item-number';
        numberSpan.textContent = (index + 1).toString();

        // 项目图标
        const iconSpan = document.createElement('span');
        iconSpan.className = 'outline-item-icon';
        const originalIcon = this._getMessageIcon(title);
        iconSpan.textContent = originalIcon;

        // 项目文本
        const textSpan = document.createElement('span');
        textSpan.className = 'outline-item-text';
        textSpan.textContent = this._escapeHTML(title);
        textSpan.title = title; // 完整标题作为提示

        // 组装项目
        item.appendChild(numberSpan);
        item.appendChild(iconSpan);
        item.appendChild(textSpan);

        // 添加交互功能
        this._addItemInteractions(item, message, iconSpan, originalIcon);

        return item;
    }

    /**
     * 根据消息内容获取合适的图标
     * @param {string} title - 消息标题
     * @returns {string} 图标字符
     */
    _getMessageIcon(title) {
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

    /**
     * 为大纲项目添加交互功能
     * @param {Element} item - 项目元素
     * @param {Element} message - 对应的消息元素
     * @param {Element} iconSpan - 图标元素
     * @param {string} originalIcon - 原始图标
     */
    _addItemInteractions(item, message, iconSpan, originalIcon) {
        let currentZone = '';
        let hoverTimeout = null;

        // 鼠标进入事件
        item.addEventListener('mouseenter', () => {
            // 延迟显示高亮，避免快速滑过时的闪烁
            hoverTimeout = setTimeout(() => {
                message.classList.add('outline-highlight-target');
                if (this.hintOverlay) {
                    this.hintOverlay.classList.add('visible');
                }
            }, 100);
        });

        // 鼠标移动事件 - 根据位置改变图标和提示
        item.addEventListener('mousemove', (event) => {
            const rect = item.getBoundingClientRect();
            const hoverX = event.clientX - rect.left;
            const width = rect.width;
            let newZone;

            // 将项目分为三个区域
            if (hoverX < width / 3) {
                newZone = 'start';
            } else if (hoverX > (width * 2) / 3) {
                newZone = 'end';
            } else {
                newZone = 'center';
            }

            // 只在区域改变时更新
            if (newZone !== currentZone) {
                currentZone = newZone;
                const hintTextEl = this.hintOverlay?.querySelector('.scroll-hint-text');

                if (hintTextEl) {
                    switch (newZone) {
                        case 'start':
                            iconSpan.textContent = '⬆️';
                            hintTextEl.textContent = '滚动到消息顶部';
                            break;
                        case 'center':
                            iconSpan.textContent = '🎯';
                            hintTextEl.textContent = '滚动到消息中央';
                            break;
                        case 'end':
                            iconSpan.textContent = '⬇️';
                            hintTextEl.textContent = '滚动到消息底部';
                            break;
                    }
                }
            }
        });

        // 鼠标离开事件
        item.addEventListener('mouseleave', () => {
            // 清除延迟显示的定时器
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }

            // 恢复原始状态
            iconSpan.textContent = originalIcon;
            currentZone = '';
            message.classList.remove('outline-highlight-target');
            if (this.hintOverlay) {
                this.hintOverlay.classList.remove('visible');
            }
        });

        // 点击事件 - 滚动到对应消息
        item.addEventListener('click', (event) => {
            const rect = item.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const width = rect.width;
            let scrollBlock;

            // 根据点击位置决定滚动方式
            if (clickX < width / 3) {
                scrollBlock = 'start';
            } else if (clickX > (width * 2) / 3) {
                scrollBlock = 'end';
            } else {
                scrollBlock = 'center';
            }

            // 平滑滚动到目标消息
            message.scrollIntoView({
                behavior: 'smooth',
                block: scrollBlock,
                inline: 'nearest'
            });

            // 高亮当前项目
            this.highlightItem(item);

            // 临时高亮目标消息
            this._flashHighlight(message);
        });
    }

    /**
     * 闪烁高亮效果
     * @param {Element} element - 要高亮的元素
     */
    _flashHighlight(element) {
        element.style.transition = 'background-color 0.5s ease';
        element.style.backgroundColor = 'rgba(0, 169, 255, 0.15)';

        setTimeout(() => {
            element.style.backgroundColor = '';
            setTimeout(() => {
                element.style.transition = '';
            }, 500);
        }, 1500);
    }

    /**
     * HTML转义
     * @param {string} str - 要转义的字符串
     * @returns {string} 转义后的字符串
     */
    _escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * 高亮指定项目
     * @param {Element} itemToHighlight - 要高亮的项目
     */
    highlightItem(itemToHighlight) {
        if (!this.outlineContainer) return;

        const items = this.outlineContainer.querySelectorAll('.outline-item');
        items.forEach(item => item.classList.remove('active'));

        if (itemToHighlight) {
            itemToHighlight.classList.add('active');
        }
    }

    /**
     * 高亮当前可见的项目
     * 根据滚动位置自动高亮最可见的消息对应的大纲项目
     */
    highlightVisibleItem() {
        // 清除之前的定时器
        if (this.scrollTimer) {
            clearTimeout(this.scrollTimer);
        }

        // 延迟执行，避免频繁计算
        this.scrollTimer = setTimeout(() => {
            if (!this.outlineContainer) return;

            const scrollContainer = this.config.selectors.scrollContainer === window ?
                document.documentElement :
                document.querySelector(this.config.selectors.scrollContainer);

            if (!scrollContainer) return;

            const containerHeight = scrollContainer.clientHeight || window.innerHeight;
            const userMessages = document.querySelectorAll(this.config.selectors.userMessage);

            let mostVisibleItem = null;
            let maxVisibility = 0;

            // 计算每个消息的可见度
            userMessages.forEach((msg, index) => {
                const msgRect = msg.getBoundingClientRect();
                const top = Math.max(msgRect.top, 0);
                const bottom = Math.min(msgRect.bottom, containerHeight);
                const visibleHeight = Math.max(0, bottom - top);
                const visibility = visibleHeight / msgRect.height;

                if (visibility > maxVisibility && visibility > 0.3) { // 至少30%可见
                    maxVisibility = visibility;
                    mostVisibleItem = this.outlineContainer?.querySelector(`.outline-item[data-index="${index}"]`);
                }
            });

            if (mostVisibleItem) {
                this.highlightItem(mostVisibleItem);
            }
        }, 150);
    }

    /**
     * 观察滚动事件
     * 监听页面滚动，实时更新高亮项目
     */
    _observeScroll() {
        const container = this.config.selectors.scrollContainer;
        const scrollTarget = container === window ? window : document.querySelector(container);

        if (scrollTarget) {
            scrollTarget.addEventListener('scroll', () => {
                this.highlightVisibleItem();
            }, {
                passive: true
            });
        }
    }

    /**
     * 观察DOM变化
     * 监听页面内容变化，自动更新大纲
     */
    _observeMutations() {
        const targetNode = document.querySelector(this.config.selectors.observeTarget);
        if (!targetNode) {
            console.warn("大纲生成器: 未找到观察目标节点");
            return;
        }

        // 断开之前的观察器
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            let majorDomChange = false; // 标志位，表示是否发生剧烈变化

            for (const mutation of mutations) {
                // 检查是否有大量的节点被移除
                if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                    for (const removedNode of mutation.removedNodes) {
                        // 如果被移除的节点是聊天容器，或者包含了很多消息，就可以认为是切换了
                        if (removedNode.nodeType === Node.ELEMENT_NODE && removedNode.querySelector(this.config.selectors.userMessage)) {
                            majorDomChange = true;
                            break;
                        }
                    }
                }

                // 检查是否有新的用户消息节点被添加
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // ... (你原来的逻辑) ...
                    shouldUpdate = true;
                }
            }

            if (majorDomChange) {
                console.log('Major DOM change detected, likely a conversation switch. Re-initializing.');
                // 剧烈变化，直接重新初始化
                setTimeout(() => this.init(true), 100);
            } else if (shouldUpdate) {
                // 只是小更新，增量生成
                setTimeout(() => this.generateOutlineItems(), 100);
            }
        });

        this.observer.observe(targetNode, {
            childList: true,
            subtree: true
        });
    }

    /**
     * 观察暗色模式变化
     * 自动适应页面的主题变化
     */
    _observeDarkMode() {
        const updateTheme = () => {
            const isDark = document.documentElement.classList.contains('dark') ||
                document.body.classList.contains('dark-theme') ||
                document.body.classList.contains('dark') ||
                window.matchMedia('(prefers-color-scheme: dark)').matches;

            if (this.outlineContainer?.parentElement) {
                this.outlineContainer.parentElement.classList.toggle('dark', isDark);
            }
        };

        // 监听类名变化
        const darkModeObserver = new MutationObserver(updateTheme);
        darkModeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
        darkModeObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });

        // 监听系统主题变化
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateTheme);
        }

        // 初始化主题
        setTimeout(updateTheme, 100);
    }

    /**
     * 观察URL变化
     * 支持单页应用的路由变化
     */
    // 在 BaseOutlineGenerator 类中
    _observeUrlChanges() {
        // 检查浏览器是否支持 Navigation API
        if (window.navigation) {
            // 'navigate' 事件会在任何导航开始时触发
            window.navigation.addEventListener('navigate', (event) => {
                // event.destination.url 是导航的目标 URL
                const destinationUrl = event.destination.url;

                // 导航完成后，URL 会更新，我们可以设置一个短暂的延迟来执行刷新
                // 使用 navigatesuccess 事件会更精确
            });

            // 'navigatesuccess' 事件在导航成功完成，且 DOM 更新后触发，更适合我们的场景
            window.navigation.addEventListener('navigatesuccess', (event) => {
                console.log(`Navigation successful to: ${event.target.currentEntry.url}`);
                
                setTimeout(() => {
                    if (window.location.href !== this.lastUrl) {
                        this.lastUrl = window.location.href;
                        this.init(true); // 重新初始化大纲
                    }
                }, 100); // 稍微延迟，确保动态加载的组件渲染完毕
            });

        } else {
            // 如果浏览器不支持，可以回退到之前的主世界注入方案
            console.warn('Navigation API not supported. Falling back to other methods.');
            // 这里可以调用你的主世界注入方案
        }
    }

    /**
     * 等待内容加载
     * @param {Function} callback - 内容加载完成后的回调函数
     */
    _waitForContent(callback) {
        if (!this.config.options.waitForContentLoaded) {
            callback();
            return;
        }

        this.show();
        this._setItemsContainerMessage('正在加载对话内容...\n请稍候');

        let interval;
        let timeout;

        const cleanup = () => {
            if (interval) clearInterval(interval);
            if (timeout) clearTimeout(timeout);
        };

        // 定期检查内容是否加载完成
        interval = setInterval(() => {
            if (document.querySelector(this.config.options.contentReadySelector)) {
                cleanup();
                callback();
            }
        }, 200);

        // 超时处理
        timeout = setTimeout(() => {
            cleanup();
            this._setItemsContainerMessage('内容加载超时\n请刷新页面重试');
        }, 10000);
    }

    /**
     * 显示大纲
     */
    show() {
        if (!this.uiReady) {
            this._createUI();
        }

        this._observeDarkMode();

        if (this.outlineContainer) {
            this.outlineContainer.style.display = 'block';
        }
        if (this.toggleButton) {
            this.toggleButton.style.display = 'none';
        }

        this.generateOutlineItems();
    }

    /**
     * 隐藏大纲
     */
    hide() {
        if (!this.uiReady) return;

        if (this.outlineContainer) {
            this.outlineContainer.style.display = 'none';
        }
        if (this.toggleButton) {
            this.toggleButton.style.display = 'flex';
        }
    }

    /**
     * 运行大纲生成器
     * @param {boolean} isUrlChange - 是否为URL变化触发
     */
    run(isUrlChange = false) {
        if (!isUrlChange) {
            this._addStyles();
            this._observeUrlChanges();
        } else {
            // URL变化时重新初始化观察器
            if (this.observer) {
                this.observer.disconnect();
            }
        }

        this._waitForContent(() => {
            if (!this.uiReady) {
                this._createUI();
            }
            this.show();
            this._observeScroll();
            this._observeMutations();
        });
    }

    /**
     * 初始化大纲生成器
     * @param {boolean} isUrlChange - 是否为URL变化触发
     */
    init(isUrlChange = false) {
        this.run(isUrlChange);
    }
}



