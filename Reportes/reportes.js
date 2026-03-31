import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { renderNavbar } from "../Componentes/navbar.js?v=20260331-1";
import { auth, fetchWithAuth, firebaseConfig, getUserContext, logoutUser } from "../Componentes/auth.js";

const API_URL = `${firebaseConfig.databaseURL}/reportes.json`;

const reportForm = document.getElementById("reportForm");
const tipoSelect = document.getElementById("tipo");
const otroContainer = document.getElementById("otroContainer");
const otroDetalleInput = document.getElementById("otroDetalle");
const statusMsg = document.getElementById("status");
const btnEnviar = document.getElementById("btnEnviar");
const userName = document.getElementById("userName");
const usuarioInput = document.getElementById("usuario");
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../Login/login.html";
    return;
  }

  currentUser = user;
  const { profile, role } = await getUserContext(user);

  renderNavbar({
    active: "reportes",
    user,
    role,
    base: ".."
  });

  const displayName = profile?.name || user.email || "usuario";
  userName.textContent = `Hola, ${displayName}`;

  if (!usuarioInput.value.trim()) {
    usuarioInput.value = profile?.name || "";
  }
});

document.addEventListener("click", async (event) => {
  if (event.target?.id !== "btnLogout") return;

  await logoutUser();
  window.location.href = "../Login/login.html";
});

tipoSelect.addEventListener("change", () => {
  const isOther = tipoSelect.value === "Otro";
  otroContainer.style.display = isOther ? "block" : "none";
  otroDetalleInput.required = isOther;

  if (!isOther) {
    otroDetalleInput.value = "";
  }
});

reportForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  btnEnviar.disabled = true;
  btnEnviar.innerText = "Enviando reporte...";

  if (tipoSelect.value === "Otro" && !otroDetalleInput.value.trim()) {
    statusMsg.style.color = "red";
    statusMsg.textContent = "Especifica el tipo de reporte en 'Otro'.";
    btnEnviar.disabled = false;
    btnEnviar.innerText = "Enviar reporte";
    return;
  }

  const nombreUsuario = usuarioInput.value.trim();
  if (!nombreUsuario) {
    statusMsg.style.color = "red";
    statusMsg.textContent = "Ingresa el nombre del reportante.";
    btnEnviar.disabled = false;
    btnEnviar.innerText = "Enviar reporte";
    return;
  }

  let tipoFinal = tipoSelect.value;
  if (tipoFinal === "Otro") {
    tipoFinal = `Otro: ${otroDetalleInput.value.trim()}`;
  }

  const nuevoReporte = {
    usuario: nombreUsuario,
    usuarioUid: currentUser?.uid || "",
    usuarioEmail: currentUser?.email || "",
    tipo: tipoFinal,
    ubicacion: document.getElementById("ubicacion").value.trim(),
    descripcion: document.getElementById("descripcion").value.trim(),
    estado: "Pendiente",
    fecha: new Date().toLocaleString()
  };

  try {
    const response = await fetchWithAuth(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevoReporte)
    }, currentUser);

    if (!response.ok) {
      throw new Error("Error al enviar el reporte");
    }

    const data = await response.json();
    statusMsg.style.color = "#2d5a27";
    statusMsg.textContent = `Reporte enviado. Folio: ${data.name}`;

    reportForm.reset();
    otroContainer.style.display = "none";
  } catch (error) {
    console.error("Error enviando reporte:", error);
    statusMsg.style.color = "red";
    statusMsg.textContent = "No se pudo enviar el reporte.";
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.innerText = "Enviar reporte";
  }
});

