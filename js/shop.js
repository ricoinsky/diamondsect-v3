import { getProducts, moneyBRL, addToCart, updateCartCount } from "./store.js";

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }

function getCategoryFromPage(){
  // suporta data-category no body
  const c = document.body?.dataset?.category;
  return c ? String(c) : "all";
}

function getSearchTerm(){
  const v = qs("#searchInput")?.value || "";
  return v.trim().toLowerCase();
}

function getSort(){
  return qs("#sortSelect")?.value || "best";
}

function normalizeProducts(list){
  // garante formato
  return (list || []).map((p, idx)=>({
    id: Number(p.id ?? (idx+1)),
    name: String(p.name || "Produto"),
    price: Number(p.price || 0),
    category: String(p.category || "outros"),
    subcat: p.subcat ? String(p.subcat) : "",
    stock: Number.isFinite(Number(p.stock)) ? Number(p.stock) : 0,
    soldScore: Number(p.soldScore || 0),
    image: String(p.image || p.images?.[0] || "https://images.unsplash.com/photo-1520975682071-aacbc3f4a78a?auto=format&fit=crop&w=1200&q=70"),
    images: Array.isArray(p.images) ? p.images.map(String) : (p.image ? [String(p.image)] : []),
    description: String(p.description || "")
  }));
}

function filterProducts(all){
  const category = getCategoryFromPage();
  const term = getSearchTerm();
  const hash = (location.hash || "").replace("#","").trim().toLowerCase();

  let out = normalizeProducts(all);

  if(category && category !== "all"){
    out = out.filter(p => p.category === category);
  }

  // subcat via hash (ex: #relogios)
  if(category === "joias" && hash){
    out = out.filter(p => (p.subcat || "").toLowerCase() === hash);
    // marca filtro ativo
    qsa("[data-subcat]").forEach(b=>{
      b.classList.toggle("is-active", (b.getAttribute("data-subcat")||"").toLowerCase() === hash);
    });
  }

  if(term){
    out = out.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.description||"").toLowerCase().includes(term)
    );
  }

  // remove produtos sem estoque? NÃO. Mostrar, mas com badge.
  return out;
}

function sortProducts(list){
  const s = getSort();
  const out = [...list];
  if(s === "low") out.sort((a,b)=> a.price - b.price);
  else if(s === "high") out.sort((a,b)=> b.price - a.price);
  else out.sort((a,b)=> (b.soldScore||0) - (a.soldScore||0) || a.price - b.price);
  return out;
}

function productCard(p){
  const isOut = Number(p.stock||0) <= 0;
  const badge = isOut ? "Sem estoque" : (p.stock <= 3 ? `Últimas ${p.stock}` : "Premium");
  const badgeHtml = `<span class="badge">${badge}</span>`;

  return `
    <article class="card">
      <a class="card__img" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="Ver ${p.name}">
        ${badgeHtml}
        <img src="${p.image}" alt="${p.name}">
      </a>

      <div class="card__body">
        <h3 class="card__title">${p.name}</h3>

        <div class="price">
          <span class="now">${moneyBRL(p.price)}</span>
        </div>

        <div class="meta">${isOut ? "Indisponível no momento" : `Estoque: ${p.stock}`}</div>

        <button class="btn btn--card" type="button" data-add="${p.id}" ${isOut ? "disabled" : ""}>
          ${isOut ? "Indisponível" : "Adicionar ao carrinho"}
        </button>
      </div>
    </article>
  `;
}

function render(){
  const grid = qs("#shopGrid") || qs("#products") || qs("#product-list");
  if(!grid) return;

  const all = getProducts();
  const filtered = sortProducts(filterProducts(all));

  // expõe pro cart.js (compat)
  window.PRODUCTS = normalizeProducts(all);

  const countEl = qs("#resultCount");
  if(countEl) countEl.textContent = `${filtered.length} item(s)`;

  if(!filtered.length){
    grid.innerHTML = `
      <div class="empty" style="grid-column:1 / -1">
        <h2 style="font-size:18px;letter-spacing:.08em;text-transform:uppercase">Catálogo vazio</h2>
        <p>Você ainda não cadastrou produtos. Entre no <b>Admin</b> para adicionar, ou faça isso depois. O design já está pronto.</p>
        <div style="height:12px"></div>
        <a class="btn" href="admin.html">Abrir Admin</a>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(productCard).join("");

  qsa("[data-add]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-add");
      const res = addToCart(id, 1);
      alert(res.message);
    });
  });
}

export function initShop(){
  updateCartCount();

  const search = qs("#searchInput");
  const sort = qs("#sortSelect");
  search?.addEventListener("input", render);
  sort?.addEventListener("change", render);

  // filtros joias
  qsa("[data-subcat]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const sc = (b.getAttribute("data-subcat")||"").toLowerCase();
      if(sc) location.hash = sc;
      else location.hash = "";
      render();
    });
  });

  window.addEventListener("hashchange", render);
  render();
}
