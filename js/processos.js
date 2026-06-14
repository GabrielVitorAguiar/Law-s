import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { registrarRecente } from "./recentes-store.js";

const form = document.getElementById("processoForm");
const lista = document.getElementById("listaProcessos");
const pesquisa = document.getElementById("pesquisa");
const novoProcessoBtn = document.getElementById("novoProcessoBtn");
const cancelarEdicaoBtn = document.getElementById("cancelarEdicao");
const processosToolbar = document.getElementById("processosToolbar");
const voltarListaProcessos = document.getElementById("voltarListaProcessos");
const params = new URLSearchParams(window.location.search);
const processoIdSelecionado = params.get("id");

let processos = [];
let editandoId = null;

novoProcessoBtn.addEventListener("click", () => {

  abrirFormulario();
  document.getElementById("numero").focus();

});

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  const numero = document.getElementById("numero").value.trim();
  const cliente = document.getElementById("cliente").value.trim();
  const area = document.getElementById("area").value.trim();
  const status = document.getElementById("status").value.trim();
  const descricao = document.getElementById("descricao").value.trim();

  try {

    if (editandoId) {

      await updateDoc(doc(db, "processos", editandoId), {
        numero,
        cliente,
        area,
        status,
        descricao
      });

    } else {

      await addDoc(collection(db, "processos"), {
        numero,
        cliente,
        area,
        status,
        descricao,
        criadoEm: new Date()
      });

    }

    form.reset();

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

async function carregarProcessos() {

  lista.innerHTML = "";
  processos = [];

  const querySnapshot = await getDocs(collection(db, "processos"));

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

    if (processoSelecionado) {
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

  lista.innerHTML = "";

  if (listaProcessos.length === 0) {

    lista.innerHTML = `<p class="empty-state">Nenhum processo encontrado.</p>`;
    return;

  }

  listaProcessos.forEach((processo) => {

    const div = document.createElement("div");

    div.classList.add("registro-card");
    div.classList.toggle("clicavel", !modoDetalhe);

    div.innerHTML = `

      <h3>${escapeHTML(processo.numero)}</h3>

      <p><strong>Cliente:</strong> ${escapeHTML(processo.cliente)}</p>

      <p><strong>Área:</strong> ${escapeHTML(processo.area)}</p>

      <p><strong>Status:</strong> ${escapeHTML(processo.status)}</p>

      <p>${escapeHTML(processo.descricao)}</p>

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
        excluirProcesso(processo.id);

      });

    lista.appendChild(div);

  });

}

function editarProcesso(processo) {

  document.getElementById("numero").value = processo.numero;
  document.getElementById("cliente").value = processo.cliente;
  document.getElementById("area").value = processo.area;
  document.getElementById("status").value = processo.status;
  document.getElementById("descricao").value = processo.descricao;

  editandoId = processo.id;
  abrirFormulario();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}

async function excluirProcesso(id) {

  const confirmar = confirm("Deseja realmente excluir este processo?");

  if (!confirmar) return;

  try {

    await deleteDoc(doc(db, "processos", id));

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

    return Object.values(processo).some((campo) => {

      if (campo === null || campo === undefined) return false;

      return valorTexto(campo).includes(valor);

    });

  });

  renderizarProcessos(filtrados);

});

cancelarEdicaoBtn.addEventListener("click", () => {

  form.reset();

  if (processoIdSelecionado) {
    window.location.href = "processos.html";
    return;
  }

  fecharFormulario();

});

function abrirFormulario() {

  form.hidden = false;
  novoProcessoBtn.hidden = true;

}

function fecharFormulario() {

  editandoId = null;
  form.hidden = true;
  novoProcessoBtn.hidden = false;

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

carregarProcessos();
