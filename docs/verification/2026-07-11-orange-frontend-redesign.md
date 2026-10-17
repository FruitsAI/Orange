# Orange Ember Orbit 前端重构验收记录

日期：2026-07-12  
平台：macOS 26.5.1，Wails v3.0.0-alpha.55，WKWebView

## 自动验证

最终提交前执行以下完整命令：

```bash
cd frontend
npm run test:run
npx eslint . --cache
npm run build
cd ..
go test ./...
```

结果记录在本次任务最终回执中。生产构建保留既有的大 chunk 警告；Go 测试保留本机
macOS linker 版本警告，两者均不影响退出码。

## 真实 Wails 桌面验收

- 使用 `task dev` 启动功能工作树中的原生 Orange 应用，登录页和 `admin` 登录流程通过。
- 初始窗口由 Wails 配置为 1280×800；Computer Use 捕获内容区为 1230×768。
- 双击顶部空白拖拽区可最大化，再次双击可还原到之前的窄窗口尺寸。
- 顶栏链接、主题、通知、设置和用户控件均可独立点击，没有触发窗口拖动。
- 800px：主导航仍显示，品牌自动收敛为 Logo，工具区无碰撞，Hero 与摘要卡正常重排。
- 768px：桌面主导航仍显示，符合当前 `< 768px` 的 Dock 切换边界。
- 约 700px：顶部主导航从视觉、Tab 范围和可访问树移除；底部 Dock 按工作台、项目管理、
  收款日历、数据分析顺序出现。
- 页面滚动至末端后，近期项目内容与 Dock 之间保留底部间距，Dock 未遮挡最后一项。
- 窄窗口通知菜单保持在窗口左右边界内，并可通过通知按钮打开、关闭。
- Dashboard 成功态、无未来七天待处理收款空态、Hero、摘要指标、计划/实际趋势、行动队列和
  近期项目均在真实后端数据下显示。
- 主题选择器的 `auto`、`light`、`dark` 三种模式均可选择；auto 正确报告当前系统亮色。

## 验收中发现并修复的问题

WKWebView 在切换根节点主题后，部分使用继承 CSS 自定义属性的合成层会停留在旧主题帧，
直到原生窗口发生尺寸变化。修复在设置 `data-theme` 后同步重建一次 body 布局，并增加回归
测试，确保临时样式恢复。重新构建 Wails 资源后，Day Ember 与 Night Orbit 均能一次切换完整
重绘，无需调整窗口。重绘仅用于交互式主题切换，并在折叠 body 前后保存、恢复 `scrollX/Y`；
回归测试覆盖初始渲染不触发强制布局、交互切换恢复原滚动坐标。

## 截图

- [Night Orbit 仪表盘](screenshots/dashboard-night-orbit-1280x800.jpg)
- [Day Ember 仪表盘](screenshots/dashboard-day-ember-1280x800.jpg)
- [Night Orbit 登录页](screenshots/login-night-orbit.jpg)
- [Day Ember 登录页](screenshots/login-day-ember.jpg)

## 自动化覆盖与未完成的手动项

- 320px、375px 的顶栏/通知/Dock CSS 边界由布局与组件测试覆盖；本次 Computer Use 无法把
  原生窗口可靠拖到这两个精确宽度，因此不记为手动通过。
- 已通过可访问树确认约 700px 时隐藏的桌面导航退出可访问树，Dock 顺序正确；Computer Use
  未能稳定返回普通链接/按钮的逐项焦点描述，因此完整桌面与移动 Tab 序列只记为自动测试
  覆盖，不记为完整手动通过。主题菜单、通知菜单的打开、方向键/关闭行为已有组件测试。
- reduced-motion 的运行时切换、动画禁用和监听清理由自动测试覆盖。未通过 UI 修改 macOS
  系统的“减少动态效果”设置。
- 鼠标环境光已由单监听器、`requestAnimationFrame` 节流和 reduced-motion 测试覆盖；本次未
  获得可附档的 WKWebView Performance 面板录制，因此不声明完成浏览器级性能采样。
- 1440×900 无法在当前显示器可用区域内精确建立；已验证初始 1280×800 配置与最大化状态。

## 已知非阻断项

- Vite 生产构建仍提示主 JavaScript chunk 较大，后续可按路由拆包。
- 本机 Go 链接阶段有 macOS SDK/linker 版本提示。
- 项目、日历、分析和设置页的深度视觉迁移属于后续独立阶段，本次只保证新 Shell、主题和
  共享组件兼容这些页面。
