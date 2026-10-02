import { db, storage } from "./firebase.js";
import { collection, doc, getDoc, onSnapshot, orderBy, query } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { getBlob, listAll, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-storage.js";

const codigo = sessionStorage.getItem("portalClienteCodigo");
const processoId = new URLSearchParams(window.location.search).get("processo");
const contexto = processoId || "geral";
const voltarPortal = document.getElementById("voltarPortal");
const sairPortal = document.getElementById("sairPortal");
const tituloContexto = document.getElementById("tituloContexto");
const subtituloContexto = document.getElementById("subtituloContexto");
const rotuloContexto = document.getElementById("rotuloContexto");
const iconeContexto = document.getElementById("iconeContexto");
const secaoStatus = document.getElementById("secaoStatus");
const statusProcesso = document.getElementById("statusProcesso");
const mensagensCliente = document.getElementById("mensagensCliente");
const abrirDocumentosAdvogado = document.getElementById("abrirDocumentosAdvogado");
const documentosAdvogadoCliente = document.getElementById("documentosAdvogadoCliente");
const arquivoCliente = document.getElementById("arquivoCliente");
const enviarArquivoCliente = document.getElementById("enviarArquivoCliente");
const arquivoClienteFeedback = document.getElementById("arquivoClienteFeedback");
const documentosEnviadosCliente = document.getElementById("documentosEnviadosCliente");

let cancelarMensagens = null;

if (!codigo) window.location.href = "portal-cliente.html";
voltarPortal.addEventListener("click", () => window.location.href = "portal-cliente.html");
sairPortal.addEventListener("click", () => { sessionStorage.removeItem("portalClienteCodigo"); window.location.href = "portal-cliente.html"; });
abrirDocumentosAdvogado.addEventListener("click", async () => {
  documentosAdvogadoCliente.hidden = !documentosAdvogadoCliente.hidden;
  if (!documentosAdvogadoCliente.hidden) await listarArquivos("advogado", documentosAdvogadoCliente);
});
enviarArquivoCliente.addEventListener("click", enviarArquivo);

async function inicializar() {
  try {
    const portal = await getDoc(doc(db, "portais_cliente", codigo));
    if (!portal.exists()) throw new Error("Portal indisponível");
    const processo = processoId ? (portal.data().processos || []).find((item) => item.id === processoId) : null;
    if (processoId && !processo) throw new Error("Processo indisponível");
    renderizarContexto(processo);
    escutarMensagens();
    listarArquivos("cliente", documentosEnviadosCliente);
  } catch (erro) {
    console.error(erro);
    sessionStorage.removeItem("portalClienteCodigo");
    window.location.href = "portal-cliente.html";
  }
}

function renderizarContexto(processo) {
  if (!processo) {
    rotuloContexto.textContent = "CONVERSA GERAL";
    tituloContexto.textContent = "Conversas e documentos gerais";
    subtituloContexto.textContent = "Informações que não pertencem a um processo específico.";
    iconeContexto.textContent = "chat";
    return;
  }
  tituloContexto.textContent = processo.numero;
  subtituloContexto.textContent = processo.area || "Área não informada";
  secaoStatus.hidden = false;
  statusProcesso.innerHTML = `<article class="registro-card"><p><strong>Status atual:</strong> ${escapeHTML(processo.status || "Não informado")}</p></article>`;
}

function escutarMensagens() {
  cancelarMensagens?.();
  cancelarMensagens = onSnapshot(query(collection(db, "portais_cliente", codigo, "mensagens"), orderBy("dataEnvio", "desc")), (resultado) => {
    const mensagens = resultado.docs.map((item) => item.data()).filter((mensagem) => (mensagem.processoId || "geral") === contexto);
    mensagensCliente.innerHTML = mensagens.length ? mensagens.map((mensagem) => `<article class="mensagem-card"><p>${escapeHTML(mensagem.texto)}</p><small>${escapeHTML(formatarData(mensagem.dataEnvio))}</small></article>`).join("") : "<p class=\"empty-state\">Nenhuma mensagem até o momento.</p>";
  });
}

async function enviarArquivo() {
  const arquivo = arquivoCliente.files[0];
  if (!arquivo) return;
  if (arquivo.size >= 10 * 1024 * 1024) { arquivoClienteFeedback.textContent = "O arquivo deve ter menos de 10 MB."; return; }
  enviarArquivoCliente.disabled = true;
  try {
    await uploadBytes(ref(storage, `portal_clientes/${codigo}/cliente/${contexto}/${Date.now()}-${normalizarNomeArquivo(arquivo.name)}`), arquivo);
    arquivoCliente.value = "";
    arquivoClienteFeedback.textContent = "Documento enviado ao advogado.";
    await listarArquivos("cliente", documentosEnviadosCliente);
  } catch (erro) { arquivoClienteFeedback.textContent = "Não foi possível enviar o documento."; } finally { enviarArquivoCliente.disabled = false; }
}

async function listarArquivos(tipo, destino) {
  try {
    const resultado = await listAll(ref(storage, `portal_clientes/${codigo}/${tipo}/${contexto}`));
    destino.innerHTML = resultado.items.length ? "" : "<p class=\"empty-state\">Nenhum documento nesta pasta.</p>";
    resultado.items.forEach((arquivo) => {
      const item = document.createElement("div"); item.className = "arquivo-item"; item.innerHTML = `<span>${escapeHTML(nomeExibicao(arquivo.name))}</span>`;
      const baixar = document.createElement("button"); baixar.type = "button"; baixar.className = "secondary-btn"; baixar.textContent = "Baixar"; baixar.onclick = () => baixarArquivo(arquivo);
      item.appendChild(baixar); destino.appendChild(item);
    });
  } catch { destino.innerHTML = "<p class=\"empty-state\">Não foi possível carregar os documentos.</p>"; }
}

async function baixarArquivo(arquivo) { const blob = await getBlob(arquivo); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = nomeExibicao(arquivo.name); link.click(); URL.revokeObjectURL(link.href); }
function normalizarNomeArquivo(nome) { return String(nome).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, "-"); }
function nomeExibicao(nome) { return nome.replace(/^\d+-/, ""); }
function formatarData(data) { const valor = data?.toDate ? data.toDate() : new Date(data); return Number.isNaN(valor.getTime()) ? "Enviada agora" : valor.toLocaleString("pt-BR"); }
function escapeHTML(valor = "") { return String(valor).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
inicializar();
