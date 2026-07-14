# Accessibility

ODS 以 WCAG 2.2 AA 为最低目标，并把键盘和辅助技术行为视为组件 API，而不是完成后的补丁。

## Foundation contracts

- 全局 `:focus-visible` 使用 `--ods-color-border-focus`、统一宽度和 offset。
- 不通过全局 `:focus { outline: none }` 隐藏浏览器 fallback。
- `.ods-sr-only` 隐藏视觉内容但保留辅助技术访问。
- `.ods-hit-target` 提供 44×44px 最小指针目标工具。
- `prefers-reduced-motion: reduce` 停止装饰动画并取消平滑滚动。
- `forced-colors: active` 保留系统 focus 指示；仅确有必要的装饰使用 `forced-color-adjust: none`。

## 组件要求

### Buttons and fields

- icon-only button 必须有 `aria-label` 或等价可访问名称。
- loading button 设置 `aria-busy`；disabled 与 loading 的交互区别必须明确。
- Field 自动关联 label、description 和 error IDs。
- invalid state 使用 `aria-invalid`，错误信息使用 `aria-describedby` 或 `aria-errormessage`。
- placeholder 不替代 label。

### Dialogs and popovers

- Dialog 使用 portal、`aria-modal`、自动 title/description IDs。
- 打开后 focus 进入内容，Tab 被约束在弹层内，Escape 按约定关闭，关闭后返回 trigger。
- 嵌套 Dialog 必须维持正确的 focus stack。
- Popover、Dropdown 与 ListBox 实现 Arrow、Home、End、Enter/Space、Escape 的键盘契约。

### Tabs, tables, and feedback

- Tabs 使用 tablist/tab/tabpanel 语义并支持方向键导航。
- Table 保留原生 table 语义，排序按钮提供 `aria-sort`。
- Toast 容器选择合适的 `aria-live` politeness；错误消息不能只靠颜色表达。
- Skeleton/Spinner 提供简洁 loading 名称，避免重复播报每个装饰节点。

## 测试要求

每个交互组件至少覆盖：

1. 正确 role、name 和 ARIA 状态。
2. Tab 与方向键顺序。
3. focus 进入、循环和恢复。
4. disabled、invalid、loading 等状态。
5. reduced motion 下不依赖动画完成行为。
6. 320px 宽度下无阻断性溢出。

视觉验收同时检查 Day Ember、Night Orbit、键盘 focus 和 forced-colors 可用性。若系统设置不能安全切换，必须记录自动契约覆盖与未完成的手工项，不能声称已手测通过。
