import {
  confirmPasswordReset,
  verifyPasswordResetCode
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { renderNavbar } from "../Componentes/navbar.js";
import { auth } from "../Componentes/auth.js";

/**
 * Restablecimiento de contraseña (handleCodeInApp).
 *
 * Flujo:
 * - El usuario abre un enlace con `oobCode` (enviado por Firebase Auth).
 * - Se valida el código con `verifyPasswordResetCode`.
 * - Se confirma la nueva contraseña con `confirmPasswordReset`.
 *
 * Riesgo de cambios:
 * - Si la página deja de estar en Hosting o cambia de ruta, los enlaces de recuperación fallarán.
 * - Si se elimina la validación del código, se pierde retroalimentación clara al usuario.
 */

renderNavbar({
  active: "login",
  user: null,
  base: ".."
});

const resetForm = document.getElementById("resetForm");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");
const btnReset = document.getElementById("btnReset");
const status = document.getElementById("status");
const resetHint = document.getElementById("resetHint");

function setStatus(message, type = "info") {
  status.textContent = message || "";
  status.style.color = type === "error" ? "red" : "#2d5a27";
}

const params = new URLSearchParams(window.location.search);
const oobCode = params.get("oobCode");

async function init() {
  if (!oobCode) {
    setStatus("Enlace inválido o incompleto. Solicita de nuevo la recuperación de contraseña.", "error");
    btnReset.disabled = true;
    return;
  }

  try {
    const email = await verifyPasswordResetCode(auth, oobCode);
    if (resetHint) resetHint.textContent = `Restableciendo contraseña para: ${email}`;
  } catch (error) {
    console.error("Código de recuperación inválido:", error);
    setStatus("El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.", "error");
    btnReset.disabled = true;
  }
}

resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!oobCode) return;

  const pass1 = newPassword.value;
  const pass2 = confirmPassword.value;

  if (pass1 !== pass2) {
    setStatus("Las contraseñas no coinciden.", "error");
    return;
  }

  btnReset.disabled = true;
  btnReset.innerText = "Guardando...";
  setStatus("Aplicando cambio de contraseña...");

  try {
    await confirmPasswordReset(auth, oobCode, pass1);
    setStatus("Contraseña actualizada correctamente. Ya puedes iniciar sesión.", "success");
    resetForm.reset();
  } catch (error) {
    console.error("Error confirmando reset:", error);
    setStatus(error.code || "No se pudo actualizar la contraseña.", "error");
  } finally {
    btnReset.disabled = false;
    btnReset.innerText = "Guardar contraseña";
  }
});

init();
