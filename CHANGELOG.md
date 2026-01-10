# Changelog

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
