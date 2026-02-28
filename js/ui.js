// Simple premium toast (no dependencies)
let toastTimer = null;

function ensureToast(){
  let el = document.getElementById("dsToast");
  if(el) return el;

  el = document.createElement("div");
  el.id = "dsToast";
  el.className = "ds-toast";
  el.setAttribute("role","status");
  el.setAttribute("aria-live","polite");
  el.innerHTML = `<div class="ds-toast__box"><span class="ds-toast__msg"></span></div>`;
  document.body.appendChild(el);
  return el;
}

export function toast(message){
  const el = ensureToast();
  const msg = el.querySelector(".ds-toast__msg");
  if(msg) msg.textContent = String(message || "");
  el.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove("is-on"), 2600);
}
