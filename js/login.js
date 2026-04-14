import { auth } from "./firebase.js";
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { GithubAuthProvider } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", async () => {
  if (loginBtn.disabled) return;

  // 1. Salvamos o HTML original (preserva ícones e estilos)
  const originalContent = loginBtn.innerHTML;
  
  // 2. Estado de carregamento
  loginBtn.innerHTML = "Carregando..."; 
  loginBtn.disabled = true;

  let isSettled = false; // Controle para evitar conflito entre timeout e resposta

  // 3. O "Seguro de Vida": Se em 10 segundos nada acontecer, resetamos à força
  const safetyTimeout = setTimeout(() => {
    if (!isSettled) {
      console.warn("Segurança: Resetando botão por falta de resposta do Firebase.");
      resetButton();
    }
  }, 10000); // 10 segundos é um tempo seguro

  function resetButton() {
    isSettled = true;
    clearTimeout(safetyTimeout);
    loginBtn.innerHTML = originalContent;
    loginBtn.disabled = false;
  }

  try {
    const result = await signInWithPopup(auth, provider);
    
    // Se chegou aqui, deu certo
    isSettled = true;
    clearTimeout(safetyTimeout);

    if (result.user) {
      window.location.href = "index.html";
    }
  } catch (error) {
    console.error("Erro detectado:", error.code);
    resetButton(); // Erro ou popup fechado, voltamos ao normal

    if (error.code !== "auth/popup-closed-by-user") {
      alert("Erro ao entrar: " + error.message);
    }
  }
});



const githubProvider = new GithubAuthProvider();

const githubBtn = document.getElementById("githubBtn");

githubBtn.addEventListener("click", async () => {
  if (githubBtn.disabled) return;

  // 1. Salva o HTML original (para manter ícones e estilos CSS)
  const originalContent = githubBtn.innerHTML;

  // 2. Estado de carregamento
  githubBtn.innerHTML = "Carregando..."; 
  githubBtn.disabled = true;

  let isSettled = false; // Controle para evitar conflitos

  // 3. O "Seguro de Vida": Reset forçado após 10 segundos
  const safetyTimeout = setTimeout(() => {
    if (!isSettled) {
      console.warn("Timeout: Resetando botão do GitHub por segurança.");
      resetButton();
    }
  }, 10000);

  // Função auxiliar para voltar o botão ao normal
  function resetButton() {
    isSettled = true;
    clearTimeout(safetyTimeout);
    githubBtn.innerHTML = originalContent;
    githubBtn.disabled = false;
  }

  try {
    const result = await signInWithPopup(auth, githubProvider);
    
    // Se o login foi concluído com sucesso
    isSettled = true;
    clearTimeout(safetyTimeout);

    if (result.user) {
      window.location.href = "index.html";
    }

  } catch (error) {
    console.error("Erro detectado no GitHub:", error.code);
    
    // Independente do erro, destravamos o botão
    resetButton();

    // Só mostramos alerta se não for o usuário fechando a janela
    if (error.code !== "auth/popup-closed-by-user") {
      alert("Erro ao fazer login com GitHub: " + error.message);
    }
  }
});