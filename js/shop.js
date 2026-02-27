import { ensureCatalog, loadProducts, saveCart, loadCart, cartCount } from "./storage.js";

function moneyBRL(v){ return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }

function updateCartCount(){
  const total = cartCount();
  document.querySelectorAll(".cartcount").forEach(el=> el.textContent = String(total));
}

function addToCart(id, qty=1){
  const cart = loadCart();
  const item = cart.find(i => Number(i.id) === Number(id));
  if(item) item.qty += qty;
  else cart.push({ id:Number(id), qty:Number(qty) });

  saveCart(cart);
  updateCartCount();
}

function sortList(list, mode){
  const arr = [...list];
  if(mode === "low") arr.sort((a,b)=> Number(a.price||0) - Number(b.price||0));
  else if(mode === "high") arr.sort((a,b)=> Number(b.price||0) - Number(a.price||0));
  else arr.sort((a,b)=> (Number(b.soldScore||0) - Number(a.soldScore||0)));
  return arr;
}

function filterByCategory(list){
  const cat = document.body?.dataset?.category;
  if(!cat) return list;
  return list.filter(p => p.category === cat);
}

function renderGrid(){
  const grid = document.getElementById("shopGrid");
  if(!grid) return;

  const resultCount = document.getElementById("resultCount");
  const sortSelect = document.getElementById("sortSelect");

  const all = loadProducts();
  const filtered = filterByCategory(all);

  const mode = sortSelect?.value || "best";
  const list = sortList(filtered, mode);

  if(resultCount) resultCount.textContent = `${list.length} item(s)`;

  if(list.length === 0){
    grid.innerHTML = `
      <div class="panel" style="grid-column:1/-1;">
        <h3 style="margin:0 0 8px;">Sem produtos cadastrados</h3>
        <p class="small">Abra <b>admin.html</b> para cadastrar produtos, estoque e fotos. Depois eles aparecem aqui automaticamente.</p>
        <div style="height:10px"></div>
        <a class="btn" href="admin.html">Abrir Admin</a>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map(p => {
    const img = (p.images && p.images.length) ? p.images[0] : p.image;
    const stock = Number(p.stock||0);
    const badge = stock > 0 ? `${stock} em estoque` : "Esgotado";
    return `
      <article class="card">
        <a class="card__img" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="Ver ${p.name}">
          <img src="${img}" alt="${p.name}" loading="lazy" />
          <span class="badge">${badge}</span>
        </a>
        <div class="card__body">
          <h3 class="card__title">${p.name}</h3>
          <div class="price"><span class="now">${moneyBRL(p.price)}</span></div>
          <div class="meta">${(p.category||"").toUpperCase()}</div>
          <button class="btn btn--card" type="button" data-buy="${p.id}" ${stock<=0 ? "disabled" : ""}>
            ${stock<=0 ? "INDISPONÍVEL" : "ADICIONAR AO CARRINHO"}
          </button>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll("[data-buy]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-buy");
      addToCart(id, 1);
      btn.textContent = "ADICIONADO ✓";
      setTimeout(()=> btn.textContent = "ADICIONAR AO CARRINHO", 900);
    });
  });
}

function initSearch(){
  const input = document.getElementById("searchInput");
  if(!input) return;
  input.addEventListener("input", ()=>{
    const q = (input.value||"").trim().toLowerCase();
    const grid = document.getElementById("shopGrid");
    if(!grid) return;
    grid.querySelectorAll(".card").forEach(card=>{
      const title = (card.querySelector(".card__title")?.textContent||"").toLowerCase();
      card.style.display = title.includes(q) ? "" : "none";
    });
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  ensureCatalog();
  updateCartCount();
  renderGrid();
  initSearch();

  const sortSelect = document.getElementById("sortSelect");
  sortSelect?.addEventListener("change", renderGrid);
});
