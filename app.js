function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2);
}

/* ===== STORAGE ===== */
const LS_MENU = "menu_v3";
const LS_ORDERS = "orders_v3";
const LS_TABLE = "table_v3";
const LS_CAT = "cat_v3";
const LS_SUB = "sub_v3";
const LS_HISTORY = "history_v3";
const LS_TABLES_OPEN = "tables_open_v3";

/* ===== МЕНЮ (ПОЛЯНА) ===== */
const MENU = [
  // ===== САЛАТЫ =====
  { id:uuid(), category:"Поляна", subcat:"Салаты", name:"Салат с креветками", price:28, grams:"250г", desc:"Креветки, свежие овощи, фирменный соус" },
  { id:uuid(), category:"Поляна", subcat:"Салаты", name:"Салат с лососем", price:26, grams:"250г", desc:"Лосось, свежие овощи, фирменный соус" },
  { id:uuid(), category:"Поляна", subcat:"Салаты", name:"Салат с тунцом", price:26, grams:"250г", desc:"Тунец, свежие овощи, фирменный соус" },
  { id:uuid(), category:"Поляна", subcat:"Салаты", name:"Салат с цыпленком", price:24, grams:"250г", desc:"Куриное филе, свежие овощи, фирменный соус" },

  // ===== КРУАССАНЫ =====
  { id:uuid(), category:"Поляна", subcat:"Круассаны", name:"Круассан классический", price:6, grams:"", desc:"" },
  { id:uuid(), category:"Поляна", subcat:"Круассаны", name:"Круассан глазунья", price:19, grams:"", desc:"Яйцо, фирменный соус, зелень, сыр, маринованные огурцы, копченая говядина" },
  { id:uuid(), category:"Поляна", subcat:"Круассаны", name:"Эль круассан", price:19, grams:"", desc:"Фирменный соус, грибы, сыр, копченая говядина, помидор" },
  { id:uuid(), category:"Поляна", subcat:"Круассаны", name:"Гурме круассан", price:19, grams:"", desc:"Фарш из говядины, фирменный соус, маринованные огурцы, петрушка" },
  { id:uuid(), category:"Поляна", subcat:"Круассаны", name:"Круассан биф", price:19, grams:"", desc:"Фарш из говядины, фирменный соус, грибы, маринованные огурцы, сыр" },
  { id:uuid(), category:"Поляна", subcat:"Круассаны", name:"Круассан пикантe", price:19, grams:"", desc:"Курица гриль, маринованные огурцы, фирменный соус, зелень" },
  { id:uuid(), category:"Поляна", subcat:"Круассаны", name:"Круассан с лососем", price:19, grams:"", desc:"Лосось слабосоленый, огурцы, крем чиз, болгарский перец, зелень" },
  { id:uuid(), category:"Поляна", subcat:"Круассаны", name:"Круассан с креветкой", price:24, grams:"", desc:"Креветки, огурцы, крем чиз, болгарский перец, зелень" },
  { id:uuid(), category:"Поляна", subcat:"Круассаны", name:"Круассан с тунцом", price:22, grams:"", desc:"Тунец, помидор, болгарский перец, фирменный соус, зелень" },
  { id:uuid(), category:"Поляна", subcat:"Круассаны", name:"Миндальный круассан", price:19, grams:"", desc:"Миндальный крем, миндальные лепестки" },
  { id:uuid(), category:"Поляна", subcat:"Круассаны", name:"Шоколадный Париж", price:19, grams:"", desc:"Слоёное тесто с шоколадной пастой" },
  { id:uuid(), category:"Поляна", subcat:"Круассаны", name:"Лавандовая любовь", price:19, grams:"", desc:"Лавандовый крем, орех, ванильное мороженое" },
  { id:uuid(), category:"Поляна", subcat:"Круассаны", name:"Ягода малина", price:19, grams:"", desc:"Нежный крем, малина" },
  { id:uuid(), category:"Поляна", subcat:"Круассаны", name:"Круассан фисташка", price:19, grams:"", desc:"Фисташковый крем" },

  // ===== ДЕСЕРТЫ =====
  { id:uuid(), category:"Десерты", subcat:"", name:"Айс бэнг", price:11, grams:"150г", desc:"Ванильное мороженое, апельсин, банан, джус-боллы, мята" },
  { id:uuid(), category:"Десерты", subcat:"", name:"Торт Медовик", price:11, grams:"141г", desc:"Классический медовый торт" },
  { id:uuid(), category:"Десерты", subcat:"", name:"Чизкейк Нью-Йорк", price:11, grams:"110г", desc:"Классический чизкейк" },
  { id:uuid(), category:"Десерты", subcat:"", name:"Торт Захер", price:11, grams:"112г", desc:"Шоколадный торт с абрикосовой ноткой" },
  { id:uuid(), category:"Десерты", subcat:"", name:"Ванильное мороженое", price:9, grams:"120г", desc:"Вафельные трубочки, вишня, шоколадный или карамельный топпинг" },

  // ===== БУТЫЛОЧКА С СОБОЙ =====
  { id:uuid(), category:"Бутылочка с собой", subcat:"", name:"Вино красное сухое", price:35, grams:"750мл", desc:"" },
  { id:uuid(), category:"Бутылочка с собой", subcat:"", name:"Вино белое сухое", price:35, grams:"750мл", desc:"" },
  { id:uuid(), category:"Бутылочка с собой", subcat:"", name:"Просекко", price:38, grams:"750мл", desc:"" },
  { id:uuid(), category:"Бутылочка с собой", subcat:"", name:"Виски Джек Дэниелс", price:120, grams:"1000мл", desc:"" },
  { id:uuid(), category:"Бутылочка с собой", subcat:"", name:"Водка Финляндия", price:70, grams:"1000мл", desc:"" },
  { id:uuid(), category:"Бутылочка с собой", subcat:"", name:"Ром Бакарди", price:85, grams:"1000мл", desc:"" },
  { id:uuid(), category:"Бутылочка с собой", subcat:"", name:"Джин Бифитер", price:90, grams:"1000мл", desc:"" }
];

/* ===== INIT ===== */
let menu = JSON.parse(localStorage.getItem(LS_MENU)) || MENU;
let orders = JSON.parse(localStorage.getItem(LS_ORDERS)) || (() => {
  const o={}; for(let i=1;i<=10;i++) o[i]={}; return o;
})();
let history = JSON.parse(localStorage.getItem(LS_HISTORY)) || [];

let activeTable = Number(localStorage.getItem(LS_TABLE) || 1);
let activeCat = localStorage.getItem(LS_CAT) || "Все";
let activeSub = localStorage.getItem(LS_SUB) || "Все";

/* ===== DOM ===== */
const $ = id => document.getElementById(id);
const elTabs = $("tableTabs");
const elMenu = $("menuList");
const elOrder = $("orderList");
const elTotals = $("orderTotals");
const elTableNum = $("tableNum");
const elCat = $("categoryPills");
const elSub = $("subCategoryPills");

/* ===== RENDER ===== */
function render() {
  renderTabs();
  renderCats();
  renderSubs();
  renderMenu();
  renderOrder();
}

function renderTabs(){
  elTabs.innerHTML="";
  for(let t=1;t<=10;t++){
    const b=document.createElement("div");
    b.className="tab"+(t===activeTable?" active":"");
    b.textContent="Стол "+t;
    b.onclick=()=>{activeTable=t; localStorage.setItem(LS_TABLE,t); render();};
    elTabs.appendChild(b);
  }
}

function renderCats(){
  const cats=["Все",...new Set(menu.map(m=>m.category))];
  elCat.innerHTML="";
  cats.forEach(c=>{
    const p=document.createElement("div");
    p.className="pill"+(c===activeCat?" active":"");
    p.textContent=c;
    p.onclick=()=>{activeCat=c; activeSub="Все"; render();};
    elCat.appendChild(p);
  });
}

function renderSubs(){
  if(activeCat==="Все"){ elSub.innerHTML=""; return; }
  const subs=["Все",...new Set(menu.filter(m=>m.category===activeCat).map(m=>m.subcat).filter(Boolean))];
  elSub.innerHTML="";
  subs.forEach(s=>{
    const p=document.createElement("div");
    p.className="pill"+(s===activeSub?" active":"");
    p.textContent=s;
    p.onclick=()=>{activeSub=s; render();};
    elSub.appendChild(p);
  });
}

function renderMenu(){
  elMenu.innerHTML="";
  menu
    .filter(m=>activeCat==="Все"||m.category===activeCat)
    .filter(m=>activeSub==="Все"||m.subcat===activeSub)
    .forEach(m=>{
      const q=orders[activeTable][m.id]||0;
      elMenu.innerHTML+=`
      <div class="item">
        <div>
          <b>${m.name}</b>
          <div class="meta">${m.grams} • ${m.price} р</div>
          ${m.desc?`<div class="desc">${m.desc}</div>`:""}
        </div>
        <div class="stepper">
          <button onclick="chg('${m.id}',-1)">−</button>
          <div class="qty">${q}</div>
          <button onclick="chg('${m.id}',1)">+</button>
        </div>
      </div>`;
    });
}

function renderOrder(){
  elOrder.innerHTML="";
  let sum=0;
  Object.entries(orders[activeTable]).forEach(([id,q])=>{
    const m=menu.find(x=>x.id===id);
    if(!m) return;
    sum+=m.price*q;
    elOrder.innerHTML+=`<div class="item"><div>${m.name} × ${q}</div><div>${m.price*q} р</div></div>`;
  });
  elTotals.textContent=sum?`Итого: ${sum} р`:"";
}

window.chg=(id,d)=>{
  orders[activeTable][id]=(orders[activeTable][id]||0)+d;
  if(orders[activeTable][id]<=0) delete orders[activeTable][id];
  localStorage.setItem(LS_ORDERS,JSON.stringify(orders));
  render();
};

/* ===== START ===== */
localStorage.setItem(LS_MENU,JSON.stringify(menu));
render();