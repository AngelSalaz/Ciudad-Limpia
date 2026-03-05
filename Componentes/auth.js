import { firebaseConfig } from "../firebase-config.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
// 1. Importamos Firestore
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Inicialización de la App
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// 2. Inicializamos los servicios
const auth = getAuth(app);
const db = getFirestore(app); // Instancia de Firestore para reportes y mensajes

// Exportaciones base
export { auth, db, firebaseConfig };

/**
 * Normaliza los roles para el sistema de navegación
 */
function normalizeRole(role) {
  const value = (role || "").toString().trim().toLowerCase();
  return value === "admin" || value === "administrador" ? "admin" : "user";
}

/**
 * Añade el token de autenticación a una URL (útil para Realtime Database si aún usas partes de ella)
 */
async function addAuthToUrl(url, user = auth.currentUser) {
  if (!user) return url;

  try {
    const token = await user.getIdToken(true);
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}auth=${encodeURIComponent(token)}`;
  } catch (error) {
    console.error("No se pudo obtener token de autenticación:", error);
    return url;
  }
}

export async function fetchWithAuth(url, options = {}, user = auth.currentUser) {
  const authedUrl = await addAuthToUrl(url, user);
  return fetch(authedUrl, options);
}

/**
 * Obtiene el perfil del usuario desde Realtime Database (si ahí guardas los roles)
 */
export async function getUserProfile(uid, user = auth.currentUser) {
  if (!uid) return null;

  try {
    const response = await fetchWithAuth(`${firebaseConfig.databaseURL}/users/${uid}.json`, {}, user);
    if (!response.ok) {
      console.error(`No se pudo leer perfil de usuario (HTTP ${response.status})`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("No se pudo leer perfil de usuario:", error);
    return null;
  }
}

/**
 * Obtiene el contexto completo del usuario (Perfil + Rol)
 */
export async function getUserContext(user) {
  if (!user) {
    return { profile: null, role: "user" };
  }

  const profile = await getUserProfile(user.uid, user);
  const role = normalizeRole(profile?.role);

  return { profile, role };
}

/**
 * Define la ruta de aterrizaje según el rol detectado
 */
export function getLandingPathByRole(role, base = "..") {
  const root = base.replace(/\/$/, "");
  return normalizeRole(role) === "admin" ? `${root}/Admin/admin.html` : `${root}/Home/inicio.html`;
}

/**
 * Cierra la sesión del usuario
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    // Redirigir opcionalmente después del logout
    window.location.href = "../Login/login.html";
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
}