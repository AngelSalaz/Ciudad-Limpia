/* eslint-disable max-len */

/**
 * Cloud Functions - Ciudad Limpia
 *
 * Responsabilidad:
 * - Enviar correos transaccionales (SendGrid) cuando ocurren eventos en Realtime Database.
 *
 * Importante (invariantes):
 * - Rutas RTDB esperadas:
 *   - /seguimientoSolicitudes/{key}   (onCreate)  -> confirma solicitud de seguimiento al usuario
 *   - /reportes/{reporteId}           (onUpdate)  -> notifica cambios de estado del reporte
 * - Campos mínimos esperados:
 *   - seguimientoSolicitudes: usuarioEmail, reporteId, pregunta
 *   - reportes: usuarioEmail, estado, tipo, ubicacion
 *
 * Configuración (recomendado por variables de entorno o Secrets):
 * - SENDGRID_API_KEY: API key de SendGrid (NO exponer en frontend).
 * - SENDER_EMAIL: remitente verificado en SendGrid (ej. ciudadlimpiadgo@gmail.com).
 * - SENDER_NAME: nombre del remitente.
 *
 * Qué se rompe si se modifica:
 * - Cambiar las rutas de RTDB (strings /seguimientoSolicitudes o /reportes) deshabilita los triggers.
 * - Cambiar el campo "estado" en reportes exige actualizar la condición before/after para evitar correos duplicados.
 * - Cambiar el campo "usuarioEmail" puede provocar correos sin destino (se omite envío por validación).
 */

const admin = require("firebase-admin");
const functions = require("firebase-functions");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();

/**
 * Lee una variable de entorno y la normaliza a string.
 * Si se cambia el nombre de una variable (p.ej. SENDGRID_API_KEY),
 * el sistema dejará de enviar correos hasta actualizar la configuración.
 */
function getEnv(name, fallback = "") {
  return (process.env[name] || fallback || "").toString().trim();
}

// Runtime config (firebase functions:config:set sendgrid.key="..." ...)
const runtimeConfig = (typeof functions.config === "function" ? functions.config() : {}) || {};
const sendgridConfig = runtimeConfig.sendgrid || {};

// Prioridad:
// 1) Variables de entorno / Secrets (recomendado)
// 2) Runtime config (firebase functions:config:set ...)
const SENDGRID_API_KEY = getEnv("SENDGRID_API_KEY", sendgridConfig.key);
const SENDER_EMAIL = getEnv("SENDER_EMAIL", sendgridConfig.sender_email || "ciudadlimpiadgo@gmail.com");
const SENDER_NAME = getEnv("SENDER_NAME", sendgridConfig.sender_name || "Ciudad Limpia");

/**
 * Valida formato básico de email.
 * Si se relaja esta validación, SendGrid seguirá pudiendo fallar (o disparar rebotes),
 * por lo que no se recomienda eliminarla.
 */
function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").toString().trim());
}

/**
 * Inicializa SendGrid si hay API Key.
 * - Si SENDGRID_API_KEY no está configurada, se loguea advertencia y se evita el envío.
 * - Si se elimina esta verificación, el envío fallará con error al primer sgMail.send.
 */
function initSendgridIfPossible() {
  if (!SENDGRID_API_KEY) {
    functions.logger.warn("SENDGRID_API_KEY no esta configurada. No se enviaran correos.");
    return false;
  }
  sgMail.setApiKey(SENDGRID_API_KEY);
  return true;
}

/**
 * Envía un correo transaccional.
 *
 * Consideraciones:
 * - "from" debe estar verificado en SendGrid (Single Sender o dominio verificado).
 * - No debe llamarse desde frontend (la API key debe mantenerse en backend).
 */
async function sendEmail({ to, subject, text, html }) {
  if (!initSendgridIfPossible()) return;
  if (!isEmail(to)) {
    functions.logger.warn("Correo destino invalido:", to);
    return;
  }

  await sgMail.send({
    to,
    from: { email: SENDER_EMAIL, name: SENDER_NAME },
    subject,
    text,
    html
  });
}

/**
 * Normaliza valores a string no nulo para evitar "undefined" en plantillas.
 */
function safe(value) {
  return (value || "").toString();
}

/**
 * Trigger: se crea una solicitud de seguimiento.
 *
 * Ruta: /seguimientoSolicitudes/{key}
 * Evento: onCreate
 *
 * Si se cambia la ruta o el nombre de los campos del payload en RTDB,
 * el correo puede salir con datos incompletos ("N/A") o no enviarse.
 */
exports.onSeguimientoSolicitado = functions.database
  .ref("/seguimientoSolicitudes/{key}")
  .onCreate(async (snapshot, context) => {
    const data = snapshot.val() || {};
    const to = safe(data.usuarioEmail);
    const reporteId = safe(data.reporteId);
    const pregunta = safe(data.pregunta);

    const subject = `Seguimiento solicitado - Folio ${reporteId || "N/A"}`;
    const text =
      `Hemos recibido tu solicitud de seguimiento.\n\n` +
      `Folio: ${reporteId || "N/A"}\n` +
      `Solicitud: ${pregunta || "(sin comentario)"}\n\n` +
      `Te contactaremos con informacion del estado del reporte.\n\n` +
      `Ciudad Limpia`;

    const html =
      `<p>Hemos recibido tu solicitud de seguimiento.</p>` +
      `<p><strong>Folio:</strong> ${reporteId || "N/A"}</p>` +
      `<p><strong>Solicitud:</strong> ${pregunta ? pregunta.replaceAll("<", "&lt;").replaceAll(">", "&gt;") : "(sin comentario)"}</p>` +
      `<p>Te contactaremos con información del estado del reporte.</p>` +
      `<p><strong>Ciudad Limpia</strong></p>`;

    try {
      await sendEmail({ to, subject, text, html });
      functions.logger.info("Correo de seguimiento enviado a:", to, "key:", context.params.key);
    } catch (error) {
      functions.logger.error("Fallo enviando correo de seguimiento:", error);
    }
  });

/**
 * Trigger: se actualiza un reporte.
 *
 * Ruta: /reportes/{reporteId}
 * Evento: onUpdate
 *
 * Regla de negocio:
 * - Solo se notifica cuando cambia el campo "estado".
 *
 * Impacto de cambios:
 * - Si se elimina la condición (beforeEstado === afterEstado), se enviarán correos en cualquier update
 *   (incluyendo cambios de descripción, ubicación, etc.).
 * - Si se renombra el campo "estado", la notificación nunca se disparará.
 */
exports.onReporteActualizado = functions.database
  .ref("/reportes/{reporteId}")
  .onUpdate(async (change, context) => {
    const before = change.before.val() || {};
    const after = change.after.val() || {};

    const beforeEstado = safe(before.estado);
    const afterEstado = safe(after.estado);

    // Solo notificar si cambia el estado
    if (beforeEstado === afterEstado) return null;

    const to = safe(after.usuarioEmail);
    const reporteId = safe(context.params.reporteId);
    const tipo = safe(after.tipo);
    const ubicacion = safe(after.ubicacion);

    const subject = `Actualizacion de reporte - Folio ${reporteId}`;
    const text =
      `Tu reporte ha cambiado de estado.\n\n` +
      `Folio: ${reporteId}\n` +
      `Tipo: ${tipo || "N/A"}\n` +
      `Ubicacion: ${ubicacion || "N/A"}\n` +
      `Estado anterior: ${beforeEstado || "N/A"}\n` +
      `Estado actual: ${afterEstado || "N/A"}\n\n` +
      `Ciudad Limpia`;

    const html =
      `<p>Tu reporte ha cambiado de estado.</p>` +
      `<p><strong>Folio:</strong> ${reporteId}</p>` +
      `<p><strong>Tipo:</strong> ${tipo || "N/A"}</p>` +
      `<p><strong>Ubicación:</strong> ${ubicacion || "N/A"}</p>` +
      `<p><strong>Estado anterior:</strong> ${beforeEstado || "N/A"}</p>` +
      `<p><strong>Estado actual:</strong> ${afterEstado || "N/A"}</p>` +
      `<p><strong>Ciudad Limpia</strong></p>`;

    try {
      await sendEmail({ to, subject, text, html });
      functions.logger.info("Correo de estado enviado a:", to, "reporte:", reporteId);
    } catch (error) {
      functions.logger.error("Fallo enviando correo de estado:", error);
    }

    return null;
  });
