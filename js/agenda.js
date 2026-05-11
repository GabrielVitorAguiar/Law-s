import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

let token = null;

// ==========================
// LOGIN + TOKEN
// ==========================

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  token = sessionStorage.getItem("googleToken");

  if (!token) {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/calendar");

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      token = credential.accessToken;

      sessionStorage.setItem("googleToken", token);

    } catch (error) {
      alert("Permissão necessária.");
      return;
    }
  }

  carregarEventos();
});

// ==========================
// BUSCAR EVENTOS
// ==========================

async function carregarEventos() {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&orderBy=startTime&singleEvents=true",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  if (!data.items) return;

  renderEventos(data.items);
}

// ==========================
// RENDER
// ==========================

function renderEventos(eventos) {
  const container = document.getElementById("eventos");
  container.innerHTML = "";

  eventos.forEach(evento => {
    const dataEvento = new Date(evento.start.dateTime || evento.start.date);

    const div = document.createElement("div");

    div.style.background = "#1c1c1c";
    div.style.padding = "15px";
    div.style.margin = "10px";
    div.style.borderRadius = "10px";

    div.innerHTML = `
      <strong>${evento.summary || "Sem título"}</strong><br>
      ${dataEvento.toLocaleString()}
    `;

    container.appendChild(div);
  });
}

// ==========================
// CRIAR EVENTO
// ==========================

document.getElementById("criarEventoBtn").addEventListener("click", async () => {

  const titulo = prompt("Título do evento:");
  const data = prompt("Data (YYYY-MM-DD):");
  const hora = prompt("Hora (HH:MM):");

  if (!titulo || !data || !hora) return;

  const startDateTime = `${data}T${hora}:00-03:00`;

  const evento = {
    summary: titulo,
    start: {
      dateTime: startDateTime
    },
    end: {
      dateTime: startDateTime
    }
  };

  await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(evento)
    }
  );

  alert("Evento criado!");

  carregarEventos();
});