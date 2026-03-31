import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { renderNavbar } from "../Componentes/navbar.js?v=20260331-1";
import { auth, getLandingPathByRole, getUserContext } from "../Componentes/auth.js";

const loginForm = document.getElementById("loginForm");
const statusMsg = document.getElementById("status");
const btnLogin = document.getElementById("btnLogin");

renderNavbar({
  active: "login",
  user: null,
  base: ".."
});

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const { role } = await getUserContext(user);
  window.location.href = getLandingPathByRole(role, "..");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  btnLogin.disabled = true;
  btnLogin.innerText = "Entrando...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const { role } = await getUserContext(credential.user);

    statusMsg.style.color = "green";
    statusMsg.textContent = "Sesion iniciada";

    window.location.href = getLandingPathByRole(role, "..");
  } catch (error) {
    console.error("Error en login:", error);
    statusMsg.style.color = "red";
    statusMsg.textContent = error.code || "No se pudo iniciar sesión";
  } finally {
    btnLogin.disabled = false;
    btnLogin.innerText = "Entrar";
  }
});

