import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { renderNavbar } from "../Componentes/navbar.js";
import { auth, fetchWithAuth, firebaseConfig, getUserContext, logoutUser } from "../Componentes/auth.js";

const DB_BASE = `${firebaseConfig.databaseURL}/reportes`;

const tablaBody = document.getElementById("tablaBody");
const paginacionDiv = document.getElementById("paginacion");
const btnRecargar = document.getElementById("btnRecargar");

const buscador = document.getElementById("buscador");
const filtroEstado = document.getElementById("filtroEstado");

const modal = document.getElementById("modalEditar");
const editId = document.getElementById("editId");
const editTipo = document.getElementById("editTipo");
const editUsuario = document.getElementById("editUsuario");
const editUbicacion = document.getElementById("editUbicacion");
const editDescripcion = document.getElementById("editDescripcion");
const editEstado = document.getElementById("editEstado");

const btnGuardar = document.getElementById("btnGuardar");
const btnCerrar = document.getElementById("btnCerrar");

let reportesGlobal = [];
let reportesFiltrados = [];
let paginaActual = 1;
const porPagina = 5;
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

  await cargarReportes();
});

document.addEventListener("click", async (event) => {
  const id = event.target?.id;
  if (id !== "btnLogout" && id !== "logout") return;
  await logoutUser();
  window.location.href = "../Login/login.html";
});

btnRecargar.addEventListener("click", cargarReportes);
buscador.addEventListener("input", aplicarFiltros);
filtroEstado.addEventListener("change", aplicarFiltros);

btnGuardar.addEventListener("click", guardarEdicion);
btnCerrar.addEventListener("click", cerrarModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) cerrarModal();
});

tablaBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;
  if (!id || !action) return;

  if (action === "editar") {
    await abrirEditar(id);
    return;
  }
});

async function cargarReportes() {
  try {
    const data = await fetchJson(`${DB_BASE}.json`);

    const baseData = data?.reportes && typeof data.reportes === "object" && Object.keys(data).length === 1
      ? data.reportes
      : data;

    reportesGlobal = Object.entries(baseData || {});
    aplicarFiltros();
  } catch (error) {
    console.error("Error al cargar reportes:", error);
    reportesGlobal = [];
    reportesFiltrados = [];
    renderTabla();
    renderPaginacion();
  }
}

function aplicarFiltros() {
  const texto = toSafeLower(buscador.value);
  const estadoSeleccionado = filtroEstado.value;

  reportesFiltrados = reportesGlobal.filter(([, reporte]) => {
    const tipo = toSafeLower(reporte.tipo);
    const usuario = toSafeLower(reporte.usuario);
    const ubicacion = toSafeLower(reporte.ubicacion);
    const estado = reporte.estado || "Pendiente";

    const coincideTexto =
      tipo.includes(texto) ||
      usuario.includes(texto) ||
      ubicacion.includes(texto);

    const coincideEstado =
      estadoSeleccionado === "Todos" ||
      estado === estadoSeleccionado;

    return coincideTexto && coincideEstado;
  });

  paginaActual = 1;
  renderTabla();
  renderPaginacion();
}

function renderTabla() {
  tablaBody.innerHTML = "";

  if (!reportesFiltrados.length) {
    tablaBody.innerHTML = `
      <tr>
        <td class="empty" colspan="7">No hay reportes para mostrar.</td>
      </tr>
    `;
    return;
  }

  const inicio = (paginaActual - 1) * porPagina;
  const fin = inicio + porPagina;
  const paginaItems = reportesFiltrados.slice(inicio, fin);

  paginaItems.forEach(([id, reporte]) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(reporte.tipo || "-")}</td>
      <td>${escapeHtml(reporte.usuario || "-")}</td>
      <td>${escapeHtml(reporte.ubicacion || "-")}</td>
      <td>${escapeHtml(reporte.descripcion || "-")}</td>
      <td>${escapeHtml(reporte.fecha || "-")}</td>
      <td>${escapeHtml(reporte.estado || "Pendiente")}</td>
      <td>
        <div class="acciones">
          <button class="btn-editar" data-action="editar" data-id="${id}">Cambiar estado</button>
        </div>
      </td>
    `;

    tablaBody.appendChild(tr);
  });
}

function renderPaginacion() {
  paginacionDiv.innerHTML = "";

  const totalPaginas = Math.ceil(reportesFiltrados.length / porPagina);
  if (totalPaginas <= 1) return;

  for (let i = 1; i <= totalPaginas; i += 1) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === paginaActual) btn.classList.add("active");

    btn.addEventListener("click", () => {
      paginaActual = i;
      renderTabla();
      renderPaginacion();
    });

    paginacionDiv.appendChild(btn);
  }
}

async function abrirEditar(id) {
  const data = await fetchJson(`${DB_BASE}/${id}.json`);
  if (!data) return;

  editId.value = id;
  editTipo.value = data.tipo || "";
  editUsuario.value = data.usuario || "";
  editUbicacion.value = data.ubicacion || "";
  editDescripcion.value = data.descripcion || "";
  editEstado.value = data.estado || "Pendiente";

  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
}

async function guardarEdicion() {
  const id = editId.value;
  if (!id) return;

  await fetchWithAuth(`${DB_BASE}/${id}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      estado: editEstado.value
    })
  }, sessionUser);

  cerrarModal();
  await cargarReportes();
}

function cerrarModal() {
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
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

async function fetchJson(url) {
  const response = await fetchWithAuth(url, {}, sessionUser);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    throw new Error(data?.error || `HTTP ${response.status}`);
  }
  return data || {};
}
