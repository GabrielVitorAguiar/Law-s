import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { registrarRecente } from "./recentes-store.js";
import { obterUsuarioAtual, validarDonoDoRegistro } from "./auth-user.js";

const params = new URLSearchParams(window.location.search);
const clienteId = params.get("id");

const tituloCliente = document.getElementById("tituloCliente");
const form = document.getElementById("perfilClienteForm");
const anotacoes = document.getElementById("anotacoes");
const salvarAnotacoesBtn = document.getElementById("salvarAnotacoes");
const excluirClienteBtn = document.getElementById("excluirCliente");
const processosCliente = document.getElementById("processosCliente");
const compromissosCliente = document.getElementById("compromissosCliente");

let clienteAtual = null;
let usuarioAtual = null;

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
      userId: usuarioAtual.uid,
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
    carregarCompromissosDoCliente();

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

  if (!validarDonoDoRegistro(clienteAtual, usuarioAtual)) {
    window.location.href = "clientes.html";
    return;
  }

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
  carregarCompromissosDoCliente();

}

async function carregarProcessosDoCliente() {

  processosCliente.innerHTML = "";

  const querySnapshot = await getDocs(
    query(collection(db, "processos"), where("userId", "==", usuarioAtual.uid))
  );
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

async function carregarCompromissosDoCliente() {

  compromissosCliente.innerHTML = "";

  const querySnapshot = await getDocs(
    query(collection(db, "calendario"), where("userId", "==", usuarioAtual.uid))
  );
  const nomeCliente = normalizar(clienteAtual.nome);
  const hoje = dataParaInput(new Date());

  const compromissos = [];

  querySnapshot.forEach((documento) => {

    const compromisso = {
      id: documento.id,
      ...documento.data()
    };

    const pertenceAoCliente =
      compromisso.clienteId === clienteId ||
      normalizar(compromisso.cliente) === nomeCliente;

    if (pertenceAoCliente && dataHora(compromisso) >= `${hoje} 00:00`) {
      compromissos.push(compromisso);
    }

  });

  compromissos.sort((a, b) => dataHora(a).localeCompare(dataHora(b)));

  if (compromissos.length === 0) {

    compromissosCliente.innerHTML = `<p class="empty-state">Nenhum compromisso próximo vinculado a este cliente.</p>`;
    return;

  }

  compromissos.slice(0, 5).forEach((compromisso) => {

    const div = document.createElement("div");

    div.classList.add("registro-card");

    div.innerHTML = `

      <h3>${escapeHTML(compromisso.titulo)}</h3>

      <p><strong>Tipo:</strong> ${escapeHTML(rotuloTipo(compromisso.tipo))}</p>

      <p><strong>Data:</strong> ${formatarData(compromisso.data)} às ${escapeHTML(compromisso.hora)}</p>

      <p>${escapeHTML(compromisso.descricao)}</p>

    `;

    compromissosCliente.appendChild(div);

  });

}

function normalizar(valor = "") {

  return String(valor)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

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

function rotuloTipo(tipo = "") {

  const tipos = {
    compromisso: "Compromisso",
    lembrete: "Lembrete",
    anotacao: "Anotação"
  };

  return tipos[tipo] || "Registro";

}

function escapeHTML(valor = "") {

  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}

async function inicializar() {

  usuarioAtual = await obterUsuarioAtual();
  carregarCliente();

}

inicializar();
