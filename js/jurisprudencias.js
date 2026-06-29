import { db, storage } from "./firebase.js";

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

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-storage.js";

import { registrarRecente } from "./recentes-store.js";
import { obterUsuarioAtual, validarDonoDoRegistro } from "./auth-user.js";

const form = document.getElementById("jurisForm");
const lista = document.getElementById("listaJurisprudencias");
const pesquisa = document.getElementById("pesquisa");
const novaJurisprudenciaBtn = document.getElementById("novaJurisprudenciaBtn");
const cancelarEdicaoBtn = document.getElementById("cancelarEdicao");
const jurisprudenciasToolbar = document.getElementById("jurisprudenciasToolbar");
const voltarListaJurisprudencias = document.getElementById("voltarListaJurisprudencias");
const arquivoInput = document.getElementById("arquivo");
const arquivoAtual = document.getElementById("arquivoAtual");
const params = new URLSearchParams(window.location.search);
const jurisprudenciaIdSelecionada = params.get("id");

let jurisprudencias = [];
let editandoId = null;
let jurisprudenciaEmEdicao = null;
let usuarioAtual = null;

novaJurisprudenciaBtn.addEventListener("click", () => {

  abrirFormulario();
  document.getElementById("titulo").focus();

});

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  const dados = {
    userId: usuarioAtual.uid,
    titulo: document.getElementById("titulo").value.trim(),
    tribunal: document.getElementById("tribunal").value.trim(),
    descricao: document.getElementById("descricao").value.trim()
  };

  const arquivo = arquivoInput.files[0];

  try {

    if (editandoId) {

      await updateDoc(doc(db, "jurisprudencias", editandoId), dados);

      if (arquivo) {
        await substituirArquivo(editandoId, jurisprudenciaEmEdicao, arquivo);
      }

    } else {

      const novoDoc = await addDoc(collection(db, "jurisprudencias"), {
        ...dados,
        criadoEm: new Date()
      });

      if (arquivo) {
        await substituirArquivo(novoDoc.id, null, arquivo);
      }

    }

    form.reset();
    limparArquivoAtual();

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

  const querySnapshot = await getDocs(
    query(collection(db, "jurisprudencias"), where("userId", "==", usuarioAtual.uid))
  );

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

    if (jurisprudenciaSelecionada && validarDonoDoRegistro(jurisprudenciaSelecionada, usuarioAtual)) {
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

      ${renderizarArquivo(jurisprudencia)}

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
        excluirJurisprudencia(jurisprudencia);

      });

    lista.appendChild(div);

  });

}

function editarJurisprudencia(jurisprudencia) {

  document.getElementById("titulo").value = jurisprudencia.titulo || "";
  document.getElementById("tribunal").value = jurisprudencia.tribunal || "";
  document.getElementById("descricao").value = jurisprudencia.descricao || "";

  editandoId = jurisprudencia.id;
  jurisprudenciaEmEdicao = jurisprudencia;
  abrirFormulario();
  mostrarArquivoAtual(jurisprudencia);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}

async function excluirJurisprudencia(jurisprudencia) {

  const confirmar = confirm("Deseja realmente excluir esta jurisprudência?");

  if (!confirmar) return;

  try {

    if (jurisprudencia.arquivoPath) {
      await excluirArquivo(jurisprudencia.arquivoPath);
    }

    await deleteDoc(doc(db, "jurisprudencias", jurisprudencia.id));

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
  limparArquivoAtual();

  if (jurisprudenciaIdSelecionada) {
    window.location.href = "jurisprudencias.html";
    return;
  }

  fecharFormulario();

});

async function substituirArquivo(id, registroAtual, arquivo) {

  if (registroAtual?.arquivoPath) {
    await excluirArquivo(registroAtual.arquivoPath);
  }

  const arquivoPath = `usuarios/${usuarioAtual.uid}/jurisprudencias/${id}/${Date.now()}-${normalizarNomeArquivo(arquivo.name)}`;
  const arquivoRef = ref(storage, arquivoPath);

  await uploadBytes(arquivoRef, arquivo);

  const arquivoUrl = await getDownloadURL(arquivoRef);

  await updateDoc(doc(db, "jurisprudencias", id), {
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
  novaJurisprudenciaBtn.hidden = true;

}

function fecharFormulario() {

  editandoId = null;
  jurisprudenciaEmEdicao = null;
  form.hidden = true;
  novaJurisprudenciaBtn.hidden = false;

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
  carregarJurisprudencias();

}

inicializar();
