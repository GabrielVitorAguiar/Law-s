import { db, storage } from "./firebase.js";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import {
  getBlob,
  listAll,
  ref,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-storage.js";

const acessoPortal = document.getElementById("acessoPortal");
const codigoForm = document.getElementById("codigoForm");
const codigoInformado = document.getElementById("codigoInformado");
const erroCodigo = document.getElementById("erroCodigo");
const portalCliente = document.getElementById("portalCliente");
const boasVindasCliente = document.getElementById("boasVindasCliente");
const processosClientePortal = document.getElementById("processosClientePortal");
const mensagensCliente = document.getElementById("mensagensCliente");
const abrirDocumentosAdvogado = document.getElementById("abrirDocumentosAdvogado");
const documentosAdvogadoCliente = document.getElementById("documentosAdvogadoCliente");
const arquivoCliente = document.getElementById("arquivoCliente");
const enviarArquivoCliente = document.getElementById("enviarArquivoCliente");
const arquivoClienteFeedback = document.getElementById("arquivoClienteFeedback");
const documentosEnviadosCliente = document.getElementById("documentosEnviadosCliente");
const sairPortal = document.getElementById("sairPortal");

let codigoAtual = null;
let cancelarPortal = null;
let cancelarMensagens = null;

codigoForm.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  await acessarPortal(codigoInformado.value.trim().toUpperCase());
});

abrirDocumentosAdvogado.addEventListener("click", async () => {
  documentosAdvogadoCliente.hidden = !documentosAdvogadoCliente.hidden;
  if (!documentosAdvogadoCliente.hidden) await listarArquivos("advogado", documentosAdvogadoCliente);
});

enviarArquivoCliente.addEventListener("click", enviarArquivo);
sairPortal.addEventListener("click", encerrarPortal);

const codigoSalvo = sessionStorage.getItem("portalClienteCodigo");
if (codigoSalvo) acessarPortal(codigoSalvo);

async function acessarPortal(codigo) {
  if (!codigo) return;

  erroCodigo.textContent = "";
  try {
    const referencia = doc(db, "portais_cliente", codigo);
    const resultado = await getDoc(referencia);

    if (!resultado.exists() || resultado.data().codigo !== codigo) {
      throw new Error("Código não encontrado.");
    }

    codigoAtual = codigo;
    sessionStorage.setItem("portalClienteCodigo", codigo);
    acessoPortal.hidden = true;
    portalCliente.hidden = false;
    escutarPortal(referencia);
    escutarMensagens();
    listarArquivos("cliente", documentosEnviadosCliente);
  } catch (erro) {
    console.error("Não foi possível acessar o portal.", erro);
    erroCodigo.textContent = "Código inválido ou acesso indisponível. Verifique o código com seu advogado.";
    sessionStorage.removeItem("portalClienteCodigo");
  }
}

function escutarPortal(referencia) {
  cancelarPortal?.();
  cancelarPortal = onSnapshot(referencia, (resultado) => {
    if (!resultado.exists()) {
      encerrarPortal();
      return;
    }

    const portal = resultado.data();
    boasVindasCliente.textContent = `Olá, ${portal.nomeCliente || "cliente"}`;
    renderizarProcessos(portal.processos || []);
  }, () => encerrarPortal());
}

function escutarMensagens() {
  cancelarMensagens?.();
  cancelarMensagens = onSnapshot(
    query(collection(db, "portais_cliente", codigoAtual, "mensagens"), orderBy("dataEnvio", "desc")),
    (resultado) => {
      if (resultado.empty) {
        mensagensCliente.innerHTML = "<p class=\"empty-state\">Nenhuma mensagem do advogado até o momento.</p>";
        return;
      }

      mensagensCliente.innerHTML = resultado.docs.map((item) => {
        const mensagem = item.data();
        return `
          <article class="mensagem-card">
            <p>${escapeHTML(mensagem.texto)}</p>
            <small>${escapeHTML(formatarData(mensagem.dataEnvio))}</small>
          </article>
        `;
      }).join("");
    }, () => {
      mensagensCliente.innerHTML = "<p class=\"empty-state\">Não foi possível carregar as mensagens.</p>";
    }
  );
}

function renderizarProcessos(processos) {
  if (processos.length === 0) {
    processosClientePortal.innerHTML = "<p class=\"empty-state\">Nenhum processo disponível.</p>";
    return;
  }

  processosClientePortal.innerHTML = processos.map((processo) => `
    <article class="registro-card">
      <h3>${escapeHTML(processo.numero)}</h3>
      <p><strong>Área:</strong> ${escapeHTML(processo.area || "Não informada")}</p>
      <p><strong>Status:</strong> ${escapeHTML(processo.status || "Não informado")}</p>
    </article>
  `).join("");
}

async function enviarArquivo() {
  const arquivo = arquivoCliente.files[0];
  if (!arquivo || !codigoAtual) return;

  if (arquivo.size >= 10 * 1024 * 1024) {
    arquivoClienteFeedback.textContent = "O arquivo deve ter menos de 10 MB.";
    return;
  }

  enviarArquivoCliente.disabled = true;
  arquivoClienteFeedback.textContent = "Enviando documento...";
  try {
    const caminho = `portal_clientes/${codigoAtual}/cliente/${Date.now()}-${normalizarNomeArquivo(arquivo.name)}`;
    await uploadBytes(ref(storage, caminho), arquivo);
    arquivoCliente.value = "";
    arquivoClienteFeedback.textContent = "Documento enviado ao advogado.";
    await listarArquivos("cliente", documentosEnviadosCliente);
  } catch (erro) {
    console.error("Não foi possível enviar o documento.", erro);
    arquivoClienteFeedback.textContent = "Não foi possível enviar o documento.";
  } finally {
    enviarArquivoCliente.disabled = false;
  }
}

async function listarArquivos(tipo, destino) {
  try {
    const resultado = await listAll(ref(storage, `portal_clientes/${codigoAtual}/${tipo}`));
    if (resultado.items.length === 0) {
      destino.innerHTML = "<p class=\"empty-state\">Nenhum documento nesta pasta.</p>";
      return;
    }

    destino.innerHTML = "";
    resultado.items.forEach((arquivo) => {
      const item = document.createElement("div");
      item.className = "arquivo-item";
      item.innerHTML = `<span>${escapeHTML(nomeExibicao(arquivo.name))}</span>`;

      const baixar = document.createElement("button");
      baixar.type = "button";
      baixar.className = "secondary-btn";
      baixar.textContent = "Baixar";
      baixar.addEventListener("click", () => baixarArquivo(arquivo));
      item.appendChild(baixar);
      destino.appendChild(item);
    });
  } catch (erro) {
    console.error("Não foi possível listar os documentos.", erro);
    destino.innerHTML = "<p class=\"empty-state\">Não foi possível carregar os documentos.</p>";
  }
}

async function baixarArquivo(arquivo) {
  const blob = await getBlob(arquivo);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nomeExibicao(arquivo.name);
  link.click();
  URL.revokeObjectURL(link.href);
}

function encerrarPortal() {
  cancelarPortal?.();
  cancelarMensagens?.();
  cancelarPortal = null;
  cancelarMensagens = null;
  codigoAtual = null;
  sessionStorage.removeItem("portalClienteCodigo");
  portalCliente.hidden = true;
  acessoPortal.hidden = false;
  codigoInformado.value = "";
}

function normalizarNomeArquivo(nome) {
  return String(nome).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, "-");
}

function nomeExibicao(nome) {
  return nome.replace(/^\d+-/, "");
}

function formatarData(data) {
  const dataConvertida = data?.toDate ? data.toDate() : new Date(data);
  return Number.isNaN(dataConvertida.getTime()) ? "Enviada agora" : dataConvertida.toLocaleString("pt-BR");
}

function escapeHTML(valor = "") {
  return String(valor).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
