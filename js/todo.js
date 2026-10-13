/* DayStart — todo.js
   Task list with add / complete / delete / clear-completed,
   plus power-ups: priority flags, due dates, drag & drop
   reordering and a daily progress bar. */

const Todo = (() => {
  let tasks = [];
  let dragIndex = null;
  const $ = (id) => document.getElementById(id);

  const todayKey = () => {
    const d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  };

  /* Accept "@today" / "@tomorrow" tokens at the end of a new task. */
  function parseQuick(text) {
    let due = null;
    text = text.replace(/\s*@(today|tomorrow)\s*$/i, (_, w) => {
      const d = new Date();
      if (w.toLowerCase() === "tomorrow") d.setDate(d.getDate() + 1);
      due = d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
      return "";
    });
    return { text: text.trim(), due };
  }

  async function load() {
    tasks = await Store.getSynced("todo", []);
    render();
  }

  async function persist() {
    await Store.setSyncedSafe("todo", tasks);
  }

  function dueLabel(due) {
    if (!due) return "";
    const today = todayKey();
    const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
    const tmrKey = tmr.getFullYear() + "-" +
      String(tmr.getMonth() + 1).padStart(2, "0") + "-" +
      String(tmr.getDate()).padStart(2, "0");
    if (due === today) return "Today";
    if (due === tmrKey) return "Tomorrow";
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const d = new Date(due + "T00:00:00");
    return names[d.getDay()] + " " + (d.getMonth() + 1) + "/" + d.getDate();
  }

  function isOverdue(due) {
    return !!due && due < todayKey();
  }

  function render() {
    const list = $("todo-list");
    list.innerHTML = "";
    const doneCount = tasks.filter((t) => t.done).length;
    $("todo-count").textContent =
      tasks.length === 0 ? "" :
      doneCount === tasks.length ? "all done" : `${tasks.length - doneCount} left`;

    // Progress bar
    const bar = $("todo-progress");
    const fill = $("todo-progress-fill");
    if (bar && fill) {
      bar.style.display = tasks.length ? "" : "none";
      const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
      fill.style.width = pct + "%";
    }

    if (tasks.length === 0) {
      const empty = document.createElement("div");
      empty.className = "links-empty";
      empty.textContent = "No tasks yet — add one below.";
      list.appendChild(empty);
      return;
    }

    tasks.forEach((task, i) => {
      const row = document.createElement("div");
      row.className = "todo-item" +
        (task.done ? " completed" : "") +
        (task.p === 1 ? " p1" : task.p === 2 ? " p2" : "");
      row.setAttribute("role", "listitem");
      row.draggable = true;
      row.dataset.index = i;

      // --- drag & drop reorder ---
      row.addEventListener("dragstart", (e) => {
        dragIndex = i;
        row.classList.add("dragging");
        try { e.dataTransfer.setData("text/plain", String(i)); } catch (err) { }
        e.dataTransfer.effectAllowed = "move";
      });
      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        list.querySelectorAll(".drop-target").forEach((el) =>
          el.classList.remove("drop-target"));
        dragIndex = null;
      });
      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === i) return;
        row.classList.add("drop-target");
      });
      row.addEventListener("dragleave", () => row.classList.remove("drop-target"));
      row.addEventListener("drop", async (e) => {
        e.preventDefault();
        row.classList.remove("drop-target");
        if (dragIndex === null || dragIndex === i) return;
        const [moved] = tasks.splice(dragIndex, 1);
        tasks.splice(i, 0, moved);
        dragIndex = null;
        await persist();
        render();
      });

      const check = document.createElement("span");
      check.className = "todo-check";
      check.textContent = "\u2713";
      check.title = "Toggle complete";
      check.addEventListener("click", () => toggle(i));

      const text = document.createElement("span");
      text.className = "todo-text";
      text.textContent = task.text;

      const meta = document.createElement("span");
      meta.className = "todo-meta";

      if (task.due) {
        const chip = document.createElement("button");
        chip.className = "due-chip" + (isOverdue(task.due) && !task.done ? " overdue" : "");
        chip.textContent = dueLabel(task.due);
        chip.title = task.due + " — click to clear due date";
        chip.addEventListener("click", async (e) => {
          e.stopPropagation();
          tasks[i].due = null;
          await persist();
          render();
        });
        meta.appendChild(chip);
      }

      const dateBtn = document.createElement("button");
      dateBtn.className = "todo-date-btn";
      dateBtn.textContent = "\u{1F4C5}";
      dateBtn.title = "Set due date";
      dateBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleDatePicker(i, row); });

      const flag = document.createElement("button");
      flag.className = "todo-flag";
      flag.textContent = task.p === 2 ? "\u2691" : task.p === 1 ? "\u2691" : "\u2690";
      flag.title = "Priority: " + (task.p === 2 ? "high" : task.p === 1 ? "medium" : "none") + " (click to change)";
      flag.addEventListener("click", async (e) => {
        e.stopPropagation();
        tasks[i].p = ((tasks[i].p || 0) + 1) % 3;
        await persist();
        render();
      });

      const del = document.createElement("button");
      del.className = "todo-del";
      del.textContent = "\u2715";
      del.title = "Delete task";
      del.addEventListener("click", () => remove(i));

      meta.appendChild(dateBtn);
      meta.appendChild(flag);
      meta.appendChild(del);
      row.appendChild(check);
      row.appendChild(text);
      row.appendChild(meta);
      list.appendChild(row);
    });
  }

  /* Inline date picker row that slides open under a task. */
  function toggleDatePicker(i, row) {
    const existing = row.nextElementSibling;
    if (existing && existing.classList.contains("todo-date-row")) {
      existing.remove();
      return;
    }
    document.querySelectorAll(".todo-date-row").forEach((el) => el.remove());
    const pickerRow = document.createElement("div");
    pickerRow.className = "todo-date-row";
    const input = document.createElement("input");
    input.type = "date";
    input.value = tasks[i].due || todayKey();
    input.addEventListener("change", async () => {
      tasks[i].due = input.value || null;
      await persist();
      render();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); pickerRow.remove(); }
    });
    pickerRow.appendChild(input);
    row.after(pickerRow);
    input.focus();
  }

  async function add(raw) {
    const { text, due } = parseQuick(raw || "");
    if (!text) return;
    tasks.unshift({ text, done: false, created: Date.now(), p: 0, due });
    if (tasks.length > 100) tasks = tasks.slice(0, 100);
    await persist();
    render();
  }

  async function toggle(i) {
    tasks[i].done = !tasks[i].done;
    await persist();
    render();
  }

  async function remove(i) {
    tasks.splice(i, 1);
    await persist();
    render();
  }

  async function clearDone() {
    tasks = tasks.filter((t) => !t.done);
    await persist();
    render();
  }

  function bind() {
    $("todo-add").addEventListener("click", () => {
      add($("todo-input").value);
      $("todo-input").value = "";
    });
    $("todo-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { add($("todo-input").value); $("todo-input").value = ""; }
    });
    $("todo-clear-done").addEventListener("click", clearDone);
  }

  return { init: async () => { await load(); bind(); } };
})();
