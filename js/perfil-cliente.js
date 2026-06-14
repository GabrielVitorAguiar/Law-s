import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { registrarRecente } from "./recentes-store.js";

const params = new URLSearchParams(window.location.search);
const clienteId = params.get("id");

const tituloCliente = document.getElementById("tituloCliente");
const form = document.getElementById("perfilClienteForm");
const anotacoes = document.getElementById("anotacoes");
const salvarAnotacoesBtn = document.getElementById("salvarAnotacoes");
const excluirClienteBtn = document.getElementById("excluirCliente");
const processosCliente = document.getElementById("processosCliente");

let clienteAtual = null;

if (!clienteId) {
  window.location.href = "clientes.html";
}

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const cpf = document.getElementById("cpf").value.trim();
  const rg = document.getElementById("rg").value.trim();
  const telefone = document.getElementById("telefone").value.trim();

  try {

    await updateDoc(doc(db, "clientes", clienteId), {
      nome,
      cpf,
      rg,
      telefone
    });

    clienteAtual = {
      ...clienteAtual,
      nome,
      cpf,
      rg,
      telefone
    };

    tituloCliente.textContent = nome;
    carregarProcessosDoCliente();

  } catch (error) {

    console.error(error);

  }

});

salvarAnotacoesBtn.addEventListener("click", async () => {

  try {

    await updateDoc(doc(db, "clientes", clienteId), {
      anotacoes: anotacoes.value
    });

  } catch (error) {

    console.error(error);

  }

});

excluirClienteBtn.addEventListener("click", async () => {

  const confirmar = confirm("Tem certeza que deseja excluir este cliente?");

  if (!confirmar) return;

  try {

    await deleteDoc(doc(db, "clientes", clienteId));
    window.location.href = "clientes.html";

  } catch (error) {

    console.error(error);

  }

});

async function carregarCliente() {

  const clienteRef = doc(db, "clientes", clienteId);
  const clienteSnap = await getDoc(clienteRef);

  if (!clienteSnap.exists()) {
    window.location.href = "clientes.html";
    return;
  }

  clienteAtual = {
    id: clienteSnap.id,
    ...clienteSnap.data()
  };

  tituloCliente.textContent = clienteAtual.nome;

  registrarRecente({
    chave: `cliente:${clienteAtual.id}`,
    tipo: "cliente",
    nome: clienteAtual.nome,
    link: `perfil-cliente.html?id=${clienteAtual.id}`
  });

  document.getElementById("nome").value = clienteAtual.nome || "";
  document.getElementById("cpf").value = clienteAtual.cpf || "";
  document.getElementById("rg").value = clienteAtual.rg || "";
  document.getElementById("telefone").value = clienteAtual.telefone || "";
  anotacoes.value = clienteAtual.anotacoes || "";

  carregarProcessosDoCliente();

}

async function carregarProcessosDoCliente() {

  processosCliente.innerHTML = "";

  const querySnapshot = await getDocs(collection(db, "processos"));
  const nomeCliente = normalizar(clienteAtual.nome);

  const processos = [];

  querySnapshot.forEach((documento) => {

    const processo = {
      id: documento.id,
      ...documento.data()
    };

    const pertenceAoCliente =
      processo.clienteId === clienteId ||
      normalizar(processo.cliente) === nomeCliente;

    if (pertenceAoCliente) {
      processos.push(processo);
    }

  });

  if (processos.length === 0) {

    processosCliente.innerHTML = `<p class="empty-state">Nenhum processo vinculado a este cliente.</p>`;
    return;

  }

  processos.forEach((processo) => {

    const link = document.createElement("a");

    link.classList.add("processo-link");
    link.href = `processos.html?id=${processo.id}`;
    link.innerHTML = `

      <strong>${escapeHTML(processo.numero)}</strong>

      <span>${escapeHTML(processo.area)} | ${escapeHTML(processo.status)}</span>

    `;

    processosCliente.appendChild(link);

  });

}

function normalizar(valor = "") {

  return String(valor).trim().toLowerCase();

}

function escapeHTML(valor = "") {

  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}

carregarCliente();
