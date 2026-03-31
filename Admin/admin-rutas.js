import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { renderNavbar } from "../Componentes/navbar.js";
import { auth, fetchWithAuth, firebaseConfig, getUserContext, logoutUser } from "../Componentes/auth.js";

const DB_BASE = `${firebaseConfig.databaseURL}/rutas`;

const rutaForm = document.getElementById("rutaForm");
const rutasBody = document.getElementById("rutasBody");
const btnRecargar = document.getElementById("btnRecargar");
const buscadorRuta = document.getElementById("buscadorRuta");
const filtroDia = document.getElementById("filtroDia");
const zonaInput = document.getElementById("zona");
const inicioCp = document.getElementById("inicioCp");
const inicioColoniaSelect = document.getElementById("inicioColoniaSelect");
const finCp = document.getElementById("finCp");
const finColoniaSelect = document.getElementById("finColoniaSelect");
const inicioLat = document.getElementById("inicioLat");
const inicioLng = document.getElementById("inicioLng");
const finLat = document.getElementById("finLat");
const finLng = document.getElementById("finLng");
const inicioDireccion = document.getElementById("inicioDireccion");
const finDireccion = document.getElementById("finDireccion");
const btnGeoInicio = document.getElementById("btnGeoInicio");
const btnGeoFin = document.getElementById("btnGeoFin");
const geoStatus = document.getElementById("geoStatus");
const cpStatus = document.getElementById("cpStatus");

const modal = document.getElementById("modalEditarRuta");
const editRutaId = document.getElementById("editRutaId");
const editNombreRuta = document.getElementById("editNombreRuta");
const editZona = document.getElementById("editZona");
const editInicioCp = document.getElementById("editInicioCp");
const editInicioColoniaSelect = document.getElementById("editInicioColoniaSelect");
const editFinCp = document.getElementById("editFinCp");
const editFinColoniaSelect = document.getElementById("editFinColoniaSelect");
const editInicioLat = document.getElementById("editInicioLat");
const editInicioLng = document.getElementById("editInicioLng");
const editFinLat = document.getElementById("editFinLat");
const editFinLng = document.getElementById("editFinLng");
const editInicioDireccion = document.getElementById("editInicioDireccion");
const editFinDireccion = document.getElementById("editFinDireccion");
const btnGeoInicioEdit = document.getElementById("btnGeoInicioEdit");
const btnGeoFinEdit = document.getElementById("btnGeoFinEdit");
const editDia = document.getElementById("editDia");
const editHora = document.getElementById("editHora");
const btnGuardarRuta = document.getElementById("btnGuardarRuta");
const btnCerrarRuta = document.getElementById("btnCerrarRuta");

let rutasGlobal = [];
let rutasFiltradas = [];
let sessionUser = null;
let sepomexCps = null;

// Restriccion de geocodificacion a Durango, Durango, Mexico (bbox aproximado).
const DURANGO_GEOCODE_SUFFIX = ", Durango, Durango, Mexico";
// viewbox: left, top, right, bottom (lon min, lat max, lon max, lat min)
// Municipio de Durango (bbox aproximado).
const DURANGO_VIEWBOX = "-105.4,24.9,-103.9,23.4";
const DURANGO_VIEWBOX_NUM = {
  left: -105.4,
  top: 24.9,
  right: -103.9,
  bottom: 23.4
};

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

  await loadSepomexMunicipioDurango();
  initPostalUi();
  await cargarRutas();
});

document.addEventListener("click", async (event) => {
  const id = event.target?.id;
  if (id !== "btnLogout" && id !== "logout") return;
  await logoutUser();
  window.location.href = "../Login/login.html";
});

btnRecargar.addEventListener("click", cargarRutas);
buscadorRuta.addEventListener("input", aplicarFiltros);
filtroDia.addEventListener("change", aplicarFiltros);
btnGeoInicio.addEventListener("click", () =>
  geocodeToInputs(inicioDireccion.value, inicioLat, inicioLng, "Inicio", getInicioPostalContext())
);
btnGeoFin.addEventListener("click", () =>
  geocodeToInputs(finDireccion.value, finLat, finLng, "Fin", getFinPostalContext())
);
btnGeoInicioEdit.addEventListener("click", () =>
  geocodeToInputs(editInicioDireccion.value, editInicioLat, editInicioLng, "Inicio (edicion)", getEditInicioPostalContext())
);
btnGeoFinEdit.addEventListener("click", () =>
  geocodeToInputs(editFinDireccion.value, editFinLat, editFinLng, "Fin (edicion)", getEditFinPostalContext())
);

rutaForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const startCp = sanitizeCp(inicioCp?.value);
  const startColonia = (inicioColoniaSelect?.value || "").trim();
  const endCp = sanitizeCp(finCp?.value);
  const endColonia = (finColoniaSelect?.value || "").trim();

  if (!startCp || !sepomexCps?.[startCp]) {
    alert("Ingresa un CP valido de inicio (municipio de Durango).");
    return;
  }
  if (!startColonia) {
    alert("Selecciona la colonia de inicio.");
    return;
  }
  if (!endCp || !sepomexCps?.[endCp]) {
    alert("Ingresa un CP valido de fin (municipio de Durango).");
    return;
  }
  if (!endColonia) {
    alert("Selecciona la colonia de fin.");
    return;
  }

  const startLatValue = parseCoord(inicioLat.value);
  const startLngValue = parseCoord(inicioLng.value);
  const endLatValue = parseCoord(finLat.value);
  const endLngValue = parseCoord(finLng.value);

  if ([startLatValue, startLngValue, endLatValue, endLngValue].some((v) => v === null)) {
    alert("Ingresa o busca las coordenadas (lat/lng) de inicio y fin antes de guardar.");
    return;
  }

  const zona = startColonia === endColonia
    ? startColonia
    : `${startColonia} -> ${endColonia}`;

  if (zonaInput) zonaInput.value = zona;

  const nuevaRuta = {
    nombre: document.getElementById("nombreRuta").value.trim(),
    zona,
    startCp,
    startColonia,
    endCp,
    endColonia,
    startAddress: inicioDireccion.value.trim(),
    endAddress: finDireccion.value.trim(),
    startLat: startLatValue,
    startLng: startLngValue,
    endLat: endLatValue,
    endLng: endLngValue,
    hora: document.getElementById("hora").value,
    dia: document.getElementById("dia").value,
    creada: new Date().toISOString()
  };

  try {
    const response = await fetchWithAuth(`${DB_BASE}.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevaRuta)
    }, sessionUser);

    if (!response.ok) throw new Error("No se pudo guardar la ruta");

    rutaForm.reset();
    if (zonaInput) zonaInput.value = "";
    resetColoniaSelect(inicioColoniaSelect, "Colonia inicio");
    resetColoniaSelect(finColoniaSelect, "Colonia fin");
    await cargarRutas();
  } catch (error) {
    console.error("Error guardando ruta:", error);
    alert("No se pudo guardar la ruta");
  }
});

rutasBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;
  if (!id || !action) return;

  if (action === "editar") {
    await abrirEditar(id);
    return;
  }

  if (action === "eliminar") {
    await eliminarRuta(id);
  }
});

btnGuardarRuta.addEventListener("click", guardarEdicionRuta);
btnCerrarRuta.addEventListener("click", cerrarModalRuta);
modal.addEventListener("click", (event) => {
  if (event.target === modal) cerrarModalRuta();
});

async function cargarRutas() {
  try {
    const data = await fetchJson(`${DB_BASE}.json`);

    const baseData = data?.rutas && typeof data.rutas === "object" && Object.keys(data).length === 1
      ? data.rutas
      : data;

    rutasGlobal = Object.entries(baseData || {});
    aplicarFiltros();
  } catch (error) {
    console.error("Error cargando rutas:", error);
    rutasGlobal = [];
    rutasFiltradas = [];
    renderTabla();
  }
}

function aplicarFiltros() {
  const texto = toSafeLower(buscadorRuta.value);
  const dia = filtroDia.value;

  rutasFiltradas = rutasGlobal.filter(([, ruta]) => {
    const nombre = toSafeLower(ruta.nombre);
    const zona = toSafeLower(ruta.zona);
    const diaRuta = ruta.dia || "";

    const coincideTexto = nombre.includes(texto) || zona.includes(texto);
    const coincideDia = dia === "Todos" || diaRuta === dia;

    return coincideTexto && coincideDia;
  });

  renderTabla();
}

function renderTabla() {
  rutasBody.innerHTML = "";

  if (!rutasFiltradas.length) {
    rutasBody.innerHTML = `
      <tr>
        <td class="empty" colspan="5">No hay rutas para mostrar.</td>
      </tr>
    `;
    return;
  }

  rutasFiltradas.forEach(([id, ruta]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(ruta.nombre || "-")}</td>
      <td>${escapeHtml(ruta.zona || "-")}</td>
      <td>${escapeHtml(ruta.dia || "-")}</td>
      <td>${escapeHtml(ruta.hora || "-")}</td>
      <td>
        <div class="acciones">
          <button class="btn-editar" data-action="editar" data-id="${id}">Editar</button>
          <button class="btn-eliminar" data-action="eliminar" data-id="${id}">Eliminar</button>
        </div>
      </td>
    `;

    rutasBody.appendChild(tr);
  });
}

async function abrirEditar(id) {
  const ruta = await fetchJson(`${DB_BASE}/${id}.json`);
  if (!ruta) return;

  editRutaId.value = id;
  editNombreRuta.value = ruta.nombre || "";
  editZona.value = ruta.zona || "";

  // Compatibilidad: rutas viejas guardaban cp/colonia a nivel ruta.
  const sCp = ruta.startCp || ruta.cp || "";
  const sColonia = ruta.startColonia || ruta.colonia || ruta.zona || "";
  const eCp = ruta.endCp || ruta.cp || "";
  const eColonia = ruta.endColonia || ruta.colonia || ruta.zona || "";

  editInicioCp.value = sCp ? sanitizeCp(sCp) : "";
  editFinCp.value = eCp ? sanitizeCp(eCp) : "";
  editInicioDireccion.value = ruta.startAddress || "";
  editFinDireccion.value = ruta.endAddress || "";
  editInicioLat.value = formatCoord(ruta.startLat);
  editInicioLng.value = formatCoord(ruta.startLng);
  editFinLat.value = formatCoord(ruta.endLat);
  editFinLng.value = formatCoord(ruta.endLng);
  editDia.value = ruta.dia || "Lunes";
  editHora.value = ruta.hora || "";

  const sCpSan = sanitizeCp(editInicioCp.value);
  if (sCpSan && sepomexCps?.[sCpSan]) {
    populateColoniasForCp(sCpSan, editInicioColoniaSelect, sColonia, "Seleccionar colonia");
    editInicioCp.value = sCpSan;
  } else {
    resetColoniaSelect(editInicioColoniaSelect, "Seleccionar colonia");
  }

  const eCpSan = sanitizeCp(editFinCp.value);
  if (eCpSan && sepomexCps?.[eCpSan]) {
    populateColoniasForCp(eCpSan, editFinColoniaSelect, eColonia, "Seleccionar colonia");
    editFinCp.value = eCpSan;
  } else {
    resetColoniaSelect(editFinColoniaSelect, "Seleccionar colonia");
  }

  // Si no venia zona (rutas viejas), calcula con los endpoints.
  if (!editZona.value) {
    editZona.value = computeZona(sColonia, eColonia);
  }

  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
}

async function guardarEdicionRuta() {
  const id = editRutaId.value;
  if (!id) return;

  const startCp = sanitizeCp(editInicioCp.value);
  const startColonia = (editInicioColoniaSelect?.value || "").trim();
  const endCp = sanitizeCp(editFinCp.value);
  const endColonia = (editFinColoniaSelect?.value || "").trim();

  if (startCp && !sepomexCps?.[startCp]) {
    alert("El CP de inicio no es valido para el municipio de Durango.");
    return;
  }
  if (startCp && !startColonia) {
    alert("Selecciona una colonia de inicio para ese CP.");
    return;
  }
  if (endCp && !sepomexCps?.[endCp]) {
    alert("El CP de fin no es valido para el municipio de Durango.");
    return;
  }
  if (endCp && !endColonia) {
    alert("Selecciona una colonia de fin para ese CP.");
    return;
  }

  const startLatValue = parseCoord(editInicioLat.value);
  const startLngValue = parseCoord(editInicioLng.value);
  const endLatValue = parseCoord(editFinLat.value);
  const endLngValue = parseCoord(editFinLng.value);

  if ([startLatValue, startLngValue, endLatValue, endLngValue].some((v) => v === null)) {
    alert("Ingresa o busca las coordenadas (lat/lng) de inicio y fin antes de guardar.");
    return;
  }

  const zonaFinal = computeZona(startColonia || editZona.value, endColonia || editZona.value).trim() || editZona.value.trim();
  editZona.value = zonaFinal;

  await fetchWithAuth(`${DB_BASE}/${id}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: editNombreRuta.value.trim(),
      zona: zonaFinal,
      startCp: startCp || null,
      startColonia: startColonia || null,
      endCp: endCp || null,
      endColonia: endColonia || null,
      startAddress: editInicioDireccion.value.trim(),
      endAddress: editFinDireccion.value.trim(),
      startLat: startLatValue,
      startLng: startLngValue,
      endLat: endLatValue,
      endLng: endLngValue,
      dia: editDia.value,
      hora: editHora.value
    })
  }, sessionUser);

  cerrarModalRuta();
  await cargarRutas();
}

function cerrarModalRuta() {
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
}

async function eliminarRuta(id) {
  if (!confirm("Eliminar ruta?")) return;

  await fetchWithAuth(`${DB_BASE}/${id}.json`, {
    method: "DELETE"
  }, sessionUser);

  await cargarRutas();
}

function toSafeLower(value) {
  return (value || "").toString().toLowerCase();
}

function sanitizeCp(value) {
  const digits = (value || "").toString().replaceAll(/\D/g, "");
  return digits.slice(0, 5);
}

async function loadSepomexMunicipioDurango() {
  try {
    const candidates = [
      "../data/sepomex-durango-municipio.json",
      "/data/sepomex-durango-municipio.json",
      "data/sepomex-durango-municipio.json"
    ];

    let loaded = null;
    for (const url of candidates) {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(url, { cache: "no-cache" });
      if (!response.ok) continue;
      // eslint-disable-next-line no-await-in-loop
      const data = await response.json().catch(() => null);
      if (data?.cps) {
        loaded = data;
        break;
      }
    }

    if (!loaded?.cps) throw new Error("No se pudo cargar SEPOMEX");

    sepomexCps = loaded.cps;
    setCpStatus("Catalogo de colonias cargado.", "success");
  } catch (error) {
    console.error("Error cargando SEPOMEX:", error);
    sepomexCps = null;
    setCpStatus("No se pudo cargar el catalogo de colonias (SEPOMEX).", "warn");
  }
}

function setCpStatus(message, type = "info") {
  if (!cpStatus) return;
  cpStatus.textContent = message || "";
  cpStatus.dataset.type = type;
}

function resetColoniaSelect(selectEl, label = "Seleccionar colonia") {
  if (!selectEl) return;
  selectEl.innerHTML = `<option value="">${label}</option>`;
  selectEl.disabled = true;
}

function populateColoniasForCp(cp, selectEl, selectedNombre = "", label = "Seleccionar colonia") {
  if (!selectEl) return;
  const items = sepomexCps?.[cp];
  if (!Array.isArray(items) || !items.length) {
    resetColoniaSelect(selectEl, label);
    return;
  }

  const selectedLower = (selectedNombre || "").toString().toLowerCase();
  selectEl.innerHTML = `<option value="">${label}</option>`;

  items.forEach((item) => {
    const nombre = item?.nombre || "";
    if (!nombre) return;
    const tipo = item?.tipo ? ` (${item.tipo})` : "";
    const option = document.createElement("option");
    option.value = nombre;
    option.textContent = `${nombre}${tipo}`;
    if (nombre.toLowerCase() === selectedLower) option.selected = true;
    selectEl.appendChild(option);
  });

  selectEl.disabled = false;
}

function initPostalUi() {
  wireCpColonia(inicioCp, inicioColoniaSelect, {
    label: "Colonia inicio",
    onColoniaChange: syncZonaFromEndpoints
  });
  wireCpColonia(finCp, finColoniaSelect, {
    label: "Colonia fin",
    onColoniaChange: syncZonaFromEndpoints
  });

  wireCpColonia(editInicioCp, editInicioColoniaSelect, {
    label: "Seleccionar colonia",
    onColoniaChange: () => {
      if (editZona) editZona.value = computeZona(editInicioColoniaSelect?.value, editFinColoniaSelect?.value);
    }
  });
  wireCpColonia(editFinCp, editFinColoniaSelect, {
    label: "Seleccionar colonia",
    onColoniaChange: () => {
      if (editZona) editZona.value = computeZona(editInicioColoniaSelect?.value, editFinColoniaSelect?.value);
    }
  });

  resetColoniaSelect(inicioColoniaSelect, "Colonia inicio");
  resetColoniaSelect(finColoniaSelect, "Colonia fin");
  resetColoniaSelect(editInicioColoniaSelect);
  resetColoniaSelect(editFinColoniaSelect);
}

function wireCpColonia(cpInput, selectEl, { label = "Seleccionar colonia", onColoniaChange = null } = {}) {
  if (!cpInput || !selectEl) return;

  const apply = () => {
    cpInput.value = sanitizeCp(cpInput.value);
    const cp = cpInput.value;
    if (cp.length === 5 && sepomexCps?.[cp]) {
      populateColoniasForCp(cp, selectEl, selectEl.value || "", label);
      setCpStatus("");
    } else {
      resetColoniaSelect(selectEl, label);
      if (cp.length === 5) {
        if (!sepomexCps) {
          setCpStatus("Catalogo de colonias no cargado. Recarga la pagina.", "warn");
        } else {
          setCpStatus(`CP ${cp} no encontrado en el catalogo del municipio de Durango.`, "warn");
        }
      } else {
        setCpStatus("");
      }
    }
    if (typeof onColoniaChange === "function") onColoniaChange();
  };

  cpInput.addEventListener("input", apply);
  cpInput.addEventListener("change", apply);
  selectEl.addEventListener("change", () => {
    if (typeof onColoniaChange === "function") onColoniaChange();
  });

  // Populate immediately in case the user typed before auth/init finished.
  apply();
}

function computeZona(startColonia, endColonia) {
  const a = (startColonia || "").trim();
  const b = (endColonia || "").trim();
  if (!a && !b) return "";
  if (a && !b) return a;
  if (!a && b) return b;
  return a === b ? a : `${a} -> ${b}`;
}

function syncZonaFromEndpoints() {
  if (!zonaInput) return;
  zonaInput.value = computeZona(inicioColoniaSelect?.value, finColoniaSelect?.value);
}

function getInicioPostalContext() {
  const cp = sanitizeCp(inicioCp?.value);
  const colonia = (inicioColoniaSelect?.value || "").trim();
  const meta = getSepomexMeta(cp, colonia);
  return { cp, colonia, ciudad: meta?.ciudad || "" };
}

function getFinPostalContext() {
  const cp = sanitizeCp(finCp?.value);
  const colonia = (finColoniaSelect?.value || "").trim();
  const meta = getSepomexMeta(cp, colonia);
  return { cp, colonia, ciudad: meta?.ciudad || "" };
}

function getEditInicioPostalContext() {
  const cp = sanitizeCp(editInicioCp?.value);
  const colonia = (editInicioColoniaSelect?.value || "").trim();
  const meta = getSepomexMeta(cp, colonia);
  return { cp, colonia, ciudad: meta?.ciudad || "" };
}

function getEditFinPostalContext() {
  const cp = sanitizeCp(editFinCp?.value);
  const colonia = (editFinColoniaSelect?.value || "").trim();
  const meta = getSepomexMeta(cp, colonia);
  return { cp, colonia, ciudad: meta?.ciudad || "" };
}

function getSepomexMeta(cp, colonia) {
  const items = sepomexCps?.[cp];
  if (!cp || !colonia || !Array.isArray(items)) return null;
  const target = colonia.toLowerCase();
  return items.find((it) => (it?.nombre || "").toLowerCase() === target) || null;
}

function isInsideDurango(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return (
    lng >= DURANGO_VIEWBOX_NUM.left &&
    lng <= DURANGO_VIEWBOX_NUM.right &&
    lat >= DURANGO_VIEWBOX_NUM.bottom &&
    lat <= DURANGO_VIEWBOX_NUM.top
  );
}

async function fetchNominatim(queryText, { bounded }) {
  const query = encodeURIComponent(queryText);
  const viewbox = encodeURIComponent(DURANGO_VIEWBOX);
  const boundedParam = bounded ? "&bounded=1" : "";
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${query}&limit=5&countrycodes=mx&viewbox=${viewbox}${boundedParam}`;
  const response = await fetch(url, {
    headers: { "Accept-Language": "es" }
  });
  const data = await response.json().catch(() => []);
  if (response.status === 429) {
    throw new Error("RATE_LIMIT");
  }
  if (!response.ok || !Array.isArray(data)) return [];
  return data;
}

async function fetchNominatimStructured(street, context = {}, { bounded }) {
  const viewbox = encodeURIComponent(DURANGO_VIEWBOX);
  const boundedParam = bounded ? "&bounded=1" : "";
  const streetParam = encodeURIComponent(street);
  const cityParam = encodeURIComponent(context?.ciudad || "Durango");
  const stateParam = encodeURIComponent("Durango");
  const countryParam = encodeURIComponent("Mexico");
  const pcParam = encodeURIComponent((context?.cp || "").trim());

  // Nominatim structured search: street + postalcode gives better results than free-text for MX.
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&country=${countryParam}&state=${stateParam}&city=${cityParam}&street=${streetParam}&postalcode=${pcParam}&countrycodes=mx&viewbox=${viewbox}${boundedParam}`;
  const response = await fetch(url, {
    headers: { "Accept-Language": "es" }
  });
  const data = await response.json().catch(() => []);
  if (response.status === 429) {
    throw new Error("RATE_LIMIT");
  }
  if (!response.ok || !Array.isArray(data)) return [];
  return data;
}

async function fetchPhoton(queryText) {
  // Photon (Komoot) as fallback geocoder. bbox: lon1,lat1,lon2,lat2
  const bbox = `${DURANGO_VIEWBOX_NUM.left},${DURANGO_VIEWBOX_NUM.bottom},${DURANGO_VIEWBOX_NUM.right},${DURANGO_VIEWBOX_NUM.top}`;
  const q = encodeURIComponent(queryText);
  const url = `https://photon.komoot.io/api/?q=${q}&limit=5&bbox=${encodeURIComponent(bbox)}`;
  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.features || !Array.isArray(data.features)) return [];

  // Normalize to Nominatim-like objects
  return data.features.map((f) => {
    const coords = f?.geometry?.coordinates || [];
    const props = f?.properties || {};
    const lat = coords.length === 2 ? coords[1] : null;
    const lon = coords.length === 2 ? coords[0] : null;
    return {
      lat: lat != null ? String(lat) : null,
      lon: lon != null ? String(lon) : null,
      class: props?.osm_key || "",
      address: {
        postcode: props?.postcode || "",
        city: props?.city || props?.county || "",
        state: props?.state || "",
        country: props?.country || ""
      }
    };
  }).filter((r) => r.lat && r.lon);
}

function pickBestNominatimResult(results, context = {}) {
  if (!Array.isArray(results) || !results.length) return null;

  const cp = (context.cp || "").trim();

  // Prefer results that match CP and fall within the municipality bbox.
  const scored = results
    .map((r) => {
      const lat = Number.parseFloat(r?.lat);
      const lng = Number.parseFloat(r?.lon);
      const postcode = (r?.address?.postcode || "").toString().trim();
      let score = 0;
      if (cp && postcode === cp) score += 10;
      if (isInsideDurango(lat, lng)) score += 5;
      if (r?.class === "highway") score += 1;
      return { r, lat, lng, score, postcode };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score <= 0) return null;
  return best;
}

async function geocodeToInputs(address, latInput, lngInput, label, context = {}) {
  const trimmed = (address || "").trim();
  if (!trimmed) {
    setGeoStatus(`${label}: ingresa una direccion primero.`, "warn");
    return;
  }

  setGeoStatus(`${label}: buscando coordenadas...`, "info");

  try {
    const normalized = trimmed.replaceAll(/\s+/g, " ").trim();
    const startsWithStreetType = /^(calle|av\.?|avenida|blvd\.?|boulevard|paseo|carretera|carr\.?|prol\.?|prolongacion)\b/i.test(normalized);

    const buildStreetCandidates = (text) => (startsWithStreetType
      ? [text]
      : [text, `Calle ${text}`]);

    const streetCandidates = buildStreetCandidates(normalized);

    // Si trae numero y no hay resultados, intentaremos tambien sin numero (para encontrar al menos la vialidad).
    const withoutNumber = normalized.replaceAll(/\s+\d+\b/g, "").trim();
    const streetCandidatesNoNumber = (withoutNumber && withoutNumber !== normalized)
      ? buildStreetCandidates(withoutNumber)
      : [];

    const buildQ = (streetText) => {
      const parts = [streetText];
      if (context?.colonia && !toSafeLower(streetText).includes(toSafeLower(context.colonia))) {
        parts.push(context.colonia);
      }
      if (context?.cp && !streetText.includes(context.cp)) {
        parts.push(context.cp);
      }
      if (context?.ciudad && !toSafeLower(streetText).includes(toSafeLower(context.ciudad))) {
        parts.push(context.ciudad);
      }
      if (!toSafeLower(streetText).includes("durango")) {
        parts.push(DURANGO_GEOCODE_SUFFIX.trim().replace(/^,/, "").trim());
      }
      return parts.join(", ");
    };

    let best = null;
    const attempted = [];

    const attemptStreet = async (streetText) => {
      // 1) Structured search (best) when CP is present.
      if (context?.cp) {
        // Strict bounded
        const structuredStrict = await fetchNominatimStructured(streetText, context, { bounded: true });
        attempted.push({ type: "nominatim_structured_bounded", q: streetText, cp: context.cp });
        best = pickBestNominatimResult(structuredStrict, context);
        if (best) return true;

        // Loose (still filtered later)
        const structuredLoose = await fetchNominatimStructured(streetText, context, { bounded: false });
        attempted.push({ type: "nominatim_structured", q: streetText, cp: context.cp });
        best = pickBestNominatimResult(structuredLoose, context);
        if (best) return true;
      }

      // 2) Free-text search
      const q = buildQ(streetText);
      attempted.push({ type: "nominatim_q_bounded", q });
      let results = await fetchNominatim(q, { bounded: true });
      best = pickBestNominatimResult(results, context);
      if (best) return true;

      attempted.push({ type: "nominatim_q", q });
      results = await fetchNominatim(q, { bounded: false });
      best = pickBestNominatimResult(results, context);
      if (best) return true;

      // 3) Photon fallback
      attempted.push({ type: "photon", q });
      const photon = await fetchPhoton(q);
      best = pickBestNominatimResult(photon, context);
      if (best) return true;

      return false;
    };

    for (const streetText of streetCandidates) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await attemptStreet(streetText);
      if (ok) break;
    }

    // 3.5) Si no encontro el numero, intenta localizar la calle (sin numero).
    if (!best && streetCandidatesNoNumber.length) {
      for (const streetText of streetCandidatesNoNumber) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await attemptStreet(streetText);
        if (ok) {
          latInput.value = best.lat;
          lngInput.value = best.lng;
          setGeoStatus(`${label}: se encontro la calle pero no el numero; se uso punto aproximado de la vialidad.`, "warn");
          console.warn("Geocode fallback (street without number) used. Attempts:", attempted);
          return;
        }
      }
    }

    // 4) Fallback aproximado: si no existe la calle en OSM, ubica por colonia/CP para poder trazar la ruta.
    if (!best && (context?.colonia || context?.cp)) {
      const fallbackParts = [];
      if (context?.colonia) fallbackParts.push(context.colonia);
      if (context?.cp) fallbackParts.push(context.cp);
      if (context?.ciudad) fallbackParts.push(context.ciudad);
      fallbackParts.push("Durango, Mexico");
      const fallbackQ = fallbackParts.join(", ");
      attempted.push({ type: "fallback_area", q: fallbackQ });

      let areaResults = await fetchNominatim(fallbackQ, { bounded: true });
      best = pickBestNominatimResult(areaResults, context);

      if (!best) {
        areaResults = await fetchNominatim(fallbackQ, { bounded: false });
        best = pickBestNominatimResult(areaResults, context);
      }

      if (best) {
        latInput.value = best.lat;
        lngInput.value = best.lng;
        setGeoStatus(`${label}: no se encontró la calle exacta; se usó ubicación aproximada por CP/colonia.`, "warn");
        console.warn("Geocode fallback (area) used. Attempts:", attempted);
        return;
      }
    }

    if (!best) {
      const hasNumber = /\b\d+\b/.test(normalized);
      const baseExample = startsWithStreetType ? normalized : `Calle ${normalized}`;
      const example = hasNumber ? baseExample : `${baseExample} 123`;
      setGeoStatus(
        `${label}: no se encontraron resultados. Tip: escribe tipo de via y numero (ej. \"${example}\").`,
        "warn"
      );
      console.warn("No geocode results. Attempts:", attempted);
      return;
    }

    latInput.value = best.lat;
    lngInput.value = best.lng;
    setGeoStatus(`${label}: coordenadas encontradas.`, "success");
  } catch (error) {
    console.error("Error geocodificando:", error);
    if (error?.message === "RATE_LIMIT") {
      setGeoStatus(`${label}: el servicio de geocodificacion esta limitando solicitudes. Espera 10-20s e intenta de nuevo.`, "warn");
      return;
    }
    setGeoStatus(`${label}: no se pudo geocodificar.`, "warn");
  }
}

function setGeoStatus(message, type = "info") {
  if (!geoStatus) return;
  geoStatus.textContent = message;
  geoStatus.dataset.type = type;
}

function parseCoord(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCoord(value) {
  return Number.isFinite(value) ? value : "";
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
