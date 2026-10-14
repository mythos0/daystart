# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.3.0] - 2026-10-14

### Added
- **New-tab takeover for Vivaldi and other browsers that ignore the new-tab override** (fixes the dashboard not appearing on new tabs in Vivaldi). The background service worker now recognizes tabs created on the browser's default new-tab page (`chrome://newtab`, `vivaldi://startpage`, `edge://newtab`, …) and redirects them to the DayStart dashboard. Automatic in Vivaldi (user-agent detection); also covers Edge, Brave, Opera and plain Chromium.
- Settings → **New tab → Take over new tabs** with three modes: *Auto* (default — takeover only where the browser needs it), *Always*, and *Off*.
- Optional `tabs` permission, required to identify default new-tab pages (disclosed in the README with an explicit privacy note; no tab data is read, stored, or transmitted beyond that check).

### Fixed
- Dashboard no longer fails to appear on new tabs in Vivaldi when the buried *Controlled by Extension* setting was missed or reset by an update.

## [1.2.0] - 2026-10-14

### Added
- **Daily journal** (`J`): one entry per day with a reflective prompt of the day, a five-step mood check-in, three gratitude lines, day-by-day navigation and autosave. Entries stay on-device and are included in data export.
- **Todo power-ups**: priority flags (medium / high, drawn as a colored edge), due dates with human labels (Today / Tomorrow / weekday) and red overdue highlighting, drag & drop reordering, a completion progress bar, and quick `@today` / `@tomorrow` tokens while typing a task.
- **Curated daily wallpaper** (new default background): high-resolution Bing wallpaper archive photo, cached per day, with graceful fallback to the nature catalog and then to gradients.
- **Photo playlist background mode**: paste one image URL per line; a different photo is chosen each day.
- **Search bangs**: `!gh`, `!y`, `!w`, `!d`, `!b`, `!g` switch engine for a single search; Wikipedia added as a sixth engine; `Tab` cycles engines.
- **Keyboard cheat-sheet**: press `?` for a modal listing all shortcuts (also available from the new top-bar help button).
- **Pomodoro auto-start** option for the next session, and the running timer now survives tab reloads (persisted with an absolute end timestamp).
- **Quote shuffle**: clicking the quote shows another one with a soft fade.
- Weather popover with condition, high/low three-day forecast and location name; coordinates cached for 7 days so the geolocation prompt is not repeated on every new tab.
- Soundscapes keep playing after the panel closes, with a pulsing indicator on the dock and a Stop-all button in the panel.
- Entrance animation for the dashboard, disabled automatically under `prefers-reduced-motion`.
- 15 new automated end-to-end tests (38 total).

### Fixed
- Soundscapes crashed with an AudioContext cross-context error the second time a sound was played; a single context is now cached for the session.
- Closing any side panel (notes, pomodoro, …) stopped the soundscapes; ambient audio is now independent of panel state.
- The weather detail popover could never open (its toggle was never wired); it is now a proper dropdown card.
- The pomodoro timer reset whenever the tab was reloaded; state is persisted and restored.
- `chrome.storage.sync` writes that exceed the per-item quota failed silently; writes now detect the failure and fall back to the local storage area.
- Zen mode did not hide the search bar (entrance animation overrode the hidden state) nor the countdown chip.
- `S` shortcut focused the web search although the dock labeled it “Soundscapes”; `S` now toggles soundscapes and `/` focuses search.
- Stale comment referenced an unimplemented “lucky search” behavior.
- Incorrect `homepage_url` in the manifest.

### Changed
- Storage layer resolves write failures instead of failing silently (`setSyncedSafe` with local fallback).
- Weather forecast now shows icon plus high/low temperatures per day.

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

[1.2.0]: https://github.com/mythos0/daystart/releases/tag/v1.2.0
[1.1.0]: https://github.com/mythos0/daystart/releases/tag/v1.1.0
[1.0.0]: https://github.com/mythos0/daystart/releases/tag/v1.0.0
