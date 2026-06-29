import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

export function obterUsuarioAtual() {

  return new Promise((resolve) => {

    const unsubscribe = onAuthStateChanged(auth, (user) => {

      unsubscribe();

      if (!user) {
        window.location.href = "login.html";
        return;
      }

      resolve(user);

    });

  });

}

export function validarDonoDoRegistro(registro, usuario) {

  return registro?.userId === usuario.uid;

}
