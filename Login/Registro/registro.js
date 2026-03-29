import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { renderNavbar } from "../../Componentes/navbar.js";
import { auth, fetchWithAuth, firebaseConfig, getLandingPathByRole, getUserContext } from "../../Componentes/auth.js";

/**
 * Pantalla de Registro.
 *
 * Responsabilidad:
 * - Crear cuenta en Firebase Auth.
 * - Persistir perfil del usuario en Realtime Database: `/users/{uid}`.
 * - Enviar verificación de correo (Firebase Auth) y cerrar sesión.
 *
 * Invariantes / riesgos de cambios:
 * - Si cambias la ruta `/users/{uid}` o la estructura del perfil, el resto del sistema (roles, perfil, admin)
 *   puede dejar de funcionar.
 * - Si eliminas el envío de verificación o el `signOut`, el usuario podría permanecer autenticado sin verificar.
 */

const form = document.getElementById("registerForm");
const statusMsg = document.getElementById("status");
const btnRegister = document.getElementById("btnRegister");
let isCreatingAccount = false;

renderNavbar({
  active: "registro",
  user: null,
  base: "../.."
});

onAuthStateChanged(auth, async (user) => {
  if (!user || isCreatingAccount) return;

  const { role } = await getUserContext(user);
  window.location.href = getLandingPathByRole(role, "../..");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  isCreatingAccount = true;

  btnRegister.disabled = true;
  btnRegister.innerText = "Creando cuenta...";

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    const userData = {
      name,
      phone,
      address: "",
      email,
      role: "user",
      favoriteRoutes: {},
      createdAt: new Date().toISOString()
    };

    const response = await fetchWithAuth(`${firebaseConfig.databaseURL}/users/${uid}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    }, credential.user);

    if (!response.ok) throw new Error("No se pudo guardar el perfil");

    // Envia correo de verificacion. El usuario debe verificar antes de iniciar sesion.
    // Si se cambia la URL, hay que mantener disponible `verify-email.html` en Hosting.
    const baseUrl = `https://${firebaseConfig.projectId}.web.app`;
    await sendEmailVerification(credential.user, {
      url: `${baseUrl}/Login/verify-email.html`,
      handleCodeInApp: true
    });

    statusMsg.style.color = "#2d5a27";
    statusMsg.textContent = "Cuenta creada. Revisa tu correo para verificar tu cuenta antes de iniciar sesión.";

    setTimeout(() => {
      signOut(auth).catch(() => {});
      window.location.href = "../login.html?verify=1";
    }, 700);
  } catch (error) {
    console.error("Error en registro:", error);
    statusMsg.style.color = "red";
    statusMsg.textContent = error.code || error.message || "No se pudo crear la cuenta";
  } finally {
    isCreatingAccount = false;
    btnRegister.disabled = false;
    btnRegister.innerText = "Crear cuenta";
  }
});
