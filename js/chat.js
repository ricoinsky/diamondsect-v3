import { getSession } from "./store.js";

const FAQ = [
  { q:"Prazo de entrega", a:"O prazo e o frete aparecem no checkout. Você pode simular pelo CEP no carrinho." },
  { q:"Trocas e devoluções", a:"Você tem 7 dias para solicitar devolução após o recebimento (conforme Código de Defesa do Consumidor). Trocas seguem a política da loja." },
  { q:"Garantia", a:"Garantia de 30 dias contra defeitos de fabricação. Se precisar, chame no atendimento." },
  { q:"Tabela de medidas", a:"Na linha de alfaiataria, indicamos confirmar medidas antes do pedido. Se quiser, envie sua altura/peso e ajudamos." },
];

function el(tag, attrs={}, html=""){
  const e = document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k === "class") e.className = v;
    else if(k.startsWith("data-")) e.setAttribute(k, v);
    else e[k] = v;
  }
  if(html) e.innerHTML = html;
  return e;
}

function addBubble(container, text, me=false){
  const b = el("div", { class: "bubble" + (me ? " bubble--me" : "") });
  b.textContent = text;
  container.appendChild(b);
  container.scrollTop = container.scrollHeight;
}

function openChat(){
  document.getElementById("chatBox")?.setAttribute("aria-hidden","false");
}
function closeChat(){
  document.getElementById("chatBox")?.setAttribute("aria-hidden","true");
}

function sendText(){
  const input = document.getElementById("chatInput");
  const body = document.getElementById("chatBody");
  if(!input || !body) return;
  const text = (input.value || "").trim();
  if(!text) return;
  input.value = "";
  addBubble(body, text, true);
  setTimeout(()=> addBubble(body, "Recebido ✅ Um atendente vai te responder. Se quiser acelerar, clique em “Atendimento ao vivo”.", false), 300);
}

function liveSupport(){
  // Sem backend: abre WhatsApp como “ao vivo”
  const session = getSession();
  const name = session?.name || "";
  const msg = encodeURIComponent(`Olá! Preciso de ajuda no site Diamondsect. ${name ? "Meu nome é "+name+"." : ""}`);
  // troque o número abaixo depois
  const phone = "5500000000000"; // 55 + DDD + número
  window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
}

export function initChat(){
  const wrap = document.body;

  // FAB
  const fab = el("div", { class:"chatfab" });
  const fabBtn = el("button", { class:"chatfab__btn", type:"button", "aria-label":"Abrir chat" }, `
    <span class="chatfab__dot" aria-hidden="true"></span>
    <span style="font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:12px">Ajuda</span>
  `);
  fab.appendChild(fabBtn);

  // Box
  const box = el("div", { class:"chatbox", id:"chatBox", "aria-hidden":"true" });
  box.innerHTML = `
    <div class="chatpanel">
      <div class="chathead">
        <div class="t">Atendimento Diamondsect</div>
        <button class="x" type="button" data-chat-close>Fechar</button>
      </div>
      <div class="chatbody" id="chatBody"></div>
      <div class="chatfoot">
        <div class="row">
          <input id="chatInput" type="text" placeholder="Digite sua dúvida…" />
          <button id="chatSend" type="button">Enviar</button>
        </div>
        <button class="btn livebtn" type="button" id="chatLive">Atendimento ao vivo</button>
      </div>
    </div>
  `;
  wrap.appendChild(fab);
  wrap.appendChild(box);

  const body = document.getElementById("chatBody");
  addBubble(body, "Olá! 👋 Selecione uma pergunta rápida:", false);

  const quick = el("div", { class:"quick" });
  FAQ.forEach(item=>{
    const chip = el("button", { class:"qchip", type:"button" });
    chip.textContent = item.q;
    chip.addEventListener("click", ()=>{
      addBubble(body, item.q, true);
      setTimeout(()=> addBubble(body, item.a, false), 220);
    });
    quick.appendChild(chip);
  });
  body.appendChild(quick);

  fabBtn.addEventListener("click", ()=>{
    const open = document.getElementById("chatBox")?.getAttribute("aria-hidden") === "false";
    if(open) closeChat(); else openChat();
  });
  document.querySelector("[data-chat-close]")?.addEventListener("click", closeChat);
  document.getElementById("chatSend")?.addEventListener("click", sendText);
  document.getElementById("chatInput")?.addEventListener("keydown", (e)=>{
    if(e.key === "Enter") sendText();
  });
  document.getElementById("chatLive")?.addEventListener("click", liveSupport);
}
