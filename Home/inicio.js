import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { renderNavbar } from "../Componentes/navbar.js";
import { auth, getUserContext, logoutUser } from "../Componentes/auth.js";

const status = document.getElementById("status");
const navbar = document.getElementById("navbar");
const perfilCta = document.getElementById("perfilCta");

onAuthStateChanged(auth, async (user) => {
  const { role } = await getUserContext(user);

  renderNavbar({
    active: "inicio",
    user,
    role,
    base: ".."
  });

  const perfilHref = role === "admin"
    ? "../Admin/admin-perfil.html"
    : "../Usuarios/Usuarios-perfil.html";

  if (perfilCta) perfilCta.href = perfilHref;

  if (user) {
    status.style.color = "#2d5a27";
    status.textContent = role === "admin" ? "Sesión activa (admin)" : "Sesión activa";
  } else {
    status.style.color = "#777";
    status.textContent = "No has iniciado sesión. Ve a Login para entrar.";
  }
});

document.addEventListener("click", async (event) => {
  if (event.target?.id !== "btnLogout") return;

  await logoutUser();
  window.location.href = "../Login/login.html";
});

window.addEventListener("scroll", () => {
  if (!navbar) return;
  if (window.scrollY > 50) {
    navbar.classList.add("nav-active");
  } else {
    navbar.classList.remove("nav-active");
  }
});
