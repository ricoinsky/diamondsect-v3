import { loadProducts, saveProducts, cartCount } from "./storage.js";

function moneyBRL(v){ return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }

function updateCartCount(){
  document.querySelectorAll(".cartcount").forEach(el => el.textContent = String(cartCount()));
}

function qs(sel){ return document.querySelector(sel); }

function uid(){
  return Math.floor(Date.now()/1000) + "-" + Math.floor(Math.random()*10000);
}

function parseImages(str){
  return (str||"")
    .split(",")
    .map(s=>s.trim())
    .filter(Boolean);
}

function renderList(){
  const wrap = qs("#adminList");
  if(!wrap) return;

  const list = loadProducts();

  if(list.length === 0){
    wrap.innerHTML = `
      <div class="panel">
        <h3 style="margin:0 0 8px;">Sem produtos</h3>
        <p class="small">Cadastre produtos aqui. Eles vão aparecer automaticamente na Home e nas categorias.</p>
      </div>
    `;
    return;
  }

  wrap.innerHTML = list.map(p=>{
    const img = (p.images && p.images[0]) || p.image || "";
    return `
      <div class="panel" style="display:grid;grid-template-columns:110px 1fr;gap:14px;align-items:center;">
        <div style="border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.03)">
          <img src="${img}" alt="" style="width:100%;height:110px;object-fit:cover">
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:start;flex-wrap:wrap">
            <div>
              <div style="font-weight:800;font-size:16px">${p.name}</div>
              <div class="small">Categoria: <b>${p.category}</b> • Preço: <b>${moneyBRL(p.price)}</b> • Estoque: <b>${Number(p.stock||0)}</b></div>
              <div class="small">ID: ${p.id}</div>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <a class="btn" href="product.html?id=${encodeURIComponent(p.id)}">Ver</a>
              <button class="btn" type="button" data-edit="${p.id}">Editar</button>
              <button class="btn" type="button" data-del="${p.id}">Apagar</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  wrap.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-del");
      const next = loadProducts().filter(p => String(p.id) !== String(id));
      saveProducts(next);
      renderList();
    });
  });

  wrap.querySelectorAll("[data-edit]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-edit");
      const p = loadProducts().find(p=> String(p.id)===String(id));
      if(!p) return;

      qs("#pid").value = p.id;
      qs("#pname").value = p.name || "";
      qs("#pcat").value = p.category || "ternos";
      qs("#pprice").value = p.price ?? "";
      qs("#pstock").value = p.stock ?? 0;
      qs("#pdesc").value = p.description || "";
      qs("#pimgs").value = (p.images||[]).join(", ");
      qs("#pimg").value = p.image || "";
      qs("#formTitle").textContent = "Editar produto";
      qs("#saveBtn").textContent = "Salvar alterações";
      window.scrollTo({ top: 0, behavior:"smooth" });
    });
  });
}

function clearForm(){
  qs("#pid").value = "";
  qs("#pname").value = "";
  qs("#pcat").value = "ternos";
  qs("#pprice").value = "";
  qs("#pstock").value = 0;
  qs("#pdesc").value = "";
  qs("#pimgs").value = "";
  qs("#pimg").value = "";
  qs("#formTitle").textContent = "Cadastrar produto";
  qs("#saveBtn").textContent = "Cadastrar";
}

function onSubmit(e){
  e.preventDefault();

  const id = qs("#pid").value.trim() || uid();
  const name = qs("#pname").value.trim();
  const category = qs("#pcat").value;
  const price = Number(qs("#pprice").value || 0);
  const stock = Number(qs("#pstock").value || 0);
  const description = qs("#pdesc").value.trim();
  const image = qs("#pimg").value.trim();
  const images = parseImages(qs("#pimgs").value);

  if(!name){
    alert("Digite o nome do produto.");
    return;
  }

  const list = loadProducts();
  const existingIdx = list.findIndex(p => String(p.id) === String(id));

  const product = {
    id,
    name,
    category,
    price,
    stock,
    description,
    image,
    images: images.length ? images : (image ? [image] : []),
    soldScore: Number(list[existingIdx]?.soldScore || 0)
  };

  if(existingIdx >= 0) list[existingIdx] = product;
  else list.push(product);

  saveProducts(list);
  clearForm();
  renderList();
}

function bind(){
  qs("#adminForm")?.addEventListener("submit", onSubmit);
  qs("#resetBtn")?.addEventListener("click", clearForm);

  qs("#wipeBtn")?.addEventListener("click", ()=>{
    if(confirm("Apagar TODOS os produtos?")){
      saveProducts([]);
      renderList();
      clearForm();
    }
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  updateCartCount();
  bind();
  renderList();
});
