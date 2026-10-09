# DayStart — New Tab Focus Dashboard

A calm, focused dashboard for every new tab in Chrome, Edge, Brave, Vivaldi and other Chromium browsers. DayStart replaces the default new tab page with a clean, personal workspace that combines the time, your daily focus, tasks, weather, shortcuts and focus tools in one thoughtfully designed view.

![Version](https://img.shields.io/badge/version-1.1.0-blue) ![Chrome](https://img.shields.io/badge/browser-Chrome%20MV3-green) ![Tests](https://img.shields.io/badge/tests-23%2F23%20passing-brightgreen) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

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

- **Todo list** — a lightweight task list with add, complete, delete and “clear completed” operations. Task count is summarized at the top of the widget. Tasks sync across devices through your browser profile.
- **Habit tracker** — define daily habits with a proper inline input and check them off each day. The widget tracks consecutive-day streaks and resets intelligently when a day is missed.
- **Event countdowns** — add any event with a name and date. The next upcoming event appears as a subtle chip under the clock (“Kyoto trip — 12 days”), with full management in its own panel.
- **Pomodoro timer** — configurable focus and break intervals (default 25/5), an animated progress ring, desktop notifications, a synthesized chime, and a daily session counter.
- **Notes** — a distraction-free notepad with automatic saving.

### Environment and context

- **Weather widget** — current conditions and a three-day forecast, powered by the free, keyless [Open-Meteo](https://open-meteo.com) API. Location is detected automatically (with your permission) or set manually to any city worldwide. Celsius and Fahrenheit are both supported. Responses are cached for thirty minutes.
- **Daily landscape photography** — a curated catalog of scenic images rotates once per calendar day. Random rotation, **custom image URL**, and an offline gradient mode are available in settings.
- **Quick shortcuts** — a compact grid of up to twelve favorite destinations with automatic favicon lookup; sensible defaults are provided on first launch.
- **Web search** — a search bar with five selectable engines: Google, DuckDuckGo, Bing, YouTube and GitHub.
- **Soundscapes** — six ambient soundscapes (rain, ocean, stream, wind, fireplace, night) generated entirely with the Web Audio API. No audio files are downloaded, and playback works offline.

### Personalization

- **Zen mode** — hides every widget and leaves only the clock and your focus. Ideal for deep work.
- **Theme system** — light, dark, or **auto** (switches to dark automatically at night and back at sunrise).
- **Widget visibility** — every dashboard widget can be shown or hidden independently in settings.
- **Background modes** — daily photo, random photo, custom image URL, or a hand-tuned gradient (works fully offline, with six quick swatches).

### Privacy and data ownership

- **No account required** — nothing to sign up for, nothing to log into.
- **Local-first storage** — all data lives in `chrome.storage` on your device. Todos, focus, habits, shortcuts and countdowns sync automatically through your browser profile when Chrome Sync (or your browser's equivalent) is signed in. Data from v1.0 installs migrates automatically.
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
| `C` | Toggle the countdowns panel |
| `Z` | Toggle zen mode |
| `D` | Toggle dark mode |
| `Esc` | Close the active panel |

## Installation

### Google Chrome / Edge / Brave

1. Download or clone this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** and select the project folder.
5. Open a new tab. DayStart is ready.

### Vivaldi

Vivaldi uses its own Start Page by default and requires one extra setting to hand the new tab to an extension. It works fully — the browser even ships a dedicated control for it:

1. Install the extension: open `vivaldi://extensions`, enable **Developer mode**, click **Load unpacked** and select the project folder. (To install from the Chrome Web Store instead, open the store in Vivaldi and confirm the *Allow extensions from other stores* prompt.)
2. Copy the extension **ID** shown on its card in `vivaldi://extensions` (you will only need this for the fallback in step 4).
3. Go to **Settings → Tabs → New Tab Page**.
4. Select **Start Page**, then tick **Controlled by Extension** — Vivaldi will offer the newly installed dashboard. Pick it, and every new tab now opens DayStart.
5. *Fallback (if your Vivaldi version does not offer the extension picker):* go to **Settings → General**, set **Homepage** to `chrome-extension://<ID-from-step-2>/newtab.html` and enable **Use Homepage as New Tab Page**. Also set **Startup with → Homepage** if you want it on launch.

**Toolbar button:** DayStart also adds a toolbar icon that opens the dashboard on click — pin it (click the puzzle icon → pin) for one-click access from any page, in any Chromium browser, regardless of new tab settings.

### Packaging a release

Run the following command from the repository root to produce an installable archive:

```bash
zip -r daystart-v1.0.0.zip . -x "*.git*" -x "*.md"
```

The resulting `.zip` can be uploaded to the Chrome Web Store or loaded locally.

## Weather attribution

Weather data is provided by [Open-Meteo](https://open-meteo.com) under the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/). The extension requires no API key, and requests are made directly from the browser to Open-Meteo's public endpoints.

Background photography is served from [Picsum Photos](https://picsum.photos).

## Testing

The repository ships an automated end-to-end suite (`tests/test_extension.py`, Playwright) that loads the real extension into headless Chromium and verifies the service worker, onboarding, every widget, themes, shortcuts, storage migration and error-free execution — 23 checks in total. See [tests/README.md](tests/README.md).

```bash
python3 tests/test_extension.py
```

## Project structure

```
daystart/
├── manifest.json          # Manifest V3 configuration
├── newtab.html            # Dashboard entry point
├── css/
│   └── style.css          # Complete stylesheet
├── js/
│   ├── service-worker.js  # Toolbar button: open dashboard
│   ├── storage.js         # Storage abstraction (sync / local / fallback)
│   ├── app.js             # Bootstrap, shortcuts, themes, zen mode
│   ├── clock.js           # Clock, date, greeting
│   ├── focus.js           # Daily focus
│   ├── todo.js            # Todo list
│   ├── habits.js          # Habit tracker with streaks
│   ├── countdowns.js      # Event countdowns
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
├── tests/                 # Playwright end-to-end suite
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
