import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const form = document.getElementById("agendaForm");
const lista = document.getElementById("listaEventos");
const pesquisa = document.getElementById("pesquisa");
const cancelarEdicaoBtn = document.getElementById("cancelarEdicao");

let eventos = [];
let editandoId = null;

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  const titulo = document.getElementById("titulo").value;
  const data = document.getElementById("data").value;
  const hora = document.getElementById("hora").value;
  const descricao = document.getElementById("descricao").value;

  try {

    if (editandoId) {

      await updateDoc(doc(db, "calendario", editandoId), {
        titulo,
        data,
        hora,
        descricao
      });

      limparEdicao();

    } else {

      await addDoc(collection(db, "calendario"), {
        titulo,
        data,
        hora,
        descricao,
        criadoEm: new Date()
      });

    }

    form.reset();
    carregarEventos();

  } catch (error) {

    console.error(error);

  }

});

async function carregarEventos() {

  lista.innerHTML = "";
  eventos = [];

  const querySnapshot = await getDocs(collection(db, "calendario"));

  querySnapshot.forEach((documento) => {

    eventos.push({
      id: documento.id,
      ...documento.data()
    });

  });

  eventos.sort((a, b) => `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`));

  renderizarEventos(eventos);

}

function renderizarEventos(listaEventos) {

  lista.innerHTML = "";

  listaEventos.forEach((evento) => {

    const div = document.createElement("div");

    div.classList.add("registro-card");

    div.innerHTML = `

      <h3>${escapeHTML(evento.titulo)}</h3>

      <p><strong>Data:</strong> ${formatarData(evento.data)} às ${escapeHTML(evento.hora)}</p>

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

  document.getElementById("titulo").value = evento.titulo;
  document.getElementById("data").value = evento.data;
  document.getElementById("hora").value = evento.hora;
  document.getElementById("descricao").value = evento.descricao;

  editandoId = evento.id;
  cancelarEdicaoBtn.hidden = false;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}

async function excluirEvento(id) {

  const confirmar = confirm("Deseja realmente excluir este compromisso?");

  if (!confirmar) return;

  try {

    await deleteDoc(doc(db, "calendario", id));
    carregarEventos();

  } catch (error) {

    console.error(error);

  }

}

pesquisa.addEventListener("input", () => {

  const valor = pesquisa.value.toLowerCase();

  const filtrados = eventos.filter((evento) => {

    return (
      evento.titulo.toLowerCase().includes(valor) ||
      evento.descricao.toLowerCase().includes(valor) ||
      evento.data.includes(valor)
    );

  });

  renderizarEventos(filtrados);

});

cancelarEdicaoBtn.addEventListener("click", () => {

  form.reset();
  limparEdicao();

});

function limparEdicao() {

  editandoId = null;
  cancelarEdicaoBtn.hidden = true;

}

function formatarData(data) {

  if (!data) return "";

  const [ano, mes, dia] = data.split("-");

  return `${dia}/${mes}/${ano}`;

}

function escapeHTML(valor = "") {

  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}

carregarEventos();
