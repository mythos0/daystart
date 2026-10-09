/* DayStart — clock.js
   Live clock, date line and personalized greeting. */

const Clock = (() => {
  let showSeconds = false;
  let hour12 = false;
  let userName = "";
  let timer = null;

  const pad = (n) => String(n).padStart(2, "0");

  function greetingFor(h) {
    if (h < 5) return "Good night";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    if (h < 22) return "Good evening";
    return "Good night";
  }

  function render() {
    const now = new Date();
    let h = now.getHours();
    let suffix = "";
    if (hour12) {
      suffix = h >= 12 ? " PM" : " AM";
      h = h % 12 || 12;
    }
    const m = pad(now.getMinutes());
    const s = pad(now.getSeconds());
    document.getElementById("clock").textContent =
      hour12 ? `${h}:${m}${suffix}` : `${pad(h)}:${m}` + (showSeconds ? `:${s}` : "");

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    document.getElementById("date").textContent =
      `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;

    // Refresh greeting every minute if hour bucket changes
    const g = greetingFor(now.getHours());
    document.getElementById("greeting").textContent =
      userName ? `${g}, ${userName}.` : `${g}.`;
  }

  async function init() {
    showSeconds = await Store.getSetting("clockSeconds", false);
    hour12 = (await Store.getSetting("clockFormat", "24")) === "12";
    userName = await Store.getSetting("userName", "");
    render();
    timer = setInterval(render, 1000);
  }

  return {
    init,
    refreshName: async () => { userName = await Store.getSetting("userName", ""); render(); },
    refreshFormat: async () => {
      showSeconds = await Store.getSetting("clockSeconds", false);
      hour12 = (await Store.getSetting("clockFormat", "24")) === "12";
      render();
    }
  };
})();
