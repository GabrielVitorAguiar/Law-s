import { db } from "./firebase.js";
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { obterUsuarioAtual } from "./auth-user.js";

const form = document.getElementById("agendaForm");
const calendarioGrid = document.getElementById("calendarioGrid");
const mesAtualTitulo = document.getElementById("mesAtual");
const tituloDiaSelecionado = document.getElementById("tituloDiaSelecionado");
const resumoDia = document.getElementById("resumoDia");
const eventosDoDia = document.getElementById("eventosDoDia");
const lista = document.getElementById("listaEventos");
const clienteSelect = document.getElementById("clienteId");
const feedback = document.getElementById("agendaFeedback");
const tituloFormulario = document.getElementById("tituloFormulario");
const textoSalvar = document.getElementById("textoSalvar");
const tituloInput = document.getElementById("titulo");
const horaInput = document.getElementById("hora");
const tipoInput = document.getElementById("tipo");
const descricaoInput = document.getElementById("descricao");
const cancelarEdicaoBtn = document.getElementById("cancelarEdicao");

let eventos = [];
let clientes = [];
let usuarioAtual = null;
let editandoId = null;
let dataSelecionada = dataParaInput(new Date());
let dataCalendario = inicioDoMes(new Date());
let pararEventos = null;

document.getElementById("mesAnterior").addEventListener("click", () => mudarMes(-1));
document.getElementById("mesProximo").addEventListener("click", () => mudarMes(1));
document.getElementById("irParaHoje").addEventListener("click", irParaHoje);
document.getElementById("abrirFormulario").addEventListener("click", () => abrirFormulario());
document.getElementById("fecharFormulario").addEventListener("click", fecharFormulario);
cancelarEdicaoBtn.addEventListener("click", fecharFormulario);
form.addEventListener("submit", salvarEvento);

async function inicializar() {
  usuarioAtual = await obterUsuarioAtual();
  await carregarClientes();
  observarEventos();
}

async function carregarClientes() {
  const resultado = await getDocs(query(collection(db, "clientes"), where("userId", "==", usuarioAtual.uid)));
  clientes = resultado.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => texto(a.nome).localeCompare(texto(b.nome), "pt-BR"));
  clienteSelect.innerHTML = '<option value="">Sem cliente vinculado</option>';
  clientes.forEach((cliente) => {
    const opcao = document.createElement("option");
    opcao.value = cliente.id;
    opcao.textContent = cliente.nome;
    clienteSelect.appendChild(opcao);
  });
}

function observarEventos() {
  pararEventos?.();
  pararEventos = onSnapshot(query(collection(db, "calendario"), where("userId", "==", usuarioAtual.uid)), (resultado) => {
    eventos = resultado.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => dataHora(a).localeCompare(dataHora(b)));
    renderizarTudo();
  }, (erro) => {
    console.error(erro);
    feedback.textContent = "Não foi possível atualizar a agenda agora.";
  });
}

function mudarMes(deslocamento) {
  dataCalendario = new Date(dataCalendario.getFullYear(), dataCalendario.getMonth() + deslocamento, 1);
  renderizarCalendario();
}

function irParaHoje() {
  const hoje = new Date();
  dataSelecionada = dataParaInput(hoje);
  dataCalendario = inicioDoMes(hoje);
  fecharFormulario();
  renderizarTudo();
}

function renderizarTudo() {
  renderizarCalendario();
  renderizarDiaSelecionado();
  renderizarProximos();
}

function renderizarCalendario() {
  calendarioGrid.innerHTML = "";
  ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].forEach((nome) => {
    const cabecalho = document.createElement("div");
    cabecalho.className = "calendario-dia-semana";
    cabecalho.textContent = nome;
    calendarioGrid.appendChild(cabecalho);
  });

  const ano = dataCalendario.getFullYear();
  const mes = dataCalendario.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  mesAtualTitulo.textContent = primeiroDia.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  for (let indice = 0; indice < primeiroDia.getDay(); indice += 1) calendarioGrid.appendChild(criarCelulaVazia());

  for (let dia = 1; dia <= ultimoDia.getDate(); dia += 1) {
    const data = dataParaInput(new Date(ano, mes, dia));
    const eventosDoDia = eventos.filter((evento) => evento.data === data);
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "calendario-dia";
    botao.classList.toggle("selecionado", data === dataSelecionada);
    botao.classList.toggle("com-eventos", eventosDoDia.length > 0);
    botao.classList.toggle("hoje", data === dataParaInput(new Date()));
    botao.setAttribute("aria-label", `${dia} de ${mesAtualTitulo.textContent}${eventosDoDia.length ? `, ${eventosDoDia.length} compromisso${eventosDoDia.length > 1 ? "s" : ""}` : ""}`);

    const numero = document.createElement("strong");
    numero.textContent = dia;
    botao.appendChild(numero);
    if (eventosDoDia.length) {
      const marcador = document.createElement("div");
      marcador.className = "calendar-event-preview";
      eventosDoDia.slice(0, 2).forEach((evento) => {
        const ponto = document.createElement("i");
        ponto.title = evento.titulo || "Compromisso";
        marcador.appendChild(ponto);
      });
      if (eventosDoDia.length > 2) {
        const total = document.createElement("small");
        total.textContent = `+${eventosDoDia.length - 2}`;
        marcador.appendChild(total);
      }
      botao.appendChild(marcador);
    }
    botao.addEventListener("click", () => selecionarData(data));
    calendarioGrid.appendChild(botao);
  }
}

function renderizarDiaSelecionado() {
  const registros = eventos.filter((evento) => evento.data === dataSelecionada);
  tituloDiaSelecionado.textContent = formatarDataLonga(dataSelecionada);
  resumoDia.textContent = registros.length ? `${registros.length} ${registros.length === 1 ? "compromisso marcado" : "compromissos marcados"}` : "Nenhum compromisso para este dia.";
  eventosDoDia.innerHTML = "";

  if (!registros.length) {
    eventosDoDia.innerHTML = '<div class="agenda-empty-day"><span class="material-icons">event_available</span><p>Seu dia está livre. Use “Adicionar à agenda” para registrar algo.</p></div>';
    return;
  }
  registros.forEach((evento) => eventosDoDia.appendChild(criarCartaoEvento(evento, true)));
}

function renderizarProximos() {
  const agora = `${dataParaInput(new Date())} ${horarioAtual()}`;
  const proximos = eventos.filter((evento) => dataHora(evento) >= agora).slice(0, 6);
  lista.innerHTML = "";
  if (!proximos.length) {
    lista.innerHTML = '<p class="empty-state">Nenhum compromisso futuro cadastrado.</p>';
    return;
  }
  proximos.forEach((evento) => {
    const cartao = criarCartaoEvento(evento, false);
    cartao.classList.add("agenda-upcoming-item");
    cartao.addEventListener("click", (eventoClique) => {
      if (eventoClique.target.closest("button")) return;
      selecionarData(evento.data);
      document.querySelector(".agenda-day-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    lista.appendChild(cartao);
  });
}

function criarCartaoEvento(evento, mostrarData) {
  const cartao = document.createElement("article");
  cartao.className = "agenda-event-card";
  const cabecalho = document.createElement("div");
  cabecalho.className = "agenda-event-main";
  cabecalho.innerHTML = `<span class="agenda-type-icon material-icons">${iconeTipo(evento.tipo)}</span><div><span class="agenda-event-time">${escapeHTML(evento.hora || "Sem horário")}${mostrarData ? "" : ` · ${formatarDataCurta(evento.data)}`}</span><h3>${escapeHTML(evento.titulo || "Sem título")}</h3><p>${escapeHTML(rotuloTipo(evento.tipo))}${nomeClienteDoEvento(evento) ? ` · ${escapeHTML(nomeClienteDoEvento(evento))}` : ""}</p>${evento.descricao ? `<small>${escapeHTML(evento.descricao)}</small>` : ""}</div>`;
  const acoes = document.createElement("div");
  acoes.className = "agenda-event-actions";
  acoes.appendChild(botaoAcao("edit", "Editar", () => editarEvento(evento)));
  acoes.appendChild(botaoAcao("delete", "Excluir", () => excluirEvento(evento.id)));
  cartao.append(cabecalho, acoes);
  return cartao;
}

function botaoAcao(icone, rotulo, acao) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = icone === "delete" ? "agenda-delete-btn" : "agenda-edit-btn";
  botao.setAttribute("aria-label", rotulo);
  botao.innerHTML = `<span class="material-icons">${icone}</span>`;
  botao.addEventListener("click", acao);
  return botao;
}

function selecionarData(data) {
  dataSelecionada = data;
  dataCalendario = inicioDoMesDeTexto(data);
  fecharFormulario();
  renderizarTudo();
}

function abrirFormulario(evento = null) {
  form.hidden = false;
  feedback.textContent = "";
  if (!evento) {
    editandoId = null;
    form.reset();
    horaInput.value = "09:00";
    tituloFormulario.textContent = "Novo compromisso";
    textoSalvar.textContent = "Salvar compromisso";
    cancelarEdicaoBtn.hidden = true;
  }
  tituloInput.focus();
}

function fecharFormulario() {
  editandoId = null;
  form.reset();
  form.hidden = true;
  cancelarEdicaoBtn.hidden = true;
  feedback.textContent = "";
}

function editarEvento(evento) {
  dataSelecionada = evento.data || dataSelecionada;
  dataCalendario = inicioDoMesDeTexto(dataSelecionada);
  editandoId = evento.id;
  tituloInput.value = evento.titulo || "";
  horaInput.value = evento.hora || "09:00";
  tipoInput.value = evento.tipo || "compromisso";
  clienteSelect.value = evento.clienteId || clienteIdPorNome(evento.cliente);
  descricaoInput.value = evento.descricao || "";
  tituloFormulario.textContent = "Editar compromisso";
  textoSalvar.textContent = "Salvar alterações";
  cancelarEdicaoBtn.hidden = false;
  form.hidden = false;
  renderizarTudo();
  form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  tituloInput.focus();
}

async function salvarEvento(evento) {
  evento.preventDefault();
  const cliente = clientes.find((item) => item.id === clienteSelect.value);
  const dados = {
    userId: usuarioAtual.uid,
    titulo: tituloInput.value.trim(),
    tipo: tipoInput.value,
    clienteId: clienteSelect.value,
    cliente: cliente?.nome || "",
    data: dataSelecionada,
    hora: horaInput.value,
    descricao: descricaoInput.value.trim()
  };
  try {
    if (editandoId) await updateDoc(doc(db, "calendario", editandoId), dados);
    else await addDoc(collection(db, "calendario"), { ...dados, criadoEm: serverTimestamp() });
    fecharFormulario();
  } catch (erro) {
    console.error(erro);
    feedback.textContent = "Não foi possível salvar o compromisso.";
  }
}

async function excluirEvento(id) {
  if (!confirm("Excluir este compromisso da agenda?")) return;
  try { await deleteDoc(doc(db, "calendario", id)); } catch (erro) { console.error(erro); feedback.textContent = "Não foi possível excluir o compromisso."; }
}

function criarCelulaVazia() { const celula = document.createElement("div"); celula.className = "calendario-vazio"; return celula; }
function inicioDoMes(data) { return new Date(data.getFullYear(), data.getMonth(), 1); }
function inicioDoMesDeTexto(data) { const [ano, mes] = data.split("-"); return new Date(Number(ano), Number(mes) - 1, 1); }
function dataParaInput(data) { return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`; }
function horarioAtual() { const agora = new Date(); return `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`; }
function dataHora(evento) { return `${evento.data || ""} ${evento.hora || "00:00"}`; }
function formatarDataCurta(data) { return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }); }
function formatarDataLonga(data) { return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
function nomeClienteDoEvento(evento) { return clientes.find((cliente) => cliente.id === evento.clienteId)?.nome || evento.cliente || ""; }
function clienteIdPorNome(nome = "") { return clientes.find((cliente) => texto(cliente.nome) === texto(nome))?.id || ""; }
function rotuloTipo(tipo) { return ({ compromisso: "Compromisso", lembrete: "Lembrete", anotacao: "Anotação" })[tipo] || "Registro"; }
function iconeTipo(tipo) { return ({ compromisso: "event", lembrete: "notifications", anotacao: "sticky_note_2" })[tipo] || "event_note"; }
function texto(valor = "") { return String(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function escapeHTML(valor = "") { return String(valor).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }

inicializar();
