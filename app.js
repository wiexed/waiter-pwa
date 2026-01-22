/* waiter-pwa: офлайн меню + 10 столов + история + редактор меню
   ✅ фикс Safari: одинаковое меню на всех устройствах (версия + сброс localStorage)
*/

const LS = {
  MENU: "waiter_menu_v2",
  TABLES: "waiter_tables_v2",
  HISTORY: "waiter_history_v2",
  SEL: "waiter_selected_table_v2",
};

const TABLE_COUNT = 10;

/* ===== Версия данных (меняй при деплое, если хочешь принудительно обновить меню на всех) ===== */
const DATA_VERSION = "2026-01-22-02";
const LS_VERSION_KEY = "waiter_data_version_v2";
const FORCE_RESET_MENU_ON_VERSION_CHANGE = true;

function uid() {
  return "i_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function nowISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function parsePriceToken(tok) {
  const n = Number(String(tok).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ===== Safari фикс: если версия сменилась — сбросить локальные данные ===== */
function ensureDataVersion() {
  const cur = localStorage.getItem(LS_VERSION_KEY);
  if (cur !== DATA_VERSION) {
    localStorage.setItem(LS_VERSION_KEY, DATA_VERSION);

    if (FORCE_RESET_MENU_ON_VERSION_CHANGE) {
      localStorage.removeItem(LS.MENU);
      localStorage.removeItem(LS.TABLES);
      // историю обычно оставляют, но при желании можно очистить:
      // localStorage.removeItem(LS.HISTORY);
    }
  }
}

/* ---------- состояние (загружаем в init) ---------- */
let menu = [];
let tables = [];
let history = [];

let selectedTable = 1;
let selectedCategory = "Все";
let selectedSub = "Все";

const els = {
  status: document.getElementById("status"),
  tableTabs: document.getElementById("tableTabs"),
  tableNum: document.getElementById("tableNum"),
  tableNote: document.getElementById("tableNote"),
  menuList: document.getElementById("menuList"),
  orderList: document.getElementById("orderList"),
  orderTotals: document.getElementById("orderTotals"),
  categoryPills: document.getElementById("categoryPills"),
  subCategoryPills: document.getElementById("subCategoryPills"),
  search: document.getElementById("search"),

  closeTable: document.getElementById("closeTable"),
  clearTable: document.getElementById("clearTable"),

  historyList: document.getElementById("historyList"),
  exportHistory: document.getElementById("exportHistory"),
  importHistory: document.getElementById("importHistory"),
  clearHistory: document.getElementById("clearHistory"),

  openEditor: document.getElementById("openEditor"),
  menuEditor: document.getElementById("menuEditor"),
  closeEditor: document.getElementById("closeEditor"),
  exportMenu: document.getElementById("exportMenu"),
  importMenu: document.getElementById("importMenu"),
  resetMenu: document.getElementById("resetMenu"),

  fCat: document.getElementById("fCat"),
  fSub: document.getElementById("fSub"),
  fName: document.getElementById("fName"),
  fGram: document.getElementById("fGram"),
  fPrice: document.getElementById("fPrice"),
  fDesc: document.getElementById("fDesc"),
  saveItem: document.getElementById("saveItem"),
  resetForm: document.getElementById("resetForm"),
  editHint: document.getElementById("editHint"),
  menuAdminList: document.getElementById("menuAdminList"),
  itemForm: document.getElementById("itemForm"),
};

let editingId = null;

/* ---------- storage ---------- */

function normalizeMenu(arr) {
  return arr
    .map((x) => ({
      id: String(x.id || uid()),
      cat: String(x.cat || "Без категории").trim(),
      sub: String(x.sub || "").trim(),
      name: String(x.name || "").trim(),
      grams: String(x.grams || "").trim(),
      desc: String(x.desc || "").trim(),
      price: Number.isFinite(Number(x.price)) ? Number(x.price) : (parsePriceToken(x.price) ?? 0),
    }))
    .filter((x) => x.name.length > 0);
}

function loadMenu() {
  const m = safeJsonParse(localStorage.getItem(LS.MENU), null);
  if (Array.isArray(m)) return normalizeMenu(m);

  // старт пустой (чтобы не было "примеров" на телефоне)
  const starter = [];
  localStorage.setItem(LS.MENU, JSON.stringify(starter));
  return starter;
}

function saveMenu() {
  localStorage.setItem(LS.MENU, JSON.stringify(menu));
}

function normalizeTable(t) {
  return {
    order: (t && t.order && typeof t.order === "object") ? { ...t.order } : {},
    note: (t && typeof t.note === "string") ? t.note : ""
  };
}

function loadTables() {
  const t = safeJsonParse(localStorage.getItem(LS.TABLES), null);
  if (Array.isArray(t) && t.length === TABLE_COUNT) return t.map(normalizeTable);
  const empty = Array.from({ length: TABLE_COUNT }, () => ({
  order: {},
  note: ""
}));
  localStorage.setItem(LS.TABLES, JSON.stringify(empty));
  return empty;
}

function saveTables() {
  localStorage.setItem(LS.TABLES, JSON.stringify(tables));
}

function loadHistory() {
  const h = safeJsonParse(localStorage.getItem(LS.HISTORY), null);
  if (Array.isArray(h)) return h;
  localStorage.setItem(LS.HISTORY, JSON.stringify([]));
  return [];
}

function saveHistory() {
  localStorage.setItem(LS.HISTORY, JSON.stringify(history));
}

function loadSelectedTable() {
  const n = Number(localStorage.getItem(LS.SEL));
  if (Number.isFinite(n) && n >= 1 && n <= TABLE_COUNT) return n;
  localStorage.setItem(LS.SEL, "1");
  return 1;
}

function saveSelectedTable() {
  localStorage.setItem(LS.SEL, String(selectedTable));
}

/* ---------- утилиты ---------- */

function byId(id) { return menu.find((x) => x.id === id); }

function getOrderMap() {
  return tables[selectedTable - 1].order;
}

function setQty(itemId, qty) {
  const order = getOrderMap();
  const q = Math.max(0, Number(qty) || 0);
  if (q === 0) delete order[itemId];
  else order[itemId] = q;
  saveTables();
  renderAll();
}

function incQty(itemId, delta) {
  const order = getOrderMap();
  const cur = Number(order[itemId] || 0);
  setQty(itemId, cur + delta);
}

function orderItemsForTable(tn) {
  const order = tables[tn - 1].order;
  const list = [];
  for (const [id, qty] of Object.entries(order)) {
    const it = byId(id);
    if (!it) continue;
    list.push({ it, qty: Number(qty) || 0 });
  }
  return list;
}

function orderTotalForTable(tn) {
  return orderItemsForTable(tn).reduce((s, x) => s + x.it.price * x.qty, 0);
}

function uniqueSorted(arr) {
  return Array.from(new Set(arr)).filter(Boolean).sort((a, b) => a.localeCompare(b, "ru"));
}

/* ---------- рендер ---------- */

function renderStatus() {
  els.status.textContent = navigator.onLine ? "онлайн" : "офлайн";
}

function renderTables() {
  els.tableTabs.innerHTML = "";
  for (let i = 1; i <= TABLE_COUNT; i++) {
    const btn = document.createElement("button");
    btn.className = "tab" + (i === selectedTable ? " active" : "");
    btn.textContent = String(i);
    btn.onclick = () => {
      selectedTable = i;
      saveSelectedTable();
      els.tableNum.textContent = String(i);
      renderAll();
    };
    els.tableTabs.appendChild(btn);
  }
  els.tableNum.textContent = String(selectedTable);
}

function renderCategories() {
  const cats = uniqueSorted(menu.map((x) => x.cat));
  const all = ["Все", ...cats.length ? cats : ["Без категории"]];

  els.categoryPills.innerHTML = "";
  for (const c of all) {
    const b = document.createElement("button");
    b.className = "pill" + (c === selectedCategory ? " active" : "");
    b.textContent = c;
    b.onclick = () => {
      selectedCategory = c;
      selectedSub = "Все";
      renderAll();
    };
    els.categoryPills.appendChild(b);
  }
}

function renderSubCategories() {
  let subs = [];
  if (selectedCategory === "Все") {
    subs = uniqueSorted(menu.map((x) => x.sub).filter(Boolean));
  } else {
    subs = uniqueSorted(menu.filter((x) => x.cat === selectedCategory).map((x) => x.sub).filter(Boolean));
  }
  const all = ["Все", ...subs];

  els.subCategoryPills.innerHTML = "";
  for (const s of all) {
    const b = document.createElement("button");
    b.className = "pill" + (s === selectedSub ? " active" : "");
    b.textContent = s || "Без подкатегории";
    b.onclick = () => {
      selectedSub = s;
      renderAll();
    };
    els.subCategoryPills.appendChild(b);
  }
}

function renderMenuList() {
  const q = els.search.value.trim().toLowerCase();
  const order = getOrderMap();

  let items = [...menu];

  if (selectedCategory !== "Все") items = items.filter((x) => x.cat === selectedCategory);
  if (selectedSub !== "Все") items = items.filter((x) => (x.sub || "") === selectedSub);

  if (q) {
    items = items.filter((x) =>
      (x.name + " " + x.desc + " " + x.cat + " " + x.sub).toLowerCase().includes(q)
    );
  }

  els.menuList.innerHTML = "";
  if (items.length === 0) {
    els.menuList.innerHTML = `<div class="hint" style="padding:10px 0;">Меню пустое — нажми “Редактировать меню” и добавь позиции</div>`;
    return;
  }

  items.sort((a, b) =>
    (a.cat || "").localeCompare(b.cat || "", "ru") ||
    (a.sub || "").localeCompare(b.sub || "", "ru") ||
    (a.name || "").localeCompare(b.name || "", "ru")
  );

  for (const it of items) {
    const row = document.createElement("div");
    row.className = "item";

    const left = document.createElement("div");
    left.style.maxWidth = "70%";

    const title = document.createElement("div");
    title.style.fontWeight = "900";
    title.textContent = it.name;

    const meta = document.createElement("div");
    meta.className = "meta";
    const metaParts = [];
    if (it.grams) metaParts.push(it.grams);
    if (it.cat) metaParts.push(it.cat + (it.sub ? ` / ${it.sub}` : ""));
    meta.textContent = metaParts.join(" • ");

    const desc = document.createElement("div");
    desc.className = "desc";
    desc.textContent = it.desc || "";

    left.appendChild(title);
    if (meta.textContent) left.appendChild(meta);
    if (it.desc) left.appendChild(desc);

    const right = document.createElement("div");
    right.style.textAlign = "right";

    const price = document.createElement("div");
    price.style.fontWeight = "900";
    price.textContent = `${it.price} р`;

    const step = document.createElement("div");
    step.className = "stepper";
    step.style.justifyContent = "flex-end";

    const minus = document.createElement("button");
    minus.className = "small";
    minus.textContent = "–";
    minus.onclick = () => incQty(it.id, -1);

    const qty = document.createElement("div");
    qty.className = "qty";
    qty.textContent = String(order[it.id] || 0);

    const plus = document.createElement("button");
    plus.className = "small";
    plus.textContent = "+";
    plus.onclick = () => incQty(it.id, +1);

    step.append(minus, qty, plus);
    right.append(price, step);

    row.append(left, right);
    els.menuList.appendChild(row);
  }
}

function renderOrder() {
  const list = orderItemsForTable(selectedTable);
  els.orderList.innerHTML = "";

  if (list.length === 0) {
    els.orderList.innerHTML = `<div class="hint" style="padding:10px 0;">Пусто</div>`;
    els.orderTotals.textContent = "";
    return;
  }

  let total = 0;

  for (const { it, qty } of list) {
    const row = document.createElement("div");
    row.className = "item";

    const left = document.createElement("div");

    const title = document.createElement("div");
    title.style.fontWeight = "900";
    title.textContent = it.name;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = it.grams ? it.grams : "";

    left.appendChild(title);
    if (meta.textContent) left.appendChild(meta);

    const right = document.createElement("div");
    right.style.textAlign = "right";

    const sum = it.price * qty;
    total += sum;

    const price = document.createElement("div");
    price.style.fontWeight = "900";
    price.textContent = `${sum} р`;

    const step = document.createElement("div");
    step.className = "stepper";
    step.style.justifyContent = "flex-end";

    const minus = document.createElement("button");
    minus.className = "small";
    minus.textContent = "–";
    minus.onclick = () => incQty(it.id, -1);

    const q = document.createElement("div");
    q.className = "qty";
    q.textContent = String(qty);

    const plus = document.createElement("button");
    plus.className = "small";
    plus.textContent = "+";
    plus.onclick = () => incQty(it.id, +1);

    step.append(minus, q, plus);
    right.append(price, step);

    row.append(left, right);
    els.orderList.appendChild(row);
  }

  els.orderTotals.textContent = `Итого: ${total} р`;
}

function renderHistory() {
  els.historyList.innerHTML = "";
  if (history.length === 0) {
    els.historyList.innerHTML = `<div class="hint" style="padding:10px 0;">История пустая</div>`;
    return;
  }

  const list = [...history].reverse();
  for (const h of list) {
    const wrap = document.createElement("div");
    wrap.style.padding = "10px 0";
    wrap.style.borderBottom = "1px dashed #243244";

    const head = document.createElement("div");
    head.style.fontWeight = "900";
    head.textContent = `Стол ${h.table} • ${h.time} • ${h.total} р`;

    const body = document.createElement("div");
    body.className = "meta";
    body.style.marginTop = "6px";
    body.textContent = (h.items || [])
      .map((x) => `${x.name} ×${x.qty}`)
      .join(" • ");

    wrap.append(head, body);
    els.historyList.appendChild(wrap);
    if (h.note) {
  const note = document.createElement("div");
  note.className = "desc";
  note.textContent = `Заметка: ${h.note}`;
  wrap.appendChild(note);
}
  }
}

function renderEditorList() {
  els.menuAdminList.innerHTML = "";
  if (menu.length === 0) {
    els.menuAdminList.innerHTML = `<div class="hint">Меню пустое — добавь первую позицию слева</div>`;
    return;
  }

  const items = [...menu].sort((a, b) =>
    (a.cat || "").localeCompare(b.cat || "", "ru") ||
    (a.sub || "").localeCompare(b.sub || "", "ru") ||
    (a.name || "").localeCompare(b.name || "", "ru")
  );

  for (const it of items) {
    const row = document.createElement("div");
    row.className = "miniRow";

    const left = document.createElement("div");
    left.style.flex = "1";

    const t = document.createElement("div");
    t.className = "miniTitle";
    t.textContent = it.name;

    const m = document.createElement("div");
    m.className = "meta";
    const mp = [];
    if (it.cat) mp.push(it.cat);
    if (it.sub) mp.push(it.sub);
    if (it.grams) mp.push(it.grams);
    m.textContent = `${mp.join(" • ")} • ${it.price} р`;

    left.append(t, m);

    const btns = document.createElement("div");
    btns.className = "miniBtns";

    const edit = document.createElement("button");
    edit.className = "small";
    edit.textContent = "Правка";
    edit.onclick = () => startEdit(it.id);

    const del = document.createElement("button");
    del.className = "danger small";
    del.textContent = "Удалить";
    del.onclick = () => {
      if (!confirm(`Удалить: ${it.name}?`)) return;
      for (const tb of tables) delete tb.order[it.id];
      menu = menu.filter((x) => x.id !== it.id);
      saveMenu(); saveTables();
      renderAll();
      renderEditorList();
    };

    btns.append(edit, del);
    row.append(left, btns);
    els.menuAdminList.appendChild(row);
  }
}

function renderAll() {
  renderStatus();
  renderTables();
  renderCategories();
  renderSubCategories();
  renderMenuList();
  renderOrder();
  renderHistory();
  if (els.tableNote) {
  els.tableNote.value = tables[selectedTable - 1].note || "";
}
}

/* ---------- действия ---------- */

function clearCurrentTable() {
  if (!confirm(`Очистить заказ стола ${selectedTable}?`)) return;
  tables[selectedTable - 1].order = {};
  saveTables();
  renderAll();
}

function closeCurrentTable() {
  const items = orderItemsForTable(selectedTable);
  if (items.length === 0) {
    alert("Заказ пустой.");
    return;
  }

  const total = orderTotalForTable(selectedTable);

  history.push({
    time: nowISO(),
    table: selectedTable,
    total,
    note: tables[selectedTable - 1].note || "",
    items: items.map(({ it, qty }) => ({
      id: it.id,
      name: it.name,
      qty,
      price: it.price,
      grams: it.grams || "",
    })),
  });
tables[selectedTable - 1].note = "";
  tables[selectedTable - 1].order = {};
  saveHistory();
  saveTables();
  renderAll();
}

/* ---------- редактор ---------- */

function startEdit(id) {
  const it = byId(id);
  if (!it) return;
  editingId = id;

  els.fCat.value = it.cat || "";
  els.fSub.value = it.sub || "";
  els.fName.value = it.name || "";
  els.fGram.value = it.grams || "";
  els.fPrice.value = String(it.price ?? "");
  els.fDesc.value = it.desc || "";

  els.saveItem.textContent = "Сохранить";
  els.editHint.textContent = "Режим правки: после сохранения позиция обновится";
}

function resetForm() {
  editingId = null;
  els.fCat.value = "";
  els.fSub.value = "";
  els.fName.value = "";
  els.fGram.value = "";
  els.fPrice.value = "";
  els.fDesc.value = "";
  els.saveItem.textContent = "Добавить";
  els.editHint.textContent = "";
}

function saveFromForm() {
  const cat = els.fCat.value.trim();
  const sub = els.fSub.value.trim();
  const name = els.fName.value.trim();
  const grams = els.fGram.value.trim();
  const desc = els.fDesc.value.trim();
  const price = parsePriceToken(els.fPrice.value);

  if (!cat) return alert("Укажи категорию.");
  if (!name) return alert("Укажи название.");
  if (price === null) return alert("Укажи цену числом (например 19).");

  if (editingId) {
    const idx = menu.findIndex((x) => x.id === editingId);
    if (idx >= 0) {
      menu[idx] = { ...menu[idx], cat, sub, name, grams, desc, price };
    }
  } else {
    menu.push({ id: uid(), cat, sub, name, grams, desc, price });
  }

  saveMenu();
  resetForm();
  renderAll();
  renderEditorList();
}

/* ---------- экспорт / импорт ---------- */

function exportMenu() {
  const payload = { version: 2, exportedAt: nowISO(), menu };
  downloadText(`menu_${Date.now()}.json`, JSON.stringify(payload, null, 2));
}

function importMenu() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const text = await file.text();
    const data = safeJsonParse(text, null);
    if (!data) return alert("Не смог прочитать JSON.");

    let arr = null;
    if (Array.isArray(data)) arr = data;
    else if (data && Array.isArray(data.menu)) arr = data.menu;

    if (!arr) return alert("В файле нет menu массива.");
    const norm = normalizeMenu(arr);

    if (!confirm(`Импортировать меню (${norm.length} позиций)? Текущее меню будет заменено.`)) return;

    menu = norm;
    tables = Array.from({ length: TABLE_COUNT }, () => ({ order: {} }));
    saveMenu();
    saveTables();

    selectedCategory = "Все";
    selectedSub = "Все";
    els.search.value = "";

    renderAll();
    renderEditorList();
  };
  input.click();
}

function exportHistory() {
  const payload = { version: 2, exportedAt: nowISO(), history };
  downloadText(`history_${Date.now()}.json`, JSON.stringify(payload, null, 2));
}

function importHistory() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const text = await file.text();
    const data = safeJsonParse(text, null);
    if (!data) return alert("Не смог прочитать JSON.");

    let arr = null;
    if (Array.isArray(data)) arr = data;
    else if (data && Array.isArray(data.history)) arr = data.history;

    if (!arr) return alert("В файле нет history массива.");
    if (!confirm(`Импортировать историю (${arr.length} записей)? Текущая история будет заменена.`)) return;

    history = arr;
    saveHistory();
    renderAll();
  };
  input.click();
}

/* ---------- init ---------- */

function init() {
  if (els.tableNote) {
  els.tableNote.addEventListener("input", () => {
    tables[selectedTable - 1].note = els.tableNote.value;
    saveTables();
  });
}
  ensureDataVersion();

  // загружаем данные после возможного сброса
  menu = loadMenu();
  tables = loadTables();
  history = loadHistory();
  selectedTable = loadSelectedTable();

  // сервис-воркер (офлайн)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").then((reg) => {
      reg.update?.();
    }).catch(() => {});
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // когда SW обновился — перезагрузим, чтобы Safari точно взял новое
      window.location.reload();
    });
  }

  renderAll();

  window.addEventListener("online", renderStatus);
  window.addEventListener("offline", renderStatus);

  els.search.addEventListener("input", () => renderMenuList());

  els.clearTable.onclick = clearCurrentTable;
  els.closeTable.onclick = closeCurrentTable;

  els.exportHistory.onclick = exportHistory;
  els.importHistory.onclick = importHistory;
  els.clearHistory.onclick = () => {
    if (!confirm("Очистить всю историю?")) return;
    history = [];
    saveHistory();
    renderAll();
  };

  els.openEditor.onclick = () => {
    if (typeof els.menuEditor.showModal === "function") els.menuEditor.showModal();
    else els.menuEditor.setAttribute("open", "open");
    renderEditorList();
  };

  els.closeEditor.onclick = () => {
    resetForm();
    els.menuEditor.close?.();
    els.menuEditor.removeAttribute?.("open");
  };

  els.exportMenu.onclick = exportMenu;
  els.importMenu.onclick = importMenu;

    els.resetMenu.onclick = () => {
    if (!confirm("Сбросить меню и очистить заказы на всех столах?")) return;

    // Сброс только меню и заказов (историю не трогаем)
    menu = [];
    tables = Array.from({ length: TABLE_COUNT }, () => ({ order: {} }));

    saveMenu();
    saveTables();

    selectedCategory = "Все";
    selectedSub = "Все";
    els.search.value = "";

    resetForm();
    renderAll();
    renderEditorList();
  };

  // Форма: чтобы Enter не перезагружал страницу
  if (els.itemForm) {
    els.itemForm.addEventListener("submit", (e) => {
      e.preventDefault();
      saveFromForm();
    });
  }

  els.saveItem.onclick = (e) => {
    e.preventDefault();
    saveFromForm();
  };

  els.resetForm.onclick = (e) => {
    e.preventDefault();
    resetForm();
  };

  // Esc закрывает редактор (если открыт)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const isOpen = !!(els.menuEditor && (els.menuEditor.open || els.menuEditor.hasAttribute?.("open")));
      if (isOpen) {
        resetForm();
        els.menuEditor.close?.();
        els.menuEditor.removeAttribute?.("open");
      }
    }
  });
}

init();