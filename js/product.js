import { getProductById, loadProducts, loadCart, saveCart, cartCount } from "./storage.js";

function moneyBRL(v){ return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }

function updateCartCount(){
  document.querySelectorAll(".cartcount").forEach(el=> el.textContent = String(cartCount()));
}

function qs(sel){ return document.querySelector(sel); }

function getId(){
  const u = new URL(location.href);
  return u.searchParams.get("id");
}

function setActiveThumb(i){
  document.querySelectorAll(".thumb").forEach((t,idx)=> t.classList.toggle("is-active", idx===i));
}

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function addToCartWithStock(product, qty){
  // trava para não passar do estoque somando ao que já está no carrinho
  const cart = loadCart();
  const item = cart.find(i => Number(i.id) === Number(product.id));
  const inCart = item ? Number(item.qty||0) : 0;
  const max = Number(product.stock||0);

  const allowed = clamp(qty, 1, Math.max(0, max - inCart));
  if(allowed <= 0) return { ok:false, msg:"Sem estoque disponível" };

  if(item) item.qty += allowed;
  else cart.push({ id:Number(product.id), qty:allowed });

  saveCart(cart);
  updateCartCount();
  return { ok:true, added: allowed, remaining: max - (inCart + allowed) };
}

function renderNotFound(){
  const root = qs("#pdpRoot");
  if(!root) return;
  root.innerHTML = `
    <div class="panel">
      <h2 style="margin:0 0 8px;">Produto não encontrado</h2>
      <p class="small">Verifique o link ou cadastre produtos em <b>admin.html</b>.</p>
      <div style="height:10px"></div>
      <a class="btn" href="index.html">Voltar</a>
      <span style="display:inline-block;width:10px"></span>
      <a class="btn" href="admin.html">Abrir Admin</a>
    </div>
  `;
}

function render(){
  updateCartCount();

  const id = getId();
  const product = getProductById(id);

  if(!product){ renderNotFound(); return; }

  const images = (product.images && product.images.length) ? product.images : (product.image ? [product.image] : []);
  const mainImg = qs("#mainImg");
  const thumbs = qs("#thumbs");
  const nameEl = qs("#pName");
  const priceEl = qs("#pPrice");
  const skuEl = qs("#pSku");
  const descEl = qs("#pDesc");
  const stockEl = qs("#pStock");

  if(nameEl) nameEl.textContent = product.name || "Produto";
  if(priceEl) priceEl.textContent = moneyBRL(product.price);
  if(skuEl) skuEl.textContent = `SKU: ${product.id}`;
  if(descEl) descEl.textContent = product.description || "Descrição premium será adicionada depois.";
  if(stockEl) stockEl.textContent = String(Number(product.stock||0));

  let active = 0;
  function show(i){
    active = clamp(i, 0, Math.max(0, images.length-1));
    if(mainImg) mainImg.src = images[active] || "";
    setActiveThumb(active);
  }

  if(thumbs){
    thumbs.innerHTML = images.map((src,i)=> `
      <div class="thumb ${i===0?"is-active":""}" role="button" tabindex="0" aria-label="Ver foto ${i+1}">
        <img src="${src}" alt="${product.name} foto ${i+1}" loading="lazy">
      </div>
    `).join("");

    thumbs.querySelectorAll(".thumb").forEach((t,i)=>{
      t.addEventListener("click", ()=> show(i));
      t.addEventListener("keydown", (e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); show(i);} });
    });
  }
  show(0);

  // qty selector
  const minus = qs("#qtyMinus");
  const plus = qs("#qtyPlus");
  const qtyVal = qs("#qtyVal");
  const btn = qs("#addBtn");
  const pill = qs("#pPill");

  let qty = 1;
  const stock = Number(product.stock||0);
  const setQty = (v)=>{
    qty = clamp(v, 1, Math.max(1, stock));
    if(qtyVal) qtyVal.textContent = String(qty);
  };
  setQty(1);

  minus?.addEventListener("click", ()=> setQty(qty-1));
  plus?.addEventListener("click", ()=> setQty(qty+1));

  if(btn){
    btn.disabled = stock <= 0;
    btn.addEventListener("click", ()=>{
      const r = addToCartWithStock(product, qty);
      if(!pill) return;
      pill.style.display="inline-flex";
      if(r.ok){
        pill.textContent = `✓ Adicionado (${r.added})`;
      }else{
        pill.textContent = `✕ ${r.msg}`;
      }
      setTimeout(()=> pill.style.display="none", 1600);
    });
  }
}

document.addEventListener("DOMContentLoaded", render);
