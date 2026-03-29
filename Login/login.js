import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { renderNavbar } from "../Componentes/navbar.js";
import { auth, firebaseConfig, getLandingPathByRole, getUserContext } from "../Componentes/auth.js";

/**
 * Pantalla de Login.
 *
 * Responsabilidad:
 * - Iniciar sesión con correo/contraseña (Firebase Auth).
 * - Bloquear acceso si el correo NO está verificado.
 * - Permitir recuperación de contraseña (envío de correo con enlace).
 *
 * Invariantes / riesgos de cambios:
 * - Si se elimina la validación `emailVerified`, usuarios no verificados podrán entrar.
 * - Las URLs de acción (`verify-email.html`, `reset-password.html`) deben existir en Hosting.
 *   Si cambian de ruta, hay que actualizar `baseUrl` y las llamadas a Auth.
 */

const loginForm = document.getElementById("loginForm");
const statusMsg = document.getElementById("status");
const btnLogin = document.getElementById("btnLogin");
const btnForgotPassword = document.getElementById("btnForgotPassword");
const btnResendVerification = document.getElementById("btnResendVerification");

const baseUrl = `https://${firebaseConfig.projectId}.web.app`;

renderNavbar({
  active: "login",
  user: null,
  base: ".."
});

const params = new URLSearchParams(window.location.search);
if (params.get("verify") === "1") {
  statusMsg.style.color = "#2d5a27";
  statusMsg.textContent = "Revisa tu correo. Enviamos un mensaje de verificación para activar tu cuenta.";
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  if (user.emailVerified === false) {
    // Mantiene la seguridad básica: no permitir acceso mientras no verifique correo.
    await signOut(auth);
    statusMsg.style.color = "red";
    statusMsg.textContent = "Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.";
    return;
  }

  const { role } = await getUserContext(user);
  window.location.href = getLandingPathByRole(role, "..");
});

btnForgotPassword?.addEventListener("click", async () => {
  const emailInput = document.getElementById("email");
  const email = (emailInput?.value || "").trim() || window.prompt("Ingresa tu correo para recuperar tu contraseña:");
  if (!email) return;

  btnForgotPassword.disabled = true;
  statusMsg.style.color = "#2d5a27";
  statusMsg.textContent = "Enviando correo de recuperación...";

  try {
    // Envia un correo con enlace de restablecimiento. `handleCodeInApp` hace que el enlace
    // redirija a nuestra pantalla `reset-password.html` y que el `oobCode` llegue por URL.
    await sendPasswordResetEmail(auth, email, {
      url: `${baseUrl}/Login/reset-password.html`,
      handleCodeInApp: true
    });
    statusMsg.style.color = "#2d5a27";
    statusMsg.textContent = "Correo de recuperación enviado. Revisa tu bandeja de entrada.";
  } catch (error) {
    console.error("Error enviando recuperación:", error);
    statusMsg.style.color = "red";
    statusMsg.textContent = error.code || "No se pudo enviar el correo de recuperación.";
  } finally {
    btnForgotPassword.disabled = false;
  }
});

btnResendVerification?.addEventListener("click", async () => {
  statusMsg.style.color = "red";
  statusMsg.textContent = "Inicia sesión para reenviar la verificación.";
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  btnLogin.disabled = true;
  btnLogin.innerText = "Entrando...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    if (credential.user.emailVerified === false) {
      // Reenvía verificación para mejorar UX: el usuario recibe un nuevo enlace si perdió el anterior.
      await sendEmailVerification(credential.user, {
        url: `${baseUrl}/Login/verify-email.html`,
        handleCodeInApp: true
      });

      await signOut(auth);
      statusMsg.style.color = "red";
      statusMsg.textContent = "Tu correo no está verificado. Enviamos un nuevo correo de verificación.";
      return;
    }

    const { role } = await getUserContext(credential.user);

    statusMsg.style.color = "#2d5a27";
    statusMsg.textContent = "Sesión iniciada";

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
