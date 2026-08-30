import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { obterUsuarioAtual } from "./auth-user.js";

const form = document.getElementById("agendaForm");
const lista = document.getElementById("listaEventos");
const calendarioGrid = document.getElementById("calendarioGrid");
const mesAtualTitulo = document.getElementById("mesAtual");
const mesAnteriorBtn = document.getElementById("mesAnterior");
const mesProximoBtn = document.getElementById("mesProximo");
const tituloDiaSelecionado = document.getElementById("tituloDiaSelecionado");
const cancelarEdicaoBtn = document.getElementById("cancelarEdicao");
const clienteSelect = document.getElementById("clienteId");
const dataInput = document.getElementById("data");

let eventos = [];
let clientes = [];
let editandoId = null;
let dataSelecionada = dataParaInput(new Date());
let dataCalendario = new Date();
let usuarioAtual = null;

mesAnteriorBtn.addEventListener("click", () => {

  dataCalendario = new Date(dataCalendario.getFullYear(), dataCalendario.getMonth() - 1, 1);
  renderizarCalendario();

});

mesProximoBtn.addEventListener("click", () => {

  dataCalendario = new Date(dataCalendario.getFullYear(), dataCalendario.getMonth() + 1, 1);
  renderizarCalendario();

});

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  const clienteSelecionado = clientes.find((cliente) => cliente.id === clienteSelect.value);

  const dados = {
    userId: usuarioAtual.uid,
    titulo: document.getElementById("titulo").value.trim(),
    tipo: document.getElementById("tipo").value,
    clienteId: clienteSelect.value,
    cliente: clienteSelecionado?.nome || "",
    data: document.getElementById("data").value,
    hora: document.getElementById("hora").value,
    descricao: document.getElementById("descricao").value.trim()
  };

  try {

    if (editandoId) {

      await updateDoc(doc(db, "calendario", editandoId), dados);

    } else {

      await addDoc(collection(db, "calendario"), {
        ...dados,
        criadoEm: new Date()
      });

    }

    form.reset();
    limparEdicao();
    dataSelecionada = dados.data;
    document.getElementById("data").value = dataSelecionada;
    carregarEventos();

  } catch (error) {

    console.error(error);

  }

});

dataInput.addEventListener("change", () => {

  if (!dataInput.value) return;

  dataSelecionada = dataInput.value;
  const [ano, mes] = dataSelecionada.split("-");
  dataCalendario = new Date(Number(ano), Number(mes) - 1, 1);
  renderizarCalendario();
  renderizarEventosProximos();

});

cancelarEdicaoBtn.addEventListener("click", () => {

  form.reset();
  limparEdicao();
  dataInput.value = dataSelecionada;

});

async function inicializar() {

  usuarioAtual = await obterUsuarioAtual();
  dataInput.value = dataSelecionada;
  await carregarClientes();
  await carregarEventos();

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

  clienteSelect.innerHTML = `<option value="">Sem cliente vinculado</option>`;

  clientes.forEach((cliente) => {

    const option = document.createElement("option");

    option.value = cliente.id;
    option.textContent = cliente.nome;

    clienteSelect.appendChild(option);

  });

}

async function carregarEventos() {

  lista.innerHTML = "";
  eventos = [];

  const querySnapshot = await getDocs(
    query(collection(db, "calendario"), where("userId", "==", usuarioAtual.uid))
  );

  querySnapshot.forEach((documento) => {

    eventos.push({
      id: documento.id,
      ...documento.data()
    });

  });

  eventos.sort((a, b) => dataHora(a).localeCompare(dataHora(b)));

  renderizarCalendario();
  renderizarEventosProximos();

}

function renderizarCalendario() {

  calendarioGrid.innerHTML = "";

  const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  nomesDias.forEach((dia) => {

    const div = document.createElement("div");

    div.classList.add("calendario-dia-semana");
    div.textContent = dia;

    calendarioGrid.appendChild(div);

  });

  const ano = dataCalendario.getFullYear();
  const mes = dataCalendario.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);

  mesAtualTitulo.textContent = primeiroDia.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });

  for (let i = 0; i < primeiroDia.getDay(); i += 1) {
    calendarioGrid.appendChild(criarCelulaVazia());
  }

  for (let dia = 1; dia <= ultimoDia.getDate(); dia += 1) {

    const data = dataParaInput(new Date(ano, mes, dia));
    const eventosDoDia = eventos.filter((evento) => evento.data === data);
    const button = document.createElement("button");

    button.type = "button";
    button.classList.add("calendario-dia");
    button.classList.toggle("selecionado", data === dataSelecionada);
    button.classList.toggle("com-eventos", eventosDoDia.length > 0);

    button.innerHTML = `
      <span>${dia}</span>
      ${eventosDoDia.length > 0 ? `<small>${eventosDoDia.length}</small>` : ""}
    `;

    button.addEventListener("click", () => selecionarData(data));

    calendarioGrid.appendChild(button);

  }

  atualizarTituloDia();

}

function criarCelulaVazia() {

  const div = document.createElement("div");

  div.classList.add("calendario-vazio");

  return div;

}

function selecionarData(data) {

  dataSelecionada = data;
  dataInput.value = data;
  limparEdicao();
  renderizarCalendario();
  renderizarEventosProximos();

}

function renderizarEventosProximos() {

  lista.innerHTML = "";

  const proximos = eventos
    .filter((evento) => dataHora(evento) >= `${dataSelecionada} 00:00`)
    .slice(0, 8);

  if (proximos.length === 0) {

    lista.innerHTML = `<p class="empty-state">Nenhum registro próximo desta data.</p>`;
    return;

  }

  proximos.forEach((evento) => {

    const div = document.createElement("div");

    div.classList.add("registro-card");

    div.innerHTML = `

      <h3>${escapeHTML(evento.titulo)}</h3>

      <p><strong>Tipo:</strong> ${escapeHTML(rotuloTipo(evento.tipo))}</p>

      <p><strong>Data:</strong> ${formatarData(evento.data)} às ${escapeHTML(evento.hora)}</p>

      ${nomeClienteDoEvento(evento) ? `<p><strong>Cliente:</strong> ${escapeHTML(nomeClienteDoEvento(evento))}</p>` : ""}

      <p>${escapeHTML(evento.descricao)}</p>

      <div class="acoes">

        <button class="editar-btn" type="button">
          Editar
        </button>

        <button class="deletar-btn" type="button">
          Excluir
        </button>

      </div>

    `;

    div.querySelector(".editar-btn")
      .addEventListener("click", () => editarEvento(evento));

    div.querySelector(".deletar-btn")
      .addEventListener("click", () => excluirEvento(evento.id));

    lista.appendChild(div);

  });

}

function editarEvento(evento) {

  document.getElementById("titulo").value = evento.titulo || "";
  document.getElementById("tipo").value = evento.tipo || "compromisso";
  clienteSelect.value = evento.clienteId || clienteIdPorNome(evento.cliente) || "";
  dataInput.value = evento.data || dataSelecionada;
  document.getElementById("hora").value = evento.hora || "";
  document.getElementById("descricao").value = evento.descricao || "";

  editandoId = evento.id;
  dataSelecionada = evento.data || dataSelecionada;
  cancelarEdicaoBtn.hidden = false;
  renderizarCalendario();
  atualizarTituloDia();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}

async function excluirEvento(id) {

  const confirmar = confirm("Deseja realmente excluir este registro do calendário?");

  if (!confirmar) return;

  try {

    await deleteDoc(doc(db, "calendario", id));
    carregarEventos();

  } catch (error) {

    console.error(error);

  }

}

function limparEdicao() {

  editandoId = null;
  cancelarEdicaoBtn.hidden = true;
  atualizarTituloDia();

}

function atualizarTituloDia() {

  tituloDiaSelecionado.textContent = `Registro para ${formatarData(dataSelecionada)}`;

}

function nomeClienteDoEvento(evento) {

  const cliente = clientes.find((item) => item.id === evento.clienteId);

  return cliente?.nome || evento.cliente || "";

}

function clienteIdPorNome(nome = "") {

  const nomeNormalizado = valorTexto(nome);
  const cliente = clientes.find((item) => valorTexto(item.nome) === nomeNormalizado);

  return cliente?.id || "";

}

function rotuloTipo(tipo = "") {

  const tipos = {
    compromisso: "Compromisso",
    lembrete: "Lembrete",
    anotacao: "Anotação"
  };

  return tipos[tipo] || "Registro";

}

function dataHora(evento) {

  return `${evento.data || ""} ${evento.hora || "00:00"}`;

}

function dataParaInput(data) {

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;

}

function formatarData(data) {

  if (!data) return "";

  const [ano, mes, dia] = data.split("-");

  return `${dia}/${mes}/${ano}`;

}

function valorTexto(valor = "") {

  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

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
