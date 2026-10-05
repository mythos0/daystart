/* DayStart — links.js
   Quick shortcuts with auto favicon and default suggestions. */

const Links = (() => {
  let links = [];
  const $ = (id) => document.getElementById(id);

  const DEFAULTS = [
    { name: "Gmail", url: "https://mail.google.com" },
    { name: "Calendar", url: "https://calendar.google.com" },
    { name: "GitHub", url: "https://github.com" },
    { name: "YouTube", url: "https://youtube.com" },
    { name: "Drive", url: "https://drive.google.com" },
    { name: "Maps", url: "https://maps.google.com" }
  ];

  async function load() {
    links = await Store.getData("links", null);
    if (links === null) { links = DEFAULTS.slice(); await persist(); }
    render();
  }

  async function persist() {
    await Store.setData("links", links);
  }

  function hostOf(url) {
    try { return new URL(url).hostname; } catch (e) { return url; }
  }

  function initialOf(link) {
    return (link.name || hostOf(link.url)).charAt(0).toUpperCase();
  }

  function render() {
    const grid = $("links-grid");
    grid.innerHTML = "";

    if (links.length === 0) {
      const empty = document.createElement("div");
      empty.className = "links-empty";
      empty.textContent = "Add your first shortcut.";
      grid.appendChild(empty);
      return;
    }

    links.forEach((link, i) => {
      const tile = document.createElement("a");
      tile.className = "link-tile";
      tile.href = link.url;
      tile.title = hostOf(link.url);

      const fav = document.createElement("span");
      fav.className = "link-fav";
      const img = document.createElement("img");
      img.src = "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(hostOf(link.url)) + "&sz=32";
      img.alt = "";
      img.addEventListener("error", () => {
        fav.textContent = initialOf(link);
        img.remove();
      });
      fav.appendChild(img);

      const name = document.createElement("span");
      name.className = "link-name";
      name.textContent = link.name || hostOf(link.url);

      const del = document.createElement("button");
      del.className = "link-del";
      del.textContent = "\u2715";
      del.title = "Remove shortcut";
      del.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); remove(i); });

      tile.appendChild(fav);
      tile.appendChild(name);
      tile.appendChild(del);
      grid.appendChild(tile);
    });
  }

  async function add() {
    const url = prompt("Shortcut URL (e.g. https://news.ycombinator.com):");
    if (!url) return;
    let full = url.trim();
    if (!/^https?:\/\//i.test(full)) full = "https://" + full;
    let name = "";
    try { name = prompt("Display name:", new URL(full).hostname.replace("www.", "")) || ""; } catch (e) { }
    links.push({ name, url: full });
    if (links.length > 12) links = links.slice(-12);
    await persist();
    render();
  }

  async function remove(i) {
    links.splice(i, 1);
    await persist();
    render();
  }

  return { init: async () => { await load(); $("links-add").addEventListener("click", add); } };
})();
