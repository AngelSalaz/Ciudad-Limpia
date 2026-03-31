import { onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { renderNavbar } from "../Componentes/navbar.js?v=20260331-1";
import { auth, fetchWithAuth, firebaseConfig, getUserContext, logoutUser } from "../Componentes/auth.js";

const emailSpan = document.getElementById("email");
const rolSpan = document.getElementById("rol");
const nombreInput = document.getElementById("nombreInput");
const guardarBtn = document.getElementById("guardarNombre");
const resetBtn = document.getElementById("resetPassword");
const statusMessage = document.getElementById("statusMessage");
const logoutProfileBtn = document.getElementById("logoutProfileBtn");

let activeUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../Login/login.html";
    return;
  }

  activeUser = user;
  const { profile, role } = await getUserContext(user);

  if (role !== "admin") {
    window.location.href = "../Usuarios/Usuarios-perfil.html";
    return;
  }

  renderNavbar({
    active: "admin",
    user,
    role,
    base: ".."
  });

  emailSpan.textContent = user.email;
  rolSpan.textContent = role;
  nombreInput.value = profile?.name || "";

  nombreInput.disabled = false;
  guardarBtn.disabled = false;
  resetBtn.disabled = false;
});

document.addEventListener("click", async (event) => {
  const buttonId = event.target?.id;
  if (buttonId !== "logout" && buttonId !== "btnLogout") return;

  await logoutUser();
  window.location.href = "../Login/login.html";
});

logoutProfileBtn?.addEventListener("click", async () => {
  await logoutUser();
  window.location.href = "../Login/login.html";
});

document.getElementById("profileForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!activeUser) return;
  const nuevoNombre = nombreInput.value.trim();

  if (!nuevoNombre) {
    showStatus("El nombre no puede estar vacío.", "error");
    return;
  }

  try {
    await fetchWithAuth(`${firebaseConfig.databaseURL}/users/${activeUser.uid}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nuevoNombre })
    }, activeUser);

    showStatus("Nombre actualizado correctamente.", "success");
  } catch (error) {
    console.error("Error actualizando nombre:", error);
    showStatus("No se pudo actualizar el nombre.", "error");
  }
});

resetBtn.addEventListener("click", async () => {
  if (!activeUser?.email) return;

  try {
    await sendPasswordResetEmail(auth, activeUser.email);
    showStatus("Correo de cambio de contraseña enviado.", "success");
  } catch (error) {
    console.error("Error enviando correo de cambio:", error);
    showStatus("No se pudo enviar el correo de cambio.", "error");
  }
});

function showStatus(message, type) {
  statusMessage.hidden = false;
  statusMessage.textContent = message;

  statusMessage.classList.remove(
    "perfil-status--info",
    "perfil-status--success",
    "perfil-status--error"
  );

  statusMessage.classList.add(
    type === "success" ? "perfil-status--success" :
    type === "error" ? "perfil-status--error" :
    "perfil-status--info"
  );
}

