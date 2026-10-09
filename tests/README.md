# DayStart — Test Suite

Automated end-to-end verification for the extension, powered by
[Playwright](https://playwright.dev/python/). The suite loads the real
unpacked MV3 extension into headless Chromium and drives the actual
dashboard — no mocks for core logic.

## What is covered

**Layer 1 — Static validation**
- Manifest V3 integrity (required fields, action, service worker, semver)
- All referenced files exist (icons, scripts, styles)
- Repository hygiene (no restricted branding strings)

**Layer 2 — Extension loading**
- The unpacked extension registers its MV3 service worker in real Chromium
- The dashboard page runs with `chrome.storage` available

**Layer 3 — UI functional tests**
- Onboarding and personalized greeting
- Live clock and date
- Daily focus (set / complete / clear)
- Todo (add / complete / clear completed)
- Habits (inline add, check off, streak badge)
- Shortcuts (inline form, URL normalization)
- Countdowns (add event, chip shows days remaining)
- Pomodoro (start, tick, ring animation, pause)
- Notes (debounced autosave, persistence across reload)
- Themes (toggle, auto night mode persisted)
- Zen mode
- Widget visibility toggles
- Regression: shortcut keys never leak text into focused inputs
- Custom background URL
- Search engine cycling and submission
- Storage migration (v1.0 local data → sync)
- Zero uncaught JS errors across the whole session

## Running

```bash
# one-time setup
pip install playwright
python3 -m playwright install chromium

# run
python3 tests/test_extension.py
```

Exit code `0` = all tests passed; `1` = at least one failure.
