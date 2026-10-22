import { auth, db } from "./firebase.js";
import { doc, getDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { aplicarTema, temaAtual } from "./theme.js";

const perfilForm = document.getElementById("perfilAdvogadoForm");
const configForm = document.getElementById("configuracoes");
const profileEmail = document.getElementById("profileEmail");
const perfilFeedback = document.getElementById("perfilFeedback");
const configFeedback = document.getElementById("configFeedback");
const temaEscuro = document.getElementById("temaEscuro");
let usuario;

onAuthStateChanged(auth, async (atual) => {
  if (!atual) { window.location.href = "login.html"; return; }
  usuario = atual;
  profileEmail.textContent = atual.email || "";
  document.getElementById("nome").value = atual.displayName || "";
  document.getElementById("email").value = atual.email || "";
  temaEscuro.checked = temaAtual();
  const salvo = await getDoc(doc(db, "usuarios", atual.uid));
  if (salvo.exists()) preencher(salvo.data());
});

perfilForm.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  await salvar({
    nome: document.getElementById("nome").value.trim(),
    telefone: document.getElementById("telefone").value.trim(),
    oab: document.getElementById("oab").value.trim(),
    escritorio: document.getElementById("escritorio").value.trim()
  }, perfilFeedback, "Perfil salvo com sucesso.");
});

configForm.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  await salvar({
    preferencias: {
      notificacoesAtivas: document.getElementById("notificacoesAtivas").checked,
      lembretesAtivos: document.getElementById("lembretesAtivos").checked,
      temaEscuro: temaEscuro.checked
    }
  }, configFeedback, "Preferências atualizadas.");
});

temaEscuro.addEventListener("change", () => aplicarTema(temaEscuro.checked));

function preencher(dados) {
  document.getElementById("nome").value = dados.nome || document.getElementById("nome").value;
  document.getElementById("telefone").value = dados.telefone || "";
  document.getElementById("oab").value = dados.oab || "";
  document.getElementById("escritorio").value = dados.escritorio || "";
  document.getElementById("notificacoesAtivas").checked = dados.preferencias?.notificacoesAtivas ?? true;
  document.getElementById("lembretesAtivos").checked = dados.preferencias?.lembretesAtivos ?? true;
  temaEscuro.checked = dados.preferencias?.temaEscuro ?? temaAtual();
  aplicarTema(temaEscuro.checked);
}

async function salvar(dados, feedback, sucesso) {
  try {
    await setDoc(doc(db, "usuarios", usuario.uid), { ...dados, atualizadoEm: serverTimestamp() }, { merge: true });
    feedback.textContent = sucesso;
  } catch (erro) { console.error(erro); feedback.textContent = "Não foi possível salvar as alterações."; }
}
