/* waiter-pwa: простое офлайн меню + 10 столов + история + редактор меню */

const LS = {
  MENU: "waiter_menu_v2",
  TABLES: "waiter_tables_v2",
  HISTORY: "waiter_history_v2",
  SEL: "waiter_selected_table_v2",
};

const TABLE_COUNT = 10;

function uid() {
  return "i_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function nowISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

/* ---------- состояние ---------- */

let menu = loadMenu();
let tables = loadTables();
let history = loadHistory();

let selectedTable = loadSelectedTable();
let selectedCategory = "Все";
let selectedSub = "Все";

const els = {
  status: document.getElementById("status"),
  tableTabs: document.getElementById("tableTabs"),
  tableNum: document.getElementById("tableNum"),
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
};

let editingId = null;

/* ---------- storage ---------- */

function loadMenu() {
  const m = safeJsonParse(localStorage.getItem(LS.MENU), null);
  if (Array.isArray(m) && m.length) return normalizeMenu(m);

  // Стартовый пример (можешь удалить в редакторе)
  const starter = [
    { id: uid(), cat: "Напитки", sub: "Кофе", name: "Американо", grams: "100мл", desc: "", price: 5 },
    { id: uid(), cat: "Напитки", sub: "Кофе", name: "Капучино", grams: "125мл", desc: "", price: 6 },
    { id: uid(), cat: "Поляна", sub: "Бургеры", name: "Чизбургер Поляна", grams: "300г", desc: "Котлета 100% говядина, сыр чеддер, огурцы, жареный сыр, фирменный соус", price: 19 },
  ];
  localStorage.setItem(LS.MENU, JSON.stringify(starter));
  return normalizeMenu(starter);
}

function normalizeMenu(arr) {
  return arr
    .map((x) => ({
      id: String(x.id || uid()),
      cat: String(x.cat || "Без категории").trim(),
      sub: String(x.sub || "").trim(),
      name: String(x.name || "").trim(),
      grams: String(x.grams || "").trim(),
      desc: String(x.desc || "").trim(),
      price: Number.isFinite(Number(x.price)) ? Number(x.price) : parsePriceToken(x.price) ?? 0,
    }))
    .filter((x) => x.name.length > 0);
}

function saveMenu() {
  localStorage.setItem(LS.MENU, JSON.stringify(menu));
}

function loadTables() {
  const t = safeJsonParse(localStorage.getItem(LS.TABLES), null);
  if (Array.isArray(t) && t.length === TABLE_COUNT) return t.map(normalizeTable);
  const empty = Array.from({ length: TABLE_COUNT }, () => ({ order: {} }));
  localStorage.setItem(LS.TABLES, JSON.stringify(empty));
  return empty;
}

function normalizeTable(t) {
  const order = (t && typeof t === "object" && t.order && typeof t.order === "object") ? t.order : {};
  return { order: { ...order } };
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
  const all = ["Все", ...cats];

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
    b.textContent = s;
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

  // группировка по sub внутри выбранной категории (если sub есть)
  els.menuList.innerHTML = "";
  if (items.length === 0) {
    els.menuList.innerHTML = `<div class="hint" style="padding:10px 0;">Ничего не найдено</div>`;
    return;
  }

  // сорт: cat, sub, name
  items.sort((a,b) =>
    (a.cat||"").localeCompare(b.cat||"", "ru") ||
    (a.sub||"").localeCompare(b.sub||"", "ru") ||
    (a.name||"").localeCompare(b.name||"", "ru")
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
    if (it.grams) metaParts.push(it.grams); // граммовка мелким
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

  // новые сверху
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
  }
}

function renderEditorList() {
  els.menuAdminList.innerHTML = "";
  if (menu.length === 0) {
    els.menuAdminList.innerHTML = `<div class="hint">Меню пустое — добавь первую позицию сверху</div>`;
    return;
  }

  const items = [...menu].sort((a,b) =>
    (a.cat||"").localeCompare(b.cat||"", "ru") ||
    (a.sub||"").localeCompare(b.sub||"", "ru") ||
    (a.name||"").localeCompare(b.name||"", "ru")
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
      // убрать из заказов всех столов
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
    items: items.map(({ it, qty }) => ({
      id: it.id,
      name: it.name,
      qty,
      price: it.price,
      grams: it.grams || "",
    })),
  });

  // очистить стол
  tables[selectedTable - 1].order = {};
  saveHistory();
  saveTables();
  renderAll();
}

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
  const payload = {
    version: 2,
    exportedAt: nowISO(),
    menu,
  };
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

    // допускаем либо {menu:[...]} либо просто массив
    let arr = null;
    if (Array.isArray(data)) arr = data;
    else if (data && Array.isArray(data.menu)) arr = data.menu;

    if (!arr) return alert("В файле нет menu массива.");
    const norm = normalizeMenu(arr);

    if (!confirm(`Импортировать меню (${norm.length} позиций)? Текущее меню будет заменено.`)) return;

    // при замене меню — очистим заказы, чтобы не было битых id
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
  const payload = {
    version: 2,
    exportedAt: nowISO(),
    history,
  };
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
  // сервис-воркер (офлайн)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
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
    els.menuEditor.close();
  };

  els.exportMenu.onclick = exportMenu;
  els.importMenu.onclick = importMenu;

  els.saveItem.onclick = (e) => { e.preventDefault(); saveFromForm(); };
  els.resetForm.onclick = (e) => { e.preventDefault(); resetForm(); };

  // если в меню удалены категории — сброс выбранных
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && els.menuEditor.open) {
      resetForm();
      els.menuEditor.close();
    }
  });
}

init();