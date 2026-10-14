/* DayStart — service-worker.js
   Two jobs:

   1. Toolbar button — opens the dashboard in a new tab from any page.

   2. New-tab takeover (Vivaldi & other Chromium browsers) — some browsers
      keep their own start page and silently ignore chrome_url_overrides.
      newtab unless the user finds a deeply buried browser setting. When
      takeover is enabled, a tab that the browser created on its default
      new-tab page is immediately redirected to the DayStart dashboard.

      Modes (Settings → New tab → "Take over new tabs"):
        auto — takeover only in browsers known to ignore the override
               (Vivaldi, detected via user agent). Default.
        on   — always redirect the browser's default new-tab page.
        off  — never redirect; browser handles its own new tab. */

const DASHBOARD_URL = chrome.runtime.getURL("newtab.html");

/* URLs a Chromium-based browser may load for a brand-new tab. The
   dashboard's own chrome-extension:// URL never matches, so no loops. */
const NTP_URLS = [
  "chrome://newtab/",
  "chrome://new-tab-page/",
  "vivaldi://newtab/",
  "vivaldi://startpage/",
  "vivaldi://new-tab-page/",
  "edge://newtab/",
  "edge://new-tab-page/",
  "brave://newtab/",
  "brave://new-tab-page/",
  "opera://newtab/",
  "about:newtab"
];

function isDefaultNtp(url) {
  if (!url) return false;
  const u = String(url).toLowerCase();
  return NTP_URLS.some((n) => u === n || u.startsWith(n));
}

function isVivaldi() {
  try { return navigator.userAgent.includes("Vivaldi"); }
  catch (e) { return false; }
}

async function takeoverEnabled() {
  let mode = "auto";
  try {
    const got = await chrome.storage.sync.get("forceNewTab");
    if (got && typeof got.forceNewTab === "string" &&
        ["auto", "on", "off"].includes(got.forceNewTab)) {
      mode = got.forceNewTab;
    }
  } catch (e) { /* storage unavailable → auto */ }
  if (mode === "on") return true;
  if (mode === "off") return false;
  return isVivaldi();
}

/* One redirect per tab while it is in flight; cleared shortly after so a
   genuinely failed update can be retried by the next event. */
const inFlight = new Set();

function redirect(tab) {
  if (!tab || tab.id === undefined || tab.id === chrome.tabs.TAB_ID_NONE) return;
  if (tab.incognito) return;
  if (inFlight.has(tab.id)) return;
  inFlight.add(tab.id);
  try {
    chrome.tabs.update(tab.id, { url: DASHBOARD_URL }, () => {
      void chrome.runtime.lastError; // tab may already be gone — fine
      setTimeout(() => inFlight.delete(tab.id), 5000);
    });
  } catch (e) {
    inFlight.delete(tab.id);
  }
}

/* Fresh tabs: pendingUrl carries the default new-tab address at creation. */
chrome.tabs.onCreated.addListener(async (tab) => {
  const url = (tab && (tab.pendingUrl || tab.url)) || "";
  if (!isDefaultNtp(url)) return;
  if (!(await takeoverEnabled())) return;
  redirect(tab);
});

/* Belt-and-braces: some builds clear pendingUrl before we can see it.
   onUpdated reveals the final URL once navigation commits. */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const url = changeInfo.url || (tab && tab.url) || "";
  if (!isDefaultNtp(url)) return;
  if (!(await takeoverEnabled())) return;
  redirect({ id: tabId, incognito: tab && tab.incognito });
});

/* 1. Toolbar button (unchanged since v1.1). */
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: DASHBOARD_URL });
});
