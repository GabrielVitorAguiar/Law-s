import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

// ==========================
// ELEMENTOS
// ==========================

const form = document.getElementById("clienteForm");

const lista = document.getElementById("listaClientes");

const pesquisa = document.getElementById("pesquisa");

// ==========================
// ARRAY LOCAL
// ==========================

let clientes = [];

// ==========================
// CREATE
// ==========================

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  const nome = document.getElementById("nome").value;

  const cpf = document.getElementById("cpf").value;

  const rg = document.getElementById("rg").value;

  const telefone = document.getElementById("telefone").value;

  try {

    await addDoc(collection(db, "clientes"), {

      nome,
      cpf,
      rg,
      telefone,
      criadoEm: new Date()

    });

    form.reset();

    carregarClientes();

  } catch (error) {

    console.error(error);

  }

});

// ==========================
// READ
// ==========================

async function carregarClientes() {

  lista.innerHTML = "";

  clientes = [];

  const querySnapshot = await getDocs(
    collection(db, "clientes")
  );

  querySnapshot.forEach((documento) => {

    clientes.push({
      id: documento.id,
      ...documento.data()
    });

  });

  renderizarClientes(clientes);

}

// ==========================
// RENDERIZAÇÃO
// ==========================

function renderizarClientes(listaClientes) {

  lista.innerHTML = "";

  listaClientes.forEach((cliente) => {

    const div = document.createElement("div");

    div.classList.add("cliente-card");

    div.innerHTML = `

      <h3>${cliente.nome}</h3>

      <p><strong>CPF:</strong> ${cliente.cpf}</p>

      <p><strong>RG:</strong> ${cliente.rg}</p>

      <p><strong>Telefone:</strong> ${cliente.telefone}</p>

    `;

    lista.appendChild(div);

  });

}

// ==========================
// PESQUISA
// ==========================

pesquisa.addEventListener("input", () => {

  const valor = pesquisa.value.toLowerCase();

  const filtrados = clientes.filter((cliente) => {

    return cliente.nome.toLowerCase().includes(valor);

  });

  renderizarClientes(filtrados);

});

// ==========================
// INICIAR
// ==========================

carregarClientes();