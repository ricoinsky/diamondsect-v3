import { getUsers, saveUsers, getSession, setSession, clearSession, mergeGuestCartIntoUser, updateCartCount } from "./store.js";

function initials(name=""){
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return "DS";
  const a = parts[0]?.[0] || "D";
  const b = parts.length > 1 ? parts[parts.length-1]?.[0] : (parts[0]?.[1] || "S");
  return (a+b).toUpperCase();
}

function setAccountUI(){
  const session = getSession();
  const btn = document.querySelector("[data-account-btn]");
  const avatar = document.querySelector("[data-account-avatar]");
  const label = document.querySelector("[data-account-label]");

  if(!btn || !avatar || !label) return;

  if(session?.email){
    avatar.textContent = initials(session.name || session.email);
    label.textContent = session.name ? session.name.split(" ")[0] : "Conta";
    btn.setAttribute("data-state","logged");
  } else {
    avatar.textContent = "DS";
    label.textContent = "Entrar";
    btn.setAttribute("data-state","guest");
  }

  updateCartCount();
}

function openModal(){
  document.getElementById("authModal")?.setAttribute("aria-hidden","false");
}
function closeModal(){
  document.getElementById("authModal")?.setAttribute("aria-hidden","true");
}

function renderMode(mode){
  const m = document.getElementById("authMode");
  const title = document.getElementById("authTitle");
  const btn = document.getElementById("authSubmit");
  const switchLink = document.getElementById("authSwitch");
  const switchText = document.getElementById("authSwitchText");
  const nameField = document.getElementById("authNameWrap");

  if(!m || !title || !btn || !switchLink || !switchText || !nameField) return;

  m.value = mode;

  if(mode === "signup"){
    title.textContent = "Criar conta";
    btn.textContent = "Criar conta";
    switchText.textContent = "Já tem conta?";
    switchLink.textContent = "Entrar";
    nameField.style.display = "block";
  } else {
    title.textContent = "Entrar";
    btn.textContent = "Entrar";
    switchText.textContent = "Não tem conta?";
    switchLink.textContent = "Criar conta";
    nameField.style.display = "none";
  }
}

function toast(msg){
  const el = document.getElementById("authToast");
  if(!el) { alert(msg); return; }
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(window.__auth_toast);
  window.__auth_toast = setTimeout(()=>{ el.style.display="none"; }, 2200);
}

function onSubmit(){
  const mode = document.getElementById("authMode")?.value || "login";
  const name = (document.getElementById("authName")?.value || "").trim();
  const email = (document.getElementById("authEmail")?.value || "").trim().toLowerCase();
  const pass = (document.getElementById("authPass")?.value || "");

  if(!email || !pass) return toast("Preencha e-mail e senha.");

  const users = getUsers();

  if(mode === "signup"){
    if(!name) return toast("Informe seu nome.");
    if(users.some(u => (u.email||"").toLowerCase() === email)) return toast("Esse e-mail já está cadastrado.");

    users.push({ email, pass, name, createdAt: Date.now() });
    saveUsers(users);

    setSession({ email, name, ts: Date.now() });
    mergeGuestCartIntoUser();
    setAccountUI();
    closeModal();
    return toast("Conta criada! ✅");
  }

  // login
  const u = users.find(x => (x.email||"").toLowerCase() === email && x.pass === pass);
  if(!u) return toast("E-mail ou senha inválidos.");

  setSession({ email: u.email, name: u.name, ts: Date.now() });
  mergeGuestCartIntoUser();
  setAccountUI();
  closeModal();
  toast("Bem-vindo de volta! ✅");
}

function onLogout(){
  clearSession();
  setAccountUI();
  toast("Você saiu da conta.");
}

export function initAuth(){
  // modal wiring
  document.querySelectorAll("[data-open-auth]").forEach(b=> b.addEventListener("click", openModal));
  document.querySelectorAll("[data-close-auth]").forEach(b=> b.addEventListener("click", closeModal));
  document.getElementById("authBackdrop")?.addEventListener("click", closeModal);

  document.getElementById("authSwitch")?.addEventListener("click", ()=>{
    const mode = document.getElementById("authMode")?.value || "login";
    renderMode(mode === "login" ? "signup" : "login");
  });

  document.getElementById("authSubmit")?.addEventListener("click", onSubmit);

  // account button
  document.querySelector("[data-account-btn]")?.addEventListener("click", ()=>{
    const s = getSession();
    if(s?.email){
      // dropdown simples: confirma logout
      if(confirm("Deseja sair da conta?")){
        onLogout();
      }
    } else {
      renderMode("login");
      openModal();
    }
  });

  renderMode("login");
  setAccountUI();
}
