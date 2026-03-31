import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { renderNavbar } from "../Componentes/navbar.js?v=20260331-1";
import { auth, fetchWithAuth, firebaseConfig, getUserContext, logoutUser } from "../Componentes/auth.js";

const usuariosBody = document.getElementById("usuariosBody");
const btnRecargar = document.getElementById("btnRecargar");
const buscadorUsuario = document.getElementById("buscadorUsuario");
const filtroRol = document.getElementById("filtroRol");

let usuariosGlobal = [];
let usuariosFiltrados = [];
let sessionUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../Login/login.html";
    return;
  }

  sessionUser = user;
  const { role } = await getUserContext(user);
  if (role !== "admin") {
    alert("No autorizado");
    window.location.href = "../Home/inicio.html";
    return;
  }

  renderNavbar({
    active: "admin",
    user,
    role,
    base: ".."
  });

  await cargarUsuarios();
});

document.addEventListener("click", async (event) => {
  const id = event.target?.id;
  if (id !== "btnLogout" && id !== "logout") return;
  await logoutUser();
  window.location.href = "../Login/login.html";
});

btnRecargar.addEventListener("click", cargarUsuarios);
buscadorUsuario.addEventListener("input", aplicarFiltros);
filtroRol.addEventListener("change", aplicarFiltros);

usuariosBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='rol']");
  if (!button) return;

  const uid = button.dataset.id;
  if (!uid) return;

  const selector = document.getElementById(`role-${uid}`);
  const nuevoRol = selector?.value || "user";

  await fetchWithAuth(`${firebaseConfig.databaseURL}/users/${uid}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: nuevoRol })
  }, sessionUser);

  await cargarUsuarios();
});

async function cargarUsuarios() {
  try {
    const data = await fetchJson(`${firebaseConfig.databaseURL}/users.json`);

    if (data?.users && typeof data.users === "object" && Object.keys(data).length === 1) {
      usuariosGlobal = Object.entries(data.users);
    } else {
      usuariosGlobal = Object.entries(data || {});
    }

    aplicarFiltros();
  } catch (error) {
    console.error("Error cargando usuarios:", error);
    usuariosGlobal = [];
    usuariosFiltrados = [];
    renderTabla();
  }
}

async function fetchJson(url) {
  const response = await fetchWithAuth(url, {}, sessionUser);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    throw new Error(data?.error || `HTTP ${response.status}`);
  }
  return data || {};
}

function aplicarFiltros() {
  const texto = toSafeLower(buscadorUsuario.value);
  const rolSeleccionado = filtroRol.value;

  usuariosFiltrados = usuariosGlobal.filter(([, usuario]) => {
    const nombre = toSafeLower(usuario.name);
    const correo = toSafeLower(usuario.email);
    const telefono = toSafeLower(usuario.phone);
    const rol = usuario.role || "user";

    const coincideTexto =
      nombre.includes(texto) ||
      correo.includes(texto) ||
      telefono.includes(texto);

    const coincideRol =
      rolSeleccionado === "Todos" ||
      rol === rolSeleccionado;

    return coincideTexto && coincideRol;
  });

  renderTabla();
}

function renderTabla() {
  usuariosBody.innerHTML = "";

  if (!usuariosFiltrados.length) {
    usuariosBody.innerHTML = `
      <tr>
        <td class="empty" colspan="5">No hay usuarios para mostrar.</td>
      </tr>
    `;
    return;
  }

  usuariosFiltrados.forEach(([uid, usuario]) => {
    const tr = document.createElement("tr");
    const rolValue = (usuario.role || "user") === "admin" ? "admin" : "user";
    const rolLabel = rolValue === "admin" ? "Administrador" : "Usuario";
    tr.innerHTML = `
      <td>${escapeHtml(usuario.name || "Sin nombre")}</td>
      <td>${escapeHtml(usuario.email || "-")}</td>
      <td>${escapeHtml(usuario.phone || "-")}</td>
      <td>${escapeHtml(rolLabel)}</td>
      <td>
        <div class="role-control">
          <select id="role-${uid}">
            <option value="user" ${rolValue === "user" ? "selected" : ""}>Usuario</option>
            <option value="admin" ${rolValue === "admin" ? "selected" : ""}>Administrador</option>
          </select>
          <button class="btn-role" data-action="rol" data-id="${uid}">Actualizar</button>
        </div>
      </td>
    `;

    usuariosBody.appendChild(tr);
  });
}

function toSafeLower(value) {
  return (value || "").toString().toLowerCase();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

