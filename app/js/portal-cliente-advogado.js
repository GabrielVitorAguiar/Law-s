import { db, storage } from "./firebase.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import {
  deleteObject,
  getBlob,
  listAll,
  ref,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-storage.js";
import { obterUsuarioAtual, validarDonoDoRegistro } from "./auth-user.js";

const clienteId = new URLSearchParams(window.location.search).get("id");
const tituloPortal = document.getElementById("tituloPortal");
const codigoAcesso = document.getElementById("codigoAcesso");
const codigoPortal = document.getElementById("codigoPortal");
const gerarCodigoBtn = document.getElementById("gerarCodigo");
const copiarCodigoBtn = document.getElementById("copiarCodigo");
const codigoFeedback = document.getElementById("codigoFeedback");
const conteudoPortal = document.getElementById("conteudoPortal");
const processosCompartilhados = document.getElementById("processosCompartilhados");
const atualizarProcessosBtn = document.getElementById("atualizarProcessos");
const novaMensagem = document.getElementById("novaMensagem");
const enviarMensagemBtn = document.getElementById("enviarMensagem");
const mensagemFeedback = document.getElementById("mensagemFeedback");
const mensagensEnviadas = document.getElementById("mensagensEnviadas");
const arquivoAdvogado = document.getElementById("arquivoAdvogado");
const enviarArquivoAdvogadoBtn = document.getElementById("enviarArquivoAdvogado");
const arquivosAdvogado = document.getElementById("arquivosAdvogado");
const arquivosCliente = document.getElementById("arquivosCliente");

let usuarioAtual;
let clienteAtual;
let portalAtual;
let cancelarMensagens = null;

if (!clienteId) window.location.href = "clientes.html";

gerarCodigoBtn.addEventListener("click", gerarPortal);
copiarCodigoBtn.addEventListener("click", copiarCodigo);
atualizarProcessosBtn.addEventListener("click", () => sincronizarProcessos(true));
enviarMensagemBtn.addEventListener("click", enviarMensagem);
enviarArquivoAdvogadoBtn.addEventListener("click", enviarArquivo);

async function inicializar() {
  usuarioAtual = await obterUsuarioAtual();

  const clienteSnapshot = await getDoc(doc(db, "clientes", clienteId));
  if (!clienteSnapshot.exists() || !validarDonoDoRegistro(clienteSnapshot.data(), usuarioAtual)) {
    window.location.href = "clientes.html";
    return;
  }

  clienteAtual = { id: clienteSnapshot.id, ...clienteSnapshot.data() };
  tituloPortal.textContent = `Área do cliente: ${clienteAtual.nome}`;
  await carregarPortal();
}

async function carregarPortal() {
  const resultado = await getDocs(
    query(collection(db, "portais_cliente"), where("advogadoId", "==", usuarioAtual.uid))
  );

  const documentoPortal = resultado.docs.find((item) => item.data().clienteId === clienteId);

  if (!documentoPortal) return;

  portalAtual = { id: documentoPortal.id, ...documentoPortal.data() };
  codigoPortal.textContent = portalAtual.codigo;
  codigoAcesso.hidden = false;
  gerarCodigoBtn.hidden = true;
  conteudoPortal.hidden = false;

  await sincronizarProcessos(false);
  escutarMensagens();
  carregarArquivos();
}

async function gerarPortal() {
  gerarCodigoBtn.disabled = true;
  codigoFeedback.textContent = "Gerando código seguro...";

  try {
    const codigo = gerarCodigoSeguro();
    const referencia = doc(db, "portais_cliente", codigo);
    const processos = await obterResumoProcessos();

    await setDoc(referencia, {
      codigo,
      clienteId,
      advogadoId: usuarioAtual.uid,
      nomeCliente: clienteAtual.nome,
      processos,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    });

    codigoFeedback.textContent = "Código criado. Copie-o e forneça-o ao cliente por um canal seguro.";
    await carregarPortal();
  } catch (erro) {
    console.error("Não foi possível criar o portal do cliente.", erro);
    codigoFeedback.textContent = "Não foi possível gerar o código. Tente novamente.";
    gerarCodigoBtn.disabled = false;
  }
}

async function sincronizarProcessos(mostrarFeedback) {
  if (!portalAtual) return;

  try {
    const processos = await obterResumoProcessos();
    await updateDoc(doc(db, "portais_cliente", portalAtual.codigo), {
      processos,
      atualizadoEm: serverTimestamp()
    });
    portalAtual.processos = processos;
    renderizarProcessos(processos);

    if (mostrarFeedback) {
      codigoFeedback.textContent = "Status atualizado no portal do cliente.";
    }
  } catch (erro) {
    console.error("Não foi possível atualizar os processos compartilhados.", erro);
    if (mostrarFeedback) codigoFeedback.textContent = "Não foi possível atualizar os status.";
  }
}

async function obterResumoProcessos() {
  const resultado = await getDocs(
    query(collection(db, "processos"), where("userId", "==", usuarioAtual.uid))
  );
  const nomeCliente = normalizar(clienteAtual.nome);

  return resultado.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((processo) => processo.clienteId === clienteId || normalizar(processo.cliente) === nomeCliente)
    .map((processo) => ({
      id: processo.id,
      numero: processo.numero || "Processo sem número",
      area: processo.area || "",
      status: processo.status || "Status não informado"
    }));
}

function renderizarProcessos(processos = []) {
  if (processos.length === 0) {
    processosCompartilhados.innerHTML = "<p class=\"empty-state\">Nenhum processo vinculado a este cliente.</p>";
    return;
  }

  processosCompartilhados.innerHTML = processos.map((processo) => `
    <article class="registro-card">
      <h3>${escapeHTML(processo.numero)}</h3>
      <p><strong>Área:</strong> ${escapeHTML(processo.area || "Não informada")}</p>
      <p><strong>Status:</strong> ${escapeHTML(processo.status)}</p>
    </article>
  `).join("");
}

function escutarMensagens() {
  cancelarMensagens?.();
  cancelarMensagens = onSnapshot(
    query(collection(db, "portais_cliente", portalAtual.codigo, "mensagens"), orderBy("dataEnvio", "desc")),
    (resultado) => {
      if (resultado.empty) {
        mensagensEnviadas.innerHTML = "<p class=\"empty-state\">Nenhuma mensagem enviada ao cliente.</p>";
        return;
      }

      mensagensEnviadas.innerHTML = resultado.docs.map((item) => {
        const mensagem = item.data();
        return `
          <article class="mensagem-card">
            <p>${escapeHTML(mensagem.texto)}</p>
            <small>${escapeHTML(formatarData(mensagem.dataEnvio))}</small>
          </article>
        `;
      }).join("");
    },
    (erro) => console.error("Não foi possível carregar as mensagens.", erro)
  );
}

async function enviarMensagem() {
  const texto = novaMensagem.value.trim();
  if (!texto || !portalAtual) return;

  enviarMensagemBtn.disabled = true;
  try {
    await addDoc(collection(db, "portais_cliente", portalAtual.codigo, "mensagens"), {
      texto,
      dataEnvio: serverTimestamp()
    });
    novaMensagem.value = "";
    mensagemFeedback.textContent = "Mensagem enviada ao cliente.";
  } catch (erro) {
    console.error("Não foi possível enviar a mensagem.", erro);
    mensagemFeedback.textContent = "Não foi possível enviar a mensagem.";
  } finally {
    enviarMensagemBtn.disabled = false;
  }
}

async function enviarArquivo() {
  const arquivo = arquivoAdvogado.files[0];
  if (!arquivo || !portalAtual) return;

  enviarArquivoAdvogadoBtn.disabled = true;
  try {
    const caminho = `portal_clientes/${portalAtual.codigo}/advogado/${Date.now()}-${normalizarNomeArquivo(arquivo.name)}`;
    await uploadBytes(ref(storage, caminho), arquivo);
    arquivoAdvogado.value = "";
    await carregarArquivos();
  } catch (erro) {
    console.error("Não foi possível disponibilizar o arquivo.", erro);
    alert("Não foi possível disponibilizar o arquivo.");
  } finally {
    enviarArquivoAdvogadoBtn.disabled = false;
  }
}

async function carregarArquivos() {
  await Promise.all([
    renderizarArquivos("advogado", arquivosAdvogado, true),
    renderizarArquivos("cliente", arquivosCliente, true)
  ]);
}

async function renderizarArquivos(tipo, destino, permitirExcluir) {
  const pasta = ref(storage, `portal_clientes/${portalAtual.codigo}/${tipo}`);
  const resultado = await listAll(pasta);

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

    if (permitirExcluir) {
      const excluir = document.createElement("button");
      excluir.type = "button";
      excluir.className = "deletar-btn";
      excluir.textContent = "Excluir";
      excluir.addEventListener("click", async () => {
        await deleteObject(arquivo);
        await carregarArquivos();
      });
      item.appendChild(excluir);
    }

    destino.appendChild(item);
  });
}

async function baixarArquivo(arquivo) {
  const blob = await getBlob(arquivo);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nomeExibicao(arquivo.name);
  link.click();
  URL.revokeObjectURL(link.href);
}

async function copiarCodigo() {
  await navigator.clipboard.writeText(portalAtual.codigo);
  codigoFeedback.textContent = "Código copiado.";
}

function gerarCodigoSeguro() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `LS-${[...bytes].map((byte) => alfabeto[byte % alfabeto.length]).join("")}`;
}

function normalizar(valor = "") {
  return String(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
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

inicializar();
