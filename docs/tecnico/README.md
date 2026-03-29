# Documentación Técnica (v2.19.0)

Este directorio describe las **integraciones técnicas** del sistema "Ciudad Limpia", con énfasis en las librerías/APIs externas, su propósito y los puntos críticos que no deben modificarse sin comprender el impacto.

## 1. Arquitectura (alto nivel)

- **Frontend**: aplicación web estática (HTML/CSS/JavaScript ES Modules) desplegada en **Firebase Hosting**.
- **Autenticación**: **Firebase Authentication** (correo/contraseña).
- **Datos**: **Firebase Realtime Database** consumida mediante su **REST API** (peticiones `fetch` a `*.firebaseio.com/...json`).
- **Back-end serverless**: **Firebase Cloud Functions** (Node.js) para envío de correos (SendGrid) por eventos en Realtime Database.
- **Mapa/rutas (usuario)**: **Leaflet** + teselas de **OpenStreetMap** + enrutamiento con **OSRM (demo público)**.
- **Geocodificación (admin-rutas)**: consultas a **Nominatim** (OpenStreetMap) y **Photon** (fallback) con restricciones para Durango, Durango, México.

## 2. Archivos clave de configuración

- `firebase-config.js`: credenciales del proyecto Firebase (cliente).
- `.firebaserc`: proyecto Firebase por defecto para CLI.
- `firebase.json`: configuración de Hosting y Functions para despliegue.
- `functions/package.json`: dependencias y runtime (Node 18) de Cloud Functions.

## 3. Referencias

1. [Dependencias y APIs](./dependencias-y-apis.md)
2. [Notificaciones por correo](./notificaciones-correo.md)
3. [Impacto de cambios](./impacto-de-cambios.md)

