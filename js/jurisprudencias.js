import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

// ==========================
// ELEMENTOS
// ==========================

const form = document.getElementById("jurisForm");

const lista = document.getElementById("listaJurisprudencias");

// ==========================
// CONTROLE DE EDIÇÃO
// ==========================

let editandoId = null;

// ==========================
// CREATE / UPDATE
// ==========================

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  const titulo = document.getElementById("titulo").value;

  const tribunal = document.getElementById("tribunal").value;

  const descricao = document.getElementById("descricao").value;

  try {

    // ==========================
    // UPDATE
    // ==========================

    if (editandoId) {

      const docRef = doc(db, "jurisprudencias", editandoId);

      await updateDoc(docRef, {

        titulo,
        tribunal,
        descricao

      });

      editandoId = null;

    }

    // ==========================
    // CREATE
    // ==========================

    else {

      await addDoc(collection(db, "jurisprudencias"), {

        titulo,
        tribunal,
        descricao,
        criadoEm: new Date()

      });

    }

    form.reset();

    carregarJurisprudencias();

  } catch (error) {

    console.error(error);

  }

});

// ==========================
// READ
// ==========================

async function carregarJurisprudencias() {

  lista.innerHTML = "";

  const querySnapshot = await getDocs(
    collection(db, "jurisprudencias")
  );

  querySnapshot.forEach((documento) => {

    const data = documento.data();

    const div = document.createElement("div");

    div.classList.add("juris-card");

    div.innerHTML = `

      <h3>${data.titulo}</h3>

      <p><strong>Tribunal:</strong> ${data.tribunal}</p>

      <p>${data.descricao}</p>

      <div class="acoes">

        <button class="editar-btn">
          Editar
        </button>

        <button class="deletar-btn">
          Excluir
        </button>

      </div>

    `;

    // ==========================
    // EDITAR
    // ==========================

    div.querySelector(".editar-btn")
      .addEventListener("click", () => {

        document.getElementById("titulo").value = data.titulo;

        document.getElementById("tribunal").value = data.tribunal;

        document.getElementById("descricao").value = data.descricao;

        editandoId = documento.id;

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

      });

    // ==========================
    // DELETE
    // ==========================

    div.querySelector(".deletar-btn")
      .addEventListener("click", async () => {

        const confirmar = confirm(
          "Deseja realmente excluir esta jurisprudência?"
        );

        if (!confirmar) return;

        try {

          await deleteDoc(
            doc(db, "jurisprudencias", documento.id)
          );

          carregarJurisprudencias();

        } catch (error) {

          console.error(error);

        }

      });

    lista.appendChild(div);

  });

}

carregarJurisprudencias();