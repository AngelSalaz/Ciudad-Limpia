export function renderNavbar({ active = "inicio", user = null, role = "user", base = ".." } = {}) {
  const navLinks = document.querySelector(".nav__links");
  if (!navLinks) return;

  const is = (key) => (active === key ? "nav__link active" : "nav__link");
  const root = (base || ".").replace(/\/+$/, "");
  const prefix = root === "." ? "" : `${root}/`;
  const isAdmin = role === "admin";
  const profileHref = isAdmin
    ? `${prefix}Admin/admin-perfil.html`
    : `${prefix}Usuarios/Usuarios-perfil.html`;
  const profileClass = active === "perfil" ? "nav__profile-link active" : "nav__profile-link";

  if (user) {
    navLinks.innerHTML = `
      <a class="${is("inicio")}" href="${prefix}Home/inicio.html">Inicio</a>
      <a class="${is("reportes")}" href="${prefix}Reportes/reportes.html">Reportes</a>
      <a class="${is("rutas")}" href="${prefix}Rutas/Rutas.html">Rutas</a>
      <a class="${is("contacto")}" href="${prefix}Contacto/Contacto.html">Soporte</a>
      ${isAdmin ? `<a class="${is("admin")}" href="${prefix}Admin/admin.html">Administrador</a>` : ""}
      <a class="${profileClass}" href="${profileHref}" aria-label="Mi perfil" title="Mi perfil">
        <svg class="nav__profile-img nav__profile-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M12 12a4 4 0 1 0-4-4a4 4 0 0 0 4 4Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z"/>
        </svg>
      </a>
    `;
  } else {
    navLinks.innerHTML = `
      <a class="${is("inicio")}" href="${prefix}Home/inicio.html">Inicio</a>
      <a class="${is("contacto")}" href="${prefix}Contacto/Contacto.html">Soporte</a>
      <a class="${is("login")}" href="${prefix}Login/login.html">Login</a>
      <a class="${is("registro")}" href="${prefix}Login/Registro/registro.html">Registro</a>
    `;
  }
}
