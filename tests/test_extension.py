#!/usr/bin/env python3
"""
DayStart — automated end-to-end test suite.

Runs three layers of verification against the real extension binary:

  1. Static validation  — manifest integrity, referenced files, icon assets.
  2. Extension loading  — loads the unpacked MV3 extension into real
     Chromium via Playwright persistent context, waits for the MV3 service
     worker, then opens the actual chrome-extension:// dashboard page.
  3. UI functional tests — drives onboarding, focus, todo, habits, links,
     search, pomodoro, notes, countdowns, widget toggles, themes, zen mode
     and storage migration through the real browser.

Usage:
    python3 tests/test_extension.py            # run everything
    python3 -m playwright install chromium     # one-time browser setup

Exit code 0 = all tests passed, 1 = at least one failure.
"""

import base64
import json
import os
import re
import sys
import time
from datetime import date, timedelta

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = ROOT
RESULTS = []


def check(name, fn):
    try:
        fn()
        RESULTS.append((name, True, ""))
        print(f"  PASS  {name}")
    except Exception as e:
        RESULTS.append((name, False, str(e)))
        print(f"  FAIL  {name}\n        {e}")


def expect(cond, msg=""):
    if not cond:
        raise AssertionError(msg or "expectation failed")


# ----------------------------------------------------------------------
# Layer 1: static validation
# ----------------------------------------------------------------------

def static_tests():
    print("\n[1] Static validation")

    def manifest_ok():
        m = json.load(open(os.path.join(EXT, "manifest.json")))
        expect(m["manifest_version"] == 3, "must be MV3")
        for field in ("name", "version", "description", "icons",
                      "chrome_url_overrides", "action", "background",
                      "permissions"):
            expect(field in m, f"missing field: {field}")
        expect(m["chrome_url_overrides"]["newtab"] == "newtab.html")
        expect(m["background"]["service_worker"] == "js/service-worker.js")
        expect(re.match(r"^\d+\.\d+\.\d+$", m["version"]), "semver version")

    def referenced_files_exist():
        m = json.load(open(os.path.join(EXT, "manifest.json")))
        for size, path in m["icons"].items():
            expect(os.path.isfile(os.path.join(EXT, path)), f"icon missing: {path}")
        expect(os.path.isfile(os.path.join(EXT, m["background"]["service_worker"])))
        html = open(os.path.join(EXT, "newtab.html")).read()
        for path in re.findall(r'(?:src|href)="(js/[^"]+|css/[^"]+)"', html):
            expect(os.path.isfile(os.path.join(EXT, path)), f"referenced file missing: {path}")

    def no_restricted_branding():
        for dirpath, _, files in os.walk(EXT):
            if ".git" in dirpath:
                continue
            for f in files:
                if f.endswith((".js", ".html", ".css", ".json", ".md")):
                    content = open(os.path.join(dirpath, f), encoding="utf-8", errors="ignore").read()
                    expect("momentum" not in content.lower(),
                           f"restricted brand string found in {f}")

    check("manifest is valid MV3 with action + service worker", manifest_ok)
    check("all referenced files exist (icons, scripts, css)", referenced_files_exist)
    check("no restricted branding anywhere in repo", no_restricted_branding)


# ----------------------------------------------------------------------
# Layer 2 + 3: real browser
# ----------------------------------------------------------------------

DATA_URL_GIF = ("data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAUwAOw==")


def browser_tests():
    print("\n[2] Extension loading in real Chromium")

    import tempfile
    user_data = tempfile.mkdtemp(prefix="daystart-test-")
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data,
            headless=True,
            channel="chromium",
            args=[
                f"--disable-extensions-except={EXT}",
                f"--load-extension={EXT}",
            ],
        )

        # Wait for the MV3 service worker to prove the extension loaded
        deadline = time.time() + 15
        while time.time() < deadline and not ctx.service_workers:
            time.sleep(0.3)
        sws = [w for w in ctx.service_workers if w.url.startswith("chrome-extension://")]
        check("extension loads: MV3 service worker registered",
              lambda: expect(sws, "no service worker found"))
        if not sws:
            ctx.close()
            return
        ext_id = sws[0].url.split("/")[2]
        print(f"        extension id: {ext_id}")

        page = ctx.new_page()
        console_errors = []
        page.on("pageerror", lambda e: console_errors.append(str(e)))

        page.goto(f"chrome-extension://{ext_id}/newtab.html")
        page.wait_for_timeout(1500)

        def test_chrome_storage_available():
            has = page.evaluate("typeof chrome !== 'undefined' && !!(chrome.storage && chrome.storage.sync)")
            expect(has, "chrome.storage.sync unavailable on dashboard page")
        check("dashboard runs with chrome.storage available", test_chrome_storage_available)

        def wipe():
            page.evaluate("""() => new Promise(res => {
                chrome.storage.sync.clear(() => chrome.storage.local.clear(() => {
                    localStorage.clear(); res();
                }));
            })""")
            page.reload()
            page.wait_for_timeout(1200)

        print("\n[3] UI functional tests")

        def onboarding_flow():
            expect(page.locator("#onboarding").is_visible(), "onboarding should show on first run")
            page.fill("#onboard-name", "Alex")
            page.click("#onboard-go")
            page.wait_for_timeout(600)
            expect(not page.locator("#onboarding").is_visible(), "onboarding should hide")
            expect("Alex" in page.locator("#greeting").inner_text(), "greeting lacks name")
        check("onboarding: name captured, greeting personalized", onboarding_flow)

        def clock_ticks():
            txt = page.locator("#clock").inner_text()
            expect(re.match(r"^\d{1,2}:\d{2}$", txt.strip()), f"clock format bad: {txt}")
            expect(len(page.locator("#date").inner_text()) > 5, "date line empty")
        check("clock renders live time and date", clock_ticks)

        def focus_flow():
            page.fill("#focus-input", "Finish the report")
            page.press("#focus-input", "Enter")
            page.locator("#focus-input").blur()
            page.wait_for_timeout(300)
            expect("main focus" in page.locator("#focus-prompt").inner_text().lower(),
                   "prompt should switch to confirmation")
            page.click("#focus-done")
            page.wait_for_timeout(200)
            expect("done" in page.locator("#focus-input").get_attribute("class"),
                   "focus should get done class")
            page.click("#focus-clear")
            page.wait_for_timeout(200)
            expect(page.locator("#focus-input").input_value() == "", "focus not cleared")
        check("daily focus: set, complete, clear", focus_flow)

        def todo_flow():
            page.fill("#todo-input", "Task A")
            page.press("#todo-input", "Enter")
            page.fill("#todo-input", "Task B")
            page.press("#todo-input", "Enter")
            page.wait_for_timeout(300)
            expect("2 left" in page.locator("#todo-count").inner_text(), "count should be 2")
            page.locator(".todo-item").first.locator(".todo-check").click()
            page.wait_for_timeout(200)
            expect("1 left" in page.locator("#todo-count").inner_text(), "count should be 1")
            page.click("#todo-clear-done")
            page.wait_for_timeout(200)
            expect(page.locator(".todo-item").count() == 1, "should have 1 task left")
        check("todo: add, complete, clear completed", todo_flow)

        def habits_flow():
            page.fill("#habits-input", "Morning run")
            page.press("#habits-input", "Enter")
            page.wait_for_timeout(300)
            row = page.locator(".habit-row").first
            expect("Morning run" in row.inner_text(), "habit row missing")
            row.locator(".habit-check").click()
            page.wait_for_timeout(200)
            expect("done" in page.locator(".habit-row").first.get_attribute("class"),
                   "habit not marked done")
            page.keyboard.press("Escape")
            page.keyboard.press("Escape")
        check("habits: inline add and check off with streak badge", habits_flow)

        def links_flow():
            page.click("#links-add")  # opens inline form
            page.wait_for_timeout(200)
            page.fill("#links-url-input", "news.ycombinator.com")
            page.fill("#links-name-input", "HN")
            page.click("#links-save")
            page.wait_for_timeout(300)
            tiles = page.locator(".link-tile")
            found = any("HN" in tiles.nth(i).inner_text() for i in range(tiles.count()))
            expect(found, "added shortcut tile not found")
            stored = page.evaluate("new Promise(r => chrome.storage.sync.get('links', r))")
            expect(stored["links"][-1]["url"] == "https://news.ycombinator.com",
                   f"url normalization failed: {stored['links'][-1]}")
        check("shortcuts: inline form adds and normalizes URL", links_flow)

        def countdown_flow():
            page.keyboard.press("Escape")
            page.keyboard.press("c")
            page.wait_for_timeout(400)
            expect("open" in page.locator("#panel-countdowns").get_attribute("class"),
                   "countdown panel did not open")
            tomorrow = str(date.today() + timedelta(days=1))
            page.fill("#countdown-name-input", "Trip to Kyoto")
            page.fill("#countdown-date-input", tomorrow)
            page.click("#countdown-add")
            page.wait_for_timeout(400)
            chip = page.locator("#countdown-chip")
            expect(chip.is_visible(), "countdown chip not visible")
            expect("Trip to Kyoto" in chip.inner_text() and "tomorrow" in chip.inner_text(),
                   f"chip text wrong: {chip.inner_text()}")
            expect(page.locator(".countdown-row").count() == 1, "panel row missing")
        check("countdowns: add event, chip shows days remaining", countdown_flow)

        def pomodoro_flow():
            page.keyboard.press("Escape")
            page.keyboard.press("p")
            page.wait_for_timeout(400)
            expect("open" in page.locator("#panel-pomodoro").get_attribute("class"),
                   "pomodoro panel did not open")
            page.fill("#pomo-focus-min", "5")
            page.locator("#pomo-focus-min").dispatch_event("change")
            page.click("#pomo-start")
            page.wait_for_timeout(2300)
            face = page.locator("#pomo-face").inner_text()
            expect(face.startswith("04:5"), f"timer not ticking, face={face}")
            ring = page.locator("#pomo-ring").get_attribute("style")
            expect(ring and "stroke-dashoffset" in ring, "ring not updating")
            page.click("#pomo-start")  # pause
            page.keyboard.press("Escape")
            page.wait_for_timeout(400)
        check("pomodoro: starts, ticks, ring animates, pauses", pomodoro_flow)

        def notes_flow():
            page.keyboard.press("n")
            page.wait_for_timeout(400)
            expect("open" in page.locator("#panel-notes").get_attribute("class"),
                   "notes panel did not open via shortcut")
            page.fill("#notes-area", "hello notes")
            page.wait_for_timeout(1200)  # debounce 600ms
            expect("Saved" in page.locator("#notes-saved").inner_text(), "not marked saved")
            page.keyboard.press("Escape")  # closes even with textarea focused
            page.wait_for_timeout(400)
            page.reload()
            page.wait_for_timeout(1500)
            page.keyboard.press("n")
            page.wait_for_timeout(400)
            expect("open" in page.locator("#panel-notes").get_attribute("class"),
                   "notes panel did not reopen after reload")
            expect(page.locator("#notes-area").input_value() == "hello notes",
                   f"notes did not persist: {page.locator('#notes-area').input_value()!r}")
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)
        check("notes: autosave persists across reload, no key leakage", notes_flow)

        def theme_flow():
            page.keyboard.press("Escape")
            page.keyboard.press("d")
            page.wait_for_timeout(300)
            expect("dark" in page.locator("body").get_attribute("class"), "dark mode did not apply")
            page.keyboard.press("d")
            page.wait_for_timeout(300)
            expect("dark" not in (page.locator("body").get_attribute("class") or ""),
                   "dark mode did not toggle off")
            page.click("#btn-settings")
            page.wait_for_timeout(300)
            page.select_option("#set-theme", "auto")
            page.wait_for_timeout(300)
            stored = page.evaluate("new Promise(r => chrome.storage.sync.get('themeMode', r))")
            expect(stored.get("themeMode") == "auto", "themeMode not stored")
            page.keyboard.press("Escape")
        check("themes: toggle + auto night mode setting persists", theme_flow)

        def zen_flow():
            page.keyboard.press("z")
            page.wait_for_timeout(300)
            expect("zen" in page.locator("body").get_attribute("class"), "zen class missing")
            page.keyboard.press("z")
            page.wait_for_timeout(300)
            expect("zen" not in (page.locator("body").get_attribute("class") or ""),
                   "zen did not toggle off")
        check("zen mode toggles clean", zen_flow)

        def widget_toggle_flow():
            page.click("#btn-settings")
            page.wait_for_timeout(300)
            page.uncheck("#set-w-todo")
            page.wait_for_timeout(300)
            expect(page.locator("#todo-panel").is_hidden(), "todo widget should hide")
            page.check("#set-w-todo")
            page.wait_for_timeout(300)
            expect(page.locator("#todo-panel").is_visible(), "todo widget should return")
            page.keyboard.press("Escape")
        check("widget visibility toggles apply instantly", widget_toggle_flow)

        def shortcut_leak_regression():
            # Shortcut 'c' must open the countdown panel WITHOUT typing 'c' into its input
            page.keyboard.press("c")
            page.wait_for_timeout(400)
            expect(page.locator("#countdown-name-input").input_value() == "",
                   "shortcut key leaked into focused input")
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)
            expect("open" not in page.locator("#panel-countdowns").get_attribute("class"),
                   "Escape should close panel even when an input is focused")
        check("regression: shortcut keys never leak text into inputs", shortcut_leak_regression)

        def custom_bg_flow():
            page.click("#btn-settings")
            page.wait_for_timeout(300)
            page.select_option("#set-bg-mode", "custom")
            page.fill("#set-bg-url", DATA_URL_GIF)
            page.locator("#set-bg-url").dispatch_event("change")
            page.wait_for_timeout(600)
            bg = page.locator("#bg-photo").get_attribute("style")
            expect("data:image/gif" in (bg or ""), f"custom bg not applied: {bg}")
            page.select_option("#set-bg-mode", "daily")
            page.locator("#set-bg-mode").dispatch_event("change")
            page.keyboard.press("Escape")
        check("custom background URL applies", custom_bg_flow)

        def search_engine_cycle():
            page.click("#search-engine-btn")
            page.wait_for_timeout(200)
            expect(page.locator("#search-engine-btn").inner_text() == "DuckDuckGo",
                   "engine did not cycle")
        check("search engine cycles to DuckDuckGo", search_engine_cycle)

        def storage_migration():
            # Simulate a v1.0 user: legacy data in chrome.storage.local
            page.evaluate("""() => new Promise(res => {
                chrome.storage.local.set({ todo: [{ text: 'legacy task', done: false }] }, res);
            })""")
            page.evaluate("() => new Promise(res => chrome.storage.sync.remove('todo', res))")
            page.reload()
            page.wait_for_timeout(1500)
            expect("legacy task" in page.locator("#todo-list").inner_text(),
                   "legacy todo not migrated to UI")
            synced = page.evaluate("new Promise(r => chrome.storage.sync.get('todo', r))")
            expect(bool(synced.get("todo")), "legacy todo not written to sync area")
        check("storage migration: v1.0 local data moves to sync", storage_migration)

        def search_submit_navigates():
            # Intercept the engine request so the test is deterministic & offline-safe
            page.route("**duckduckgo.com/**", lambda route: route.fulfill(
                status=200, body="<html>ddg-ok</html>", content_type="text/html"))
            page.fill("#search-input", "vivaldi browser")
            with page.expect_navigation(url="**duckduckgo.com/**"):
                page.evaluate("document.getElementById('search-form').requestSubmit()")
            expect("duckduckgo" in page.url and "vivaldi" in page.url,
                   f"unexpected url {page.url}")
            page.unroute("**duckduckgo.com/**")
            page.go_back()
            page.wait_for_timeout(1000)
        check("search submits to the selected engine", search_submit_navigates)

        # ------------------- v1.2.0 feature tests -------------------

        def todo_quick_parse():
            page.fill("#todo-input", "Submit report @today")
            page.press("#todo-input", "Enter")
            page.wait_for_timeout(300)
            first = page.locator(".todo-item").first
            expect("Submit report" in first.locator(".todo-text").inner_text(),
                   "quick token not stripped from text")
            expect("Today" in first.locator(".due-chip").inner_text(),
                   "due chip missing after @today")
        check("todo: @today token sets a due chip", todo_quick_parse)

        def todo_priority_cycle():
            flag = page.locator(".todo-item").first.locator(".todo-flag")
            row = page.locator(".todo-item").first
            flag.click()
            page.wait_for_timeout(200)
            expect("p1" in row.get_attribute("class"), "priority 1 class missing")
            flag.click()
            page.wait_for_timeout(200)
            expect("p2" in row.get_attribute("class"), "priority 2 class missing")
            flag.click()
            page.wait_for_timeout(200)
            expect("p1" not in row.get_attribute("class") and "p2" not in row.get_attribute("class"),
                   "priority did not cycle back to none")
        check("todo: priority flag cycles none→med→high", todo_priority_cycle)

        def todo_date_picker():
            row = page.locator(".todo-item").first
            row.locator(".todo-date-btn").click()
            page.wait_for_timeout(200)
            picker = page.locator(".todo-date-row input")
            expect(picker.count() == 1, "inline date picker did not open")
            # fill() fires input+change → handler persists and re-renders
            picker.fill("2020-01-01")
            page.wait_for_timeout(300)
            chip = page.locator(".todo-item").first.locator(".due-chip")
            expect("overdue" in chip.get_attribute("class"), "past due date not flagged overdue")
            chip.click()  # clears the due date
            page.wait_for_timeout(300)
            expect(page.locator(".todo-item").first.locator(".due-chip").count() == 0,
                   "due chip did not clear")
        check("todo: inline date picker sets + clears overdue state", todo_date_picker)

        def todo_dnd_reorder():
            page.fill("#todo-input", "Drag Alpha")
            page.press("#todo-input", "Enter")
            page.fill("#todo-input", "Drag Beta")
            page.press("#todo-input", "Enter")
            page.wait_for_timeout(400)
            first_text = page.locator(".todo-item").first.locator(".todo-text").inner_text()
            expect(first_text == "Drag Beta", f"expected Beta first, got {first_text}")
            # synthetic HTML5 drag: Beta (row 0) dropped onto Alpha (row 1)
            page.evaluate("""() => {
                const rows = document.querySelectorAll('.todo-item');
                const dt = new DataTransfer();
                rows[0].dispatchEvent(new DragEvent('dragstart', {dataTransfer: dt, bubbles: true}));
                rows[1].dispatchEvent(new DragEvent('dragover', {dataTransfer: dt, bubbles: true}));
                rows[1].dispatchEvent(new DragEvent('drop', {dataTransfer: dt, bubbles: true}));
                rows[0].dispatchEvent(new DragEvent('dragend', {dataTransfer: dt, bubbles: true}));
            }""")
            page.wait_for_timeout(400)
            first_text = page.locator(".todo-item").first.locator(".todo-text").inner_text()
            expect(first_text == "Drag Alpha", f"drag reorder failed, first={first_text}")
        check("todo: drag & drop reorders tasks", todo_dnd_reorder)

        def todo_progress_bar():
            items = page.locator(".todo-item").count()
            expect(items >= 2, "need tasks for progress test")
            page.locator(".todo-item").first.locator(".todo-check").click()
            page.wait_for_timeout(300)
            width = page.locator("#todo-progress-fill").evaluate("el => el.style.width")
            expect(width and width != "0%" and width != "", f"progress bar not moving: {width!r}")
        check("todo: progress bar reflects completion", todo_progress_bar)

        def journal_flow():
            page.keyboard.press("j")
            page.wait_for_timeout(400)
            expect("open" in page.locator("#panel-journal").get_attribute("class"),
                   "journal panel did not open via J")
            prompt1 = page.locator("#journal-prompt").inner_text()
            expect(len(prompt1) > 10, "journal prompt missing")
            page.fill("#journal-text", "Deep work all morning, felt great.")
            page.locator(".mood-btn[data-mood='4']").click()
            page.fill("#journal-g1", "morning run")
            page.wait_for_timeout(1200)  # debounce
            stored = page.evaluate("new Promise(r => chrome.storage.local.get('journal', r))")
            entry = stored.get("journal", {}).get(str(date.today()))
            expect(entry and entry["text"] == "Deep work all morning, felt great.",
                   f"journal entry not persisted: {entry}")
            expect(entry["mood"] == 4, "mood not saved")
            expect("morning run" in entry["gratitude"][0], "gratitude not saved")
            # persists across reload
            page.reload()
            page.wait_for_timeout(1500)
            page.keyboard.press("j")
            page.wait_for_timeout(400)
            expect(page.locator("#journal-text").input_value() == "Deep work all morning, felt great.",
                   "journal did not reload")
            # navigate to yesterday
            page.click("#journal-prev")
            page.wait_for_timeout(300)
            expect("Yesterday" in page.locator("#journal-date").inner_text(),
                   "prev-day navigation failed")
            expect(page.locator("#journal-text").input_value() == "",
                   "yesterday should start empty")
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)
        check("journal: prompt, mood, gratitude, autosave, reload, day nav", journal_flow)

        def sounds_survive_panel_close():
            page.click("#btn-sounds")
            page.wait_for_timeout(400)
            page.locator(".sound-btn[data-sound='rain']").click()
            page.wait_for_timeout(400)
            expect("playing" in page.locator(".sound-btn[data-sound='rain']").get_attribute("class"),
                   "rain did not start")
            page.keyboard.press("Escape")  # close panel — audio must continue
            page.wait_for_timeout(400)
            expect("playing" in page.locator("#btn-sounds").get_attribute("class"),
                   "dock indicator lost after panel close")
            page.click("#btn-sounds")
            page.wait_for_timeout(400)
            expect("playing" in page.locator(".sound-btn[data-sound='rain']").get_attribute("class"),
                   "soundscape stopped when panel closed (regression)")
            # play a second sound: must not throw (single AudioContext regression)
            page.locator(".sound-btn[data-sound='ocean']").click()
            page.wait_for_timeout(400)
            expect(not console_errors, f"audio errors on second play: {console_errors[:2]}")
            expect("playing" in page.locator(".sound-btn[data-sound='ocean']").get_attribute("class"),
                   "second soundscape did not start")
            page.click("#sound-stop")
            page.wait_for_timeout(300)
            expect("playing" not in (page.locator("#btn-sounds").get_attribute("class") or ""),
                   "stop-all did not clear dock indicator")
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)
        check("sounds: survive panel close, replay safely, stop-all works", sounds_survive_panel_close)

        def weather_popover():
            page.click("#weather")
            page.wait_for_timeout(300)
            expect("open" in page.locator("#weather-detail").get_attribute("class"),
                   "weather popover did not open")
            page.click("#weather")
            page.wait_for_timeout(300)
            expect("open" not in (page.locator("#weather-detail").get_attribute("class") or ""),
                   "weather popover did not close")
        check("weather: pill toggles forecast popover", weather_popover)

        def pomodoro_survives_reload():
            page.keyboard.press("p")
            page.wait_for_timeout(400)
            page.click("#pomo-start")
            page.wait_for_timeout(2300)
            page.reload()
            page.wait_for_timeout(1500)
            page.keyboard.press("p")  # reopen panel after reload
            page.wait_for_timeout(400)
            face = page.locator("#pomo-face").inner_text()
            expect(face.startswith("04:"), f"timer state lost after reload, face={face}")
            expect("Pause" in page.locator("#pomo-start").inner_text(),
                   "restored timer should still be running")
            page.click("#pomo-start")  # pause
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)
        check("pomodoro: running timer survives tab reload", pomodoro_survives_reload)

        def pomo_auto_persists():
            page.keyboard.press("p")
            page.wait_for_timeout(300)
            page.check("#pomo-auto")
            page.wait_for_timeout(300)
            stored = page.evaluate("new Promise(r => chrome.storage.sync.get('pomoAuto', r))")
            expect(stored.get("pomoAuto") is True, "auto-start not persisted")
            page.keyboard.press("Escape")
        check("pomodoro: auto-start setting persists", pomo_auto_persists)

        def search_bang():
            page.route("**github.com/**", lambda route: route.fulfill(
                status=200, body="<html>gh-ok</html>", content_type="text/html"))
            page.fill("#search-input", "!gh playwright")
            with page.expect_navigation(url="**github.com/**"):
                page.evaluate("document.getElementById('search-form').requestSubmit()")
            expect("github.com/search" in page.url and "playwright" in page.url,
                   f"bang failed: {page.url}")
            page.unroute("**github.com/**")
            page.go_back()
            page.wait_for_timeout(800)
        check("search: !gh bang routes a one-shot engine search", search_bang)

        def help_modal_flow():
            page.keyboard.press("?")
            page.wait_for_timeout(300)
            expect(page.locator("#help-modal").is_visible(), "help modal did not open")
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)
            expect(not page.locator("#help-modal").is_visible(), "help modal did not close")
        check("keyboard: ? opens shortcut cheat-sheet, Esc closes", help_modal_flow)

        def quote_shuffle():
            before = page.locator("#quote-text").inner_text()
            changed = False
            for _ in range(6):
                page.click("#quote-box", position={"x": 20, "y": 20})
                page.wait_for_timeout(450)
                if page.locator("#quote-text").inner_text() != before:
                    changed = True
                    break
            expect(changed, "clicking quote never shuffled it")
        check("quote: clicking shuffles to a new quote", quote_shuffle)

        def bg_playlist_mode():
            png_b64 = ("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")
            page.route("**://playlist-test.example/**", lambda route: route.fulfill(
                status=200, body=base64.b64decode(png_b64), content_type="image/png"))
            page.click("#btn-settings")
            page.wait_for_timeout(300)
            page.select_option("#set-bg-mode", "playlist")
            page.fill("#set-bg-playlist", "https://playlist-test.example/a.jpg")
            page.locator("#set-bg-playlist").dispatch_event("change")
            page.wait_for_timeout(800)
            bg = page.locator("#bg-photo").get_attribute("style")
            expect("playlist-test.example" in (bg or ""), f"playlist bg not applied: {bg}")
            page.select_option("#set-bg-mode", "bing")
            page.locator("#set-bg-mode").dispatch_event("change")
            page.keyboard.press("Escape")
            page.unroute("**://playlist-test.example/**")
        check("background: playlist mode applies daily URL", bg_playlist_mode)

        def sync_quota_fallback():
            ok = page.evaluate("""async () => {
                const ok = await Store.setSyncedSafe('quotaProbe', 'x'.repeat(9000));
                const back = await Store.getSynced('quotaProbe', null);
                return { ok, len: back ? back.length : 0 };
            }""")
            expect(ok["len"] == 9000,
                   f"large value not recoverable after sync quota rejection: {ok}")
            expect(ok["ok"] is False, "sync write should have reported failure")
        check("storage: over-quota sync write safely falls back to local", sync_quota_fallback)

        def no_page_errors():
            expect(not console_errors, f"JS errors on page: {console_errors[:3]}")
        check("zero uncaught JS errors across the whole session", no_page_errors)

        ctx.close()


def main():
    print("=" * 60)
    print("DayStart v1.2.0 — automated test suite")
    print("=" * 60)
    static_tests()
    browser_tests()
    failed = [r for r in RESULTS if not r[1]]
    print("\n" + "=" * 60)
    print(f"RESULT: {len(RESULTS) - len(failed)}/{len(RESULTS)} passed")
    if failed:
        print("Failed:")
        for name, _, err in failed:
            print(f"  - {name}: {err[:200]}")
        sys.exit(1)
    print("All tests passed.")
    sys.exit(0)


if __name__ == "__main__":
    main()
