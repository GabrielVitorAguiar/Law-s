import { db } from "./firebase.js";
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const acessoPortal = document.getElementById("acessoPortal");
const codigoForm = document.getElementById("codigoForm");
const codigoInformado = document.getElementById("codigoInformado");
const erroCodigo = document.getElementById("erroCodigo");
const portalCliente = document.getElementById("portalCliente");
const boasVindasCliente = document.getElementById("boasVindasCliente");
const processosClientePortal = document.getElementById("processosClientePortal");
const acessarConversaGeral = document.getElementById("acessarConversaGeral");
const sairPortal = document.getElementById("sairPortal");

let cancelarPortal = null;

codigoForm.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  await acessarPortal(codigoInformado.value.trim().toUpperCase());
});

acessarConversaGeral.addEventListener("click", () => window.location.href = "processo-cliente.html");
sairPortal.addEventListener("click", encerrarPortal);

const codigoSalvo = sessionStorage.getItem("portalClienteCodigo");
if (codigoSalvo) acessarPortal(codigoSalvo);

async function acessarPortal(codigo) {
  if (!codigo) return;
  erroCodigo.textContent = "";

  try {
    const referencia = doc(db, "portais_cliente", codigo);
    const resultado = await getDoc(referencia);
    if (!resultado.exists() || resultado.data().codigo !== codigo) throw new Error("Código não encontrado.");

    sessionStorage.setItem("portalClienteCodigo", codigo);
    acessoPortal.hidden = true;
    portalCliente.hidden = false;
    escutarPortal(referencia);
  } catch (erro) {
    console.error("Não foi possível acessar o portal.", erro);
    erroCodigo.textContent = "Código inválido ou acesso indisponível. Verifique o código com seu advogado.";
    sessionStorage.removeItem("portalClienteCodigo");
  }
}

function escutarPortal(referencia) {
  cancelarPortal?.();
  cancelarPortal = onSnapshot(referencia, (resultado) => {
    if (!resultado.exists()) return encerrarPortal();
    const portal = resultado.data();
    boasVindasCliente.textContent = `Olá, ${portal.nomeCliente || "cliente"}`;
    renderizarProcessos(portal.processos || []);
  }, encerrarPortal);
}

function renderizarProcessos(processos) {
  if (processos.length === 0) {
    processosClientePortal.innerHTML = "<p class=\"empty-state\">Seu advogado ainda não vinculou processos a este portal.</p>";
    return;
  }

  processosClientePortal.innerHTML = processos.map((processo) => `
    <button class="portal-process-card" type="button" data-processo-id="${escapeHTML(processo.id)}">
      <span class="material-icons">folder_open</span>
      <span class="portal-process-card-content">
        <strong>${escapeHTML(processo.numero)}</strong>
        <small>${escapeHTML(processo.area || "Área não informada")}</small>
        <em>${escapeHTML(processo.status || "Status não informado")}</em>
      </span>
      <span class="material-icons portal-process-arrow">arrow_forward</span>
    </button>
  `).join("");

  processosClientePortal.querySelectorAll("[data-processo-id]").forEach((botao) => {
    botao.addEventListener("click", () => {
      window.location.href = `processo-cliente.html?processo=${encodeURIComponent(botao.dataset.processoId)}`;
    });
  });
}

function encerrarPortal() {
  cancelarPortal?.();
  cancelarPortal = null;
  sessionStorage.removeItem("portalClienteCodigo");
  portalCliente.hidden = true;
  acessoPortal.hidden = false;
  codigoInformado.value = "";
}

function escapeHTML(valor = "") {
  return String(valor).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
