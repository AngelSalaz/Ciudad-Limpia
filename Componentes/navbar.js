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
      <a class="${is("soporte")}" href="${prefix}Contacto/Contacto.html">Soporte</a>
      ${isAdmin ? `<a class="${is("admin")}" href="${prefix}Admin/admin.html">Admin</a>` : ""}
      <a class="${profileClass}" href="${profileHref}" aria-label="Mi perfil" title="Mi perfil">
        <img src="${prefix}Imagenes/images.png" class="nav__profile-img" alt="Perfil" />
      </a>
    `;
  } else {
    navLinks.innerHTML = `
      <a class="${is("inicio")}" href="${prefix}Home/inicio.html">Inicio</a>
      <a class="${is("soporte")}" href="${prefix}Contacto/Contacto.html">Soporte</a>
      <a class="${is("login")}" href="${prefix}Login/login.html">Login</a>
      <a class="${is("registro")}" href="${prefix}Login/Registro/registro.html">Registro</a>
    `;
  }
}
