# Migration Guide

ODS 采用渐进迁移。目标是减少重复 CSS 和行为分叉，而不是一次性改写所有页面。

## 总体顺序

1. 建立 tokens、foundations、cascade layers、公共 exports 和契约测试。
2. 实现 Button、Field、Dialog 等高频组件，但暂不删除 legacy styles。
3. 选择一个完整 vertical slice 迁移并完成视觉/交互验收。
4. 通过 `rg` 证明旧 class 和 token 没有生产引用后，删除对应 CSS 区块。
5. 重复迁移 Settings、Projects、Calendar 和创建流程。
6. 最后移除 compatibility aliases 与 legacy layer。

## 首批映射

| 现有实现                                      | ODS 目标                                | 迁移说明                              |
| --------------------------------------------- | --------------------------------------- | ------------------------------------- |
| `.btn`, `.btn-primary`, `.btn-ghost`          | `Button`                                | variant/size/loading 进入 typed props |
| `.form-input`, `.form-select`, `.input-group` | `Field`, `Input`, `NativeSelect`        | 自动 label/error IDs                  |
| `ConfirmModal`                                | `AlertDialog`                           | 保留文案和回调，统一 focus 行为       |
| 页面级 `.modal*`                              | `Dialog`                                | 分页迁移，不保留多个 overlay 实现     |
| `GlassCard`                                   | `Surface`/`Card`                        | hover 不再是调用方布尔开关            |
| `EmberPanel`                                  | `Card` 或产品 pattern                   | 兼容 wrapper 标记 deprecated          |
| `PanelHeader`                                 | `Card.Header` 或 `patterns/PanelHeader` | 根据是否包含业务语气决定层级          |
| `StatusBadge`                                 | `Chip`/status variant                   | 状态语义通过 tone 映射                |
| `DatePicker`                                  | 原生 `DateField`                        | 完整 calendar 延后到 Phase 2          |
| `ThemeSelector`、topbar menus                 | `Popover` + `ListBox`                   | 保留 portal、键盘和 focus restore     |
| 多套 pagination                               | `Pagination`                            | 统一 page、pageSize 与 disabled 状态  |
| `ToastContainer`                              | `Toaster`                               | 保留现有 store，替换 presentation     |

页面结构迁移统一使用以下 patterns：

| 现有实现                      | ODS 目标                       |
| ----------------------------- | ------------------------------ |
| 页面内自定义标题栏            | `PageHeader` + `RouterButton`  |
| 卡片/表单内自定义标题行       | `SectionHeader`                |
| `.form-grid`、`.form-actions` | `FormGrid`、`FormActions`      |
| 重复的搜索 input wrapper      | `SearchField`                  |
| 重复的分页信息与控件 wrapper  | `PaginationBar`                |
| 页面内空数据占位              | `EmptyState`                   |
| 原生 `<a>` 包装客户端内部路由 | `RouterLink` 或 `RouterButton` |

这些 pattern 允许页面通过 `className` 做布局 escape hatch，但页面不得重新实现其内部按钮、input、pagination 或 typography 状态。

## Token 迁移

旧 token 在迁移期由 `compatibility.css` 单向映射。新代码禁止使用旧名称。

```css
/* 迁移前 */
color: var(--text-primary);
background: var(--bg-content);

/* 迁移后 */
color: var(--ods-color-fg-default);
background: var(--ods-color-bg-surface-raised);
```

页面出现新颜色时，先寻找现有 semantic role；不要把十六进制颜色直接复制到组件 CSS。

## CSS 接入

`styles.css` 是未来的唯一入口。首次接入时：

1. 从 legacy `main.css` 移除重复 Tailwind import。
2. 在 layer 顺序固定后导入已完成的 component index。
3. legacy 文件进入 `legacy` layer 前运行全部视觉回归，因为未分层规则与已分层规则的优先级不同。
4. 页面专属 styles 进入 patterns 或 feature layer，不通过 import 顺序覆盖基础组件。

## 删除规则

删除旧实现前必须同时满足：

- `rg` 无生产 TSX/class/token 引用。
- focused tests 与全量 frontend tests 通过。
- ESLint、TypeScript 和生产构建通过。
- Day Ember、Night Orbit、键盘与 320px 验收通过。
- 对应 compatibility alias 已无消费者。

不要以“大文件不好维护”为理由直接批量删除；每次删除都要有消费者清单和回归证据。
