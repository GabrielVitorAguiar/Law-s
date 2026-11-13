const menuButton = document.querySelector(".landing-menu-toggle");
const navigation = document.querySelector(".landing-nav");

menuButton?.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Abrir navegação" : "Fechar navegação");
  navigation?.classList.toggle("is-open", !isOpen);
  const icon = menuButton.querySelector(".material-icons");
  if (icon) icon.textContent = isOpen ? "menu" : "close";
});

navigation?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navigation.classList.remove("is-open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "Abrir navegação");
    const icon = menuButton?.querySelector(".material-icons");
    if (icon) icon.textContent = "menu";
  });
});
