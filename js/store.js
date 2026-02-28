// ===== DIAMONDSECT — STORE (produtos, conta e carrinho por usuário) =====

const LS_PRODUCTS = "diamondsect_products_v1";
const LS_USERS = "diamondsect_users_v1";
const LS_SESSION = "diamondsect_session_v1";

function safeJSONParse(v, fallback){
  try{ return JSON.parse(v) ?? fallback; }catch{ return fallback; }
}

export function moneyBRL(v){
  const n = Number(v) || 0;
  return n.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}

// ---------- Produtos ----------
export function getProducts(){
  const list = safeJSONParse(localStorage.getItem(LS_PRODUCTS), []);
  return Array.isArray(list) ? list : [];
}

export function saveProducts(list){
  localStorage.setItem(LS_PRODUCTS, JSON.stringify(list || []));
}

// ---------- Conta / sessão ----------
export function getUsers(){
  const u = safeJSONParse(localStorage.getItem(LS_USERS), []);
  return Array.isArray(u) ? u : [];
}
export function saveUsers(users){
  localStorage.setItem(LS_USERS, JSON.stringify(users || []));
}

export function getSession(){
  return safeJSONParse(localStorage.getItem(LS_SESSION), null);
}
export function setSession(session){
  localStorage.setItem(LS_SESSION, JSON.stringify(session));
}
export function clearSession(){
  localStorage.removeItem(LS_SESSION);
}

export function getCartKey(){
  const s = getSession();
  if(s?.email) return `diamondsect_cart_${s.email.toLowerCase()}`;
  return "diamondsect_cart_guest";
}

// ---------- Carrinho ----------
export function getCart(){
  return safeJSONParse(localStorage.getItem(getCartKey()), []);
}

export function saveCart(cart){
  localStorage.setItem(getCartKey(), JSON.stringify(cart || []));
  updateCartCount();
}

export function updateCartCount(){
  const cart = getCart();
  const total = (cart || []).reduce((sum, item) => sum + Number(item.qty||0), 0);
  document.querySelectorAll(".cartcount").forEach(el => el.textContent = String(total));
}

export function findProduct(id){
  const list = getProducts();
  return list.find(p => Number(p.id) === Number(id));
}

export function clampQtyToStock(id, qty){
  const p = findProduct(id);
  const stock = Number(p?.stock ?? 0);
  if(stock <= 0) return 0;
  return Math.max(1, Math.min(stock, qty));
}

export function addToCart(id, qty=1){
  const p = findProduct(id);
  if(!p) return { ok:false, message:"Produto não encontrado." };

  const stock = Number(p.stock ?? 0);
  if(stock <= 0) return { ok:false, message:"Sem estoque no momento." };

  const cart = getCart();
  const item = cart.find(i => Number(i.id) === Number(id));
  const current = Number(item?.qty || 0);
  const next = Math.min(stock, current + Number(qty||1));

  if(item) item.qty = next;
  else cart.push({ id:Number(id), qty: next });

  saveCart(cart);

  if(next === stock) return { ok:true, message:"Adicionado (limite de estoque atingido)." };
  return { ok:true, message:"Produto adicionado ao carrinho." };
}

export function mergeGuestCartIntoUser(){
  const session = getSession();
  if(!session?.email) return;

  const guestKey = "diamondsect_cart_guest";
  const userKey = `diamondsect_cart_${session.email.toLowerCase()}`;

  const guest = safeJSONParse(localStorage.getItem(guestKey), []);
  const user = safeJSONParse(localStorage.getItem(userKey), []);

  if(!Array.isArray(guest) || !guest.length){
    updateCartCount();
    return;
  }

  const merged = Array.isArray(user) ? [...user] : [];
  for(const gi of guest){
    const existing = merged.find(x => Number(x.id) === Number(gi.id));
    if(existing) existing.qty = Number(existing.qty||0) + Number(gi.qty||0);
    else merged.push({ id:Number(gi.id), qty:Number(gi.qty||0) });
  }

  // respeita estoque real
  const fixed = merged
    .map(i => ({ id:Number(i.id), qty: clampQtyToStock(i.id, Number(i.qty||0)) }))
    .filter(i => i.qty > 0);

  localStorage.setItem(userKey, JSON.stringify(fixed));
  localStorage.removeItem(guestKey);
  updateCartCount();
}
