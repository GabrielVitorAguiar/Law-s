import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

const menu = document.getElementById("userMenu");
const trigger = document.getElementById("userMenuTrigger");
const panel = document.getElementById("userMenuPanel");
const logoutBtn = document.getElementById("logoutBtn");
const userMenuName = document.getElementById("userMenuName");
const userMenuEmail = document.getElementById("userMenuEmail");

function fecharMenu() {
  panel.hidden = true;
  trigger.setAttribute("aria-expanded", "false");
}

trigger.addEventListener("click", () => {
  const aberto = !panel.hidden;
  panel.hidden = aberto;
  trigger.setAttribute("aria-expanded", String(!aberto));
});

document.addEventListener("click", (event) => {
  if (!menu.contains(event.target)) fecharMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") fecharMenu();
});

logoutBtn.addEventListener("click", async () => {
  logoutBtn.disabled = true;

  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (erro) {
    console.error("Não foi possível encerrar a sessão.", erro);
    logoutBtn.disabled = false;
    alert("Não foi possível encerrar a sessão. Tente novamente.");
  }
});

document.querySelectorAll(".coming-soon").forEach((botao) => {
  botao.addEventListener("click", () => {
    alert("Esta área estará disponível em breve.");
  });
});

onAuthStateChanged(auth, (usuario) => {
  if (!usuario) return;

  userMenuName.textContent = usuario.displayName || "Minha conta";
  userMenuEmail.textContent = usuario.email || "";
});
