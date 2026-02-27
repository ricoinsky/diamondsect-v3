import { loadCart, saveCart, cartCount, loadProducts } from "./storage.js";

function moneyBRL(v){ return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }

const LS_COUPON = "diamondsect_coupon_v1";
const LS_SHIP = "diamondsect_ship_v1";

function updateCartCount(){
  document.querySelectorAll(".cartcount").forEach(el => el.textContent = String(cartCount()));
}

function findProduct(id){
  return (loadProducts() || []).find(p => Number(p.id) === Number(id)) || null;
}

function getCoupon(){
  try { return JSON.parse(localStorage.getItem(LS_COUPON)) || null; } catch { return null; }
}
function setCoupon(c){ localStorage.setItem(LS_COUPON, JSON.stringify(c)); }

function getShip(){
  try { return JSON.parse(localStorage.getItem(LS_SHIP)) || null; } catch { return null; }
}
function setShip(s){ localStorage.setItem(LS_SHIP, JSON.stringify(s)); }

function calcCouponDiscount(subtotal, coupon){
  if(!coupon) return 0;
  if(coupon.code === "DIAMOND10") return Math.round(subtotal * 0.10);
  if(coupon.code === "DIAMOND15") return Math.round(subtotal * 0.15);
  if(coupon.code === "VIP200") return 200;
  return 0;
}

function estimateShipping(subtotalAfterDiscount, ship){
  if(!ship) return 0;
  if(subtotalAfterDiscount >= 1500) return 0;
  return ship.value;
}

function setStatus(text){
  const pill = document.getElementById("statusPill");
  if(!pill) return;
  pill.style.display = "inline-flex";
  pill.textContent = `✓ ${text}`;
  setTimeout(()=>{ pill.style.display = "none"; }, 2200);
}

function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

function updateQty(id, delta){
  const cart = loadCart();
  const item = cart.find(i => Number(i.id) === Number(id));
  if(!item) return;

  const p = findProduct(id);
  const stock = Number(p?.stock||0);

  const nextQty = item.qty + delta;

  if(nextQty <= 0){
    saveCart(cart.filter(i => Number(i.id) !== Number(id)));
    renderCart();
    return;
  }

  // trava no estoque
  const finalQty = clamp(nextQty, 1, Math.max(0, stock));
  if(stock > 0 && finalQty !== nextQty){
    setStatus("Limite do estoque atingido");
  }
  item.qty = finalQty;

  // se stock for 0, não deixa ficar no carrinho
  if(stock <= 0){
    saveCart(cart.filter(i => Number(i.id) !== Number(id)));
    setStatus("Produto sem estoque removido");
  } else {
    saveCart(cart);
  }
  renderCart();
}

function removeItem(id){
  saveCart(loadCart().filter(i => Number(i.id) !== Number(id)));
  renderCart();
}

// mobile bar visibility
function initMobileBarVisibility(){
  const bar = document.querySelector(".mobile-bar");
  if(!bar) return;
  const summary = document.querySelector(".summary");

  function update(){
    const cart = loadCart();
    const hasItems = cart.reduce((s,i)=> s + Number(i.qty||0), 0) > 0;

    if(!hasItems){ bar.classList.remove("is-visible"); return; }

    if(!summary){ bar.classList.remove("is-visible"); return; }

    const rect = summary.getBoundingClientRect();
    const summaryVisible = rect.top < window.innerHeight && rect.bottom > 0;

    const y = window.scrollY || 0;
    if(y > 220 && !summaryVisible) bar.classList.add("is-visible");
    else bar.classList.remove("is-visible");
  }

  update();
  window.addEventListener("scroll", update, { passive:true });
  window.addEventListener("resize", update);
}

function renderReco(){
  const grid = document.getElementById("recoGrid");
  if(!grid) return;

  const cartIds = new Set(loadCart().map(i => Number(i.id)));
  const all = (loadProducts() || []).filter(p => !cartIds.has(Number(p.id)) && Number(p.stock||0) > 0);

  const sorted = [...all].sort((a,b)=> (b.soldScore||0) - (a.soldScore||0));
  const pick = sorted.slice(0,6);

  if(pick.length === 0){
    grid.innerHTML = `<div class="small">Cadastre produtos em <b>admin.html</b> para aparecer recomendados.</div>`;
    return;
  }

  grid.innerHTML = pick.map(p => `
    <div class="reco-card" style="border:1px solid rgba(255,255,255,.10);border-radius:16px;overflow:hidden;background:rgba(255,255,255,.03)">
      <img src="${(p.images&&p.images[0])||p.image}" alt="${p.name}" style="width:100%;height:110px;object-fit:cover;display:block">
      <div class="b" style="padding:10px">
        <p class="n" style="font-size:13px;margin:0 0 6px">${p.name}</p>
        <p class="p" style="font-weight:900;font-size:13px;margin:0 0 10px">${moneyBRL(p.price)}</p>
        <button type="button" data-reco="${p.id}" style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;cursor:pointer">Adicionar</button>
      </div>
    </div>
  `).join("");

  grid.querySelectorAll("[data-reco]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-reco");
      updateQty(id, +1); // reutiliza regra de estoque
      setStatus("Adicionado ao carrinho");
    });
  });
}

function renderCart(){
  updateCartCount();

  const cartList = document.getElementById("cartList");
  const totalEl = document.getElementById("cartTotal");
  const mobileTotal = document.getElementById("mobileTotal");
  const itemsEl = document.getElementById("itemsCount");
  const subEl = document.getElementById("subTotal");
  const discEl = document.getElementById("discountVal");
  const shipEl = document.getElementById("shippingVal");

  if(!cartList || !totalEl || !itemsEl || !subEl || !discEl || !shipEl) return;

  const cart = loadCart();

  // carrinho vazio
  if(cart.length === 0){
    cartList.innerHTML = `
      <div class="panel" style="text-align:center">
        <h2 style="margin:0 0 8px;">Seu carrinho está vazio</h2>
        <p class="small">Adicione itens premium para continuar.</p>
        <div style="height:10px"></div>
        <a class="btn" href="index.html">Voltar para a loja</a>
      </div>
    `;
    totalEl.textContent = moneyBRL(0);
    if(mobileTotal) mobileTotal.textContent = moneyBRL(0);
    itemsEl.textContent = "0";
    subEl.textContent = moneyBRL(0);
    discEl.textContent = moneyBRL(0);
    shipEl.textContent = moneyBRL(0);
    renderReco();
    initMobileBarVisibility();
    return;
  }

  // remove automaticamente itens sem estoque
  const cleaned = cart.filter(ci => {
    const p = findProduct(ci.id);
    return p && Number(p.stock||0) > 0;
  });
  if(cleaned.length !== cart.length){
    saveCart(cleaned);
  }

  let subtotal = 0;
  let items = 0;

  cartList.innerHTML = cleaned.map(ci => {
    const p = findProduct(ci.id);
    if(!p) return "";

    const qty = clamp(Number(ci.qty), 1, Number(p.stock||0));
    const price = Number(p.price||0);
    const line = price * qty;

    subtotal += line;
    items += qty;

    const img = (p.images && p.images.length) ? p.images[0] : p.image;

    return `
      <div class="cart-item">
        <a href="product.html?id=${encodeURIComponent(p.id)}"><img src="${img}" alt="${p.name}" /></a>
        <div>
          <h3 class="ci-title">${p.name}</h3>
          <div class="ci-meta">Unitário: ${moneyBRL(price)} • Estoque: ${Number(p.stock||0)}</div>

          <div class="ci-actions">
            <button class="qbtn" type="button" data-minus="${p.id}">−</button>
            <span class="qty" style="min-width:26px;text-align:center;font-weight:800">${qty}</span>
            <button class="qbtn" type="button" data-plus="${p.id}">+</button>
            <button class="rm" type="button" data-rm="${p.id}">Remover</button>
          </div>
        </div>

        <div class="ci-right">
          <div class="ci-price">${moneyBRL(line)}</div>
          <div class="ci-sub">Subtotal</div>
        </div>
      </div>
    `;
  }).join("");

  // Cupom
  const coupon = getCoupon();
  const discount = calcCouponDiscount(subtotal, coupon);

  // Frete
  const ship = getShip();
  const shipping = estimateShipping(subtotal - discount, ship);

  const total = Math.max(0, subtotal - discount + shipping);

  itemsEl.textContent = String(items);
  subEl.textContent = moneyBRL(subtotal);
  discEl.textContent = moneyBRL(discount);
  shipEl.textContent = moneyBRL(shipping);
  totalEl.textContent = moneyBRL(total);
  if(mobileTotal) mobileTotal.textContent = moneyBRL(total);

  cartList.querySelectorAll("[data-plus]").forEach(btn => {
    btn.addEventListener("click", () => updateQty(btn.getAttribute("data-plus"), +1));
  });
  cartList.querySelectorAll("[data-minus]").forEach(btn => {
    btn.addEventListener("click", () => updateQty(btn.getAttribute("data-minus"), -1));
  });
  cartList.querySelectorAll("[data-rm]").forEach(btn => {
    btn.addEventListener("click", () => removeItem(btn.getAttribute("data-rm")));
  });

  renderReco();
  initMobileBarVisibility();
}

function initActions(){
  const couponInput = document.getElementById("couponInput");
  const applyCouponBtn = document.getElementById("applyCouponBtn");

  const cepInput = document.getElementById("cepInput");
  const calcShipBtn = document.getElementById("calcShipBtn");

  const finishBtn = document.getElementById("finishBtn");
  const mobileFinishBtn = document.getElementById("mobileFinishBtn");

  if(applyCouponBtn){
    applyCouponBtn.addEventListener("click", ()=>{
      const code = (couponInput?.value || "").trim().toUpperCase();
      if(!code){
        setCoupon(null);
        setStatus("Cupom removido");
        renderCart();
        return;
      }
      const valid = ["DIAMOND10","DIAMOND15","VIP200"];
      if(!valid.includes(code)){
        setStatus("Cupom inválido");
        return;
      }
      setCoupon({ code });
      setStatus(`Cupom aplicado: ${code}`);
      renderCart();
    });
  }

  if(calcShipBtn){
    calcShipBtn.addEventListener("click", ()=>{
      const cep = (cepInput?.value || "").replace(/\D/g,"");
      if(cep.length !== 8){
        setStatus("CEP inválido");
        return;
      }
      const last = Number(cep.slice(-1));
      const value = 19 + (last % 5) * 6;
      setShip({ cep, value });
      setStatus(`Frete estimado: ${moneyBRL(value)}`);
      renderCart();
    });
  }

  function finish(){
    alert("Checkout será configurado depois. Por enquanto: carrinho, cupom e frete já estão funcionando.");
  }
  finishBtn?.addEventListener("click", finish);
  mobileFinishBtn?.addEventListener("click", finish);
}

document.addEventListener("DOMContentLoaded", ()=>{
  updateCartCount();
  initActions();
  renderCart();
  initMobileBarVisibility();
});
