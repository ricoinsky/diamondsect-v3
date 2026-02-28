function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }

const slides = qsa(".hero__slide");
const prev = qs("#heroPrev");
const next = qs("#heroNext");
const dotsWrap = qs("#heroDots");

let idx = 0;
let timer = null;

function buildDots(){
  if(!dotsWrap) return;
  dotsWrap.innerHTML = "";
  slides.forEach((_, i) => {
    const b = document.createElement("button");
    b.className = "hero__dot" + (i === 0 ? " is-active" : "");
    b.type = "button";
    b.setAttribute("aria-label", `Ir para slide ${i+1}`);
    b.addEventListener("click", () => go(i));
    dotsWrap.appendChild(b);
  });
}

function setActive(i){
  slides.forEach(s => s.classList.remove("is-active"));
  const dots = qsa(".hero__dot");
  dots.forEach(d => d.classList.remove("is-active"));
  slides[i]?.classList.add("is-active");
  dots[i]?.classList.add("is-active");
}

function go(i){
  if(!slides.length) return;
  idx = (i + slides.length) % slides.length;
  setActive(idx);
  resetTimer();
}

function resetTimer(){
  if(timer) clearInterval(timer);
  timer = setInterval(() => go(idx + 1), 6500);
}

prev?.addEventListener("click", () => go(idx - 1));
next?.addEventListener("click", () => go(idx + 1));

buildDots();
setActive(0);
resetTimer();
