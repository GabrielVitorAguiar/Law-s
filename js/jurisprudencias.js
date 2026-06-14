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

const form = document.getElementById("jurisForm");
const lista = document.getElementById("listaJurisprudencias");
const pesquisa = document.getElementById("pesquisa");
const novaJurisprudenciaBtn = document.getElementById("novaJurisprudenciaBtn");
const cancelarEdicaoBtn = document.getElementById("cancelarEdicao");
const jurisprudenciasToolbar = document.getElementById("jurisprudenciasToolbar");
const voltarListaJurisprudencias = document.getElementById("voltarListaJurisprudencias");
const params = new URLSearchParams(window.location.search);
const jurisprudenciaIdSelecionada = params.get("id");

let jurisprudencias = [];
let editandoId = null;

novaJurisprudenciaBtn.addEventListener("click", () => {

  abrirFormulario();
  document.getElementById("titulo").focus();

});

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  const titulo = document.getElementById("titulo").value.trim();
  const tribunal = document.getElementById("tribunal").value.trim();
  const descricao = document.getElementById("descricao").value.trim();

  try {

    if (editandoId) {

      await updateDoc(doc(db, "jurisprudencias", editandoId), {
        titulo,
        tribunal,
        descricao
      });

    } else {

      await addDoc(collection(db, "jurisprudencias"), {
        titulo,
        tribunal,
        descricao,
        criadoEm: new Date()
      });

    }

    form.reset();

    if (jurisprudenciaIdSelecionada) {
      window.location.href = `jurisprudencias.html?id=${jurisprudenciaIdSelecionada}`;
      return;
    }

    fecharFormulario();
    carregarJurisprudencias();

  } catch (error) {

    console.error(error);

  }

});

async function carregarJurisprudencias() {

  lista.innerHTML = "";
  jurisprudencias = [];

  const querySnapshot = await getDocs(collection(db, "jurisprudencias"));

  querySnapshot.forEach((documento) => {

    jurisprudencias.push({
      id: documento.id,
      ...documento.data()
    });

  });

  jurisprudencias.sort((a, b) => valorTexto(a.titulo).localeCompare(valorTexto(b.titulo), "pt-BR"));

  if (jurisprudenciaIdSelecionada) {

    const jurisprudenciaSelecionada = jurisprudencias.find((jurisprudencia) => jurisprudencia.id === jurisprudenciaIdSelecionada);

    jurisprudenciasToolbar.hidden = true;
    voltarListaJurisprudencias.hidden = false;

    if (jurisprudenciaSelecionada) {
      registrarRecente({
        chave: `jurisprudencia:${jurisprudenciaSelecionada.id}`,
        tipo: "jurisprudencia",
        nome: jurisprudenciaSelecionada.titulo,
        link: `jurisprudencias.html?id=${jurisprudenciaSelecionada.id}`
      });

      renderizarJurisprudencias([jurisprudenciaSelecionada], true);
      editarJurisprudencia(jurisprudenciaSelecionada);
      return;
    }

    lista.innerHTML = `<p class="empty-state">Jurisprudência não encontrada.</p>`;
    return;

  }

  renderizarJurisprudencias(jurisprudencias);

}

function renderizarJurisprudencias(listaJurisprudencias, modoDetalhe = false) {

  lista.innerHTML = "";

  if (listaJurisprudencias.length === 0) {

    lista.innerHTML = `<p class="empty-state">Nenhuma jurisprudência encontrada.</p>`;
    return;

  }

  listaJurisprudencias.forEach((jurisprudencia) => {

    const div = document.createElement("div");

    div.classList.add("registro-card");
    div.classList.toggle("clicavel", !modoDetalhe);

    div.innerHTML = `

      <h3>${escapeHTML(jurisprudencia.titulo)}</h3>

      <p><strong>Tribunal:</strong> ${escapeHTML(jurisprudencia.tribunal)}</p>

      <p>${escapeHTML(jurisprudencia.descricao)}</p>

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

        window.location.href = `jurisprudencias.html?id=${jurisprudencia.id}`;

      });

    }

    div.querySelector(".editar-btn")
      .addEventListener("click", (event) => {

        event.stopPropagation();
        editarJurisprudencia(jurisprudencia);

      });

    div.querySelector(".deletar-btn")
      .addEventListener("click", (event) => {

        event.stopPropagation();
        excluirJurisprudencia(jurisprudencia.id);

      });

    lista.appendChild(div);

  });

}

function editarJurisprudencia(jurisprudencia) {

  document.getElementById("titulo").value = jurisprudencia.titulo;
  document.getElementById("tribunal").value = jurisprudencia.tribunal;
  document.getElementById("descricao").value = jurisprudencia.descricao;

  editandoId = jurisprudencia.id;
  abrirFormulario();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}

async function excluirJurisprudencia(id) {

  const confirmar = confirm("Deseja realmente excluir esta jurisprudência?");

  if (!confirmar) return;

  try {

    await deleteDoc(doc(db, "jurisprudencias", id));

    if (jurisprudenciaIdSelecionada) {
      window.location.href = "jurisprudencias.html";
      return;
    }

    carregarJurisprudencias();

  } catch (error) {

    console.error(error);

  }

}

pesquisa.addEventListener("input", () => {

  const valor = valorTexto(pesquisa.value);

  const filtradas = jurisprudencias.filter((jurisprudencia) => {

    return Object.values(jurisprudencia).some((campo) => {

      if (campo === null || campo === undefined) return false;

      return valorTexto(campo).includes(valor);

    });

  });

  renderizarJurisprudencias(filtradas);

});

cancelarEdicaoBtn.addEventListener("click", () => {

  form.reset();

  if (jurisprudenciaIdSelecionada) {
    window.location.href = "jurisprudencias.html";
    return;
  }

  fecharFormulario();

});

function abrirFormulario() {

  form.hidden = false;
  novaJurisprudenciaBtn.hidden = true;

}

function fecharFormulario() {

  editandoId = null;
  form.hidden = true;
  novaJurisprudenciaBtn.hidden = false;

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

carregarJurisprudencias();
