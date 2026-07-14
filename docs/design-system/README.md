# Orange Design System

Orange Design System（ODS）是 Orange 桌面应用的视觉与交互公共层。它将 Day Ember、Night Orbit、macOS/Wails 桌面壳层约束和无障碍行为整理为稳定 API，使页面不再依赖散落的颜色、尺寸和全局 class。

## 目标

- 为亮色与暗色主题提供完整、对等的 semantic tokens。
- 让组件通过明确的 variant、size 和 state API 复用视觉，而不是复制页面 CSS。
- 保持 Wails 桌面体验，包括标题栏安全区、拖拽区、键盘导航和 reduced motion。
- 渐进迁移现有页面，避免一次重写 `main.css` 与 `liquid-glass.css`。
- 为后续组件展示、视觉回归和独立发布预留稳定边界。

## 架构

```text
frontend/src/design-system/
  tokens/         reference、semantic、themes、compatibility
  foundations/    reset、typography、focus、motion、accessibility
  components/     可复用交互组件
  patterns/       Orange 产品级组合模式
  internal/       不公开的状态和无障碍辅助逻辑
  dev/            开发态 Design System Gallery
  styles.css      唯一 CSS 入口与 cascade layer 顺序
  index.ts        唯一 TypeScript 公共入口
```

## 公共边界

- 新样式只消费 `--ods-*` semantic tokens。
- React 组件从 `@/design-system` 使用 named imports。
- `.ods-*` 是 Design System 的 DOM class 命名空间；内部 anatomy 使用 `data-slot`。
- `tokens/compatibility.css` 仅允许把旧变量映射到 ODS，不允许 ODS 反向依赖旧变量。
- 页面布局、Dashboard Hero 和业务卡片等产品表达属于 patterns 或业务目录，不进入基础组件。

未来的根聚合入口遵循以下规则：

```ts
// frontend/src/design-system/index.ts
export { Button } from "./components/button";
export type { ButtonProps } from "./components/button";
```

- 只做显式 named exports，不使用 `export *`，也不导出 `internal`。
- 业务代码只从 `@/design-system` 导入，组件包内部使用相对路径，避免 barrel 循环依赖。
- CSS 由 `styles.css` 唯一聚合；组件包不在 TSX 中 side-effect import 自己的 CSS。
- `components/index.css` 只有在对应组件包完成测试后才加入 `components` layer。

`frontend/src/design-system/styles.css` 当前没有接入 `main.tsx`。这是有意的：foundation 可以先独立验证，待首个组件迁移切片准备好后，再一次性切换 CSS 入口并处理 Tailwind 与 legacy layer。

## HeroUI 参考边界

[HeroUI v3 Components](https://heroui.com/en/docs/react/components) 仅用于参考以下设计方法：

- 复杂组件的 anatomy 与 compound API。
- controlled/uncontrolled 状态命名。
- 键盘、focus、ARIA 和 collection 交互契约。
- variant、size、loading、invalid 等一致状态模型。

ODS 不安装 HeroUI、不复制其源码、不复刻全部组件目录，也不沿用其品牌视觉。Orange 的 token、CSS、组件实现和产品模式均由本项目维护。Calendar、ComboBox 等复杂组件在 Phase 2 再独立评估 React Aria 等无障碍 primitives。

## 相关文档

- [Tokens](./tokens.md)
- [Components](./components.md)
- [Accessibility](./accessibility.md)
- [Migration](./migration.md)
- [Implementation plan](../plans/2026-07-14-orange-design-system.md)
