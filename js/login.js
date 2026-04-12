import { auth } from "./firebase.js";
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);

    // Redireciona após login
    window.location.href = "index.html";

  } catch (error) {
    console.error("Erro no login:", error);
  }
});