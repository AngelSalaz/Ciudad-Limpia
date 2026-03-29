# Impacto de Cambios (guía de mantenimiento)

Este documento resume los puntos que, si se modifican sin ajustar el resto del sistema, suelen **romper el flujo**.

## 1. Rutas de Realtime Database (invariantes)

El frontend y Cloud Functions dependen de estas rutas:

- Perfiles: `/users/{uid}`
  - Campos esperados: `name`, `phone`, `address`, `email`, `role`.
- Reportes: `/reportes/{reporteId}`
  - Campos esperados: `usuarioEmail`, `estado`, `tipo`, `ubicacion`, `descripcion`, `fecha`.
- Rutas: `/rutas/{rutaId}`
  - Campos comunes: `nombre`, `zona`, `dia`, `hora`, `startLat`, `startLng`, `endLat`, `endLng`.
- Seguimiento: `/seguimientoSolicitudes/{key}`
  - Campos esperados: `usuarioEmail`, `reporteId`, `pregunta`, `estadoSolicitud`, `respuesta`.

Impacto típico:

- Si cambias el nombre de una ruta (ej. `seguimientoSolicitudes`), los triggers de `functions/index.js` dejan de ejecutarse.
- Si cambias campos (ej. `usuarioEmail`), el correo destino puede quedar vacío y no se enviará notificación.

## 2. Función `fetchWithAuth` (autorización a RTDB)

Archivo: `Componentes/auth.js`

- `fetchWithAuth` anexa el token del usuario como query param `auth=...`.
- Si se elimina/rompe:
  - Las lecturas/escrituras a RTDB fallarán con permisos (`PERMISSION_DENIED`) cuando existan reglas que requieran `auth != null`.

## 3. Roles y navegación

- El rol se lee desde `/users/{uid}.role`.
- Si `role` deja de existir o se guarda con valores distintos:
  - El sistema puede redirigir a pantallas incorrectas (admin vs user).

## 4. Verificación de correo y recuperación de contraseña (Auth)

Archivos:

- `Login/login.js`
- `Login/Registro/registro.js`
- `Login/verify-email.js`
- `Login/reset-password.js`

Puntos críticos:

- La URL configurada en `sendEmailVerification` / `sendPasswordResetEmail` debe apuntar a rutas reales en Hosting.
- Si se cambia la ruta del archivo (ej. mover `Login/verify-email.html`) sin actualizar el código:
  - Los enlaces de los correos abrirán una página inexistente (404) y no se aplicará el `oobCode`.

## 5. SendGrid (Functions)

Archivo: `functions/index.js`

Variables críticas:

- `SENDGRID_API_KEY` (si falta, no se envían correos)
- `SENDER_EMAIL` (si no está verificado en SendGrid, el envío falla)

Si cambias:

- El formato de payload en `/seguimientoSolicitudes/{key}`:
  - El correo puede salir con "N/A" o sin contenido.
- La condición del trigger de estado (`beforeEstado === afterEstado`):
  - Podrías enviar correos duplicados o nunca enviarlos.

## 6. Mapa y servicios externos (rutas usuario)

Archivo: `Rutas/Rutas.js`

- OSM tiles y OSRM demo pueden limitar o fallar.
- Si se cambia el endpoint OSRM o su respuesta:
  - `fetchOsrmRoute` puede romper el trazado.

## 7. Geocodificación (admin-rutas)

Archivo: `Admin/admin-rutas.js`

- Nominatim/Photon son servicios públicos y pueden:
  - rechazar muchas solicitudes,
  - devolver resultados aproximados,
  - cambiar políticas.

Si se elimina la restricción geográfica (bbox/sufijo):

- El sistema puede geocodificar resultados fuera de Durango y afectar el trazado.

