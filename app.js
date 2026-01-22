console.log("APP.JS LOADED");

/***********************
 * НАСТРОЙКИ
 ***********************/
const TABLES_COUNT = 10;
const STORAGE_KEY = 'waiter_pwa_state_v1';

/***********************
 * СОСТОЯНИЕ
 ***********************/
let state = {
  table: 1,
  orders: {},        // { tableNum: { itemId: qty } }
  history: [],
  menu: [],
  category: '',
  subCategory: '',
  search: ''
};

/***********************
 * УТИЛИТЫ
 ***********************/
const $ = id => document.getElementById(id);

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadState() {
  const s = localStorage.getItem(STORAGE_KEY);
  if (s) Object.assign(state, JSON.parse(s));
}

/***********************
 * ПАРСЕР МЕНЮ
 ***********************/
function parseMenu(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];

  let cat = '';
  let sub = '';

  for (let line of lines) {
    // Категория
    if (line.endsWith(':') && !line.startsWith('[')) {
      cat = line.replace(':','');
      sub = '';
      continue;
    }

    // Подкатегория
    if (line.startsWith('[') && line.endsWith(']')) {
      sub = line.slice(1,-1);
      continue;
    }

    // Блюдо
    const [left, desc] = line.split('|').map(s=>s?.trim());
    const parts = left.split(' ');
    const price = parseInt(parts.find(p => /^\d+$/.test(p)));
    const weight = parts.find(p => /(г|мл|л)$/i.test(p)) || '';
    const name = left
      .replace(price,'')
      .replace(weight,'')
      .trim();

    if (!name || !price) continue;

    items.push({
      id: items.length + 1,
      name,
      price,
      weight,
      desc: desc || '',
      category: cat,
      subCategory: sub
    });
  }

  return items;
}

/***********************
 * ДАННЫЕ МЕНЮ (ТВОЙ ТЕКСТ)
 ***********************/
const MENU_TEXT = `
${`ТУТ БУДЕТ ТВОЙ БОЛЬШОЙ ТЕКСТ МЕНЮ, КОТОРЫЙ ТЫ УЖЕ ПРИСЛАЛ`}
`;

/***********************
 * РЕНДЕР
 ***********************/
function renderTables() {
  const wrap = $('tableTabs');
  wrap.innerHTML = '';
  for (let i=1;i<=TABLES_COUNT;i++){
    const b = document.createElement('button');
    b.className = 'tab' + (state.table===i?' active':'');
    b.textContent = i;
    b.onclick = () => {
      state.table = i;
      saveState();
      renderAll();
    };
    wrap.appendChild(b);
  }
}

function renderCategories() {
  const cats = [...new Set(state.menu.map(i=>i.category))];
  const wrap = $('categoryPills');
  wrap.innerHTML = '';
  cats.forEach(c=>{
    const b = document.createElement('div');
    b.className = 'pill'+(state.category===c?' active':'');
    b.textContent = c;
    b.onclick = ()=>{
      state.category = c;
      state.subCategory = '';
      renderAll();
    };
    wrap.appendChild(b);
  });
}

function renderSubCategories() {
  const subs = [...new Set(
    state.menu.filter(i=>i.category===state.category && i.subCategory)
      .map(i=>i.subCategory)
  )];
  const wrap = $('subCategoryPills');
  wrap.innerHTML = '';
  subs.forEach(s=>{
    const b = document.createElement('div');
    b.className = 'pill'+(state.subCategory===s?' active':'');
    b.textContent = s;
    b.onclick = ()=>{
      state.subCategory = s;
      renderAll();
    };
    wrap.appendChild(b);
  });
}

function renderMenu() {
  const wrap = $('menuList');
  wrap.innerHTML = '';

  let list = state.menu;

  if (state.category)
    list = list.filter(i=>i.category===state.category);
  if (state.subCategory)
    list = list.filter(i=>i.subCategory===state.subCategory);
  if (state.search)
    list = list.filter(i=>i.name.toLowerCase().includes(state.search));

  list.forEach(i=>{
    const row = document.createElement('div');
    row.className = 'item';

    const left = document.createElement('div');
    left.innerHTML = `
      <div><b>${i.name}</b> — ${i.price} р</div>
      ${i.weight?`<div class="meta">${i.weight}</div>`:''}
      ${i.desc?`<div class="desc">${i.desc}</div>`:''}
    `;

    const step = document.createElement('div');
    step.className = 'stepper';
    const qty = state.orders[state.table]?.[i.id] || 0;

    const minus = document.createElement('button');
    minus.textContent = '–';
    minus.onclick = ()=>{
      if (!state.orders[state.table]) state.orders[state.table]={};
      state.orders[state.table][i.id] = Math.max(0, qty-1);
      saveState(); renderAll();
    };

    const plus = document.createElement('button');
    plus.textContent = '+';
    plus.onclick = ()=>{
      if (!state.orders[state.table]) state.orders[state.table]={};
      state.orders[state.table][i.id] = qty+1;
      saveState(); renderAll();
    };

    const q = document.createElement('div');
    q.className='qty';
    q.textContent = qty;

    step.append(minus,q,plus);
    row.append(left,step);
    wrap.appendChild(row);
  });
}

function renderOrder() {
  $('tableNum').textContent = state.table;
  const wrap = $('orderList');
  wrap.innerHTML = '';
  const order = state.orders[state.table]||{};
  let sum = 0;

  Object.entries(order).forEach(([id,qty])=>{
    if (qty<=0) return;
    const item = state.menu.find(i=>i.id==id);
    sum += item.price*qty;
    const d = document.createElement('div');
    d.className='item';
    d.innerHTML = `<b>${item.name}</b> × ${qty} — ${item.price*qty} р`;
    wrap.appendChild(d);
  });

  $('orderTotals').textContent = sum?`Итого: ${sum} р`:'';
}

function renderAll(){
  renderTables();
  renderCategories();
  renderSubCategories();
  renderMenu();
  renderOrder();
}

/***********************
 * СОБЫТИЯ
 ***********************/
$('search').oninput = e=>{
  state.search = e.target.value.toLowerCase();
  renderMenu();
};

$('clearTable').onclick = ()=>{
  state.orders[state.table]={};
  saveState(); renderAll();
};

$('closeTable').onclick = ()=>{
  state.history.push({
    table: state.table,
    order: state.orders[state.table],
    time: new Date().toLocaleString()
  });
  state.orders[state.table]={};
  saveState(); renderAll();
};

/***********************
 * СТАРТ
 ***********************/
loadState();
state.menu = parseMenu(MENU_TEXT);
if (!state.category && state.menu.length)
  state.category = state.menu[0].category;

renderAll();
