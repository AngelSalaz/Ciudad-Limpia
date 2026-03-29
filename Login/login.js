import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { renderNavbar } from "../Componentes/navbar.js";
import { auth, fetchWithAuth, firebaseConfig, getLandingPathByRole, getUserContext, getUserProfile } from "../Componentes/auth.js";

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

/**
 * Garantiza que exista un perfil en RTDB ("/users/{uid}") para usuarios verificados.
 *
 * Objetivo (requisito escolar):
 * - No registrar al usuario en la base de datos (RTDB) hasta que su correo se haya verificado.
 *
 * Nota importante:
 * - Firebase Auth crea la cuenta al registrarse (no se puede "posponer" esa creación sin un backend).
 * - Lo que sí controlamos aquí (gratis) es cuándo creamos el registro en RTDB.
 */
async function ensureUserProfileExists(user) {
  if (!user) return null;

  const existing = await getUserProfile(user.uid, user);
  if (existing) return existing;

  const pendingKey = `pending_profile_${user.uid}`;
  let pending = null;
  try {
    pending = JSON.parse(localStorage.getItem(pendingKey) || "null");
  } catch {
    pending = null;
  }

  const payload = {
    name: "",
    phone: "",
    address: "",
    email: user.email || "",
    role: "user",
    favoriteRoutes: {},
    createdAt: new Date().toISOString(),
    ...(pending && pending.uid === user.uid ? pending : {})
  };

  // Crear perfil en RTDB. Si las reglas exigen auth.uid === {uid}, el token ya viene en fetchWithAuth.
  await fetchWithAuth(`${firebaseConfig.databaseURL}/users/${user.uid}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }, user);

  localStorage.removeItem(pendingKey);
  return payload;
}

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
if (params.get("reset") === "1") {
  statusMsg.style.color = "#2d5a27";
  statusMsg.textContent = "Contraseña restablecida. Ya puedes iniciar sesión.";
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

  // Solo a partir de aquí el usuario está verificado: creamos el perfil en RTDB si aún no existe.
  await ensureUserProfileExists(user);

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
    // Para evitar "doble formulario" (Firebase + formulario propio), usamos el flujo oficial de Firebase.
    // El enlace abre la pantalla de restablecimiento de Firebase y al finalizar regresa a Login.
    await sendPasswordResetEmail(auth, email, {
      url: `${baseUrl}/Login/login.html?reset=1`,
      handleCodeInApp: false
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

    // El usuario ya está verificado: asegurar creación de perfil en RTDB antes de redirigir.
    await ensureUserProfileExists(credential.user);

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
