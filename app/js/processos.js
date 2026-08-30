import { db, storage } from "./firebase.js";

import {
  collection,
  addDoc,
  setDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-storage.js";

import { registrarRecente } from "./recentes-store.js";
import { obterUsuarioAtual, validarDonoDoRegistro } from "./auth-user.js";

const form = document.getElementById("processoForm");
const lista = document.getElementById("listaProcessos");
const pesquisa = document.getElementById("pesquisa");
const novoProcessoBtn = document.getElementById("novoProcessoBtn");
const cancelarEdicaoBtn = document.getElementById("cancelarEdicao");
const processosToolbar = document.getElementById("processosToolbar");
const voltarListaProcessos = document.getElementById("voltarListaProcessos");
const clienteSelect = document.getElementById("clienteId");
const arquivoInput = document.getElementById("arquivo");
const arquivoAtual = document.getElementById("arquivoAtual");
const notificacoesBtn = document.getElementById("notificacoesBtn");
const notificacoesBadge = document.getElementById("notificacoesBadge");
const painelNotificacoes = document.getElementById("painelNotificacoes");
const listaNotificacoes = document.getElementById("listaNotificacoes");
const params = new URLSearchParams(window.location.search);
const processoIdSelecionado = params.get("id");

let processos = [];
let clientes = [];
let editandoId = null;
let processoEmEdicao = null;
let usuarioAtual = null;
let processosMonitorados = [];
let notificacoes = [];
let cancelarEscutaMovimentacoes = [];

novoProcessoBtn.addEventListener("click", () => {

  abrirFormulario();
  document.getElementById("numero").focus();

});

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  const clienteSelecionado = clientes.find((cliente) => cliente.id === clienteSelect.value);

  const dados = {
    userId: usuarioAtual.uid,
    numero: document.getElementById("numero").value.trim(),
    clienteId: clienteSelect.value,
    cliente: clienteSelecionado?.nome || "",
    area: document.getElementById("area").value.trim(),
    status: document.getElementById("status").value.trim(),
    descricao: document.getElementById("descricao").value.trim()
  };

  const arquivo = arquivoInput.files[0];

  try {

    if (editandoId) {

      await updateDoc(doc(db, "processos", editandoId), dados);

      if (arquivo) {
        await substituirArquivo(editandoId, processoEmEdicao, arquivo);
      }

    } else {

      const novoDoc = await addDoc(collection(db, "processos"), {
        ...dados,
        criadoEm: new Date()
      });

      if (arquivo) {
        await substituirArquivo(novoDoc.id, null, arquivo);
      }

    }

    form.reset();
    limparArquivoAtual();

    if (processoIdSelecionado) {
      window.location.href = `processos.html?id=${processoIdSelecionado}`;
      return;
    }

    fecharFormulario();
    carregarProcessos();

  } catch (error) {

    console.error(error);

  }

});

async function inicializar() {

  usuarioAtual = await obterUsuarioAtual();
  await carregarClientes();
  await carregarProcessos();
  escutarProcessosMonitorados();
  escutarNotificacoes();

}

function escutarProcessosMonitorados() {

  onSnapshot(
    query(
      collection(db, "processos_monitorados"),
      where("advogadoResponsavelId", "==", usuarioAtual.uid)
    ),
    (snapshot) => {

      processosMonitorados = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
      }));

      renderizarProcessos(processos);

    },
    (erro) => console.error("Não foi possível acompanhar os processos monitorados.", erro)
  );

}

function escutarNotificacoes() {

  onSnapshot(
    query(
      collection(db, "notificacoes_usuario"),
      where("usuarioId", "==", usuarioAtual.uid)
    ),
    (snapshot) => {

      notificacoes = snapshot.docs
        .map((documento) => ({ id: documento.id, ...documento.data() }))
        .filter((notificacao) => notificacao.lida === false)
        .sort((a, b) => dataEmMilissegundos(b.dataHora) - dataEmMilissegundos(a.dataHora));

      notificacoesBadge.textContent = notificacoes.length;
      notificacoesBadge.hidden = notificacoes.length === 0;
      renderizarNotificacoes();

    },
    (erro) => console.error("Não foi possível acompanhar as notificações.", erro)
  );

}

async function carregarClientes() {

  clientes = [];

  const querySnapshot = await getDocs(
    query(collection(db, "clientes"), where("userId", "==", usuarioAtual.uid))
  );

  querySnapshot.forEach((documento) => {

    clientes.push({
      id: documento.id,
      ...documento.data()
    });

  });

  clientes.sort((a, b) => valorTexto(a.nome).localeCompare(valorTexto(b.nome), "pt-BR"));

  renderizarClientesNoSelect();

}

function renderizarClientesNoSelect() {

  clienteSelect.innerHTML = `<option value="">Selecione o cliente</option>`;

  clientes.forEach((cliente) => {

    const option = document.createElement("option");

    option.value = cliente.id;
    option.textContent = cliente.nome;

    clienteSelect.appendChild(option);

  });

}

async function carregarProcessos() {

  lista.innerHTML = "";
  processos = [];

  const querySnapshot = await getDocs(
    query(collection(db, "processos"), where("userId", "==", usuarioAtual.uid))
  );

  querySnapshot.forEach((documento) => {

    processos.push({
      id: documento.id,
      ...documento.data()
    });

  });

  processos.sort((a, b) => valorTexto(a.numero).localeCompare(valorTexto(b.numero), "pt-BR"));

  if (processoIdSelecionado) {

    const processoSelecionado = processos.find((processo) => processo.id === processoIdSelecionado);

    processosToolbar.hidden = true;
    voltarListaProcessos.hidden = false;

    if (processoSelecionado && validarDonoDoRegistro(processoSelecionado, usuarioAtual)) {
      registrarRecente({
        chave: `processo:${processoSelecionado.id}`,
        tipo: "processo",
        nome: processoSelecionado.numero,
        link: `processos.html?id=${processoSelecionado.id}`
      });

      renderizarProcessos([processoSelecionado], true);
      editarProcesso(processoSelecionado);
      return;
    }

    lista.innerHTML = `<p class="empty-state">Processo não encontrado.</p>`;
    return;

  }

  renderizarProcessos(processos);

}

function renderizarProcessos(listaProcessos, modoDetalhe = false) {

  cancelarEscutaMovimentacoes.forEach((cancelar) => cancelar());
  cancelarEscutaMovimentacoes = [];
  lista.innerHTML = "";

  if (listaProcessos.length === 0) {

    lista.innerHTML = `<p class="empty-state">Nenhum processo encontrado.</p>`;
    return;

  }

  listaProcessos.forEach((processo) => {

    const div = document.createElement("div");
    const monitorado = obterMonitoramentoDoProcesso(processo);

    div.classList.add("registro-card");
    div.classList.toggle("clicavel", !modoDetalhe);

    div.innerHTML = `

      <h3>${escapeHTML(processo.numero)}</h3>

      <p><strong>Cliente:</strong> ${escapeHTML(nomeClienteDoProcesso(processo))}</p>

      <p><strong>Área:</strong> ${escapeHTML(processo.area)}</p>

      <p><strong>Status:</strong> ${escapeHTML(processo.status)}</p>

      <p>${escapeHTML(processo.descricao)}</p>

      ${renderizarArquivo(processo)}

      ${renderizarMonitoramento(processo, monitorado)}

      <div class="acoes">

        <button class="editar-btn" type="button">
          Editar
        </button>

        <button class="deletar-btn" type="button">
          Excluir
        </button>

      </div>

    `;

    if (!modoDetalhe) {

      div.addEventListener("click", () => {

        window.location.href = `processos.html?id=${processo.id}`;

      });

    }

    div.querySelector(".editar-btn")
      .addEventListener("click", (event) => {

        event.stopPropagation();
        editarProcesso(processo);

      });

    div.querySelector(".deletar-btn")
      .addEventListener("click", (event) => {

        event.stopPropagation();
        excluirProcesso(processo);

      });

    const formularioMonitoramento = div.querySelector(".monitoramento-form");

    if (formularioMonitoramento) {
      formularioMonitoramento.addEventListener("click", (event) => event.stopPropagation());
      formularioMonitoramento.addEventListener("submit", (event) => {
        event.stopPropagation();
        cadastrarMonitoramento(event, processo);
      });
    }

    const botaoTimeline = div.querySelector(".timeline-btn");

    if (botaoTimeline && monitorado) {
      botaoTimeline.addEventListener("click", (event) => {
        event.stopPropagation();
        alternarTimeline(monitorado.id, div.querySelector(".timeline-movimentacoes"));
      });
    }

    div.querySelector(".monitoramento-processo")
      .addEventListener("click", (event) => event.stopPropagation());

    lista.appendChild(div);

  });

}

function obterMonitoramentoDoProcesso(processo) {

  return processosMonitorados.find((monitorado) => {
    return monitorado.clienteId === processo.clienteId
      && normalizarNumeroCnj(monitorado.numeroProcesso) === normalizarNumeroCnj(processo.numero);
  });

}

function renderizarMonitoramento(processo, monitorado) {

  if (!monitorado) {
    return `
      <section class="monitoramento-processo">
        <h4>Acompanhamento DataJud</h4>
        <p>Cadastre este processo para acompanhar movimentações automaticamente.</p>
        <form class="monitoramento-form">
          <input class="monitor-numero" type="text" value="${escapeHTML(processo.numero)}" placeholder="Número CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO" required>
          <input class="monitor-tribunal" type="text" placeholder="Tribunal (ex.: TRT4, TJSC)" required>
          <button class="primary-btn" type="submit">Monitorar via DataJud</button>
          <p class="monitoramento-erro" aria-live="polite"></p>
        </form>
      </section>
    `;
  }

  const estado = monitorado.primeiraConsultaFeita
    ? "Consulta inicial concluída"
    : "Aguardando primeira consulta (até 15 minutos)";

  return `
    <section class="monitoramento-processo">
      <h4>Acompanhamento DataJud</h4>
      <p class="monitoramento-status">${escapeHTML(estado)}</p>
      <p><strong>Tribunal:</strong> ${escapeHTML(monitorado.tribunal)}</p>
      <p><strong>Classe:</strong> ${escapeHTML(monitorado.classeProcessual || "Ainda não informada")}</p>
      <p><strong>Assunto:</strong> ${escapeHTML(monitorado.assunto || "Ainda não informado")}</p>
      <p><strong>Órgão julgador:</strong> ${escapeHTML(monitorado.orgaoJulgador || "Ainda não informado")}</p>
      ${monitorado.primeiraConsultaFeita ? `
        <button class="secondary-btn timeline-btn" type="button">Ver movimentações</button>
        <div class="timeline-movimentacoes" hidden></div>
      ` : ""}
    </section>
  `;

}

async function cadastrarMonitoramento(event, processo) {

  const formulario = event.currentTarget;
  const numeroProcesso = formulario.querySelector(".monitor-numero").value.trim();
  const tribunal = formulario.querySelector(".monitor-tribunal").value.trim().toUpperCase();
  const erroElement = formulario.querySelector(".monitoramento-erro");

  if (!numeroCnjValido(numeroProcesso)) {
    erroElement.textContent = "Informe o número no formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO.";
    return;
  }

  erroElement.textContent = "";

  try {
    const referencia = doc(collection(db, "processos_monitorados"));

    await setDoc(referencia, {
      id: referencia.id,
      numeroProcesso,
      tribunal,
      clienteId: processo.clienteId,
      advogadoResponsavelId: usuarioAtual.uid,
      dataCadastro: serverTimestamp(),
      ativo: true,
      primeiraConsultaFeita: false,
      ultimaConsulta: null,
      ultimaMovimentacaoId: null,
      classeProcessual: null,
      assunto: null,
      orgaoJulgador: null
    });
  } catch (erro) {
    console.error("Não foi possível cadastrar o monitoramento.", erro);
    erroElement.textContent = "Não foi possível iniciar o monitoramento. Tente novamente.";
  }

}

function alternarTimeline(processoMonitoradoId, container) {

  if (!container.hidden) {
    container.hidden = true;
    return;
  }

  container.hidden = false;
  container.innerHTML = "<p>Carregando movimentações...</p>";

  const cancelar = onSnapshot(
    query(
      collection(db, "processos_monitorados", processoMonitoradoId, "movimentacoes"),
      orderBy("dataHora", "desc")
    ),
    (snapshot) => {
      if (snapshot.empty) {
        container.innerHTML = "<p>Nenhuma movimentação encontrada.</p>";
        return;
      }

      container.innerHTML = snapshot.docs.map((documento) => {
        const movimentacao = documento.data();
        return `
          <article class="movimentacao-item">
            <strong>${escapeHTML(movimentacao.descricao)}</strong>
            <span>${escapeHTML(formatarData(movimentacao.dataHora))}</span>
            ${movimentacao.complementos?.length ? `<p>${escapeHTML(movimentacao.complementos.join(" · "))}</p>` : ""}
          </article>
        `;
      }).join("");
    },
    (erro) => {
      console.error("Não foi possível carregar a timeline.", erro);
      container.innerHTML = "<p>Não foi possível carregar as movimentações.</p>";
    }
  );

  cancelarEscutaMovimentacoes.push(cancelar);

}

function editarProcesso(processo) {

  document.getElementById("numero").value = processo.numero || "";
  clienteSelect.value = processo.clienteId || clienteIdPorNome(processo.cliente) || "";
  document.getElementById("area").value = processo.area || "";
  document.getElementById("status").value = processo.status || "";
  document.getElementById("descricao").value = processo.descricao || "";

  editandoId = processo.id;
  processoEmEdicao = processo;
  abrirFormulario();
  mostrarArquivoAtual(processo);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}

async function excluirProcesso(processo) {

  const confirmar = confirm("Deseja realmente excluir este processo?");

  if (!confirmar) return;

  try {

    if (processo.arquivoPath) {
      await excluirArquivo(processo.arquivoPath);
    }

    await deleteDoc(doc(db, "processos", processo.id));

    if (processoIdSelecionado) {
      window.location.href = "processos.html";
      return;
    }

    carregarProcessos();

  } catch (error) {

    console.error(error);

  }

}

pesquisa.addEventListener("input", () => {

  const valor = valorTexto(pesquisa.value);

  const filtrados = processos.filter((processo) => {

    const processoPesquisavel = {
      ...processo,
      cliente: nomeClienteDoProcesso(processo)
    };

    return Object.values(processoPesquisavel).some((campo) => {

      if (campo === null || campo === undefined) return false;

      return valorTexto(campo).includes(valor);

    });

  });

  renderizarProcessos(filtrados);

});

notificacoesBtn.addEventListener("click", () => {

  painelNotificacoes.hidden = !painelNotificacoes.hidden;

});

function renderizarNotificacoes() {

  if (notificacoes.length === 0) {
    listaNotificacoes.innerHTML = "<p>Nenhuma notificação não lida.</p>";
    return;
  }

  listaNotificacoes.innerHTML = notificacoes.map((notificacao) => `
    <article class="notificacao-item">
      <strong>${escapeHTML(notificacao.mensagem)}</strong>
      <span>${escapeHTML(formatarData(notificacao.dataHora))}</span>
    </article>
  `).join("");

}

cancelarEdicaoBtn.addEventListener("click", () => {

  form.reset();
  limparArquivoAtual();

  if (processoIdSelecionado) {
    window.location.href = "processos.html";
    return;
  }

  fecharFormulario();

});

async function substituirArquivo(id, registroAtual, arquivo) {

  if (registroAtual?.arquivoPath) {
    await excluirArquivo(registroAtual.arquivoPath);
  }

  const arquivoPath = `usuarios/${usuarioAtual.uid}/processos/${id}/${Date.now()}-${normalizarNomeArquivo(arquivo.name)}`;
  const arquivoRef = ref(storage, arquivoPath);

  await uploadBytes(arquivoRef, arquivo);

  const arquivoUrl = await getDownloadURL(arquivoRef);

  await updateDoc(doc(db, "processos", id), {
    arquivoNome: arquivo.name,
    arquivoPath,
    arquivoUrl,
    arquivoTipo: arquivo.type
  });

}

async function excluirArquivo(arquivoPath) {

  try {
    await deleteObject(ref(storage, arquivoPath));
  } catch (error) {
    console.warn("Não foi possível remover o arquivo antigo.", error);
  }

}

function abrirFormulario() {

  form.hidden = false;
  novoProcessoBtn.hidden = true;

}

function fecharFormulario() {

  editandoId = null;
  processoEmEdicao = null;
  form.hidden = true;
  novoProcessoBtn.hidden = false;

}

function mostrarArquivoAtual(registro) {

  if (!registro?.arquivoUrl) {
    limparArquivoAtual();
    return;
  }

  arquivoAtual.innerHTML = `
    <a class="arquivo-link" href="${registro.arquivoUrl}" target="_blank" download>
      <span class="material-icons">download</span>
      ${escapeHTML(registro.arquivoNome || "Baixar arquivo")}
    </a>
  `;

}

function limparArquivoAtual() {

  arquivoAtual.innerHTML = "";

}

function renderizarArquivo(registro) {

  if (!registro.arquivoUrl) return "";

  return `
    <a class="arquivo-link" href="${registro.arquivoUrl}" target="_blank" download>
      <span class="material-icons">download</span>
      ${escapeHTML(registro.arquivoNome || "Baixar arquivo")}
    </a>
  `;

}

function nomeClienteDoProcesso(processo) {

  const cliente = clientes.find((item) => item.id === processo.clienteId);

  return cliente?.nome || processo.cliente || "";

}

function clienteIdPorNome(nome = "") {

  const nomeNormalizado = valorTexto(nome);
  const cliente = clientes.find((item) => valorTexto(item.nome) === nomeNormalizado);

  return cliente?.id || "";

}

function normalizarNomeArquivo(nome = "") {

  return String(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "-");

}

function valorTexto(valor = "") {

  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

}

function normalizarNumeroCnj(numero = "") {

  return String(numero).replace(/\D/g, "");

}

function numeroCnjValido(numero = "") {

  return /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(numero);

}

function dataEmMilissegundos(data) {

  if (data?.toDate) return data.toDate().getTime();

  const timestamp = new Date(data).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;

}

function formatarData(data) {

  const dataConvertida = data?.toDate ? data.toDate() : new Date(data);

  if (Number.isNaN(dataConvertida.getTime())) return "Data não informada";

  return dataConvertida.toLocaleString("pt-BR");

}

function escapeHTML(valor = "") {

  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}

inicializar();
