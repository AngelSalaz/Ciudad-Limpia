export function renderNavbar({ active = "inicio", user = null, role = "user", base = ".." } = {}) {
  /**
   * Renderiza la barra de navegación (navbar) en todas las pantallas.
   *
   * Invariantes (si se cambian, se rompe la navegación o los estilos):
   * - Requiere un contenedor con la clase `.nav__links` en el HTML.
   * - `base` define el prefijo de rutas relativas (ej. ".." o "../..").
   * - Si `role === "admin"`, se muestra el enlace a Admin.
   * - El link de perfil apunta a:
   *   - admin: `Admin/admin-perfil.html`
   *   - user: `Usuarios/Usuarios-perfil.html`
   */
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
      <a class="${is("contacto")}" href="${prefix}Contacto/Contacto.html">Contacto</a>
      ${isAdmin ? `<a class="${is("admin")}" href="${prefix}Admin/admin.html">Admin</a>` : ""}
      <a class="${profileClass}" href="${profileHref}" aria-label="Mi perfil" title="Mi perfil">
        <img src="${prefix}Imagenes/images.png" class="nav__profile-img" alt="Perfil" />
      </a>
    `;
  } else {
    navLinks.innerHTML = `
      <a class="${is("inicio")}" href="${prefix}Home/inicio.html">Inicio</a>
      <a class="${is("contacto")}" href="${prefix}Contacto/Contacto.html">Contacto</a>
      <a class="${is("login")}" href="${prefix}Login/login.html">Login</a>
      <a class="${is("registro")}" href="${prefix}Login/Registro/registro.html">Registro</a>
    `;
  }
}
