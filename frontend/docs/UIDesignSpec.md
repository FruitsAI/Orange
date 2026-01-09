# Orange 财务收款管理系统 - UI/UX 设计规范

**版本**: v0.0.1  
**日期**: 2026-01-03

---

## 1. 设计语言

### 1.1 Liquid Glass 设计系统
采用 Apple macOS Tahoe 26 的 **Liquid Glass** 设计语言，核心特点：

| 特性 | 描述 |
|------|------|
| 毛玻璃效果 | `backdrop-filter: blur(60px)` |
| 高光层 | 渐变高光模拟光线反射 |
| 微阴影 | 多层阴影创造深度 |
| 流体动画 | 平滑的过渡效果 |

### 1.2 设计原则
1. **简洁清晰** - 信息层级分明，操作路径简短
2. **一致性** - 统一的组件和交互方式
3. **反馈即时** - 所有操作都有视觉反馈
4. **响应式** - 适配各种屏幕尺寸

---

## 2. 色彩系统

### 2.1 主题色
| 名称 | 色值 | 用途 |
|------|------|------|
| Primary | `#FF9F0A` | 主色调，品牌色，强调 |
| Primary Light | `#FFB340` | 悬停状态 |
| Success | `#32D74B` | 成功、已完成 |
| Warning | `#FFD60A` | 警告、待处理 |
| Danger | `#FF453A` | 错误、删除 |
| Info | `#64D2FF` | 信息提示 |

### 2.2 中性色（浅色模式）
| 名称 | 色值 | 用途 |
|------|------|------|
| bg-base | `#f5f5f7` | 页面背景 |
| bg-elevated | `rgba(255,255,255,0.78)` | 卡片背景 |
| bg-content | `rgba(255,255,255,0.92)` | 内容区域 |
| text-primary | `#1d1d1f` | 主要文字 |
| text-secondary | `rgba(60,60,67,0.6)` | 次要文字 |
| border-color | `rgba(0,0,0,0.06)` | 边框 |

### 2.3 深色模式
| 名称 | 色值 |
|------|------|
| bg-base | `#000000` |
| bg-elevated | `rgba(44,44,46,0.75)` |
| text-primary | `#f5f5f7` |
| text-secondary | `rgba(235,235,245,0.6)` |

---

## 3. 字体规范

### 3.1 字体家族
```css
--font-display: 'SF Pro Display', -apple-system, system-ui, sans-serif;
--font-text: 'SF Pro Text', -apple-system, system-ui, sans-serif;
--font-mono: 'SF Mono', 'Menlo', monospace;
```

### 3.2 字号规范
| 用途 | 字号 | 字重 |
|------|------|------|
| 页面标题 | 32px | 700 |
| 卡片标题 | 17px | 600 |
| 正文 | 14px | 400 |
| 辅助文字 | 13px | 400 |
| 小标签 | 11px | 500 |

---

## 4. 间距系统

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
--spacing-2xl: 48px;
```

---

## 5. 圆角规范

```css
--radius-xs: 6px;    /* 小按钮 */
--radius-sm: 10px;   /* 输入框 */
--radius-md: 14px;   /* 卡片 */
--radius-lg: 18px;   /* 大卡片 */
--radius-xl: 22px;   /* 模态框 */
--radius-full: 9999px; /* 胶囊 */
```

---

## 6. 组件规范

### 6.1 按钮 (Button)
| 类型 | 样式 | 用途 |
|------|------|------|
| Primary | 橙色填充 | 主要操作 |
| Secondary | 浅橙色背景 | 次要操作 |
| Ghost | 透明背景 | 辅助操作 |
| Danger | 红色 | 危险操作 |

**尺寸**:
- 默认: `padding: 10px 18px`
- Small: `padding: 6px 12px`
- Icon: `40px × 40px`

### 6.2 卡片 (GlassCard)
```css
background: var(--bg-content);
backdrop-filter: blur(60px);
border: 1px solid rgba(255,255,255,0.45);
border-radius: 18px;
box-shadow: 多层阴影;
```

### 6.3 输入框 (Input)
```css
padding: 8px 12px;
background: var(--bg-elevated);
border: 1px solid var(--border-color);
border-radius: 10px;
```

### 6.4 状态标签 (StatusBadge)
| 状态 | 颜色 |
|------|------|
| 进行中 | 绿色 |
| 已完成 | 蓝色 |
| 未开始 | 红色 |
| 即将交付 | 橙色 |

---

## 7. 布局规范

### 7.1 侧边栏
- 宽度: 80px (胶囊式)
- 位置: 左侧悬浮
- 响应式: 小屏变底部 Dock

### 7.2 主内容区
- 左边距: 120px (侧边栏宽度 + 间距)
- 内边距: 32px
- 最大宽度: 无限制

### 7.3 卡片网格
```css
display: grid;
gap: 24px;
```

---

## 8. 响应式断点

| 断点 | 目标设备 | 主要变化 |
|------|----------|---------|
| > 1280px | 桌面大屏 | 完整布局 |
| 1024px - 1280px | 笔记本 | 网格调整 |
| 768px - 1024px | 平板 | 单列布局 |
| < 768px | 手机 | 侧边栏变底部 Dock |

---

## 9. 动画规范

### 9.1 过渡时长
```css
--transition-instant: 0.1s;
--transition-fast: 0.2s;
--transition-normal: 0.35s;
--transition-slow: 0.5s;
```

### 9.2 缓动函数
```css
--easing: cubic-bezier(0.2, 0, 0, 1);
--spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

### 9.3 常见动画
- **悬停上浮**: `translateY(-3px)`
- **点击缩放**: `scale(0.98)`
- **页面切换**: `slideUp` + `fadeIn`
