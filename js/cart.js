import { moneyBRL, getCart, saveCart, updateCartCount, findProduct, getProducts } from "./store.js";
import { toast } from "./ui.js";

// ===== Cupom e frete (salvos no localStorage) =====
const LS_COUPON = "diamondsect_coupon_v1";
const LS_SHIP = "diamondsect_ship_v1";

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
  pill.innerHTML = `✓ ${text}`;
  setTimeout(()=>{ pill.style.display = "none"; }, 2200);
}

function clampToStock(id, qty){
  const p = findProduct(id);
  const stock = Number(p?.stock ?? 0);
  if(stock <= 0) return 0;
  return Math.max(1, Math.min(stock, qty));
}

function updateQty(id, delta){
  const cart = getCart();
  const item = cart.find(i => Number(i.id) === Number(id));
  if(!item) return;

  const next = Number(item.qty||0) + Number(delta||0);
  const fixed = clampToStock(id, next);

  if(fixed <= 0){
    saveCart(cart.filter(i => Number(i.id) !== Number(id)));
    setStatus("Item removido (sem estoque)");
  } else {
    item.qty = fixed;
    saveCart(cart);
    if(next !== fixed) setStatus("Ajustado pelo estoque disponível");
  }
  renderCart();
}

function removeItem(id){
  saveCart(getCart().filter(i => Number(i.id) !== Number(id)));
  renderCart();
}

// ===== Recomendados =====
function renderReco(){
  const grid = document.getElementById("recoGrid");
  if(!grid) return;

  const cartIds = new Set(getCart().map(i => Number(i.id)));
  const all = (getProducts() || []).filter(p => !cartIds.has(Number(p.id)));

  const sorted = [...all].sort((a,b)=> (b.soldScore||0) - (a.soldScore||0));
  const pick = sorted.slice(0,6);

  if(!pick.length){
    grid.innerHTML = `<div class="small">Sem recomendações no momento.</div>`;
    return;
  }

  grid.innerHTML = pick.map(p => `
    <div class="reco-card">
      <img src="${p.image}" alt="${p.name}">
      <div class="b">
        <p class="n">${p.name}</p>
        <p class="p">${moneyBRL(Number(p.price))}</p>
        <button type="button" data-reco="${p.id}" ${Number(p.stock||0) <= 0 ? "disabled" : ""}>
          ${Number(p.stock||0) <= 0 ? "Indisponível" : "Adicionar"}
        </button>
      </div>
    </div>
  `).join("");

  grid.querySelectorAll("[data-reco]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-reco");
      const cart = getCart();
      const item = cart.find(i => Number(i.id) === Number(id));
      const next = clampToStock(id, Number(item?.qty||0) + 1);
      if(next <= 0) return setStatus("Sem estoque");
      if(item) item.qty = next;
      else cart.push({ id:Number(id), qty: next });
      saveCart(cart);
      setStatus("Adicionado ao carrinho");
      renderCart();
    });
  });
}

// ===== Header inteligente =====
function initSmartHeader(){
  const header = document.querySelector(".header");
  if(!header) return;

  let lastY = window.scrollY;
  let ticking = false;

  function run(){
    const y = window.scrollY;

    if(y > 10) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");

    const diff = Math.abs(y - lastY);
    if(diff > 8){
      if(y > lastY && y > 120) header.classList.add("is-hidden");
      else if(y < lastY) header.classList.remove("is-hidden");
    }

    lastY = y;
    ticking = false;
  }

  window.addEventListener("scroll", ()=>{
    if(!ticking){
      requestAnimationFrame(run);
      ticking = true;
    }
  }, { passive:true });
}

// ✅ MOBILE BAR: some com carrinho vazio, e some quando o resumo estiver visível
function initMobileBarVisibility(){
  const bar = document.querySelector(".mobile-bar");
  if(!bar) return;

  if(!document.body.classList.contains("cart-page")){
    bar.classList.remove("is-visible");
    return;
  }

  const summary = document.querySelector(".summary");

  function update(){
    const cart = getCart();
    const hasItems = cart.reduce((s,i)=> s + Number(i.qty||0), 0) > 0;

    if(!hasItems){
      bar.classList.remove("is-visible");
      return;
    }

    if(!summary){
      bar.classList.remove("is-visible");
      return;
    }

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

  const cart = getCart();
  const catalog = getProducts();

  if(!(catalog && catalog.length)){
    cartList.innerHTML = `
      <div class="empty">
        <h2>Catálogo vazio</h2>
        <p>Cadastre produtos no <b>Admin</b> para o carrinho funcionar.</p>
        <div style="height:12px"></div>
        <a class="btn" href="admin.html">Abrir Admin</a>
      </div>
    `;
    totalEl.textContent = moneyBRL(0);
    if(mobileTotal) mobileTotal.textContent = moneyBRL(0);
    itemsEl.textContent = "0";
    subEl.textContent = moneyBRL(0);
    discEl.textContent = moneyBRL(0);
    shipEl.textContent = moneyBRL(0);
    initMobileBarVisibility();
    return;
  }

  if(cart.length === 0){
    cartList.innerHTML = `
      <div class="empty">
        <h2>Seu carrinho está vazio</h2>
        <p>Adicione itens premium para continuar.</p>
        <div style="height:12px"></div>
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

  let subtotal = 0;
  let items = 0;

  cartList.innerHTML = cart.map(ci => {
    const p = findProduct(ci.id);
    if(!p) return "";

    const qty = clampToStock(p.id, Number(ci.qty||0));
    const price = Number(p.price||0);
    const line = price * qty;

    subtotal += line;
    items += qty;

    return `
      <div class="cart-item">
        <a href="product.html?id=${encodeURIComponent(p.id)}"><img src="${p.image}" alt="${p.name}" /></a>
        <div>
          <h3 class="ci-title">${p.name}</h3>
          <div class="ci-meta">Preço unitário: ${moneyBRL(price)} • Estoque: ${Number(p.stock||0)}</div>

          <div class="ci-actions">
            <button class="qbtn" type="button" data-minus="${p.id}">−</button>
            <span class="qty">${qty}</span>
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

  // aplica correções de estoque no storage
  const fixed = cart
    .map(i => ({ id:Number(i.id), qty: clampToStock(i.id, Number(i.qty||0)) }))
    .filter(i => i.qty > 0);
  if(JSON.stringify(fixed) !== JSON.stringify(cart)) saveCart(fixed);

  const coupon = getCoupon();
  const discount = calcCouponDiscount(subtotal, coupon);

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

// ===== Eventos (cupom/frete/finalizar) =====
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

      setStatus(`Frete estimado para ${cep.slice(0,5)}-${cep.slice(5)}: ${moneyBRL(value)}`);
      renderCart();
    });
  }

  function finish(){
    toast("Checkout será configurado depois (Pix/Cartão). Por enquanto: carrinho, cupom e frete já estão funcionando.");
  }

  if(finishBtn) finishBtn.addEventListener("click", finish);
  if(mobileFinishBtn) mobileFinishBtn.addEventListener("click", finish);
}

export function initCart(){
  initSmartHeader();
  initActions();
  renderCart();
  initMobileBarVisibility();
}
