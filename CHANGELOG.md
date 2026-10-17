# Changelog

## [Unreleased]

### Added

- **Dashboard**: 新增仪表盘时钟、待处理收款队列与可复用的 ODS `SummaryMetric` 指标模式。
- **Design System**: 扩展 Tabs 导航变体、空状态尺寸、分页栏、输入框、选择器、日历及路由按钮能力，并补充样式所有权、字体资源和排版比例契约测试。
- **Analytics**: 新增统一图表配置和 CSV 导出工具，完善资金状态、项目表现与周期切换视图。
- **Quality**: 增加登录动效调整方案、设置页设计验收记录以及桌面/移动端回归测试覆盖。

### Changed

- **UI**: 按 Orange Design System 全面重构工作台、项目列表、项目详情、项目新增/编辑、收款日历、数据分析和系统设置页面。
- **Projects**: 项目详情新增结算盘面、回款完成度、履约轨道、下一笔收款与项目档案；项目表单新增分段录入、实时草稿摘要、档案完整度和计划金额核对。
- **Navigation**: 优化顶部 Topbar、移动端 Dock、主题切换及按钮的选中、悬浮和图标反馈，统一桌面与移动端间距。
- **Settings**: 删除冗余设置总览，重排分类导航与字典管理，统一空状态、图标间距和低对比文字层级。
- **Typography**: 将界面字体由 Inter 迁移至 MiSans VF，调整中文字号、字重、行高和前景色令牌，并保留 JetBrains Mono 用于数据与编号。
- **Motion**: 统一登录页进入时间线、呼吸阴影、主题过渡、按钮按压及悬浮反馈，并完整支持 `prefers-reduced-motion`。

### Fixed

- **Dashboard**: 修复近期项目名称过宽、回款进度条长度不一致以及 100% 数值挤压进度条的问题。
- **Responsive**: 修复项目、分析、日历和设置页面在窄屏下的布局、横向溢出与操作区拥挤问题。
- **Accessibility**: 补齐图标按钮名称、表单标签、Tabs 键盘行为、深链焦点以及空状态操作提示。
- **Theme**: 修复登录页与 Topbar 主题图标悬浮色、选中边框色及亮暗主题下的文字对比问题。

### Removed

- **Dependencies**: 移除 Inter 依赖、旧字体文件及重复的 Dashboard `SummaryMetric` 实现。
- **Styles**: 清理旧的页面级过渡样式，将分析、日历及项目组合布局迁移至独立领域样式表。

## [0.7.2] - 2026-02-05

### Changed

- **UI**: 统一了项目管理、用户管理、通知中心的分页组件样式，实现了智能页码折叠逻辑。
- **Refactor**: 优化了分页计算逻辑，支持大量页码时的可视区域动态调整。

## [0.7.1] - 2026-02-02

### Changed

- **UI**: Improved "Developer Settings" UI with better layout, icons, and responsive design.
- **UI**: Enhanced token list display with "Active" and "Revoked" sections.
- **Sys**: Added `personal_access_tokens` table to Data Sync service for cloud synchronization.

### Fixed

- **API**: Fixed token list caching issue by adding timestamp parameter to requests.
- **UI**: Fixed missing icon in "Revoked Tokens" section.

## [0.7.0] - 2026-02-02

### Added

- **Feature**: Implemented Personal Access Token (PAT) system for external API access.
  - Added "Developer Settings" tab in System Settings.
  - Added Backend support for Token generation, hashing, and management.
  - Added new API endpoints: `/api/v1/tokens` (Create, List, Revoke, Delete).
- **Network**: Added support for external API access via a dedicated HTTP server (Default port: 3456).
  - Port is configurable via `API_SERVER_PORT`.

### Fixed

- **Internal**: Fixed user association issue when creating tokens.

## [0.6.2] - 2026-02-01

### Fixed

- **UI**: Fixed login and registration page input icons visibility in dark mode (forced white color and z-index).
- **UI**: Fixed alignment of icons in registration form (restored absolute positioning).

## [0.6.1] - 2026-02-01

### Changed

- **UI**: Added global scrollbar styling with theme-aware colors (light/dark mode support).
- **UI**: Enhanced form input focus states for dark mode with proper background color.

### Removed

- **Login**: Removed WeChat and Apple social login buttons from the login page.
- **Login**: Cleaned up commented-out "back to home" button code.

## [0.6.0] - 2026-01-27

### Added

- **UI**: Implemented "Living Light" interactive cursor effects, adding dynamic ambient lighting and specular reflections to the background and glass cards.

### Changed

- **UI**: "Ultra-Deep Liquid Glass" aesthetic overhaul.
  - **Sidebar**: Enhanced active states with "Neon Prism" glow and "Liquid Metal" logo shimmer.
  - **Header**: Redesigned dropdowns with deeper glass material and "Shift" hover effects.
  - **Global**: Refined glass materials, button physics, and input focus states ("Breathing Neon").

### Fixed

- **UI**: Fixed toast notification disappearance animation glitch by enforcing container constraints and optimizing transition properties.

## [0.5.0] - 2026-01-25

### Added

- **Data Sync**: Implement database synchronization feature (SQLite to PostgreSQL/MySQL).
- **Settings**: Add Data Sync management panel with connection test and data comparison.
- **Backend**: Add `SyncService` for handling data synchronization logic.

### Changed

- **UI**: Refine settings panel layout and table styles for better consistency.
- **UX**: Improve loading indicators with animated Remix Icons.

### Fixed

- **Sync**: Fix "append-only" sync issue by implementing "Mirror" mode (automatically delete orphaned cloud records).

## [0.4.1] - 2026-01-25

### Fixed

- **Dashboard**: Fixed percentage precision issue - trend percentages now display with 2 decimal places instead of excessive precision (e.g., `328.57%` instead of `328.57142857142856%`).
- **Analytics**: Unified percentage precision to 2 decimal places for all trend indicators in the Analytics view.

### Changed

- **Projects**: Payment records in project detail view are now sorted by plan date in descending order (newest first).

---

## [0.4.0] - 2026-01-13

### Added

- **Multi-Database Support**: Added support for MySQL and PostgreSQL in addition to SQLite (default).
- **Auto-Create Database**: MySQL/PostgreSQL databases are automatically created on first connection (configurable).
- **SSL Configuration**: Added `DB_SSL_MODE` option for cloud database connections (Nile, Supabase, AWS RDS, etc.).
- **New Config Options**: `DB_AUTO_CREATE` to toggle automatic database creation for local vs cloud environments.

### Changed

- **Documentation**: Updated README (CN/EN) with comprehensive multi-database configuration guide.
- **Configuration**: Expanded `.env.example` with new database options and detailed comments.

---

## [0.3.1] - 2026-01-12

### Added

- **Validation**: Implemented comprehensive format validation (Email, Phone) across Registration, Profile, and User Management modules.
- **Validation**: Added strict username validation rules (lowercase start, alphanumeric, max 10 chars) for User Management.

### Changed

- **Dashboard**: Optimized "Upcoming Payments" display to show only the top 3 most recent items.

## [0.3.0] - 2026-01-12

### Added

- **User Management**: New admin-only module for creating, editing, and managing system users.
- **UI**: Added visual separators to modal headers in Settings.

### Changed

- **UI**: Refined modal styles for Notifications and Dictionary Management to align with the global design system.
- **UI**: Unified form styling across "New Project", "User Management", and "Notification" modals (input styles, dark mode adaptation).

### Fixed

- **UI**: Fixed disappearing select arrows in dark mode for all settings modals.
- **Performance**: Fixed user list not refreshing immediately after creating a new user.

## [0.2.2] - 2026-01-11

### Added

- **Components**: Enhanced `DatePicker.vue` with Year and Month selection views for quick navigation (similar to Element UI).

### Changed

- **Projects**: Added comprehensive date validation when creating/editing projects (Start <= End, Contract <= Start, Contract <= Payment).

## [0.2.1] - 2026-01-11

### Changed

- **Documentation**: Enhanced `README.md` and `README_EN.md` with visual interface previews (Dashboard, Projects, Analytics, etc.).
- **Chore**: Removed `.env` file from version control (added to `.gitignore`) to prevent sensitive configuration leakage.

### Added

- **Dashboard**: Added trend calculation for Overdue Amount (month-over-month).
- **Analytics**: Implemented dynamic trend prefixes (e.g., "Compared to last week/month/quarter/year") based on the selected time period in the Analytics view.

### Changed

- **Dashboard**: Optimized the trend calculation logic for the main statistics cards to display month-over-month comparison trends instead of all-time trends.
- **UI**: Updated the dashboard statistics cards to interpret the trend values as "Compared to last month" and explicitly display this text.

### Fixed

- **CI**: Fixed Windows installer path in GitHub Actions workflow to ensure artifacts are correctly uploaded to Releases.
- **Documentation**: Added detailed Chinese comments to `.github/workflows/release.yml` for better CI/CD process understanding.

## [0.1.9] - 2026-01-11

### Changed

- **Documentation**: Comprehensive addition of Chinese comments across the entire frontend codebase (Views, Components, Stores, APIs) to improve maintainability and code readability.
- **Documentation**: Added detailed comments to `main.go` and `scripts/bump_version.go` to explain application initialization and release processes.

## [0.1.8] - 2026-01-11

### Fixed

- **UI**: Fixed sticky "Action" column in Project lists for better horizontal scrolling.
- **UI**: Fixed "Project Name" width (200px) and added text truncation in Project Management and Dashboard tables.
- **UI**: Resolved visual glitch in "Action" column by enforcing correct background color in Dark Mode.

## [0.1.7] - 2026-01-10

### Added

- **Robust Logger**: Implemented a production-grade file logging system using `Uber Zap` (high performance) and `Lumberjack` (log rotation).
  - Logs are stored in `log/orange.log` alongside the database.
  - Supports automatic rotation (10MB limit, keep 5 files, 30 days retention).
  - Captures `slog` output (Gin, GORM, system logs) automatically.
  - Configuration added to `config.json` / env vars (`LOG_PATH`, `LOG_MAX_SIZE`, etc.).

## [0.1.6] - 2026-01-10

### Fixed

- **Critical**: Replaced CGO-based SQLite driver with pure-Go driver (`glebarez/sqlite`). This resolves the "Binary was compiled with 'CGO_ENABLED=0', go-sqlite3 requires cgo" panic on Windows.

## [0.1.5] - 2026-01-10

### Added

- Added debug logging: `orange_debug.log` will be created in the user's home directory to diagnose startup issues.
- Added panic recovery to check for crashes on Windows.

## [0.1.4] - 2026-01-10

### Changed

- Updated "About" page styling: fixed reversed dark/light mode card backgrounds and refined visual hierarchy for tech stack badges.
- Temporarily hid the global search box in the header.

## [0.1.3] - 2026-01-10

### Fixed

- Resolved CORS issues in "Check for Updates" by proxying requests through a new backend endpoint `/api/v1/system/updates/check`.

### Changed

- Parameterized GitHub repository URL for update checks, allowing configuration via `GITHUB_REPO` environment variable.

## [0.1.2] - 2026-01-09

### Added

- Added `.github/workflows/release.yml` for automated multi-platform releases.
- Configured `.gitignore` to exclude `.agent` directory.

## [0.1.1] - 2026-01-09

### Added

- Implemented "Check for Updates" feature in Settings that compares local version with GitHub latest release.
- Added `scripts/bump_version.go` to automate version management across configuration files.
- Added `bump-version` task to `Taskfile.yml`.

### Changed

- Refactored notification detail modal in `SettingsView.vue` to use shared `NotificationDetailModal` component.
- Updated styling for notification details (spacing and layout).
- Updated system version to 0.1.1 across all platforms (macOS, Windows, Linux).
- Modified `SettingsView.vue` to dynamically display version from `package.json`.

### Fixed

- Fixed `Taskfile.yml` syntax error.
- Resolved build error in `StatCard.vue`.
