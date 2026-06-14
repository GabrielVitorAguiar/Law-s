const recentesContainer = document.getElementById("recentes");
const botaoAnterior = document.getElementById("recentesAnterior");
const botaoProximo = document.getElementById("recentesProximo");

const recentes = JSON.parse(localStorage.getItem("recentes")) || [];
const iconesPorTipo = {
  cliente: "person",
  processo: "folder",
  jurisprudencia: "gavel"
};

renderizarRecentes();
atualizarBotoes();
window.addEventListener("resize", atualizarBotoes);
requestAnimationFrame(atualizarBotoes);

botaoAnterior.addEventListener("click", () => {

  recentesContainer.scrollBy({
    left: -320,
    behavior: "smooth"
  });

});

botaoProximo.addEventListener("click", () => {

  recentesContainer.scrollBy({
    left: 320,
    behavior: "smooth"
  });

});

recentesContainer.addEventListener("scroll", atualizarBotoes);

function renderizarRecentes() {

  recentesContainer.innerHTML = "";

  if (recentes.length === 0) {

    recentesContainer.innerHTML = `<p class="empty-state">Nenhum item acessado recentemente.</p>`;
    return;

  }

  recentes.forEach((item) => {

    const button = document.createElement("button");

    button.type = "button";
    button.classList.add("recente-card");

    button.innerHTML = `

      <span class="material-icons">${iconesPorTipo[item.tipo] || "description"}</span>

      <span>
        <strong>${escapeHTML(item.nome)}</strong>
        <small>${escapeHTML(rotuloTipo(item.tipo))}</small>
      </span>

    `;

    button.addEventListener("click", () => {

      promoverRecente(item);
      window.location.href = item.link;

    });

    recentesContainer.appendChild(button);

  });

}

function promoverRecente(item) {

  const semRepeticao = recentes.filter((recente) => recente.chave !== item.chave);

  localStorage.setItem("recentes", JSON.stringify([
    {
      ...item,
      acessadoEm: new Date().toISOString()
    },
    ...semRepeticao
  ]));

}

function atualizarBotoes() {

  const temOverflow = recentesContainer.scrollWidth > recentesContainer.clientWidth;

  botaoAnterior.hidden = !temOverflow || recentesContainer.scrollLeft <= 0;
  botaoProximo.hidden = !temOverflow || recentesContainer.scrollLeft + recentesContainer.clientWidth >= recentesContainer.scrollWidth - 2;

}

function rotuloTipo(tipo) {

  const rotulos = {
    cliente: "Cliente",
    processo: "Processo",
    jurisprudencia: "Jurisprudência"
  };

  return rotulos[tipo] || "Registro";

}

function escapeHTML(valor = "") {

  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}
