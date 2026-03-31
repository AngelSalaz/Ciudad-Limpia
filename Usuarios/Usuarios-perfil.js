import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { renderNavbar } from "../Componentes/navbar.js";
import { auth, firebaseConfig, fetchWithAuth, getUserContext, logoutUser } from "../Componentes/auth.js";

const profileForm = document.getElementById("profileForm");
const nameInput = document.getElementById("nameInput");
const phoneInput = document.getElementById("phoneInput");
const addressInput = document.getElementById("addressInput");
const basicNameTxt = document.getElementById("basicNameTxt");
const basicEmailTxt = document.getElementById("basicEmailTxt");
const basicPhoneTxt = document.getElementById("basicPhoneTxt");
const basicAddressTxt = document.getElementById("basicAddressTxt");
const profileStatus = document.getElementById("profileStatus");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const logoutProfileBtn = document.getElementById("logoutProfileBtn");

const reportsStatus = document.getElementById("reportsStatus");
const reportsTableBody = document.getElementById("reportsTableBody");

const favoritesStatus = document.getElementById("favoritesStatus");
const favoritesList = document.getElementById("favoritesList");
const routeSelect = document.getElementById("routeSelect");
const addFavoriteBtn = document.getElementById("addFavoriteBtn");

let currentUser = null;
let currentProfile = null;
let userReportsById = {};
let trackingRequestsByReport = {};
let allRoutes = {};
let favoriteRouteIds = [];

const userUrl = (uid) => `${firebaseConfig.databaseURL}/users/${uid}.json`;
const userFavoriteRoutesUrl = (uid) => `${firebaseConfig.databaseURL}/users/${uid}/favoriteRoutes.json`;
const userFavoriteRouteUrl = (uid, routeId) => `${firebaseConfig.databaseURL}/users/${uid}/favoriteRoutes/${routeId}.json`;
const reportsUrl = `${firebaseConfig.databaseURL}/reportes.json`;
const routesUrl = `${firebaseConfig.databaseURL}/rutas.json`;
const trackingRequestsUrl = `${firebaseConfig.databaseURL}/seguimientoSolicitudes.json`;
const trackingRequestUrl = (uid, reportId) =>
  `${firebaseConfig.databaseURL}/seguimientoSolicitudes/${uid}_${reportId}.json`;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../Login/login.html";
    return;
  }

  currentUser = user;
  const { profile, role } = await getUserContext(user);

  if (role === "admin") {
    window.location.href = "../Admin/admin-perfil.html";
    return;
  }

  currentProfile = profile || {};

  renderNavbar({
    active: "perfil",
    user,
    role,
    base: ".."
  });

  hydrateProfile();
  await Promise.all([loadReports(), loadFavorites()]);

  nameInput.disabled = false;
  phoneInput.disabled = false;
  addressInput.disabled = false;
  saveProfileBtn.disabled = false;
});

document.addEventListener("click", async (event) => {
  if (event.target?.id !== "btnLogout") return;

  await logoutUser();
  window.location.href = "../Login/login.html";
});

logoutProfileBtn?.addEventListener("click", async () => {
  await logoutUser();
  window.location.href = "../Login/login.html";
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const address = addressInput.value.trim();

  if (!name || !phone || !address) {
    setStatus(profileStatus, "Completa nombre, telefono y direccion.", "error");
    return;
  }

  saveProfileBtn.disabled = true;

  try {
    await fetchWithAuth(userUrl(currentUser.uid), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, address })
    }, currentUser);

    currentProfile = { ...(currentProfile || {}), name, phone, address };
    refreshBasicInfo();
    setStatus(profileStatus, "Informacion actualizada correctamente.", "success");
  } catch (error) {
    console.error("Error actualizando perfil:", error);
    setStatus(profileStatus, "No se pudo actualizar la informacion.", "error");
  } finally {
    saveProfileBtn.disabled = false;
  }
});

reportsTableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='solicitar']");
  if (!button || !currentUser) return;

  const reportId = button.dataset.reportId;
  const report = userReportsById[reportId];
  if (!report) return;

  if (trackingRequestsByReport[reportId]) {
    setStatus(reportsStatus, "Este reporte ya tiene una solicitud de seguimiento.", "info");
    return;
  }

  const pregunta = window.prompt(
    "Escribe tu solicitud de seguimiento (opcional):",
    "Solicito informacion sobre el seguimiento de mi reporte."
  );

  if (pregunta === null) return;

  button.disabled = true;

  try {
    const payload = {
      reporteId: reportId,
      usuarioUid: currentUser.uid,
      usuarioEmail: currentUser.email || "",
      usuarioNombre: currentProfile?.name || "",
      pregunta: (pregunta || "").trim() || "Solicito informacion sobre el seguimiento de mi reporte.",
      estadoSolicitud: "Pendiente",
      respuesta: "",
      fechaSolicitud: new Date().toISOString(),
      reporteTipo: report.tipo || "",
      reporteEstado: report.estado || "",
      reporteFecha: report.fecha || ""
    };

    await fetchWithAuth(trackingRequestUrl(currentUser.uid, reportId), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, currentUser);

    trackingRequestsByReport[reportId] = payload;
    renderReports();
    setStatus(reportsStatus, "Solicitud de seguimiento enviada.", "success");
  } catch (error) {
    console.error("Error solicitando seguimiento:", error);
    button.disabled = false;
    setStatus(reportsStatus, "No se pudo enviar la solicitud de seguimiento.", "error");
  }
});

addFavoriteBtn.addEventListener("click", async () => {
  if (!currentUser) return;

  const routeId = routeSelect.value;
  if (!routeId) {
    setStatus(favoritesStatus, "Selecciona una ruta para agregar.", "error");
    return;
  }

  addFavoriteBtn.disabled = true;

  try {
    await fetchWithAuth(userFavoriteRouteUrl(currentUser.uid, routeId), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addedAt: new Date().toISOString() })
    }, currentUser);

    await loadFavorites();
    setStatus(favoritesStatus, "Ruta agregada a favoritas.", "success");
  } catch (error) {
    console.error("Error agregando favorita:", error);
    setStatus(favoritesStatus, "No se pudo agregar la ruta.", "error");
  } finally {
    addFavoriteBtn.disabled = false;
  }
});

favoritesList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='remove-favorite']");
  if (!button || !currentUser) return;

  const routeId = button.dataset.routeId;
  if (!routeId) return;

  button.disabled = true;

  try {
    await fetchWithAuth(userFavoriteRouteUrl(currentUser.uid, routeId), { method: "DELETE" }, currentUser);
    await loadFavorites();
    setStatus(favoritesStatus, "Ruta eliminada de favoritas.", "success");
  } catch (error) {
    console.error("Error eliminando favorita:", error);
    button.disabled = false;
    setStatus(favoritesStatus, "No se pudo eliminar la ruta favorita.", "error");
  }
});

function hydrateProfile() {
  nameInput.value = currentProfile?.name || "";
  phoneInput.value = currentProfile?.phone || "";
  addressInput.value = currentProfile?.address || "";
  refreshBasicInfo();

  setStatus(profileStatus, "Puedes actualizar tu informacion cuando quieras.", "info");
}

function refreshBasicInfo() {
  basicNameTxt.textContent = currentProfile?.name || "Sin establecer";
  basicEmailTxt.textContent = currentUser?.email || "-";
  basicPhoneTxt.textContent = currentProfile?.phone || "Sin establecer";
  basicAddressTxt.textContent = currentProfile?.address || "Sin establecer";
}

async function loadReports() {
  if (!currentUser) return;

  setStatus(reportsStatus, "Cargando reportes...", "info");

  try {
    const [reportsData, trackingData] = await Promise.all([
      fetchByChildEquals(reportsUrl, "usuarioUid", currentUser.uid),
      fetchByChildEquals(trackingRequestsUrl, "usuarioUid", currentUser.uid)
    ]);

    userReportsById = filterReportsForUser(reportsData || {});
    trackingRequestsByReport = mapTrackingRequestsForUser(trackingData || {});
    renderReports();

    const total = Object.keys(userReportsById).length;
    setStatus(reportsStatus, `Reportes encontrados: ${total}.`, "info");
  } catch (error) {
    console.error("Error cargando reportes:", error);
    userReportsById = {};
    trackingRequestsByReport = {};
    renderReports();
    setStatus(reportsStatus, "No se pudieron cargar tus reportes.", "error");
  }
}

function filterReportsForUser(reportsObj) {
  const entries = Object.entries(reportsObj);
  const uid = currentUser?.uid || "";
  const email = (currentUser?.email || "").toLowerCase();
  const name = (currentProfile?.name || "").trim().toLowerCase();

  const filtered = entries
    .filter(([, report]) => {
      const reportUid = report?.usuarioUid || "";
      const reportEmail = (report?.usuarioEmail || "").toLowerCase();
      const reportUserName = (report?.usuario || "").trim().toLowerCase();

      if (reportUid && reportUid === uid) return true;
      if (reportEmail && reportEmail === email) return true;
      if (name && reportUserName && reportUserName === name) return true;
      return false;
    })
    .sort((a, b) => b[0].localeCompare(a[0]));

  const byId = {};
  filtered.forEach(([id, report]) => {
    byId[id] = report;
  });

  return byId;
}

function mapTrackingRequestsForUser(trackingObj) {
  const uid = currentUser?.uid || "";
  const byReport = {};

  Object.values(trackingObj).forEach((request) => {
    if (!request || request.usuarioUid !== uid || !request.reporteId) return;
    byReport[request.reporteId] = request;
  });

  return byReport;
}

function renderReports() {
  const entries = Object.entries(userReportsById);
  reportsTableBody.innerHTML = "";

  if (!entries.length) {
    reportsTableBody.innerHTML = `
      <tr>
        <td class="empty" colspan="7">Aun no tienes reportes registrados.</td>
      </tr>
    `;
    return;
  }

  entries.forEach(([id, report]) => {
    const request = trackingRequestsByReport[id];
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(report.tipo || "-")}</td>
      <td>${escapeHtml(report.usuario || currentProfile?.name || "-")}</td>
      <td>${escapeHtml(report.ubicacion || "-")}</td>
      <td>
        ${escapeHtml(report.descripcion || "-")}
        ${
          request?.respuesta
            ? `<div class="respuesta-inline"><strong>Respuesta:</strong> ${escapeHtml(request.respuesta)}</div>`
            : ""
        }
      </td>
      <td>${escapeHtml(report.fecha || "-")}</td>
      <td>
        ${escapeHtml(report.estado || "Pendiente")}
        <span class="estado-sub">Seguimiento: ${escapeHtml(request?.estadoSolicitud || "Sin solicitud")}</span>
      </td>
      <td>
        <div class="acciones-col">
          <button
            class="btn-action"
            type="button"
            data-action="solicitar"
            data-report-id="${id}"
            ${request ? "disabled" : ""}
          >
            ${request ? "Seguimiento solicitado" : "Solicitar seguimiento"}
          </button>
        </div>
      </td>
    `;

    reportsTableBody.appendChild(tr);
  });
}

async function loadFavorites() {
  if (!currentUser) return;

  setStatus(favoritesStatus, "Cargando rutas favoritas...", "info");

  try {
    const [routesData, favoritesData] = await Promise.all([
      fetchJson(routesUrl),
      fetchJson(userFavoriteRoutesUrl(currentUser.uid))
    ]);

    allRoutes = routesData || {};
    favoriteRouteIds = Object.keys(favoritesData || {}).filter((routeId) => Boolean(favoritesData[routeId]));

    renderFavorites();
    renderAvailableRoutes();
    setStatus(favoritesStatus, "Rutas favoritas actualizadas.", "info");
  } catch (error) {
    console.error("Error cargando rutas favoritas:", error);
    allRoutes = {};
    favoriteRouteIds = [];
    renderFavorites();
    renderAvailableRoutes();
    setStatus(favoritesStatus, "No se pudieron cargar tus rutas favoritas.", "error");
  }
}

function renderFavorites() {
  favoritesList.innerHTML = "";

  if (!favoriteRouteIds.length) {
    favoritesList.innerHTML = "<p class='item'>No tienes rutas favoritas todavia.</p>";
    return;
  }

  favoriteRouteIds.forEach((routeId) => {
    const route = allRoutes[routeId] || {};
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <p><strong>Ruta:</strong> ${escapeHtml(route.nombre || routeId)}</p>
      <p><strong>Zona:</strong> ${escapeHtml(route.zona || "-")}</p>
      <p><strong>Día:</strong> ${escapeHtml(route.dia || "-")}</p>
      <p><strong>Hora:</strong> ${escapeHtml(route.hora || "-")}</p>
      <div class="row">
        <button class="btn-action btn-danger" type="button" data-action="remove-favorite" data-route-id="${routeId}">
          Quitar de favoritas
        </button>
      </div>
    `;
    favoritesList.appendChild(div);
  });
}

function renderAvailableRoutes() {
  routeSelect.innerHTML = "";

  const options = Object.entries(allRoutes)
    .filter(([routeId]) => !favoriteRouteIds.includes(routeId))
    .map(([routeId, route]) => ({
      id: routeId,
      label: `${route?.nombre || routeId} (${route?.zona || "sin zona"})`
    }));

  if (!options.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No hay rutas disponibles para agregar";
    routeSelect.appendChild(opt);
    routeSelect.disabled = true;
    addFavoriteBtn.disabled = true;
    return;
  }

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Selecciona una ruta...";
  routeSelect.appendChild(placeholder);

  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.id;
    opt.textContent = option.label;
    routeSelect.appendChild(opt);
  });

  routeSelect.disabled = false;
  addFavoriteBtn.disabled = false;
}

async function fetchJson(url) {
  const response = await fetchWithAuth(url, {}, currentUser);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json().catch(() => ({}));
  if (data?.error) throw new Error(data.error);
  return data || {};
}

async function fetchByChildEquals(baseUrl, child, value) {
  const url = `${baseUrl}?orderBy=${encodeURIComponent(`"${child}"`)}&equalTo=${encodeURIComponent(`"${value}"`)}`;
  return fetchJson(url);
}

function setStatus(element, message, type = "info") {
  element.textContent = message;
  element.classList.remove("status--info", "status--success", "status--error");
  element.classList.add(
    type === "success"
      ? "status--success"
      : type === "error"
        ? "status--error"
        : "status--info"
  );
}

function escapeHtml(value) {
  return (value || "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
