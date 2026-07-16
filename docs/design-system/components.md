# Components

## API 原则

- 简单组件保持单体；复杂交互使用 compound API。
- 全部使用 named exports，并转发 ref 与原生 DOM props。
- 受控/非受控状态统一为 `value/defaultValue/onValueChange` 或 `open/defaultOpen/onOpenChange`。
- variant 与 size 使用有限 union，不堆叠 `flat`、`hover`、`noPadding` 等布尔开关。
- DOM 根 class 使用 `.ods-*`，内部 anatomy 使用 `data-slot`，状态使用 `data-*`。
- `className`、`style` 和 `data-*` 是必要 escape hatch，但不允许调用方依赖内部 DOM 层级。
- icon-only 控件必须提供可访问名称；loading 保持控件宽度并设置 `aria-busy`。

复杂组件示例：

```tsx
<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Trigger>打开</Dialog.Trigger>
  <Dialog.Backdrop />
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>标题</Dialog.Title>
      <Dialog.Close />
    </Dialog.Header>
    <Dialog.Body>内容</Dialog.Body>
    <Dialog.Footer>操作</Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

## Phase 1：当前项目核心组件

Phase 1 以真实生产用量为依据，而不是复制 HeroUI 的完整目录。

1. Actions：Button、IconButton、CloseButton。
2. Surfaces：Surface、Card compound。
3. Fields：Field、Label、Description、FieldError、Input、TextArea、NativeSelect、InputGroup、SearchField、原生 DateField。
4. Choices：Checkbox、RadioGroup。
5. Overlays：Dialog、AlertDialog。
6. Anchored overlays：Popover、Dropdown、ListBox。
7. Navigation：Tabs、Pagination。
8. Data display：Chip/StatusBadge、Table。
9. Feedback：Toast/Toaster、Alert。
10. States：EmptyState、Skeleton、Spinner。
11. Progress：ProgressBar。

这些名称可以在代码中表现为较少的组件包。例如 Field 子组件共享 context 和样式，Dialog 与 AlertDialog 共享 overlay primitives。

## Phase 2 backlog

已交付（消费 ODS tokens，纯 CSS + 轻量 React 状态）：Tooltip、Avatar/AvatarGroup、User、Breadcrumbs、Divider（Separator）、ButtonGroup、Switch、Accordion、NumberInput（NumberField）、Kbd、Code、Snippet、Link、Badge、CircularProgress、ScrollShadow、Spacer、Modal、Drawer、Popover、Listbox、Select、Dropdown（Menu）、Slider、CheckboxGroup、InputOtp、Table、Image、Calendar、DatePicker。

浮层组件（Modal/Drawer/Popover/Select/Dropdown/DatePicker）复用 `useDialogFocus` 焦点栈与 `createPortal`；Calendar/DatePicker 复用已有依赖 `dayjs`；Slider 用 Pointer Events 实现 1:1 跟手。

仍在 backlog（需产品用例或更重依赖，暂不硬写）：

- ToggleButton、ToggleButtonGroup、Autocomplete、ComboBox。
- DateRangePicker、TimeField、Meter、Toolbar、TagGroup。
- ColorArea、ColorField、ColorPicker、ColorSlider、ColorSwatch。
- 虚拟化 collection/table、拖拽排序和高级数据网格。

Phase 2 的复杂 collection 与颜色组件不得只为了“组件齐全”而手写。先确认产品用例，再评估 React Aria primitives、虚拟化方案和可维护成本。

## 产品模式

以下内容不应伪装成通用 primitive：

- Financial Hero、Summary Metric 等 Dashboard 叙事组件。
- AppTopbar、TitlebarDragRegion、AppDock 等桌面壳层模式。
- PanelHeader、PageHeader、EmptyState 的品牌化组合。
- Settings 的统计头部、业务卡片和数据同步流程。

这些模式可以消费 ODS components 与 tokens，但保留在 `patterns` 或业务目录。
