function uuid() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

const LS_MENU = "waiter_menu_v2";
const LS_ORDERS = "waiter_orders_v2";
const LS_TABLE = "waiter_active_table_v2";
const LS_CAT = "waiter_active_cat_v2";
const LS_SUBCAT = "waiter_active_subcat_v2";
const LS_HISTORY = "waiter_history_v2";
const LS_UI_TABLES_OPEN = "waiter_ui_tables_open_v2";

const DEFAULT_MENU = [
  // Минимум “демо”, потом ты импортом заменишь
  { id: uuid(), name: "Пример: Капучино", category: "Напитки", subcategory: "Кофе", price: 220, gram: "200 мл", desc: "Классический капучино" },
  { id: uuid(), name: "Пример: Том Ям", category: "Еда", subcategory: "Супы", price: 450, gram: "350 г", desc: "Острый суп с морепродуктами" },
];

function loadMenu() {
  const raw = localStorage.getItem(LS_MENU);
  if (!raw) {
    localStorage.setItem(LS_MENU, JSON.stringify(DEFAULT_MENU));
    return [...DEFAULT_MENU];
  }
  try {
    const parsed = JSON.parse(raw);
    const fixed = (Array.isArray(parsed) ? parsed : []).map(m => ({
      id: String(m.id || uuid()),
      name: String(m.name || ""),
      category: String(m.category || "Без категории"),
      subcategory: String(m.subcategory || ""),
      price: Number.isFinite(Number(m.price)) ? Number(m.price) : 0,
      gram: String(m.gram || ""),
      desc: String(m.desc || ""),
    }));
    localStorage.setItem(LS_MENU, JSON.stringify(fixed));
    return fixed;
  } catch {
    return [...DEFAULT_MENU];
  }
}
function saveMenu(menu) { localStorage.setItem(LS_MENU, JSON.stringify(menu)); }

function loadOrders() {
  const raw = localStorage.getItem(LS_ORDERS);
  if (!raw) {
    const init = {};
    for (let t = 1; t <= 10; t++) init[String(t)] = {};
    localStorage.setItem(LS_ORDERS, JSON.stringify(init));
    return init;
  }
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") throw new Error("bad");
    for (let t = 1; t <= 10; t++) obj[String(t)] = obj[String(t)] || {};
    return obj;
  } catch {
    const init = {};
    for (let t = 1; t <= 10; t++) init[String(t)] = {};
    return init;
  }
}
function saveOrders(orders) { localStorage.setItem(LS_ORDERS, JSON.stringify(orders)); }

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
function saveHistory(history) { localStorage.setItem(LS_HISTORY, JSON.stringify(history)); }

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function fmtMoney(n){ return `${Number(n||0)} р`; }
function fmtDT(ts) {
  const d = new Date(ts);
  return d.toLocaleString("ru-RU", { year:"2-digit", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
}

/* state */
let menu = loadMenu();
let orders = loadOrders();
let history = loadHistory();

let activeTable = Number(localStorage.getItem(LS_TABLE) || "1");
let activeCat = localStorage.getItem(LS_CAT) || "Все";
let activeSub = localStorage.getItem(LS_SUBCAT) || "Все";
let searchText = "";

/* elements */
const elTabs = document.getElementById("tableTabs");
const elTablesDetails = document.getElementById("tablesDetails");
const elPills = document.getElementById("categoryPills");
const elSubPills = document.getElementById("subCategoryPills");

const elMenu = document.getElementById("menuList");
const elOrder = document.getElementById("orderList");
const elTotals = document.getElementById("orderTotals");
const elTableNum = document.getElementById("tableNum");
const elStatus = document.getElementById("status");

const elSearch = document.getElementById("search");
const elClear = document.getElementById("clearTable");
const elClose = document.getElementById("closeTable");

/* admin */
const elNewName = document.getElementById("newName");
const elNewCat = document.getElementById("newCat");
const elNewSub = document.getElementById("newSub");
const elNewPrice = document.getElementById("newPrice");
const elNewGram = document.getElementById("newGram");
const elNewDesc = document.getElementById("newDesc");
const elAddItem = document.getElementById("addItem");
const elResetMenu = document.getElementById("resetMenu");
const elAdminList = document.getElementById("menuAdminList");

const elBulk = document.getElementById("bulkMenuText");
const elImport = document.getElementById("importMenu");
const elImportReplace = document.getElementById("importReplace");

/* history ui */
const elHistoryList = document.getElementById("historyList");
const elExportHistory = document.getElementById("exportHistory");
const elClearHistory = document.getElementById("clearHistory");

/* tables open state remember */
if (elTablesDetails) {
  const saved = localStorage.getItem(LS_UI_TABLES_OPEN);
  if (saved === "0") elTablesDetails.open = false;
  if (saved === "1") elTablesDetails.open = true;
  elTablesDetails.addEventListener("toggle", () => {
    localStorage.setItem(LS_UI_TABLES_OPEN, elTablesDetails.open ? "1" : "0");
  });
}

function tableOrderMap(tableNum) {
  return orders[String(tableNum)] || {};
}
function tableCounts(tableNum) {
  const map = tableOrderMap(tableNum);
  const entries = Object.entries(map);
  const positions = entries.filter(([,q]) => q > 0).length;
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

function categories() {
  const set = new Set(menu.map(m => m.category).filter(Boolean));
  return ["Все", ...Array.from(set).sort((a,b)=>a.localeCompare(b,'ru'))];
}
function subcategoriesFor(cat) {
  if (!cat || cat === "Все") return ["Все"];
  const set = new Set(menu.filter(m => m.category === cat).map(m => m.subcategory).filter(x => x && x.trim()));
  const arr = Array.from(set).sort((a,b)=>a.localeCompare(b,'ru'));
  return ["Все", ...arr];
}

function renderTabs() {
  if (!elTabs) return;
  elTabs.innerHTML = "";
  for (let t=1; t<=10; t++) {
    const btn = document.createElement("div");
    btn.className = "tab" + (t===activeTable ? " active" : "");
    const counts = tableCounts(t);
    btn.textContent = `Стол ${t} (${counts.positions}/${counts.totalQty})`;
    btn.onclick = () => {
      activeTable = t;
      localStorage.setItem(LS_TABLE, String(activeTable));

      // авто-закрытие "Столы" на телефоне/узком экране
      if (elTablesDetails && window.matchMedia("(max-width: 900px)").matches) {
        elTablesDetails.open = false;
        localStorage.setItem(LS_UI_TABLES_OPEN, "0");
      }

      renderAll();
    };
    elTabs.appendChild(btn);
  }
}

function renderPills() {
  if (!elPills) return;
  elPills.innerHTML = "";

  const cats = categories();
  for (const c of cats) {
    const p = document.createElement("div");
    p.className = "pill" + (c===activeCat ? " active" : "");
    p.textContent = c;
    p.onclick = () => {
      activeCat = c;
      localStorage.setItem(LS_CAT, activeCat);

      // сброс подкатегории при смене категории
      activeSub = "Все";
      localStorage.setItem(LS_SUBCAT, activeSub);

      renderAll();
    };
    elPills.appendChild(p);
  }
}

function renderSubPills() {
  if (!elSubPills) return;

  const subs = subcategoriesFor(activeCat);
  const hasReal = subs.length > 1; // кроме "Все"
  elSubPills.style.display = hasReal ? "flex" : "none";
  elSubPills.innerHTML = "";

  if (!hasReal) return;

  for (const s of subs) {
    const p = document.createElement("div");
    p.className = "pill" + (s===activeSub ? " active" : "");
    p.textContent = s;
    p.onclick = () => {
      activeSub = s;
      localStorage.setItem(LS_SUBCAT, activeSub);
      renderAll();
    };
    elSubPills.appendChild(p);
  }
}

function filteredMenu() {
  return menu
    .filter(m => activeCat === "Все" ? true : m.category === activeCat)
    .filter(m => activeSub === "Все" ? true : (m.subcategory || "") === activeSub)
    .filter(m => !searchText ? true : (m.name || "").toLowerCase().includes(searchText.toLowerCase()))
    .sort((a,b)=> (a.name||"").localeCompare(b.name||"",'ru'));
}

function renderMenu() {
  if (!elMenu) return;
  const map = tableOrderMap(activeTable);
  elMenu.innerHTML = "";

  const list = filteredMenu();
  if (list.length === 0) {
    elMenu.innerHTML = `<div class="hint">Ничего не найдено</div>`;
    return;
  }

  for (const item of list) {
    const qty = map[item.id] || 0;

    const row = document.createElement("div");
    row.className = "item";

    const left = document.createElement("div");
    const metaParts = [];
    if (item.subcategory) metaParts.push(escapeHtml(item.subcategory));
    if (item.gram) metaParts.push(escapeHtml(item.gram));
    metaParts.push(fmtMoney(item.price));

    left.innerHTML = `
      <div style="font-weight:800;">${escapeHtml(item.name)}</div>
      <div class="meta">${metaParts.join(" • ")}</div>
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
  if (!elOrder || !elTotals || !elTableNum) return;

  elTableNum.textContent = String(activeTable);
  elOrder.innerHTML = "";
  elTotals.innerHTML = "";

  const map = tableOrderMap(activeTable);
  const entries = Object.entries(map)
    .map(([id, qty]) => ({ item: menu.find(m => m.id === id), qty }))
    .filter(x => x.item && x.qty > 0)
    .sort((a, b) => (a.item.name||"").localeCompare(b.item.name||"", 'ru'));

  if (entries.length === 0) {
    elOrder.innerHTML = `<div class="hint">Пока пусто. Добавляй блюда из меню слева.</div>`;
    return;
  }

  let totalQty = 0;
  let totalSum = 0;

  for (const { item, qty } of entries) {
    totalQty += qty;

    const unit = Number(item.price || 0);
    const line = unit * qty;
    totalSum += line;

    const row = document.createElement("div");
    row.className = "item";

    const metaParts = [];
    if (item.subcategory) metaParts.push(escapeHtml(item.subcategory));
    if (item.gram) metaParts.push(escapeHtml(item.gram));
    metaParts.push(`${fmtMoney(unit)} × ${qty} = ${fmtMoney(line)}`);

    row.innerHTML = `
      <div>
        <div style="font-weight:800;">${escapeHtml(item.name)}</div>
        <div class="meta">${metaParts.join(" • ")}</div>
        ${item.desc ? `<div class="desc">${escapeHtml(item.desc)}</div>` : ``}
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
    <div class="card" style="margin-top:12px; padding:10px;">
      <div style="font-weight:900; margin-bottom:6px;">ИТОГО</div>
      <div class="hint">
        Позиции — <b>${positions}</b><br>
        Всего — <b>${totalQty}</b><br>
        Сумма — <b>${fmtMoney(totalSum)}</b>
      </div>
    </div>
  `;
}

function renderStatus() {
  if (!elStatus) return;
  const online = navigator.onLine ? "онлайн" : "офлайн";
  elStatus.textContent = `Сейчас: ${online}`;
}

function renderHistory() {
  if (!elHistoryList) return;

  if (!history.length) {
    elHistoryList.innerHTML = `<div class="hint">Пока нет закрытых столов.</div>`;
    return;
  }

  const items = [...history].slice(-80).reverse();
  elHistoryList.innerHTML = items.map(h => {
    const lines = (h.items || []).map(it => {
      const name = escapeHtml(it.name);
      const qty = Number(it.qty || 0);
      const price = Number(it.price || 0);
      const gram = it.gram ? ` • ${escapeHtml(it.gram)}` : "";
      return `${name}${gram} — ${qty} шт • ${fmtMoney(price)}`;
    }).join("<br>");

    return `
      <div class="card" style="margin:8px 0; padding:10px;">
        <div style="display:flex; justify-content:space-between; gap:10px; font-weight:900;">
          <div>Стол ${h.table}</div>
          <div style="opacity:.8; font-weight:700;">${fmtDT(h.ts)}</div>
        </div>
        <div class="hint" style="margin-top:6px;">
          Позиции: <b>${h.positions}</b> • Штук: <b>${h.totalQty}</b> • Сумма: <b>${fmtMoney(h.totalSum)}</b>
        </div>
        <div style="margin-top:8px; line-height:1.35;">
          ${lines || "<span class='hint'>Пусто</span>"}
        </div>
      </div>
    `;
  }).join("");
}

function buildReceiptForTable(tableNum) {
  const map = tableOrderMap(tableNum);
  const entries = Object.entries(map)
    .map(([id, qty]) => ({ item: menu.find(m => m.id === id), qty }))
    .filter(x => x.item && x.qty > 0);

  let totalQty = 0;
  let totalSum = 0;

  const items = entries.map(({ item, qty }) => {
    totalQty += qty;
    const price = Number(item.price || 0);
    totalSum += price * qty;
    return {
      name: item.name,
      qty,
      price,
      gram: item.gram || "",
      desc: item.desc || "",
      category: item.category || "",
      subcategory: item.subcategory || "",
    };
  });

  return {
    ts: Date.now(),
    table: tableNum,
    positions: items.length,
    totalQty,
    totalSum,
    items
  };
}

function renderAdmin() {
  if (!elAdminList) return;
  elAdminList.innerHTML = "";

  const list = [...menu].sort((a,b)=>
    (a.category||"").localeCompare(b.category||"",'ru') ||
    (a.subcategory||"").localeCompare(b.subcategory||"",'ru') ||
    (a.name||"").localeCompare(b.name||"",'ru')
  );

  for (const item of list) {
    const row = document.createElement("div");
    row.className = "item";

    const metaParts = [];
    if (item.category) metaParts.push(escapeHtml(item.category));
    if (item.subcategory) metaParts.push(escapeHtml(item.subcategory));
    if (item.gram) metaParts.push(escapeHtml(item.gram));
    metaParts.push(fmtMoney(item.price));

    row.innerHTML = `
      <div>
        <div style="font-weight:800;">${escapeHtml(item.name)}</div>
        <div class="meta">${metaParts.join(" • ")}</div>
        ${item.desc ? `<div class="desc">${escapeHtml(item.desc)}</div>` : ``}
      </div>
      <button class="danger small">Удалить</button>
    `;

    row.querySelector("button").onclick = () => {
      if (!confirm(`Удалить "${item.name}"?`)) return;

      // удалить из меню
      menu = menu.filter(m => m.id !== item.id);
      saveMenu(menu);

      // удалить из всех заказов
      for (let t=1; t<=10; t++) {
        const map = tableOrderMap(t);
        if (map[item.id] != null) {
          delete map[item.id];
          orders[String(t)] = map;
        }
      }
      saveOrders(orders);

      // если категории/подкатегории пропали — сбросим фильтры
      if (!categories().includes(activeCat)) activeCat = "Все";
      localStorage.setItem(LS_CAT, activeCat);

      activeSub = "Все";
      localStorage.setItem(LS_SUBCAT, activeSub);

      renderAll();
    };

    elAdminList.appendChild(row);
  }
}

function renderAll() {
  renderStatus();
  renderTabs();
  renderPills();
  renderSubPills();
  renderMenu();
  renderOrder();
  renderHistory();
  renderAdmin();
}

/* ====== IMPORT PARSER (category: , [subcategory], item lines) ====== */
function parseMenuText(text) {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  let currentCategory = "Без категории";
  let currentSub = "";

  const items = [];

  for (const raw of lines) {
    // "Категория:"
    const catColon = raw.match(/^(.+):$/);
    if (catColon) {
      currentCategory = catColon[1].trim() || currentCategory;
      currentSub = "";
      continue;
    }

    // "[Подкатегория]"
    const subBr = raw.match(/^\[(.+)\]$/);
    if (subBr) {
      currentSub = subBr[1].trim() || "";
      continue;
    }

    // Позиция: "Название 350 300мл | описание"
    // цена — обязательна (последняя цифра-группа)
    const priceMatch = raw.match(/(\d+)\s*(?:₽|р|руб)?\s*/i);
    if (!priceMatch) continue;

    // Берем ПЕРВУЮ цену как price (так надёжнее)
    const price = Number(priceMatch[1]);

    // Отделяем описание через "|"
    const parts = raw.split("|").map(x => x.trim());
    const left = parts[0] || raw;
    const desc = parts[1] ? parts.slice(1).join(" | ") : "";

    // Из left вытащим граммовку (мл/г/гр/л) — если есть
    // например: "Манго 350 300мл" / "Борщ 250 350 г"
    let gram = "";
    const gramMatch = left.match(/(\d+(?:\.\d+)?)\s*(мл|ml|г|гр|kg|кг|л|l)\b/i);
    if (gramMatch) gram = `${gramMatch[1]} ${gramMatch[2]}`.replace("ml","мл").replace("l","л");

    // Название: уберём цену и граммовку
    let name = left
      .replace(/\|.*/g, "")
      .replace(/(\d+)\s*(?:₽|р|руб)?/i, "") // убираем первую цену
      .replace(/(\d+(?:\.\d+)?)\s*(мл|ml|г|гр|kg|кг|л|l)\b/i, "") // убираем граммовку
      .replace(/[-–—:]+/g, " ")
      .trim();

    if (!name) continue;

    items.push({
      id: uuid(),
      name,
      category: currentCategory,
      subcategory: currentSub,
      price: Number.isFinite(price) ? price : 0,
      gram,
      desc
    });
  }

  return items;
}

function mergeMenuItems(newItems) {
  const key = (x) => `${(x.category||"").toLowerCase()}||${(x.subcategory||"").toLowerCase()}||${(x.name||"").toLowerCase()}`;
  const existing = new Map(menu.map(m => [key(m), m]));

  for (const it of newItems) {
    const k = key(it);
    if (existing.has(k)) {
      const old = existing.get(k);
      // обновляем данные
      if ((it.price ?? 0) !== 0) old.price = it.price;
      if (it.gram) old.gram = it.gram;
      if (it.desc) old.desc = it.desc;
    } else {
      menu.push(it);
      existing.set(k, it);
    }
  }
}

/* ====== EVENTS ====== */
elSearch?.addEventListener("input", (e) => {
  searchText = e.target.value || "";
  renderMenu();
});

elClear?.addEventListener("click", () => {
  if (!confirm(`Очистить заказ для стола ${activeTable}?`)) return;
  orders[String(activeTable)] = {};
  saveOrders(orders);
  renderAll();
});

elClose?.addEventListener("click", () => {
  const counts = tableCounts(activeTable);
  if (counts.totalQty === 0) {
    alert("Стол и так пустой");
    return;
  }

  // Собираем чек, чтобы в confirm была сумма
  const receipt = buildReceiptForTable(activeTable);

  if (!confirm(
    `Закрыть стол ${activeTable}?\n` +
    `Позиций: ${receipt.positions}\n` +
