/* DayStart — service-worker.js
   Toolbar button: opens the dashboard in a new tab.
   Especially useful in browsers (e.g. Vivaldi) where the user has not
   enabled extension control of the new tab page. */

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("newtab.html") });
});
