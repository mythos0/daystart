/* DayStart — todo.js
   Task list with add / complete / delete / clear-completed. */

const Todo = (() => {
  let tasks = [];
  const $ = (id) => document.getElementById(id);

  async function load() {
    tasks = await Store.getSynced("todo", []);
    render();
  }

  async function persist() {
    await Store.setSetting("todo", tasks);
  }

  function render() {
    const list = $("todo-list");
    list.innerHTML = "";
    const remaining = tasks.filter((t) => !t.done).length;
    $("todo-count").textContent = remaining > 0 ? `${remaining} left` : "all done";

    if (tasks.length === 0) {
      const empty = document.createElement("div");
      empty.className = "links-empty";
      empty.textContent = "No tasks yet — add one below.";
      list.appendChild(empty);
      return;
    }

    tasks.forEach((task, i) => {
      const row = document.createElement("div");
      row.className = "todo-item" + (task.done ? " completed" : "");
      row.setAttribute("role", "listitem");

      const check = document.createElement("span");
      check.className = "todo-check";
      check.textContent = "\u2713";
      check.title = "Toggle complete";
      check.addEventListener("click", () => toggle(i));

      const text = document.createElement("span");
      text.className = "todo-text";
      text.textContent = task.text;

      const del = document.createElement("button");
      del.className = "todo-del";
      del.textContent = "\u2715";
      del.title = "Delete task";
      del.addEventListener("click", () => remove(i));

      row.appendChild(check);
      row.appendChild(text);
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  async function add(text) {
    text = text.trim();
    if (!text) return;
    tasks.unshift({ text, done: false, created: Date.now() });
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
