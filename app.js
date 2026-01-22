function uuid() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}
const LS_MENU = "waiter_menu_v1";
const LS_ORDERS = "waiter_orders_v1";
const LS_TABLE = "waiter_active_table_v1";
const LS_CAT = "waiter_active_cat_v1";
const LS_HISTORY = "waiter_history_v1";
const LS_HIDE_TABLES = "waiter_hide_tables_v1";

const DEFAULT_MENU = [
  // Закуски
  { id: uuid(), name: "—", category: "Закуски", price: 0 },

  // Напитки
  { id: uuid(), name: "—", category: "Напитки и соки", price: 0 },
  { id: uuid(), name: "—", category: "Смузи", price: 0 },
  { id: uuid(), name: "—", category: "Лимонады", price: 0 },
  { id: uuid(), name: "—", category: "Милкшейки", price: 0 },

  // Десерты
  { id: uuid(), name: "—", category: "Десерты", price: 0 },

  // Коктейли
  { id: uuid(), name: "—", category: "Коктейли авторские и твист", price: 0 },
  { id: uuid(), name: "—", category: "Безалкогольные коктейли", price: 0 },
  { id: uuid(), name: "—", category: "Коктейли классические", price: 0 },
  { id: uuid(), name: "—", category: "Микс дринк", price: 0 },
  { id: uuid(), name: "—", category: "Горячие коктейли", price: 0 },

  // Алкоголь
  { id: uuid(), name: "—", category: "Фирменные наливки", price: 0 },
  { id: uuid(), name: "—", category: "Шоты", price: 0 },
  { id: uuid(), name: "—", category: "Сеты шотов", price: 0 },
  { id: uuid(), name: "—", category: "Пиво", price: 0 },
  { id: uuid(), name: "—", category: "К пиву", price: 0 },

  // Крепкий алкоголь
  { id: uuid(), name: "—", category: "Шотландские виски", price: 0 },
  { id: uuid(), name: "—", category: "Ирландские виски", price: 0 },
  { id: uuid(), name: "—", category: "Американские виски", price: 0 },
  { id: uuid(), name: "—", category: "Ром", price: 0 },
  { id: uuid(), name: "—", category: "Водка", price: 0 },
  { id: uuid(), name: "—", category: "Текила / джин", price: 0 },
  { id: uuid(), name: "—", category: "Ликеры", price: 0 },
  { id: uuid(), name: "—", category: "Коньяк", price: 0 },
  { id: uuid(), name: "—", category: "Вермуты", price: 0 },

  // Вино
  { id: uuid(), name: "—", category: "Домашние вина", price: 0 },
  { id: uuid(), name: "—", category: "Белые вина", price: 0 },
  { id: uuid(), name: "—", category: "Красные вина", price: 0 },
  { id: uuid(), name: "—", category: "Розовое вино", price: 0 },
  { id: uuid(), name: "—", category: "Игристое вино", price: 0 },

  // Чай / кофе
  { id: uuid(), name: "—", category: "Листовой чай", price: 0 },
  { id: uuid(), name: "—", category: "Чайные напитки", price: 0 },
  { id: uuid(), name: "—", category: "Бабл-напитки", price: 0 },
  { id: uuid(), name: "—", category: "Кофе", price: 0 },
  { id: uuid(), name: "—", category: "Кофейные напитки", price: 0 },

  // Прочее
  { id: uuid(), name: "—", category: "Бутылочка с собой", price: 0 }
];



function loadMenu() {
  const raw = localStorage.getItem(LS_MENU);
  if (!raw) {
    localStorage.setItem(LS_MENU, JSON.stringify(DEFAULT_MENU));
    return [...DEFAULT_MENU];
  }
  try {
  const parsed = JSON.parse(raw);
  // добавляем price=0, если старое меню без цен
  const fixed = parsed.map(m => ({
    ...m,
    price: Number.isFinite(Number(m.price)) ? Number(m.price) : 0
  }));
  // сохраним обратно, чтобы дальше всё было ровно
  localStorage.setItem(LS_MENU, JSON.stringify(fixed));
  return fixed;
} catch {
  return [...DEFAULT_MENU];
}

}
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

function saveHistory(history) {
  localStorage.setItem(LS_HISTORY, JSON.stringify(history));
}

function fmtDT(ts) {
  const d = new Date(ts);
  return d.toLocaleString("ru-RU", { year:"2-digit", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
}

function renderHistory() {
  const el = document.getElementById("historyList");
  if (!el) return;

  if (!history.length) {
    el.innerHTML = `<div class="hint">Пока нет закрытых столов.</div>`;
    return;
  }

  // последние сверху
  const items = [...history].slice(-50).reverse(); // лимит отображения 50
  el.innerHTML = items.map(h => {
    const lines = (h.items || []).map(it =>
      `${escapeHtml(it.name)} — ${it.qty} шт • ${it.price} р`
    ).join("<br>");

    return `
      <div class="card" style="margin:8px 0; padding:10px;">
        <div style="display:flex; justify-content:space-between; gap:10px; font-weight:700;">
          <div>Стол ${h.table}</div>
          <div style="opacity:.8; font-weight:600;">${fmtDT(h.ts)}</div>
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

function saveMenu(menu) { localStorage.setItem(LS_MENU, JSON.stringify(menu)); }

function loadOrders() {
  const raw = localStorage.getItem(LS_ORDERS);
  if (!raw) {
    const init = {};
    for (let t=1; t<=10; t++) init[String(t)] = {}; // {menuId: qty}
    localStorage.setItem(LS_ORDERS, JSON.stringify(init));
    return init;
  }
  try { return JSON.parse(raw) } catch {
    const init = {};
    for (let t=1; t<=10; t++) init[String(t)] = {};
    return init;
  }
}
function saveOrders(orders) { localStorage.setItem(LS_ORDERS, JSON.stringify(orders)); }

let menu = loadMenu();
let orders = loadOrders();
let history = loadHistory();

let activeTable = Number(localStorage.getItem(LS_TABLE) || "1");
let activeCat = localStorage.getItem(LS_CAT) || "Все";
let searchText = "";

const elTabs = document.getElementById("tableTabs");
const elPills = document.getElementById("categoryPills");
const elMenu = document.getElementById("menuList");
const elOrder = document.getElementById("orderList");
const elTotals = document.getElementById("orderTotals");
const elTableNum = document.getElementById("tableNum");
const elToggleTables = document.getElementById("toggleTables");

const elSearch = document.getElementById("search");
const elClear = document.getElementById("clearTable");
const elClose = document.getElementById("closeTable");
const elClearHistory = document.getElementById("clearHistory");
const elStatus = document.getElementById("status");

const elNewName = document.getElementById("newName");
const elBulk = document.getElementById("bulkMenuText");
const elImport = document.getElementById("importMenu");
const elImportReplace = document.getElementById("importReplace");
const elNewCat = document.getElementById("newCat");
const elNewPrice = document.getElementById("newPrice");
const elAddItem = document.getElementById("addItem");
const elResetMenu = document.getElementById("resetMenu");
const elExportHistory = document.getElementById("exportHistory");

const elAdminList = document.getElementById("menuAdminList");
let hideTables = localStorage.getItem(LS_HIDE_TABLES) === "1";

function applyTablesVisibility() {
  if (hideTables) {
    elTabs.style.display = "none";
    elToggleTables.textContent = "Показать столы";
  } else {
    elTabs.style.display = "";
    elToggleTables.textContent = "Скрыть столы";
  }
}

function parsePriceFromLine(line) {
  // вытаскиваем последнюю группу цифр как цену (поддерживает "350", "350р", "350 ₽", "350руб")
  const m = line.match(/(\d+)\s*(?:р|р|руб)?\s*$/i);
  return m ? Number(m[1]) : null;
}

function cleanItemName(line) {
  // убираем цену в конце и разделители
  return line
    .replace(/[-–—:]+/g, " ")
    .replace(/(\d+)\s*(?:р|р|руб)?\s*$/i, "")
    .trim();
}

function parseMenuText(text) {
  const lines = String(text)
    .replace(/\r/g, "")
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let currentCategory = "Без категории";
  const items = [];

  for (const raw of lines) {
    // Категория: "Супы:" или "[Супы]" или "Супы"
    const catColon = raw.match(/^(.+):$/);
    const catBr = raw.match(/^\[(.+)\]$/);

    if (catColon) {
      currentCategory = catColon[1].trim() || currentCategory;
      continue;
    }
    if (catBr) {
      currentCategory = catBr[1].trim() || currentCategory;
      continue;
    }

    // Позиция
    const price = parsePriceFromLine(raw);
    const name = cleanItemName(raw);

    if (!name) continue;

    items.push({
      id: uuid(),
      name,
      category: currentCategory,
      price: price ?? 0
    });
  }

  return items;
}

function mergeMenuItems(newItems) {
  // чтобы не плодить дубли: считаем одинаковыми если совпали name+category
  const key = (x) => `${(x.category||"").toLowerCase()}||${(x.name||"").toLowerCase()}`;
  const existing = new Map(menu.map(m => [key(m), m]));

  for (const it of newItems) {
    const k = key(it);
    if (existing.has(k)) {
      // если уже есть — обновим цену, если новая не 0
      const old = existing.get(k);
      if ((it.price ?? 0) !== 0) old.price = it.price;
      // можно также обновлять category/name если надо — но обычно не надо
    } else {
      menu.push(it);
      existing.set(k, it);
    }
  }
}


function categories() {
  const set = new Set(menu.map(m => m.category).filter(Boolean));
  return ["Все", ...Array.from(set).sort((a,b)=>a.localeCompare(b,'ru'))];
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
      renderAll();
    };
    elTabs.appendChild(btn);
  }
}

function renderPills() {
  elPills.innerHTML = "";
  for (const c of categories()) {
    const p = document.createElement("div");
    p.className = "pill" + (c===activeCat ? " active" : "");
    p.textContent = c;
    p.onclick = () => {
      activeCat = c;
      localStorage.setItem(LS_CAT, activeCat);
      renderAll();
    };
    elPills.appendChild(p);
  }
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

function filteredMenu() {
  return menu
    .filter(m => m.name !== "—") // ⬅ скрываем пустышки
    .filter(m => activeCat === "Все" ? true : m.category === activeCat)
    .filter(m => !searchText ? true : m.name.toLowerCase().includes(searchText.toLowerCase()))
    .sort((a,b)=>a.name.localeCompare(b.name,'ru'));
}

function renderMenu() {
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
    left.innerHTML = `<div style="font-weight:700;">${escapeHtml(item.name)}</div>
                  <div class="meta">${escapeHtml(item.category || "")} • ${Number(item.price||0)} р</div>`;

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
    elOrder.innerHTML = `<div class="hint">Пока пусто. Добавляй блюда из меню слева.</div>`;
    elTotals.textContent = "";
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
    row.innerHTML = `
      <div>
        <div style="font-weight:700;">${escapeHtml(item.name)}</div>
        <div class="meta">
          ${escapeHtml(item.category || "")} • ${unit} р × ${qty} = ${line} р
        </div>
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
    <div style="
      margin-top:12px;
      padding-top:10px;
      border-top:1px solid #243244;
      font-size:15px;
      font-weight:700;
    ">
      ИТОГО:<br>
      Позиции — ${positions}<br>
      Всего блюд — ${totalQty}<br>
      Сумма — ${totalSum} р
    </div>
  `;
}

function renderAdmin() {
  elAdminList.innerHTML = "";
  const list = [...menu].sort((a,b)=>
    (a.category||"").localeCompare(b.category||"",'ru') || a.name.localeCompare(b.name,'ru')
  );
  for (const item of list) {
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
  <div>
    <div style="font-weight:700;">${escapeHtml(item.name)}</div>
    <div class="meta">${escapeHtml(item.category || "")} • ${Number(item.price || 0)} р</div>
  </div>
  <button class="danger small">Удалить</button>
`;
    row.querySelector("button").onclick = () => {
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

      // если категория пропала — сбросим на "Все"
      if (!categories().includes(activeCat)) activeCat = "Все";
      localStorage.setItem(LS_CAT, activeCat);

      renderAll();
    };
    elAdminList.appendChild(row);
  }
}

function renderStatus() {
  const online = navigator.onLine ? "онлайн" : "офлайн";
  elStatus.textContent = `Сейчас: ${online}`;
}

function renderAll() {
  renderStatus();
  renderTabs();
  renderPills();
  renderMenu();
  renderOrder();
  renderAdmin();
  renderHistory();
  applyTablesVisibility();
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
    return { name: item.name, qty, price };
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


elSearch.addEventListener("input", (e) => {
  searchText = e.target.value || "";
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
if (elToggleTables) {
  elToggleTables.onclick = () => {
    hideTables = !hideTables;
    localStorage.setItem(LS_HIDE_TABLES, hideTables ? "1" : "0");
    applyTablesVisibility();
  };
}
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
    const text = JSON.stringify(history, null, 2);

    // Вариант А: скопировать в буфер (самый простой)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => alert("История скопирована. Вставь в заметки/чат."))
        .catch(() => alert("Не удалось скопировать. Разреши доступ или используй экспорт файлом."));
      return;
    }

    // Вариант Б: скачать файлом (если буфер недоступен)
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `history-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
}

  if (!confirm(
    `Закрыть стол ${activeTable}?\n` +
    `Позиций: ${counts.positions}\n` +
    `Всего штук: ${counts.totalQty}`
  )) return;

  // === сохранить стол в историю ===
  const map = tableOrderMap(activeTable);
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
      price
    };
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
  renderHistory();
  // === конец истории ===

  orders[String(activeTable)] = {};
  saveOrders(orders);
  renderAll();
};



elAddItem.onclick = () => {
  const name = (elNewName.value || "").trim();
  const cat = (elNewCat.value || "").trim();
  const price = Number((elNewPrice.value || "").trim());

  if (!name) return alert("Введите название блюда");
  if (!cat) return alert("Введите категорию");
  if (!Number.isFinite(price) || price < 0) return alert("Введите корректную цену (например 350)");

  menu.push({ id: uuid(), name, category: cat, price });
  saveMenu(menu);

  elNewName.value = "";
  elNewCat.value = "";
  elNewPrice.value = "";

  renderAll();
};
elImport.onclick = () => {
  const text = (elBulk.value || "").trim();
  if (!text) return alert("Вставь текст меню");

  const newItems = parseMenuText(text);
  if (newItems.length === 0) return alert("Не нашёл блюд в тексте. Проверь формат.");

  mergeMenuItems(newItems);
  saveMenu(menu);

  elBulk.value = "";
  renderAll();
  alert(`Импортировано: ${newItems.length} строк(и).`);
};

elImportReplace.onclick = () => {
  const text = (elBulk.value || "").trim();
  if (!text) return alert("Вставь текст меню");

  const newItems = parseMenuText(text);
  if (newItems.length === 0) return alert("Не нашёл блюд в тексте. Проверь формат.");

  if (!confirm("Заменить текущее меню на импортированное?")) return;

  menu = newItems;
  saveMenu(menu);

  // очистим заказы, чтобы не было ссылок на старые id
  const init = {};
  for (let t=1; t<=10; t++) init[String(t)] = {};
  orders = init;
  saveOrders(orders);

  elBulk.value = "";
  activeCat = "Все";
  localStorage.setItem(LS_CAT, activeCat);

  renderAll();
  alert(`Новое меню: ${newItems.length} блюд.`);
};



elResetMenu.onclick = () => {
  if (!confirm("Сбросить меню на стандартное?")) return;
  menu = [...DEFAULT_MENU].map(x => ({...x, id: uuid()}));
  saveMenu(menu);

  // заказы очистим, чтобы не было ссылок на старые id
  const init = {};
  for (let t=1; t<=10; t++) init[String(t)] = {};
  orders = init;
  saveOrders(orders);

  activeCat = "Все";
  localStorage.setItem(LS_CAT, activeCat);

  renderAll();
};

// PWA: регистрируем Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  });
}

window.addEventListener("online", renderStatus);
window.addEventListener("offline", renderStatus);

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
if (elClearHistory) {
  elClearHistory.onclick = () => {
    if (!confirm("Очистить всю историю закрытий?")) return;

    history = [];
    localStorage.removeItem("waiter_history_v1"); // 💥 ГАРАНТИРОВАННО очищает
    renderHistory();

    alert("История очищена");
  };
} else {
  console.log("❌ Кнопка clearHistory не найдена");
}
renderAll();




