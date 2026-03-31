import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { renderNavbar } from "../Componentes/navbar.js?v=20260331-1";
import { auth, getUserContext, logoutUser } from "../Componentes/auth.js";

const adminName = document.getElementById("adminName");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../Login/login.html";
    return;
  }

  const { profile, role } = await getUserContext(user);
  if (role !== "admin") {
    alert("Acceso denegado");
    window.location.href = "../Home/inicio.html";
    return;
  }

  renderNavbar({
    active: "admin",
    user,
    role,
    base: ".."
  });

  adminName.textContent = `Admin: ${profile?.name || user.email}`;
});

document.addEventListener("click", async (event) => {
  const id = event.target?.id;
  if (id !== "btnLogout" && id !== "logout") return;
  await logoutUser();
  window.location.href = "../Login/login.html";
});

