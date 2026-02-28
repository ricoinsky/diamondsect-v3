import { findProduct, moneyBRL, addToCart, updateCartCount, getProducts } from "./store.js";
import { toast } from "./ui.js";

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }

// --- Reviews (local only) ---
const REV_KEY = "ds_reviews_v1";

function loadAllReviews(){
  try{ return JSON.parse(localStorage.getItem(REV_KEY) || "{}") || {}; }
  catch{ return {}; }
}

function saveAllReviews(obj){
  try{ localStorage.setItem(REV_KEY, JSON.stringify(obj || {})); }
  catch{ /* ignore */ }
}

function getReviews(productId){
  const all = loadAllReviews();
  const list = all[String(productId)] || [];
  return Array.isArray(list) ? list : [];
}

function addReview(productId, review){
  const all = loadAllReviews();
  const key = String(productId);
  const list = Array.isArray(all[key]) ? all[key] : [];
  list.unshift(review);
  all[key] = list.slice(0, 50);
  saveAllReviews(all);
}

function avgRating(list){
  const r = (list || []).map(x=> Number(x.rating||0)).filter(x=> x>=1 && x<=5);
  if(!r.length) return { avg:0, count:0 };
  const sum = r.reduce((a,b)=>a+b,0);
  return { avg: sum / r.length, count: r.length };
}

function renderStars(value, opts={}){
  const v = Math.max(0, Math.min(5, Number(value||0)));
  const full = Math.floor(v);
  const half = (v - full) >= 0.5;
  const interactive = !!opts.interactive;
  const id = opts.id || "";

  let out = "";
  for(let i=1;i<=5;i++){
    const state = i<=full ? "full" : (i===full+1 && half ? "half" : "empty");
    const cls = `star star--${state}`;
    if(interactive){
      out += `<button class="starbtn" type="button" data-rate="${i}" aria-label="Avaliar ${i} estrelas">★</button>`;
    }else{
      out += `<span class="${cls}" aria-hidden="true">★</span>`;
    }
  }
  return `<div class="stars" ${id?`id="${id}"`:``} ${interactive?`data-stars="1"`:``} aria-label="${v.toFixed(1)} de 5">${out}</div>`;
}

function getId(){
  const u = new URL(location.href);
  return u.searchParams.get("id");
}

function setActiveThumb(src){
  qsa(".thumbbtn").forEach(b=> b.classList.toggle("is-active", b.getAttribute("data-src") === src));
  const img = qs("#pdpMainImg");
  if(img){
    img.src = src;
    img.setAttribute("data-active-src", src);
  }
  const zoomImg = qs("#zoomImg");
  if(zoomImg) zoomImg.src = src;
}

function isYouTube(url){
  const u = String(url||"").toLowerCase();
  return u.includes("youtube.com") || u.includes("youtu.be");
}

function toYouTubeEmbed(url){
  try{
    const u = new URL(url);
    if(u.hostname.includes("youtu.be")){
      const id = u.pathname.replace("/","").trim();
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }
    const id = u.searchParams.get("v");
    if(id) return `https://www.youtube.com/embed/${id}`;
    // fall back to existing path
    return url;
  }catch{
    return url;
  }
}

function isVideoFile(url){
  const u = String(url||"").toLowerCase();
  return u.endsWith(".mp4") || u.endsWith(".webm") || u.endsWith(".ogg");
}

function setMediaMode(mode){
  // mode: 'image' | 'video'
  const img = qs("#pdpMainImg");
  const vwrap = qs("#pdpVideoWrap");
  if(!img || !vwrap) return;
  const isVid = mode === "video";
  img.style.display = isVid ? "none" : "block";
  vwrap.style.display = isVid ? "block" : "none";
  qs("#pdpTabs")?.querySelectorAll("button").forEach(b=>{
    b.classList.toggle("is-active", b.getAttribute("data-tab") === mode);
  });
}

function openZoom(){
  qs("#zoomModal")?.setAttribute("aria-hidden","false");
}
function closeZoom(){
  qs("#zoomModal")?.setAttribute("aria-hidden","true");
}

let zoom = 1;

function applyZoom(){
  const img = qs("#zoomImg");
  if(!img) return;
  img.style.transform = `scale(${zoom})`;
}

function zoomIn(){ zoom = Math.min(4, zoom + 0.25); applyZoom(); qs("#zoomVal").textContent = `${Math.round(zoom*100)}%`; }
function zoomOut(){ zoom = Math.max(1, zoom - 0.25); applyZoom(); qs("#zoomVal").textContent = `${Math.round(zoom*100)}%`; }
function zoomReset(){ zoom = 1; applyZoom(); qs("#zoomVal").textContent = "100%"; }

function render(){
  updateCartCount();

  const id = getId();
  const p = findProduct(id);

  const wrap = qs("#pdpWrap");
  if(!wrap) return;

  if(!p){
    wrap.innerHTML = `
      <div class="empty">
        <h2>Produto não encontrado</h2>
        <p>Esse item pode ter sido removido do catálogo.</p>
        <div style="height:12px"></div>
        <a class="btn" href="index.html">Voltar</a>
      </div>
    `;
    return;
  }

  const images = (p.images && p.images.length ? p.images : [p.image]).filter(Boolean);
  const hasVideo = !!(p.video && String(p.video).trim());

  const reviews = getReviews(p.id);
  const rating = avgRating(reviews);

  wrap.innerHTML = `
    <div class="pdp">
      <div class="panel">
        <div class="gallery2">
          <div class="mainshot mainshot--pro" id="pdpMainShot">
            <div class="pdpTabs" id="pdpTabs">
              <button class="tabbtn is-active" type="button" data-tab="image">Fotos</button>
              ${hasVideo ? `<button class="tabbtn" type="button" data-tab="video">Vídeo</button>` : ``}
            </div>

            <img id="pdpMainImg" data-active-src="${images[0]}" src="${images[0]}" alt="${p.name}">

            <div class="pdpVideo" id="pdpVideoWrap" style="display:none">
              ${hasVideo ? renderVideoEmbed(p.video) : ``}
            </div>

            <div class="zoomhint">Zoom premium • passe o mouse / clique</div>
          </div>

          <div class="thumbrail" aria-label="Galeria">
            <button class="thumbnav" type="button" id="thumbPrev" aria-label="Voltar">‹</button>
            <div class="thumbs thumbs--h" id="thumbsRow">
              ${images.map((src,i)=>`
                <button class="thumbbtn ${i===0?"is-active":""}" type="button" data-src="${src}" title="Foto ${i+1}">
                  <img src="${src}" alt="Foto ${i+1} de ${p.name}">
                </button>
              `).join("")}
            </div>
            <button class="thumbnav" type="button" id="thumbNext" aria-label="Avançar">›</button>
          </div>
        </div>
      </div>

      <aside class="panel">
        <h1>${p.name}</h1>
        <div class="reviewSummary">
          ${rating.count ? `${renderStars(rating.avg)} <a class="rlink" href="#avaliacoes">${rating.count} avaliação${rating.count>1?"s":""}</a>` : `<span class="muted">Sem avaliações ainda</span>`}
        </div>
        <div class="sub">${p.description || "Descrição premium será adicionada por você depois no Admin."}</div>

        <div class="kv">
          <span class="pill"><strong>Categoria:</strong> ${p.category}</span>
          ${p.subcat ? `<span class="pill"><strong>Tipo:</strong> ${p.subcat}</span>` : ``}
          <span class="pill"><strong>Código:</strong> #${p.id}</span>
        </div>

        <div class="pricebox">
          <div class="now">${moneyBRL(p.price)}</div>
          <div class="stock">Estoque disponível: <b id="stockVal">${Number(p.stock||0)}</b></div>
        </div>

        <div class="qtyrow">
          <button class="qbtn" type="button" id="qtyMinus">−</button>
          <div class="qty" id="qtyVal">1</div>
          <button class="qbtn" type="button" id="qtyPlus">+</button>
        </div>

        <button class="btn" type="button" id="addBtn">Adicionar ao carrinho</button>
        <div class="warn" id="warnBox" style="display:none"></div>

        <div class="divider"></div>

        <div class="small">
          • Acabamento premium<br>
          • Garantia de 30 dias<br>
          • Envio seguro (prazo no checkout)
        </div>
      </aside>
    </div>

    <section class="pdpSection">
      <div class="panel">
        <div class="sectionTop">
          <h2>Look completo</h2>
          <p class="muted">Combine com peças e acessórios que elevam o visual.</p>
        </div>
        <div class="lookgrid" id="lookGrid"></div>
      </div>
    </section>

    <section class="pdpSection" id="medidas">
      <div class="panel">
        <div class="sectionTop">
          <h2>Tabela de medidas</h2>
          <p class="muted">Referência rápida para escolher o tamanho ideal. Medidas aproximadas.</p>
        </div>
        <div id="sizeBox"></div>
        <div class="measureTips">
          <div><b>Como medir:</b> tórax na parte mais larga • cintura na linha do umbigo • quadril na parte mais larga.</div>
          <div class="muted">Se você quiser caimento perfeito, peça ajustes — roupa social premium é feita pra isso.</div>
        </div>
      </div>
    </section>

    <section class="pdpSection" id="avaliacoes">
      <div class="panel">
        <div class="sectionTop">
          <h2>Avaliações</h2>
          <p class="muted">Opiniões de clientes (salvas no navegador). Depois a gente liga em um sistema real.</p>
        </div>

        <div class="reviewTop">
          <div>
            <div class="bigRate">${rating.count ? `${rating.avg.toFixed(1)} / 5` : `—`}</div>
            <div class="muted">${rating.count ? `${rating.count} avaliação${rating.count>1?"s":""}` : `Seja o primeiro a avaliar`}</div>
            <div style="height:6px"></div>
            ${rating.count ? renderStars(rating.avg) : renderStars(0)}
          </div>

          <form class="reviewForm" id="reviewForm">
            <div class="rfTitle">Deixe sua avaliação</div>
            <div class="rfRow">
              <input class="input" id="rvName" type="text" placeholder="Seu nome" maxlength="40" required>
              <div class="rfStars" id="rvStars">${renderStars(0,{interactive:true})}</div>
            </div>
            <textarea class="input" id="rvText" placeholder="Conte como foi a experiência" rows="3" maxlength="400" required></textarea>
            <button class="btn btn--mini" type="submit">Enviar avaliação</button>
            <div class="muted" id="rvHint" style="margin-top:8px">Escolha as estrelas e envie.</div>
          </form>
        </div>

        <div class="reviewList" id="reviewList"></div>
      </div>
    </section>
  `;

  // tabs
  qs("#pdpTabs")?.addEventListener("click", (e)=>{
    const btn = e.target?.closest?.("button[data-tab]");
    if(!btn) return;
    const tab = btn.getAttribute("data-tab");
    if(tab === "video"){
      setMediaMode("video");
      // disable hover-zoom while video
      qs("#pdpMainShot")?.classList.remove("is-hoverzoom");
      return;
    }
    setMediaMode("image");
  });

  // thumbs
  qsa(".thumbbtn").forEach(b=>{
    b.addEventListener("click", ()=> setActiveThumb(b.getAttribute("data-src")));
  });

  // thumb scroll buttons
  const row = qs("#thumbsRow");
  qs("#thumbPrev")?.addEventListener("click", ()=> row?.scrollBy({ left:-260, behavior:"smooth" }));
  qs("#thumbNext")?.addEventListener("click", ()=> row?.scrollBy({ left: 260, behavior:"smooth" }));

  // hover zoom (only when in image tab)
  initHoverZoom(images);

  // zoom modal
  const main = qs("#pdpMainImg");
  main?.addEventListener("click", ()=>{
    // if in video mode, ignore
    if(qs("#pdpVideoWrap")?.style.display === "block") return;
    zoomReset();
    openZoom();
  });

  // qty control
  let qty = 1;
  const stock = Number(p.stock||0);
  const qtyEl = qs("#qtyVal");
  const warn = qs("#warnBox");

  function warnMsg(msg){
    warn.style.display = "block";
    warn.textContent = msg;
    clearTimeout(window.__pdp_warn);
    window.__pdp_warn = setTimeout(()=>{ warn.style.display="none"; }, 2600);
  }

  qs("#qtyMinus")?.addEventListener("click", ()=>{
    qty = Math.max(1, qty - 1);
    qtyEl.textContent = String(qty);
  });
  qs("#qtyPlus")?.addEventListener("click", ()=>{
    qty = Math.min(Math.max(1, stock), qty + 1);
    qtyEl.textContent = String(qty);
    if(qty === stock) warnMsg("Você atingiu o limite do estoque disponível.");
  });

  qs("#addBtn")?.addEventListener("click", ()=>{
    const res = addToCart(p.id, qty);
    toast(res.message);
    updateCartCount();
  });

  // look completo
  renderLookCompleto(p);

  // size chart
  renderSizeChart(p);

  // reviews
  initReviews(p);
}

function renderSizeChart(p){
  const box = qs("#sizeBox");
  if(!box) return;

  const cat = String(p.category||"").toLowerCase();
  const isApparel = ["ternos","linho","blazer"].includes(cat);

  if(!isApparel){
    box.innerHTML = `
      <div class="sizeNA">
        <div><b>Este item não usa numeração de roupa.</b></div>
        <div class="muted">Consulte a descrição do produto para detalhes específicos.</div>
      </div>
    `;
    return;
  }

  const rows = [
    { s:"46", chest:"92–96", waist:"78–82", hip:"94–98", h:"1,65–1,72" },
    { s:"48", chest:"96–100", waist:"82–86", hip:"98–102", h:"1,68–1,75" },
    { s:"50", chest:"100–104", waist:"86–90", hip:"102–106", h:"1,72–1,80" },
    { s:"52", chest:"104–108", waist:"90–94", hip:"106–110", h:"1,75–1,83" },
    { s:"54", chest:"108–112", waist:"94–98", hip:"110–114", h:"1,78–1,86" },
    { s:"56", chest:"112–116", waist:"98–102", hip:"114–118", h:"1,80–1,88" },
    { s:"58", chest:"116–120", waist:"102–106", hip:"118–122", h:"1,82–1,90" },
    { s:"60", chest:"120–124", waist:"106–110", hip:"122–126", h:"1,84–1,92" },
    { s:"62", chest:"124–128", waist:"110–114", hip:"126–130", h:"1,86–1,94" },
  ];

  const selected = String(p.size||"").trim();

  box.innerHTML = `
    <div class="tableWrap">
      <table class="sizeTable">
        <thead>
          <tr>
            <th>Tamanho</th>
            <th>Tórax (cm)</th>
            <th>Cintura (cm)</th>
            <th>Quadril (cm)</th>
            <th>Altura sugerida (m)</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r=>`
            <tr class="${selected && selected===r.s ? "is-pick" : ""}">
              <td><b>${r.s}</b></td>
              <td>${r.chest}</td>
              <td>${r.waist}</td>
              <td>${r.hip}</td>
              <td>${r.h}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <div class="muted" style="margin-top:10px">Variação natural de 1–3cm. Caimento pode mudar conforme modelagem e ajustes.</div>
  `;
}

function fmtDate(iso){
  try{
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2,"0");
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }catch{ return ""; }
}

function initReviews(p){
  const listEl = qs("#reviewList");
  const form = qs("#reviewForm");
  if(!listEl || !form) return;

  let picked = 0;
  const starsWrap = form.querySelector("[data-stars]");
  const hint = qs("#rvHint");

  starsWrap?.addEventListener("click", (e)=>{
    const b = e.target?.closest?.("[data-rate]");
    if(!b) return;
    picked = Number(b.getAttribute("data-rate")) || 0;
    // paint
    starsWrap.querySelectorAll(".starbtn").forEach(btn=>{
      const r = Number(btn.getAttribute("data-rate"));
      btn.classList.toggle("is-on", r <= picked);
    });
    if(hint) hint.textContent = `Você selecionou ${picked} estrela${picked>1?"s":""}.`;
  });

  function draw(){
    const items = getReviews(p.id);
    if(!items.length){
      listEl.innerHTML = `<div class="muted">Ainda não há avaliações. Seja o primeiro.</div>`;
      return;
    }
    listEl.innerHTML = items.map(r=>`
      <article class="reviewCard">
        <div class="reviewHead">
          <div class="reviewName">${escapeHTML(r.name||"Cliente")}</div>
          <div class="reviewMeta">
            ${renderStars(Number(r.rating||0))}
            <span class="muted">${fmtDate(r.date)}</span>
          </div>
        </div>
        <div class="reviewText">${escapeHTML(r.comment||"")}</div>
      </article>
    `).join("");
  }

  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const name = (qs("#rvName")?.value || "").trim();
    const text = (qs("#rvText")?.value || "").trim();
    if(!name || !text){ toast("Preencha nome e comentário."); return; }
    if(!(picked>=1 && picked<=5)){ toast("Escolha de 1 a 5 estrelas."); return; }
    addReview(p.id, { name, rating:picked, comment:text, date: new Date().toISOString() });
    qs("#rvText").value = "";
    toast("Avaliação enviada!");
    picked = 0;
    starsWrap?.querySelectorAll(".starbtn").forEach(btn=> btn.classList.remove("is-on"));
    if(hint) hint.textContent = "Escolha as estrelas e envie.";
    draw();
    // refresh summary (simple: reload)
    render();
  });

  draw();
}

function escapeHTML(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function renderVideoEmbed(url){
  const safe = String(url||"").trim();
  if(!safe) return "";
  if(isVideoFile(safe)){
    return `<video class="pdpvideo" controls playsinline preload="metadata" src="${safe}"></video>`;
  }
  if(isYouTube(safe)){
    const src = toYouTubeEmbed(safe);
    return `<iframe class="pdpiframe" src="${src}" title="Vídeo do produto" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
  }
  return `<iframe class="pdpiframe" src="${safe}" title="Vídeo do produto" frameborder="0" allowfullscreen></iframe>`;
}

function pickRecommendations(p){
  const all = (getProducts() || []).filter(x => Number(x.id) !== Number(p.id));
  const same = all.filter(x => x.category === p.category);
  const joias = all.filter(x => x.category === "joias");
  const perf = all.filter(x => x.category === "perfumaria");
  const ternos = all.filter(x => x.category === "ternos" || x.category === "linho" || x.category === "blazer");

  // prefer explicit look ids
  const explicit = Array.isArray(p.lookIds) && p.lookIds.length
    ? p.lookIds.map(id => all.find(x => Number(x.id) === Number(id))).filter(Boolean)
    : [];

  const out = [];
  for(const e of explicit){ if(out.length < 6) out.push(e); }

  // category logic
  if(out.length < 6){
    if(["ternos","linho","blazer"].includes(p.category)){
      out.push(...same.slice(0,2));
      out.push(...joias.slice(0,2));
      out.push(...perf.slice(0,2));
    }else if(p.category === "joias"){
      out.push(...same.slice(0,2));
      out.push(...ternos.slice(0,3));
      out.push(...perf.slice(0,2));
    }else if(p.category === "perfumaria"){
      out.push(...same.slice(0,2));
      out.push(...ternos.slice(0,3));
      out.push(...joias.slice(0,2));
    }else{
      out.push(...same.slice(0,4));
    }
  }

  // dedupe, cap 6
  const uniq = [];
  const seen = new Set();
  for(const item of out){
    const id = Number(item?.id);
    if(!id || seen.has(id)) continue;
    seen.add(id);
    uniq.push(item);
    if(uniq.length >= 6) break;
  }
  return uniq;
}

function renderLookCompleto(p){
  const grid = qs("#lookGrid");
  if(!grid) return;
  const picks = pickRecommendations(p);
  if(!picks.length){
    grid.innerHTML = `<div class="muted">Cadastre mais produtos no Admin para aparecer o look completo.</div>`;
    return;
  }

  grid.innerHTML = picks.map(x=>`
    <article class="lcard">
      <a class="lcard__img" href="product.html?id=${encodeURIComponent(x.id)}" aria-label="${x.name}">
        <img src="${(x.images && x.images[0]) || x.image}" alt="${x.name}" loading="lazy" />
      </a>
      <div class="lcard__body">
        <div class="lcard__title">${x.name}</div>
        <div class="lcard__meta">${x.category}${x.subcat ? ` • ${x.subcat}` : ``}</div>
        <div class="lcard__bottom">
          <div class="lcard__price">${moneyBRL(x.price)}</div>
          <button class="btn btn--mini" type="button" data-quickadd="${x.id}">Adicionar</button>
        </div>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll("[data-quickadd]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const id = b.getAttribute("data-quickadd");
      const res = addToCart(id, 1);
      toast(res.message);
      updateCartCount();
    });
  });
}


function initHoverZoom(images){
  const box = document.querySelector(".mainshot");
  const img = document.getElementById("pdpMainImg");
  if(!box || !img) return;

  function syncBg(){
    const src = img.getAttribute("src");
    box.style.backgroundImage = `url('${src}')`;
  }
  syncBg();

  // keep background synced when thumbnails change
  const obs = new MutationObserver(syncBg);
  obs.observe(img, { attributes:true, attributeFilter:["src"] });

  box.addEventListener("mouseenter", ()=>{
    // only if in image mode
    if(qs("#pdpVideoWrap")?.style.display === "block") return;
    box.classList.add("is-hoverzoom");
    syncBg();
  });

  box.addEventListener("mouseleave", ()=>{
    box.classList.remove("is-hoverzoom");
    box.style.backgroundPosition = "50% 50%";
  });

  box.addEventListener("mousemove", (e)=>{
    if(qs("#pdpVideoWrap")?.style.display === "block") return;
    if(!box.classList.contains("is-hoverzoom")) return;
    const r = box.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    box.style.backgroundPosition = `${x}% ${y}%`;
  });
}

export function initProduct(){
  // zoom modal mount
  const modal = qs("#zoomModal");
  if(modal){
    qs("[data-zoom-close]")?.addEventListener("click", closeZoom);
    qs("#zoomBackdrop")?.addEventListener("click", closeZoom);
    qs("#zoomIn")?.addEventListener("click", zoomIn);
    qs("#zoomOut")?.addEventListener("click", zoomOut);
    qs("#zoomReset")?.addEventListener("click", zoomReset);

    // wheel zoom
    modal.addEventListener("wheel", (e)=>{
      if(modal.getAttribute("aria-hidden") !== "false") return;
      e.preventDefault();
      if(e.deltaY < 0) zoomIn(); else zoomOut();
    }, { passive:false });
  }

  render();
}
