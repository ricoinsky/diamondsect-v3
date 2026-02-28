import { getProducts, saveProducts } from "./store.js";

function qs(sel){ return document.querySelector(sel); }
function esc(s){ return String(s||"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }

function normalizeImages(str){
  return String(str||"")
    .split(",")
    .map(s=>s.trim())
    .filter(Boolean);
}

function normalizeIds(str){
  return String(str||"")
    .split(",")
    .map(s=>Number(String(s).trim()))
    .filter(n=>Number.isFinite(n) && n > 0);
}

function render(){
  const tbody = qs("#admBody");
  const list = getProducts();

  qs("#admCount").textContent = String(list.length);

  if(!tbody) return;

  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="7" style="padding:14px;color:rgba(255,255,255,.7)">Nenhum produto cadastrado ainda.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p=>`
    <tr>
      <td>#${esc(p.id)}</td>
      <td>${esc(p.name)}</td>
      <td>${esc(p.category)}</td>
      <td>${esc(p.subcat||"-")}</td>
      <td>${Number(p.stock||0)}</td>
      <td>${Number(p.price||0).toFixed(2)}</td>
      <td><button data-edit="${p.id}" class="btn btn--mini" type="button">Editar</button>
          <button data-del="${p.id}" class="btn btn--mini" type="button" style="margin-left:6px">Apagar</button></td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-del]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const id = b.getAttribute("data-del");
      if(!confirm("Apagar esse produto?")) return;
      saveProducts(list.filter(x => Number(x.id) !== Number(id)));
      render();
    });
  });

  tbody.querySelectorAll("[data-edit]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const id = b.getAttribute("data-edit");
      const p = list.find(x => Number(x.id) === Number(id));
      if(!p) return;
      fillForm(p);
      window.scrollTo({ top:0, behavior:"smooth" });
    });
  });
}

function fillForm(p){
  qs("#pid").value = p.id ?? "";
  qs("#pname").value = p.name ?? "";
  qs("#pcat").value = p.category ?? "ternos";
  qs("#psub").value = p.subcat ?? "";
  qs("#pprice").value = p.price ?? 0;
  qs("#pstock").value = p.stock ?? 0;
  qs("#pimg").value = p.image ?? "";
  qs("#pimgs").value = (Array.isArray(p.images) ? p.images.join(", ") : "");
  qs("#pvideo").value = p.video ?? "";
  qs("#plook").value = (Array.isArray(p.lookIds) ? p.lookIds.join(", ") : "");
  qs("#pdesc").value = p.description ?? "";
  qs("#psold").value = p.soldScore ?? 0;
}

function clearForm(){
  qs("#pid").value = "";
  qs("#pname").value = "";
  qs("#pcat").value = "ternos";
  qs("#psub").value = "";
  qs("#pprice").value = 0;
  qs("#pstock").value = 0;
  qs("#pimg").value = "";
  qs("#pimgs").value = "";
  qs("#pvideo").value = "";
  qs("#plook").value = "";
  qs("#pdesc").value = "";
  qs("#psold").value = 0;
}

function saveFromForm(){
  const list = getProducts();
  const id = Number(qs("#pid").value || 0) || (Date.now());
  const obj = {
    id,
    name: qs("#pname").value.trim(),
    category: qs("#pcat").value.trim(),
    subcat: qs("#psub").value.trim(),
    price: Number(qs("#pprice").value || 0),
    stock: Number(qs("#pstock").value || 0),
    image: qs("#pimg").value.trim(),
    images: normalizeImages(qs("#pimgs").value),
    video: qs("#pvideo").value.trim(),
    lookIds: normalizeIds(qs("#plook").value),
    description: qs("#pdesc").value.trim(),
    soldScore: Number(qs("#psold").value || 0),
  };

  if(!obj.name) return alert("Informe o nome do produto.");
  if(!obj.image && obj.images.length) obj.image = obj.images[0];
  if(!obj.image) obj.image = "https://images.unsplash.com/photo-1520975682071-aacbc3f4a78a?auto=format&fit=crop&w=1200&q=70";
  if(!obj.images.length) obj.images = [obj.image];

  const existingIdx = list.findIndex(x => Number(x.id) === Number(id));
  if(existingIdx >= 0) list[existingIdx] = obj;
  else list.push(obj);

  saveProducts(list);
  clearForm();
  render();
  alert("Salvo ✅");
}

function wipeAll(){
  if(!confirm("Isso vai apagar TODOS os produtos do catálogo. Confirma?")) return;
  saveProducts([]);
  render();
}

export function initAdmin(){
  qs("#saveBtn")?.addEventListener("click", saveFromForm);
  qs("#clearBtn")?.addEventListener("click", clearForm);
  qs("#wipeBtn")?.addEventListener("click", wipeAll);

  // primeiro load: se já tiver produtos do seu projeto antigo, você pode apagar aqui.
  render();
}
