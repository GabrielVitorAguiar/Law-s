import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const CHAVE_TEMA = "laws-tema";

export function aplicarTema(temaEscuro) {
  document.body.classList.toggle("theme-dark", Boolean(temaEscuro));
  document.documentElement.style.colorScheme = temaEscuro ? "dark" : "light";
  localStorage.setItem(CHAVE_TEMA, temaEscuro ? "dark" : "light");
}

export function temaAtual() {
  return localStorage.getItem(CHAVE_TEMA) === "dark";
}

aplicarTema(temaAtual());

// Mantém a escolha do advogado ao trocar de dispositivo, sem depender apenas do navegador.
onAuthStateChanged(auth, async (usuario) => {
  if (!usuario) return;
  try {
    const perfil = await getDoc(doc(db, "usuarios", usuario.uid));
    const temaSalvo = perfil.data()?.preferencias?.temaEscuro;
    if (typeof temaSalvo === "boolean") aplicarTema(temaSalvo);
  } catch (erro) {
    console.warn("Não foi possível carregar a preferência de tema.", erro);
  }
});
