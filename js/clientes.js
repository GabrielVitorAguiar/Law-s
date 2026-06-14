import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const form = document.getElementById("clienteForm");
const lista = document.getElementById("listaClientes");
const pesquisa = document.getElementById("pesquisa");
const novoClienteBtn = document.getElementById("novoClienteBtn");
const cancelarCadastroBtn = document.getElementById("cancelarCadastro");
const alfabetoNav = document.getElementById("alfabetoNav");

const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

let clientes = [];
let clientesFiltrados = [];

novoClienteBtn.addEventListener("click", () => {

  form.hidden = false;
  novoClienteBtn.hidden = true;
  document.getElementById("nome").focus();

});

cancelarCadastroBtn.addEventListener("click", () => {

  form.reset();
  form.hidden = true;
  novoClienteBtn.hidden = false;

});

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const cpf = document.getElementById("cpf").value.trim();
  const rg = document.getElementById("rg").value.trim();
  const telefone = document.getElementById("telefone").value.trim();

  try {

    const novoCliente = await addDoc(collection(db, "clientes"), {
      nome,
      cpf,
      rg,
      telefone,
      anotacoes: "",
      criadoEm: new Date()
    });

    window.location.href = `perfil-cliente.html?id=${novoCliente.id}`;

  } catch (error) {

    console.error(error);

  }

});

async function carregarClientes() {

  lista.innerHTML = "";
  clientes = [];

  const querySnapshot = await getDocs(collection(db, "clientes"));

  querySnapshot.forEach((documento) => {

    clientes.push({
      id: documento.id,
      ...documento.data()
    });

  });

  clientes.sort((a, b) => valorTexto(a.nome).localeCompare(valorTexto(b.nome), "pt-BR"));

  clientesFiltrados = clientes;
  renderizarClientes(clientesFiltrados);
  renderizarAlfabeto();

}

function renderizarClientes(listaClientes) {

  lista.innerHTML = "";

  if (listaClientes.length === 0) {

    lista.innerHTML = `<p class="empty-state">Nenhum cliente encontrado.</p>`;
    atualizarLetrasDisponiveis();
    return;

  }

  let letraAtual = "";

  listaClientes.forEach((cliente) => {

    const letra = primeiraLetra(cliente.nome);

    if (letra !== letraAtual) {

      letraAtual = letra;

      const tituloLetra = document.createElement("h2");
      tituloLetra.classList.add("letra-grupo");
      tituloLetra.id = `letra-${letra}`;
      tituloLetra.textContent = letra;
      lista.appendChild(tituloLetra);

    }

    const button = document.createElement("button");

    button.type = "button";
    button.classList.add("cliente-list-item");
    button.dataset.letra = letra;

    button.innerHTML = `

      <strong>${escapeHTML(cliente.nome)}</strong>

      <span>CPF: ${escapeHTML(cliente.cpf)} | Telefone: ${escapeHTML(cliente.telefone)}</span>

    `;

    button.addEventListener("click", () => {

      window.location.href = `perfil-cliente.html?id=${cliente.id}`;

    });

    lista.appendChild(button);

  });

  atualizarLetrasDisponiveis();
  atualizarLetraAtiva();

}

function renderizarAlfabeto() {

  alfabetoNav.innerHTML = "";

  letras.forEach((letra) => {

    const button = document.createElement("button");

    button.type = "button";
    button.textContent = letra;
    button.dataset.letra = letra;

    button.addEventListener("click", () => rolarParaLetra(letra));

    alfabetoNav.appendChild(button);

  });

  atualizarLetrasDisponiveis();

}

function rolarParaLetra(letra) {

  const alvo = document.getElementById(`letra-${letra}`);

  if (!alvo) return;

  alvo.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}

function atualizarLetrasDisponiveis() {

  const letrasDisponiveis = new Set(clientesFiltrados.map((cliente) => primeiraLetra(cliente.nome)));

  alfabetoNav.querySelectorAll("button").forEach((button) => {

    const disponivel = letrasDisponiveis.has(button.dataset.letra);

    button.disabled = !disponivel;
    button.classList.toggle("indisponivel", !disponivel);

  });

}

function atualizarLetraAtiva() {

  const grupos = [...document.querySelectorAll(".letra-grupo")];

  if (grupos.length === 0) return;

  let letraAtiva = grupos[0].textContent;

  grupos.forEach((grupo) => {

    if (grupo.getBoundingClientRect().top <= 130) {
      letraAtiva = grupo.textContent;
    }

  });

  alfabetoNav.querySelectorAll("button").forEach((button) => {

    button.classList.toggle("ativa", button.dataset.letra === letraAtiva);

  });

}

pesquisa.addEventListener("input", () => {

  const valor = valorTexto(pesquisa.value).toLowerCase().trim();

  clientesFiltrados = clientes.filter((cliente) => {

    return Object.values(cliente).some((campo) => {

      if (campo === null || campo === undefined) return false;

      return valorTexto(campo).toLowerCase().includes(valor);

    });

  });

  renderizarClientes(clientesFiltrados);

});

window.addEventListener("scroll", atualizarLetraAtiva);

function primeiraLetra(nome = "") {

  const letra = valorTexto(nome).charAt(0).toUpperCase();

  return letras.includes(letra) ? letra : "#";

}

function valorTexto(valor = "") {

  return String(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

}

function escapeHTML(valor = "") {

  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}

carregarClientes();
