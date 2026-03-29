# Dependencias y APIs

Este documento lista las principales librerías y servicios externos utilizados por el proyecto, indicando **versión**, **ubicación en el código** y **propósito**.

## 1. Firebase (cliente)

- **Firebase JS SDK (CDN gstatic)**: `10.12.0`
  - Uso: imports ES Modules como `https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js`
  - Dónde: archivos `.js` del frontend (Login, Admin, Usuarios, Reportes, Rutas, Componentes).
  - Módulos usados:
    - `firebase-app`: inicialización del cliente.
    - `firebase-auth`: login, registro, verificación de correo, recuperación de contraseña.

## 1.1 Dependencia npm (raíz)

- `firebase` `^12.9.0` (en `package.json` de la raíz).
  - Estado: **no es necesaria** para ejecutar el frontend en Hosting (se usan imports desde CDN gstatic).
  - Uso recomendado: mantenerla solo si se utilizará en tooling, scripts o migraciones futuras.

## 2. Firebase Realtime Database (REST API)

- **Endpoint**: `https://<project>-default-rtdb.firebaseio.com/...`
- Formato: `/<ruta>.json`
- Autorización: se anexa `?auth=<ID_TOKEN>` cuando el usuario está autenticado.
  - Implementación: `Componentes/auth.js` (`fetchWithAuth`).
  - Nota: esto depende de que las **reglas** de Realtime Database validen `auth != null`.

## 3. Firebase Hosting

- Uso: publicación del frontend estático.
- Configuración: `firebase.json` (sección `hosting`).

## 4. Firebase Cloud Functions (Node.js)

- Runtime: Node.js `18` (definido en `functions/package.json`).
- Librerías (functions):
  - `firebase-functions` `^4.9.0`: triggers sobre Realtime Database y logging.
  - `firebase-admin` `^12.1.0`: inicialización del SDK admin.
- Configuración:
  - `firebase.json` debe incluir:
    - `functions.source = "functions"`
  - Código: `functions/index.js`.

## 5. SendGrid (correo saliente)

- Librería: `@sendgrid/mail` `^8.1.4` (en `functions/package.json`).
- Uso: envío de correos desde Cloud Functions.
- Variables requeridas (recomendado usar Secrets/Environment):
  - `SENDGRID_API_KEY`: API Key de SendGrid.
  - `SENDER_EMAIL`: correo remitente (debe estar **verificado** en SendGrid).
  - `SENDER_NAME`: nombre remitente.
- Implementación: `functions/index.js` (`sendEmail`, `initSendgridIfPossible`).

## 6. Mapa (usuario) y servicios externos

### 6.1 Leaflet (librería de mapa)

- Origen: CDN `unpkg.com`.
- Versión fijada (recomendado): `1.9.4`.
- Dónde: `Rutas/Rutas.html` carga `leaflet.css` y `leaflet.js`.
- Uso: `Rutas/Rutas.js` (creación de mapa y capas).

### 6.2 Teselas de OpenStreetMap

- Endpoint: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Uso: `Rutas/Rutas.js` (`L.tileLayer(...)`).
- Nota: es obligatorio mostrar atribución a OSM.

### 6.3 OSRM (servicio de rutas)

- Endpoint: `https://router.project-osrm.org/route/v1/driving/...`
- Uso: `Rutas/Rutas.js` (`fetchOsrmRoute`).
- Consideración: el servidor público es **de demostración** (puede tener límites, latencia y no garantiza disponibilidad).

## 7. Geocodificación (admin-rutas)

El módulo de rutas de administrador utiliza geocodificación pública (sin API key):

- **Nominatim** (OpenStreetMap): búsqueda de coordenadas a partir de texto.
- **Photon** (Komoot): fallback cuando Nominatim no retorna resultados.
- Restricción geográfica: Durango, Durango, México (bbox aproximado y sufijo).
- Implementación: `Admin/admin-rutas.js`.

## 8. Datos de códigos postales/colonias (SEPOMEX)

- Archivo: `data/sepomex-durango-municipio.json`
- Uso: poblar colonias por código postal en `Admin/admin-rutas.js`.
- Nota: este dataset se consume en el navegador (no requiere backend).
