# Changelog

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
