import { applyActionCode } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { renderNavbar } from "../Componentes/navbar.js";
import { auth } from "../Componentes/auth.js";

renderNavbar({
  active: "login",
  user: null,
  base: ".."
});

const status = document.getElementById("status");

function setStatus(message, type = "info") {
  status.textContent = message || "";
  status.style.color = type === "error" ? "red" : "#2d5a27";
}

const params = new URLSearchParams(window.location.search);
const oobCode = params.get("oobCode");

async function verify() {
  if (!oobCode) {
    setStatus("Enlace inválido o incompleto.", "error");
    return;
  }

  try {
    await applyActionCode(auth, oobCode);
    setStatus("Correo verificado correctamente. Ya puedes iniciar sesión.", "success");
  } catch (error) {
    console.error("Error aplicando código:", error);
    setStatus("No se pudo verificar el correo. El enlace puede haber expirado.", "error");
  }
}

verify();

