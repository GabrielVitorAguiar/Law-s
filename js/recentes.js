const recentesContainer = document.getElementById("recentes");

// ==========================
// PEGAR RECENTES
// ==========================

const recentes =
  JSON.parse(localStorage.getItem("recentes")) || [];

// ==========================
// RENDERIZAR
// ==========================

recentes.forEach((item) => {

  const div = document.createElement("div");

  div.classList.add("recente-card");

  div.innerHTML = `

    <strong>${item.tipo}</strong>

    <p>${item.nome}</p>

  `;

  div.addEventListener("click", () => {

    window.location.href = item.link;

  });

  recentesContainer.appendChild(div);

});