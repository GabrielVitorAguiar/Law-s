import { auth } from "./firebase.js";
import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

// ==========================
// PROVIDERS
// ==========================

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/calendar.readonly");

const githubProvider = new GithubAuthProvider();

// ==========================
// BOTÕES
// ==========================

const loginBtn = document.getElementById("loginBtn");
const githubBtn = document.getElementById("githubBtn");

// ==========================
// LOGIN GOOGLE
// ==========================

loginBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);

    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential.accessToken;

    sessionStorage.setItem("googleToken", token);

    window.location.href = "index.html";

  } catch (error) {
    if (error.code !== "auth/popup-closed-by-user") {
      alert("Erro ao entrar: " + error.message);
    }
  }
});

// ==========================
// LOGIN GITHUB
// ==========================

githubBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, githubProvider);

    if (result.user) {
      window.location.href = "index.html";
    }

  } catch (error) {
    if (error.code !== "auth/popup-closed-by-user") {
      alert("Erro GitHub: " + error.message);
    }
  }
});