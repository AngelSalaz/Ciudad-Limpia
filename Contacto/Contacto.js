import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db, getUserContext } from "../Componentes/auth.js";
import { renderNavbar } from "../Componentes/navbar.js";

const form = document.getElementById("contactForm");
const tipoSelect = document.getElementById("tipoMensaje");
const otroInput = document.getElementById("otroTipo");
const emailInput = document.getElementById("email");
const asuntoInput = document.getElementById("asunto");
const mensajeInput = document.getElementById("mensaje");
const btnEnviar = document.getElementById("btnEnviarContacto");
const statusMsg = document.getElementById("status");

let currentUser = null;
let currentRole = "user";

onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;
  const { role } = await getUserContext(user);
  currentRole = role;

  renderNavbar({
    active: "contacto",
    user,
    role,
    base: ".."
  });

  if (currentUser?.email) {
    emailInput.value = currentUser.email;
  }
});

tipoSelect.addEventListener("change", () => {
  otroInput.hidden = tipoSelect.value !== "Otro";
  if (tipoSelect.value !== "Otro") otroInput.value = "";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  btnEnviar.disabled = true;

  const tipo = tipoSelect.value === "Otro" ? otroInput.value.trim() : tipoSelect.value;
  const email = emailInput.value.trim();
  const asunto = asuntoInput.value.trim();
  const mensaje = mensajeInput.value.trim();

  if (!tipo || !email || !asunto || !mensaje) {
    showStatus("Completa todos los campos.", "#b3261e");
    btnEnviar.disabled = false;
    return;
  }

  try {
    await addDoc(collection(db, "mensajes_contacto"), {
      tipo,
      email,
      asunto,
      mensaje,
      fechaISO: new Date().toISOString(),
      fechaTexto: new Date().toLocaleString(),
      usuarioUid: currentUser?.uid || null,
      usuarioRol: currentRole
    });

    showStatus("Mensaje enviado con exito. Gracias por contactarnos.", "#2d5a27");
    form.reset();
    otroInput.hidden = true;

    if (currentUser?.email) {
      emailInput.value = currentUser.email;
    }
  } catch (error) {
    console.error("Error guardando mensaje de contacto:", error);
    showStatus("Hubo un error al enviar tu mensaje.", "#b3261e");
  } finally {
    btnEnviar.disabled = false;
  }
});

function showStatus(message, color) {
  statusMsg.hidden = false;
  statusMsg.textContent = message;
  statusMsg.style.color = color;
  statusMsg.style.fontWeight = "600";
}
