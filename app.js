function uuid() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

/* ===== Storage keys ===== */
const LS_MENU     = "waiter_menu_v2";
const LS_CATS     = "waiter_categories_v2";
const LS_ORDERS   = "waiter_orders_v2";
const LS_TABLE    = "waiter_active_table_v2";
const LS_CAT      = "waiter_active_cat_v2";
const LS_SUBCAT   = "waiter_active_subcat_v2";
const LS_SEARCH   = "waiter_search_v2";
const LS_HISTORY  = "waiter_history_v2";
const LS_TABLES_OPEN = "waiter_tables_open_v2";

/* ===== Категории по умолчанию (без позиций) ===== */
const DEFAULT_CATEGORIES = [
  "Закуски",
  "Напитки и соки",
  "Смузи",
  "Лимонады",
  "Милкшейки",
  "Десерты",
  "Коктейли",
  "Коктейли классические",
  "Коктейли авторские и твист",
  "Безалкогольные коктейли",
  "Микс дринк",
  "Фирменные наливки",
  "Шоты",
  "Сеты шотов",
  "Пиво",
  "К пиву",
  "Шотландские виски",
  "Ирландские виски",
  "Американские виски",
  "Ром",
  "Водка",
  "Текила / Джин",
  "Ликеры",
  "Коньяк",
  "Вермуты",
  "Горячие коктейли",
  "Домашние вина",
  "Белые вина",
  "Красные вина",
  "Розовое вино",
  "Игристое вино",
  "Листовой чай",
  "Чайные напитки",
  "Бабл-напитки",
  "Кофе",
  "Кофейные напитки",
  "Бутылочка с собой",
  "Поляна"
];

/* ===== Helpers ===== */
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function num(x){ const n = Number(x); return Number.isFinite(n) ? n : 0; }

function fmtDT(ts) {
  const d = new Date(ts);
  return d.toLocaleString("ru-RU", { year:"2-digit", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
}

/* ===== Load / Save ===== */
function loadCategories(){
  const raw = localStorage.getItem(LS_CATS);
  if (!raw) {
    localStorage.setItem(LS_CATS, JSON.stringify(DEFAULT_CATEGORIES));
    return [...DEFAULT_CATEGORIES];
  }
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length) return arr;
    return [...DEFAULT_CATEGORIES];
  } catch {
    return [...DEFAULT_CATEGORIES];
  }
}
function saveCategories(cats){ localStorage.setItem(LS_CATS, JSON.stringify(cats)); }

function loadMenu() {
  const raw = localStorage.getItem(LS_MENU);
  if (!raw) {
    localStorage.setItem(LS_MENU, JSON.stringify([]));
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(m => ({
      id: m.id || uuid(),
      name: String(m.name || "").trim(),
      category: String(m.category || "").trim(),
      subcat: String(m.subcat || "").trim(),
      grams: String(m.grams || "").trim(), // "250г", "200мл"
      desc: String(m.desc || "").trim(),
      price: num(m.price)
    })).filter(x => x.name);
  } catch {
    return [];
  }
}
function saveMenu(menu){ localStorage.setItem(LS_MENU, JSON.stringify(menu)); }

function loadOrders() {
  const raw = localStorage.getItem(LS_ORDERS);
  if (!raw) {
    const init = {};
    for (let t=1; t<=10; t++) init[String(t)] = {};
    localStorage.setItem(LS_ORDERS, JSON.stringify(init));
    return init;
  }
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") throw 0;
    for (let t=1; t<=10; t++) obj[String(t)] = obj[String(t)] || {};
    return obj;
  } catch {
    const init = {};
    for (let t=1; t<=10; t++) init[String(t)] = {};
    return init;
  }
}
function saveOrders(orders){ localStorage.setItem(LS_ORDERS, JSON.stringify(orders)); }

function loadHistory() {
  const raw = localStorage.getItem(LS_HISTORY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveHistory(history){ localStorage.setItem(LS_HISTORY, JSON.stringify(history)); }

/* ===== State ===== */
let categoriesList = loadCategories();
let menu = loadMenu();
let orders = loadOrders();
let history = loadHistory();

let activeTable = Number(localStorage.getItem(LS_TABLE) || "1");
let activeCat = localStorage.getItem(LS_CAT) || "Все";
let activeSubCat = localStorage.getItem(LS_SUBCAT) || "Все";
let searchText = localStorage.getItem(LS_SEARCH) || "";

/* ===== DOM ===== */
const elTabs = document.getElementById("tableTabs");
const elMenu = document.getElementById("menuList");
const elOrder = document.getElementById("orderList");
const elTotals = document.getElementById("orderTotals");
const elTableNum = document.getElementById("tableNum");
const elStatus = document.getElementById("status");

const elSearch = document.getElementById("search");
const elClear = document.getElementById("clearTable");
const elClose = document.getElementById("closeTable");

const elCatPills = document.getElementById("categoryPills");
const elSubPills = document.getElementById("subCategoryPills");

const elHistoryList = document.getElementById("historyList");
const elExportHistory = document.getElementById("exportHistory");
const elClearHistory = document.getElementById("clearHistory");

const elTablesDetails = document.getElementById("tablesDetails");

const elBulk = document.getElementById("bulkMenuText");
const elImportReplace = document.getElementById("importReplace");
const elResetAll = document.getElementById("resetAll");

/* ===== Tables open/close persistent ===== */
function applyTablesOpenState(){
  const saved = localStorage.getItem(LS_TABLES_OPEN);
  const isOpen = saved === null ? true : (saved === "1");
  elTablesDetails.open = isOpen;
}
applyTablesOpenState();

elTablesDetails.addEventListener("toggle", () => {
  localStorage.setItem(LS_TABLES_OPEN, elTablesDetails.open ? "1" : "0");
});

/* ===== Logic ===== */
function renderStatus() {
  const online = navigator.onLine ? "онлайн" : "офлайн";
  elStatus.textContent = `Сейчас: ${online}`;
}

function tableOrderMap(tableNum) {
  return orders[String(tableNum)] || {};
}

function tableCounts(tableNum) {
  const map = tableOrderMap(tableNum);
  const entries = Object.entries(map);
  const positions = entries.filter(([,q]) => (q||0) > 0).length;
  const totalQty = entries.reduce((s,[,q]) => s + (q||0), 0);
  return { positions, totalQty };
}

function adjustQty(menuId, delta) {
  const map = tableOrderMap(activeTable);
  const next = (map[menuId] || 0) + delta;
  if (next <= 0) delete map[menuId];
  else map[menuId] = next;
  orders[String(activeTable)] = map;
  saveOrders(orders);
  renderAll();
}

function getAllCategories() {
  // показываем "Все" + категории из списка + категории из меню (если появятся новые)
  const fromMenu = new Set(menu.map(m => m.category).filter(Boolean));
  const set = new Set([...categoriesList, ...fromMenu].filter(Boolean));
  const arr = Array.from(set).sort((a,b)=>a.localeCompare(b,'ru'));
  return ["Все", ...arr];
}

function getSubCategoriesFor(cat) {
  if (cat === "Все") return ["Все"];
  const set = new Set(menu.filter(m => m.category === cat).map(m => m.subcat).filter(Boolean));
  const arr = Array.from(set).sort((a,b)=>a.localeCompare(b,'ru'));
  return arr.length ? ["Все", ...arr] : ["Все"];
}

function renderTabs() {
  elTabs.innerHTML = "";
  for (let t=1; t<=10; t++) {
    const btn = document.createElement("div");
    btn.className = "tab" + (t===activeTable ? " active" : "");
    const counts = tableCounts(t);
    btn.textContent = `Стол ${t} (${counts.positions}/${counts.totalQty})`;
    btn.onclick = () => {
      activeTable = t;
      localStorage.setItem(LS_TABLE, String(activeTable));

      // авто-закрытие "Столов" после выбора
      elTablesDetails.open = false;
      localStorage.setItem(LS_TABLES_OPEN, "0");

      renderAll();
    };
    elTabs.appendChild(btn);
  }
}

function renderCategoryPills() {
  elCatPills.innerHTML = "";
  for (const c of getAllCategories()) {
    const p = document.createElement("div");
    p.className = "pill" + (c===activeCat ? " active" : "");
    p.textContent = c;
    p.onclick = () => {
      activeCat = c;
      localStorage.setItem(LS_CAT, activeCat);

      // сброс подкатегории при смене категории
      activeSubCat = "Все";
      localStorage.setItem(LS_SUBCAT, activeSubCat);

      renderAll();
    };
    elCatPills.appendChild(p);
  }
}

function renderSubCategoryPills() {
  const subs = getSubCategoriesFor(activeCat);

  // если подкатегорий нет (кроме "Все"), можно скрыть бар
  const onlyAll = subs.length === 1 && subs[0] === "Все";
  elSubPills.style.display = onlyAll ? "none" : "flex";
  if (onlyAll) return;

  elSubPills.innerHTML = "";
  for (const sc of subs) {
    const p = document.createElement("div");
    p.className = "pill" + (sc===activeSubCat ? " active" : "");
    p.textContent = sc;
    p.onclick = () => {
      activeSubCat = sc;
      localStorage.setItem(LS_SUBCAT, activeSubCat);
      renderAll();
    };
    elSubPills.appendChild(p);
  }
}

function filteredMenu() {
  return menu
    .filter(m => activeCat === "Все" ? true : m.category === activeCat)
    .filter(m => activeSubCat === "Все" ? true : (m.subcat || "") === activeSubCat)
    .filter(m => !searchText ? true : m.name.toLowerCase().includes(searchText.toLowerCase()))
    .sort((a,b)=>a.name.localeCompare(b.name,'ru'));
}

function renderMenu() {
  const map = tableOrderMap(activeTable);
  elMenu.innerHTML = "";

  const list = filteredMenu();

  if (list.length === 0) {
    elMenu.innerHTML = `<div class="hint">Пока нет позиций в этой категории.</div>`;
    return;
  }

  for (const item of list) {
    const qty = map[item.id] || 0;

    const row = document.createElement("div");
    row.className = "item";

    const left = document.createElement("div");
    const sub = item.subcat ? ` • ${escapeHtml(item.subcat)}` : "";
    const grams = item.grams ? ` • <span style="font-size:12px; opacity:.9;">${escapeHtml(item.grams)}</span>` : "";
    left.innerHTML = `
      <div style="font-weight:800;">${escapeHtml(item.name)}</div>
      <div class="meta">${escapeHtml(item.category || "")}${sub}${grams} • ${num(item.price)} р</div>
      ${item.desc ? `<div class="desc">${escapeHtml(item.desc)}</div>` : ``}
    `;

    const right = document.createElement("div");
    right.className = "stepper";
    right.innerHTML = `
      <button class="small" ${qty===0 ? "disabled" : ""} aria-label="minus">−</button>
      <div class="qty">${qty}</div>
      <button class="small" aria-label="plus">+</button>
    `;
    const [minusBtn, , plusBtn] = right.children;
    minusBtn.onclick = () => adjustQty(item.id, -1);
    plusBtn.onclick = () => adjustQty(item.id, +1);

    row.appendChild(left);
    row.appendChild(right);
    elMenu.appendChild(row);
  }
}

function renderOrder() {
  elTableNum.textContent = String(activeTable);
  elOrder.innerHTML = "";

  const map = tableOrderMap(activeTable);
  const entries = Object.entries(map)
    .map(([id, qty]) => ({ item: menu.find(m => m.id === id), qty }))
    .filter(x => x.item && x.qty > 0)
    .sort((a, b) => a.item.name.localeCompare(b.item.name, 'ru'));

  if (entries.length === 0) {
    elOrder.innerHTML = `<div class="hint">Пока пусто. Добавляй позиции из меню.</div>`;
    elTotals.textContent = "";
    return;
  }

  let totalQty = 0;
  let totalSum = 0;

  for (const { item, qty } of entries) {
    totalQty += qty;
    const unit = num(item.price);
    const line = unit * qty;
    totalSum += line;

    const row = document.createElement("div");
    row.className = "item";
    const grams = item.grams ? ` • <span style="font-size:12px; opacity:.9;">${escapeHtml(item.grams)}</span>` : "";
    row.innerHTML = `
      <div>
        <div style="font-weight:800;">${escapeHtml(item.name)}</div>
        <div class="meta">${escapeHtml(item.category || "")}${grams} • ${unit} р × ${qty} = ${line} р</div>
      </div>
      <div class="stepper">
        <button class="small">−</button>
        <div class="qty">${qty}</div>
        <button class="small">+</button>
      </div>
    `;
    const minusBtn = row.querySelectorAll("button")[0];
    const plusBtn = row.querySelectorAll("button")[1];
    minusBtn.onclick = () => adjustQty(item.id, -1);
    plusBtn.onclick = () => adjustQty(item.id, +1);

    elOrder.appendChild(row);
  }

  const positions = entries.length;
  elTotals.innerHTML = `
    <div style="margin-top:12px; padding-top:10px; border-top:1px solid #243244; font-size:15px; font-weight:900;">
      ИТОГО:<br>
      Позиции — ${positions}<br>
      Всего — ${totalQty}<br>
      Сумма — ${totalSum} р
    </div>
  `;
}

function renderHistory() {
  if (!elHistoryList) return;

  if (!history.length) {
    elHistoryList.innerHTML = `<div class="hint">Пока нет закрытых столов.</div>`;
    return;
  }

  const items = [...history].slice(-50).reverse();
  elHistoryList.innerHTML = items.map(h => {
    const lines = (h.items || []).map(it =>
      `${escapeHtml(it.name)} — ${it.qty} шт • ${it.price} р`
    ).join("<br>");

    return `
      <div class="card" style="margin:8px 0; padding:10px;">
        <div style="display:flex; justify-content:space-between; gap:10px; font-weight:900;">
          <div>Стол ${h.table}</div>
          <div style="opacity:.8; font-weight:700;">${fmtDT(h.ts)}</div>
        </div>
        <div style="margin-top:6px; opacity:.9;">
          Позиции: ${h.positions} • Штук: ${h.totalQty} • Сумма: ${h.totalSum} р
        </div>
        <div style="margin-top:8px; opacity:.95; line-height:1.35;">
          ${lines || "<span class='hint'>Пусто</span>"}
        </div>
      </div>
    `;
  }).join("");
}

function renderAll() {
  renderStatus();
  renderTabs();
  renderCategoryPills();
  renderSubCategoryPills();
  renderMenu();
  renderOrder();
  renderHistory();
}

/* ===== Events ===== */
elSearch.value = searchText;

elSearch.addEventListener("input", (e) => {
  searchText = e.target.value || "";
  localStorage.setItem(LS_SEARCH, searchText);
  renderMenu();
});

elClear.onclick = () => {
  if (!confirm(`Очистить заказ для стола ${activeTable}?`)) return;
  orders[String(activeTable)] = {};
  saveOrders(orders);
  renderAll();
};

elClose.onclick = () => {
  const counts = tableCounts(activeTable);
  if (counts.totalQty === 0) {
    alert("Стол и так пустой");
    return;
  }
  if (!confirm(
    `Закрыть стол ${activeTable}?\n` +
    `Позиций: ${counts.positions}\n` +
    `Всего: ${counts.totalQty}`
  )) return;

  const map = tableOrderMap(activeTable);
  const entries = Object.entries(map)
    .map(([id, qty]) => ({ item: menu.find(m => m.id === id), qty }))
    .filter(x => x.item && x.qty > 0);

  let totalQty = 0;
  let totalSum = 0;

  const items = entries.map(({ item, qty }) => {
    totalQty += qty;
    const price = num(item.price);
    totalSum += price * qty;
    return { name: item.name, qty, price };
  });

  history.push({
    ts: Date.now(),
    table: activeTable,
    positions: items.length,
    totalQty,
    totalSum,
    items
  });

  saveHistory(history);

  orders[String(activeTable)] = {};
  saveOrders(orders);
  renderAll();
};

if (elClearHistory) {
  elClearHistory.onclick = () => {
    if (!confirm("Очистить всю историю закрытий?")) return;
    history = [];
    saveHistory(history);
    renderHistory();
  };
}

if (elExportHistory) {
  elExportHistory.onclick = () => {
    const data = JSON.stringify(history, null, 2);
    const blob = new Blob([data], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "history.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
}

/* ===== Импорт из текста (если нужно) =====
   Формат:
   Категория:
   Подкатегория = Кофе
   Эспрессо | 30мл | описание... | 5р
*/
function parseImportText(text) {
  const lines = String(text).replace(/\r/g,"").split("\n").map(l=>l.trim()).filter(Boolean);
  let cat = "";
  let sub = "";

  const outCats = new Set(categoriesList);
  const outMenu = [];

  for (const raw of lines) {
    const catMatch = raw.match(/^(.+):$/);
    if (catMatch) {
      cat = catMatch[1].trim();
      sub = "";
      if (cat) outCats.add(cat);
      continue;
    }

    const subMatch = raw.match(/^Подкатегория\s*=\s*(.+)$/i);
    if (subMatch) {
      sub = subMatch[1].trim();
      continue;
    }

    // позиция: name | grams | desc | price
    const parts = raw.split("|").map(x => x.trim());
    const name = parts[0] || "";
    if (!name) continue;

    const grams = parts[1] || "";
    const desc  = parts[2] || "";
    let priceStr = parts[3] || "";
    priceStr = priceStr.replace(/[^\d]/g, "");
    const price = num(priceStr);

    outMenu.push({
      id: uuid(),
      name,
      category: cat || "Без категории",
      subcat: sub || "",
      grams,
      desc,
      price
    });

    outCats.add(cat || "Без категории");
  }

  return { cats: Array.from(outCats), menu: outMenu };
}

if (elImportReplace) {
  elImportReplace.onclick = () => {
    const text = (elBulk.value || "").trim();
    if (!text) return alert("Вставь текст меню");

    if (!confirm("Заменить текущее меню на импортированное?")) return;

    const parsed = parseImportText(text);
    categoriesList = parsed.cats.sort((a,b)=>a.localeCompare(b,'ru'));
    menu = parsed.menu;

    saveCategories(categoriesList);
    saveMenu(menu);

    // очистим заказы (на всякий)
    const init = {};
    for (let t=1; t<=10; t++) init[String(t)] = {};
    orders = init;
    saveOrders(orders);

    activeCat = "Все";
    activeSubCat = "Все";
    searchText = "";

    localStorage.setItem(LS_CAT, activeCat);
    localStorage.setItem(LS_SUBCAT, activeSubCat);
    localStorage.setItem(LS_SEARCH, searchText);

    elSearch.value = "";
    elBulk.value = "";

    renderAll();
    alert(`Готово: ${menu.length} позиций.`);
  };
}

if (elResetAll) {
  elResetAll.onclick = () => {
    if (!confirm("Сбросить всё (меню, заказы, историю, категории)?")) return;

    categoriesList = [...DEFAULT_CATEGORIES];
    menu = [];
    history = [];

    saveCategories(categoriesList);
    saveMenu(menu);
    saveHistory(history);

    const init = {};
    for (let t=1; t<=10; t++) init[String(t)] = {};
    orders = init;
    saveOrders(orders);

    activeCat = "Все";
    activeSubCat = "Все";
    searchText = "";

    localStorage.setItem(LS_CAT, activeCat);
    localStorage.setItem(LS_SUBCAT, activeSubCat);
    localStorage.setItem(LS_SEARCH, searchText);

    elSearch.value = "";
    if (elBulk) elBulk.value = "";

    renderAll();
  };
}

/* PWA */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  });
}

window.addEventListener("online", renderStatus);
window.addEventListener("offline", renderStatus);

/* старт */
renderAll();