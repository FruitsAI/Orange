# Orange 登录页与窗口安全间距重构设计

日期：2026-07-13  
状态：待用户书面评审  
设计方向：Ember Orbit / Day Ember / Night Orbit

## 1. 目标

本次改动包含两个紧密相关的界面任务：

1. 将应用首页顶部悬浮导航整体下移，为 macOS 左上角红黄绿窗口控制按钮留出更舒适的
   视觉距离。
2. 以首页已建立的 Ember Orbit 视觉语言重构登录页，并先抽取可复用的品牌、表单和操作
   组件，保持现有登录业务逻辑不变。

成功标准是：登录页与首页看起来属于同一个产品；亮色和深色主题都完整成立；登录、记住
用户名、密码显示、错误和加载行为没有回归；组件边界足够清晰，但不扩张为全仓表单系统重写。

## 2. 顶部窗口安全间距

- 将桌面端 `--app-topbar-inset` 从当前 14px 调整为约 24px，增加 10px 顶部安全距离。
- 顶栏左右 inset、圆角和高度保持不变，避免导航整体显得缩小。
- `.app-view-content` 继续基于 `--app-topbar-inset` 计算顶部 padding，因此 Hero 与顶栏同步
  下移，不产生遮挡或额外魔法数。
- 768px 以下仍沿用相同变量；若窄屏视觉空间不足，可在移动媒体查询中回落至 18px，但不得
  回到贴近窗口控制区的 14px。
- 顶栏拖拽区、双击最大化和交互控件 `no-drag` 契约保持不变。

## 3. 登录页信息架构

桌面采用非对称左右分栏，而不是中央单卡：

- 左侧为品牌叙事 Hero，占可用内容宽度约 55%–60%。
- 右侧为登录面板，占约 40%–45%，设置合理最大宽度，避免表单在大屏上拉伸。
- 整体容器置于窗口安全区域内，顶部为 macOS 窗口控制按钮预留空间。
- 900px 以下转为单栏：品牌 Hero 压缩为横向/顶部品牌段，登录面板位于下方。
- 600px 以下进一步收敛装饰、间距和标题字号，表单保持至少 320px 视口可用。

### 左侧品牌 Hero

Hero 只承担品牌叙事，不展示虚构财务数据：

- Orange 品牌锁定组合。
- 小型 `EMBER ORBIT` 眉题。
- 主标题建议为“让每一笔回款，都沿着清晰轨道抵达”。
- 简短说明：“管理项目、计划与回款进度，把注意力留给真正重要的工作。”
- 使用首页 Hero 相同的轨道圆弧、单一橙色环境光、暖色渐变与轻微颗粒感。
- 可加入三个短标签：“项目进度”“回款计划”“经营视图”，但不展示数字指标。

### 右侧登录面板

- 标题使用“欢迎回来”，副标题为“登录 Orange，继续管理你的项目与回款”。
- 表单保留用户名、密码、记住用户名和登录按钮。
- 主题切换位于面板右上方，复用三态 ThemeSelector，而不是维持只支持明暗切换的孤立按钮。
- 错误信息紧贴表单字段区域，使用危险色和图标，但不通过大幅抖动制造干扰。
- 加载状态锁定重复提交，按钮文案显示“登录中…”，并保持宽度稳定。

## 4. 组件边界

本次抽取以下小型组件，组件以明确语义为主，不创建万能配置组件：

### `BrandLockup`

- 职责：渲染 Orange Logo、品牌名及可选副标题。
- Props：`subtitle?`、`compact?`、标准 HTML className。
- 消费者：登录 Hero；后续可供顶栏品牌区渐进迁移，但本次不强制改写 AppTopbar。

### `EmberPanel`

- 职责：提供 Ember Orbit 的主题化玻璃/陶瓷表面、边框、阴影和装饰层。
- Props：`tone: 'hero' | 'surface'`、`children`、标准 HTML 属性。
- 不包含登录、仪表盘或数据语义。
- 可复用现有 token；避免再定义一套硬编码亮暗色。

### `AuthField`

- 职责：统一标签、前置图标、输入框、可选尾部操作和错误/帮助信息布局。
- 基于原生 `<input>`，透传标准 input 属性，并通过 `label`、`icon`、`trailing` 组合。
- 密码显示按钮由 LoginView 传入，组件本身不持有密码可见状态。
- label 与 input 必须通过稳定 id 关联。

### `PrimaryActionButton`

- 职责：提供 Ember 主操作按钮、加载状态、禁用状态与按压反馈。
- Props：`loading?`、`loadingLabel?`，其余透传原生 button 属性。
- 加载时保留原按钮尺寸并设置可访问状态。

### `LoginHero` 与 `LoginFormPanel`

- 两者是登录场景组合组件，不追求跨业务复用。
- `LoginHero` 负责品牌叙事和轨道装饰。
- `LoginFormPanel` 只负责展示受控表单，通过 props 接收字段状态、提交状态和回调。
- `LoginView` 保留导航、auth store、localStorage 和提交结果编排，成为轻量容器。

## 5. 状态与数据流

业务流保持现状：

1. `LoginView` 从 auth store 读取 `login`、`loading`、`error`、`isLoggedIn`。
2. 用户名继续从 `lastUsername` 初始化。
3. `LoginFormPanel` 通过受控 props 更新用户名、密码、记住用户名和密码可见状态。
4. 提交时由 `LoginView` 调用 `login({ username, password })`。
5. 成功后按 checkbox 写入或清理 `lastUsername`，导航到 `/dashboard`。
6. 失败时显示 store error，缺失时回退为“登录失败”。
7. 已登录用户仍立即重定向到 Dashboard。

不新增注册、忘记密码、第三方登录或后端接口。

## 6. 视觉与动效

- Day Ember：奶油背景、陶瓷白登录面板、深棕文字、焦橙 Hero。
- Night Orbit：暖黑背景、深棕玻璃面板、乳白文字、琥珀环境光。
- Hero 轨道使用纯 CSS 圆弧与渐变，不增加大图片资产。
- 页面进入时 Hero 与表单分别做小幅 opacity/translate 动画，时长沿用现有 motion tokens。
- 轨道只做非常缓慢的 transform/opacity 动画，不持续改变布局属性。
- `prefers-reduced-motion: reduce` 时取消进入位移和轨道漂移，只保留静态构图。
- hover、active、focus-visible 状态必须完整；键盘焦点不得被玻璃高光吞没。

## 7. 样式组织

- 新建独立 `frontend/src/styles/login.css`，从 `assets/main.css` 移出登录页专属规则。
- `login.css` 只包含登录布局、登录组合组件和必要响应式样式。
- 通用组件样式放入对应的聚焦样式文件，或在规模很小时由 `login.css` 承载并使用明确前缀。
- 颜色、阴影、圆角、间距和动效优先使用 `tokens.css` 中现有语义变量。
- 删除迁移后不再引用的旧 `.floating-shapes`、旧登录卡片、社交登录和无用 form-tab 样式。

## 8. 可访问性

- 页面保留单一 `<h1>`，表单区域使用语义化标题。
- 用户名与密码输入框有可见 label、正确 autocomplete 和错误关联。
- 密码显示、主题选择器和登录按钮都有明确 accessible name。
- 错误信息使用 `role="alert"` 或 `aria-live="polite"`，避免重复播报。
- 加载按钮使用 `aria-busy`，禁用重复提交。
- Tab 顺序为：主题选择器 → 用户名 → 密码 → 显示密码 → 记住用户名 → 登录。
- 装饰轨道、光斑和图标不进入可访问树。

## 9. 测试与验收

### 自动测试

- `BrandLockup`：compact 与副标题组合。
- `AuthField`：label 关联、图标隐藏、尾部操作和错误描述。
- `PrimaryActionButton`：加载、禁用与 accessible 状态。
- `LoginFormPanel`：受控输入、密码显示、checkbox、提交和错误展示。
- `LoginView`：记住用户名、本地存储清理、失败信息、成功导航和已登录重定向。
- 样式契约：顶部 inset、登录 CSS 导入、移动断点、reduced-motion 和旧 CSS 清理。

### 手动 Wails 验收

- 1280×800 与最大化窗口：窗口控制按钮与顶栏/登录内容安全距离正确。
- 900、768、375、320 宽度：无横向滚动，表单不裁切。
- Day Ember、Night Orbit 与 auto 主题切换完整重绘。
- 完整键盘 Tab 顺序、密码切换、错误与加载状态。
- reduced-motion 下无轨道漂移和入场位移。
- 顶栏拖动、双击最大化、链接和按钮 no-drag 行为不回归。

## 10. 明确不在本次范围

- 不重构所有业务表单为 `AuthField`。
- 不修改认证协议、后端接口、token 存储或用户数据。
- 不添加注册、找回密码、验证码或第三方登录。
- 不重新设计项目、日历、分析和设置页面。
- 不将 AppTopbar 强制迁移到 `BrandLockup`，除非实现中证明零风险且无额外范围。
