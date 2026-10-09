# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.1.0] - 2026-10-09

### Added
- Toolbar button: clicking the extension icon opens the dashboard from any page — one-click access in browsers where extension control of the new tab is disabled (e.g. Vivaldi before enabling "Controlled by Extension").
- Event countdowns: name + date events, next-up chip under the clock, dedicated management panel, `C` keyboard shortcut.
- Custom background image URL (Settings → Background → Mode → Custom image URL).
- Auto theme: dark mode can now switch on automatically at night (Settings → Theme → Auto).
- Cross-device sync for todos, daily focus, habits, shortcuts and countdowns via `chrome.storage.sync`.
- Automated end-to-end test suite (`tests/`) — 23 checks across static validation, real extension loading in Chromium, and full UI functional coverage.
- Vivaldi installation guide in the README.

### Changed
- Native `prompt()` dialogs replaced with inline inputs for habits and shortcuts.
- Keyboard shortcuts no longer leak the pressed key into newly focused inputs; `Escape` now closes panels even when an input inside the panel is focused.
- Todo, habits and shortcuts widgets now stack in a single adaptive column, eliminating overlap on short screens.
- v1.0 local data migrates automatically to the sync storage area on upgrade.

## [1.0.0] - 2026-10-05

### Added
- New tab dashboard with daily rotating landscape photography and offline gradient mode.
- Personalized, time-aware greeting with live clock (12h / 24h, optional seconds) and date.
- Daily focus prompt with completion state and automatic midnight reset.
- Todo list with add, complete, delete and clear-completed.
- Habit tracker with daily check-off and consecutive-day streaks.
- Weather widget with current conditions and three-day forecast via Open-Meteo (keyless), auto-location or manual city, Celsius / Fahrenheit, 30-minute cache.
- Quick shortcuts grid with automatic favicons and sensible defaults.
- Web search bar with five engines: Google, DuckDuckGo, Bing, YouTube, GitHub.
- Quote of the day from a curated thirty-quote collection.
- Pomodoro timer with configurable intervals, progress ring, notifications, chime and daily session counter.
- Notepad with debounced autosave.
- Six offline soundscapes synthesized with the Web Audio API: rain, ocean, stream, wind, fireplace, night.
- Zen mode and dark mode.
- Per-widget visibility toggles in settings.
- Data export / import as JSON and full reset.
- Keyboard shortcuts for all major actions.
- First-run onboarding.

[1.0.0]: https://github.com/daystart/daystart/releases/tag/v1.0.0
