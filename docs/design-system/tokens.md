# Design Tokens

## 三层模型

### Reference tokens

`--ods-ref-*` 保存未经业务解释的原始值，例如 palette、四像素间距、字体大小、圆角和时长。它们是内部实现细节，业务页面和组件不得直接消费。

示例：

```css
--ods-ref-color-ember-500: #f47b16;
--ods-ref-space-4: 16px;
--ods-ref-radius-10: 10px;
--ods-ref-duration-200: 200ms;
```

### Semantic tokens

`--ods-*` 是公共样式 API，名称表达用途而非具体色值。组件和产品模式只能消费这一层。

```css
--ods-color-bg-canvas: var(--ods-ref-color-warm-50);
--ods-color-fg-default: var(--ods-ref-color-warm-800);
--ods-color-border-focus: var(--ods-ref-color-ember-500);
--ods-radius-control: var(--ods-ref-radius-10);
```

主要分组：

- `--ods-color-bg-*`：canvas、surface、raised、glass 和交互状态。
- `--ods-color-fg-*`：default、muted、subtle、disabled、inverse。
- `--ods-color-border-*`：default、strong、focus。
- `--ods-color-accent*` 与 `--ods-color-status-*`：品牌和语义状态。
- `--ods-font-*`、`--ods-line-height-*`、`--ods-letter-spacing-*`：排版。
- `--ods-space-*`、`--ods-radius-*`、`--ods-control-*`：几何。
- `--ods-duration-*`、`--ods-ease-*`：动效；按压使用 `--ods-duration-press`（160ms），释放使用 `--ods-duration-release`（100ms）。
- `--ods-ease-in-out`：屏幕内持续移动与形变使用的对称缓动曲线。
- `--ods-shadow-*`、`--ods-material-glass-*`：表面与材质。
- `--ods-data-*`：Canvas/Chart.js 等数据可视化角色。
- `--ods-shell-*`：Wails/macOS 标题栏和应用壳层尺寸。

### Component tokens

组件在自己的根 class 内声明局部 token，并根据 variant 重映射。局部 token 不作为全局 API：

```css
.ods-button {
  --ods-button-bg: var(--ods-color-accent);
  --ods-button-fg: var(--ods-color-accent-fg);
}

.ods-button[data-variant="secondary"] {
  --ods-button-bg: var(--ods-color-bg-surface-raised);
  --ods-button-fg: var(--ods-color-fg-default);
}
```

## 主题

- `:root:not([data-theme])` 与 `[data-theme='light']` 使用 Day Ember。
- `[data-theme='dark']` 使用 Night Orbit。
- `auto` 是 theme store 中的用户偏好；DOM 只接收解析后的 `light` 或 `dark`。
- 两个主题必须声明同一组 `--ods-*` theme tokens。契约测试会阻止单主题缺项。

## Canvas 与第三方库

Canvas 不可靠地解析 CSS custom property。Chart.js 等库应通过统一的 `readDesignToken()` 读取 computed styles，再传入 `--ods-data-*` 值。禁止在 TypeScript 中维护一份 light/dark 三元色表。

## 兼容层已移除

全路由迁移完成后，`compatibility.css` 与旧 `styles/tokens.css` 已删除。生产组件、patterns
和页面 feature CSS 只允许消费 `--ods-*` semantic tokens；契约测试会阻止 `--color-*`、
`--space-*`、`--motion-*` 等旧 alias 回流。

## 新 token 的准入条件

1. 先证明现有 semantic token 无法表达该用途。
2. 主题相关 token 必须在 Day Ember 与 Night Orbit 同时定义。
3. 名称描述角色，不包含页面或临时视觉名称。
4. 组件私有差异优先使用局部 component token。
5. 添加或修改 token 时同步契约测试和本文档。
