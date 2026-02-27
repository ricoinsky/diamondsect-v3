// ===== DIAMONDSECT STORAGE (catálogo + estoque) =====
const LS_PRODUCTS = "diamondsect_products_v1";
const LS_CART = "diamondsect_cart_v1";

export function loadProducts(){
  try{
    const data = JSON.parse(localStorage.getItem(LS_PRODUCTS));
    return Array.isArray(data) ? data : [];
  }catch{ return []; }
}

export function saveProducts(list){
  localStorage.setItem(LS_PRODUCTS, JSON.stringify(Array.isArray(list)?list:[]));
}

export function getProductById(id){
  const list = loadProducts();
  return list.find(p => Number(p.id) === Number(id)) || null;
}

export function ensureCatalog(){
  // não cria produtos padrão: começa vazio (como você pediu)
  const existing = loadProducts();
  if(Array.isArray(existing)) return;
  saveProducts([]);
}

export function loadCart(){
  try{
    const data = JSON.parse(localStorage.getItem(LS_CART));
    return Array.isArray(data) ? data : [];
  }catch{ return []; }
}

export function saveCart(cart){
  localStorage.setItem(LS_CART, JSON.stringify(Array.isArray(cart)?cart:[]));
}

export function cartCount(){
  return loadCart().reduce((sum,i)=> sum + Number(i.qty||0), 0);
}
