import { createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { renderNavbar } from "../../Componentes/navbar.js?v=20260331-1";
import { auth, fetchWithAuth, firebaseConfig, getLandingPathByRole, getUserContext } from "../../Componentes/auth.js";

const form = document.getElementById("registerForm");
const statusMsg = document.getElementById("status");
const btnRegister = document.getElementById("btnRegister");
let isCreatingAccount = false;

renderNavbar({
  active: "registro",
  user: null,
  base: "../.."
});

onAuthStateChanged(auth, async (user) => {
  if (!user || isCreatingAccount) return;

  const { role } = await getUserContext(user);
  window.location.href = getLandingPathByRole(role, "../..");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  isCreatingAccount = true;

  btnRegister.disabled = true;
  btnRegister.innerText = "Creando cuenta...";

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    const userData = {
      name,
      phone,
      address: "",
      email,
      role: "user",
      favoriteRoutes: {},
      createdAt: new Date().toISOString()
    };

    const response = await fetchWithAuth(`${firebaseConfig.databaseURL}/users/${uid}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    }, credential.user);

    if (!response.ok) throw new Error("No se pudo guardar el perfil");

    statusMsg.style.color = "green";
    statusMsg.textContent = "Cuenta creada correctamente";

    setTimeout(() => {
      window.location.href = getLandingPathByRole("user", "../..");
    }, 700);
  } catch (error) {
    console.error("Error en registro:", error);
    statusMsg.style.color = "red";
    statusMsg.textContent = error.code || error.message || "No se pudo crear la cuenta";
  } finally {
    isCreatingAccount = false;
    btnRegister.disabled = false;
    btnRegister.innerText = "Crear cuenta";
  }
});

