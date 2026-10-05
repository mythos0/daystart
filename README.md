# DayStart — New Tab Focus Dashboard

A calm, focused dashboard for every new tab in Google Chrome. DayStart replaces the default new tab page with a clean, personal workspace that combines the time, your daily focus, tasks, weather, shortcuts and focus tools in one thoughtfully designed view.

![Version](https://img.shields.io/badge/version-1.0.0-blue) ![Chrome](https://img.shields.io/badge/browser-Chrome%20MV3-green) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## Overview

The average knowledge worker opens dozens of browser tabs every day. DayStart turns those moments into an opportunity to reset, breathe, and remember what matters. Instead of a blank page or a grid of recently visited sites, every new tab becomes a quiet dashboard designed around a single principle: *start with intention*.

The extension is completely free, requires no account, contains no advertising, and works offline for all core features.

## Features

### Dashboard essentials

- **Personalized greeting** — a time-aware salutation (good morning, good afternoon, good evening) with your name, rendered in an elegant serif typeface.
- **Live clock and date** — supports 12-hour and 24-hour formats, with an optional seconds display.
- **Daily focus** — answer one question each morning: *“What is your main focus for today?”* Your answer stays on screen until you mark it complete or clear it, and it resets automatically at midnight.
- **Quote of the day** — a curated collection of thirty motivational quotes and mantras, chosen deterministically so every user sees the same quote on the same day.

### Productivity tools

- **Todo list** — a lightweight task list with add, complete, delete and “clear completed” operations. Task count is summarized at the top of the widget.
- **Habit tracker** — define daily habits and check them off each day. The widget tracks consecutive-day streaks and resets intelligently when a day is missed.
- **Pomodoro timer** — configurable focus and break intervals (default 25/5), an animated progress ring, desktop notifications, a synthesized chime, and a daily session counter.
- **Notes** — a distraction-free notepad with automatic saving.

### Environment and context

- **Weather widget** — current conditions and a three-day forecast, powered by the free, keyless [Open-Meteo](https://open-meteo.com) API. Location is detected automatically (with your permission) or set manually to any city worldwide. Celsius and Fahrenheit are both supported. Responses are cached for thirty minutes.
- **Daily landscape photography** — a curated catalog of scenic images rotates once per calendar day. Random rotation and an offline gradient mode are available in settings.
- **Quick shortcuts** — a compact grid of up to twelve favorite destinations with automatic favicon lookup; sensible defaults are provided on first launch.
- **Web search** — a search bar with five selectable engines: Google, DuckDuckGo, Bing, YouTube and GitHub.
- **Soundscapes** — six ambient soundscapes (rain, ocean, stream, wind, fireplace, night) generated entirely with the Web Audio API. No audio files are downloaded, and playback works offline.

### Personalization

- **Zen mode** — hides every widget and leaves only the clock and your focus. Ideal for deep work.
- **Dark mode** — a subdued overlay and glass treatment for low-light environments.
- **Widget visibility** — every dashboard widget can be shown or hidden independently in settings.
- **Background modes** — daily photo, random photo, or a hand-tuned gradient (works fully offline, with six quick swatches).

### Privacy and data ownership

- **No account required** — nothing to sign up for, nothing to log into.
- **Local-first storage** — all data lives in `chrome.storage` on your device. Settings sync through your browser profile only if Chrome Sync is enabled.
- **One-click export / import** — download your entire dashboard state as a JSON file and restore it anywhere.
- **Full reset** — remove all stored data from the settings panel at any time.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `T` | Focus the todo input |
| `F` | Focus the daily-focus input |
| `S` | Focus the search bar |
| `N` | Toggle the notes panel |
| `P` | Toggle the pomodoro panel |
| `Z` | Toggle zen mode |
| `D` | Toggle dark mode |
| `Esc` | Close the active panel |

## Installation

### From source (developer mode)

1. Download or clone this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** and select the project folder.
5. Open a new tab. DayStart is ready.

### Packaging a release

Run the following command from the repository root to produce an installable archive:

```bash
zip -r daystart-v1.0.0.zip . -x "*.git*" -x "*.md"
```

The resulting `.zip` can be uploaded to the Chrome Web Store or loaded locally.

## Weather attribution

Weather data is provided by [Open-Meteo](https://open-meteo.com) under the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/). The extension requires no API key, and requests are made directly from the browser to Open-Meteo's public endpoints.

Background photography is served from [Picsum Photos](https://picsum.photos).

## Project structure

```
daystart/
├── manifest.json          # Manifest V3 configuration
├── newtab.html            # Dashboard entry point
├── css/
│   └── style.css          # Complete stylesheet
├── js/
│   ├── storage.js         # Storage abstraction (sync / local / fallback)
│   ├── app.js             # Bootstrap, shortcuts, zen & dark modes
│   ├── clock.js           # Clock, date, greeting
│   ├── focus.js           # Daily focus
│   ├── todo.js            # Todo list
│   ├── habits.js          # Habit tracker with streaks
│   ├── links.js           # Quick shortcuts
│   ├── quote.js           # Quote of the day
│   ├── weather.js         # Open-Meteo weather widget
│   ├── background.js      # Daily photography & gradients
│   ├── search.js          # Multi-engine search
│   ├── pomodoro.js        # Pomodoro timer
│   ├── notes.js           # Notepad
│   ├── sounds.js          # Web Audio soundscapes
│   ├── panels.js          # Side-panel manager
│   └── settings.js        # Settings panel
└── icons/                 # Extension icons (16 / 32 / 48 / 128 px)
```

## Technology

- Plain HTML, CSS and vanilla JavaScript — no build step, no frameworks, no dependencies.
- Chrome Extension Manifest V3 with service-worker-free architecture; the dashboard is a fully self-contained page.
- `chrome.storage.sync` for settings and `chrome.storage.local` for larger payloads, with a `localStorage` fallback for non-extension contexts.

## Browser support

Designed for Chrome and Chromium-based browsers (Edge, Brave, Opera, Vivaldi) that support Manifest V3. Other browsers may work but are not officially tested.

## Contributing

Issues and pull requests are welcome. Please keep changes consistent with the existing code style: vanilla JavaScript, no external dependencies, and no telemetry.

## License

Released under the [MIT License](LICENSE).
