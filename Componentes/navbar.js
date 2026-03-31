let profileMenuController = null;

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
  const profileTriggerClass = active === "perfil" ? "nav__profile-trigger active" : "nav__profile-trigger";
  const panelClass = active === "admin" ? "nav__profile-menu-item active" : "nav__profile-menu-item";

  if (user) {
    navLinks.innerHTML = `
      <a class="${is("inicio")}" href="${prefix}Home/inicio.html">Inicio</a>
      <a class="${is("reportes")}" href="${prefix}Reportes/reportes.html">Reportes</a>
      <a class="${is("rutas")}" href="${prefix}Rutas/Rutas.html">Rutas</a>
      <a class="${is("contacto")}" href="${prefix}Contacto/Contacto.html">Soporte</a>
      <div class="nav__profile-menu-wrap" data-profile-menu>
        <button type="button" class="${profileTriggerClass}" data-profile-trigger aria-haspopup="true" aria-expanded="false" title="Mi perfil">
          <svg class="nav__profile-img nav__profile-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M12 12a4 4 0 1 0-4-4a4 4 0 0 0 4 4Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z"/>
          </svg>
          <span class="nav__profile-caret" aria-hidden="true">▾</span>
        </button>
        <div class="nav__profile-menu" data-profile-dropdown role="menu" hidden>
          <a class="${active === "perfil" ? "nav__profile-menu-item active" : "nav__profile-menu-item"}" href="${profileHref}" role="menuitem">Perfil</a>
          ${isAdmin ? `<a class="${panelClass}" href="${prefix}Admin/admin.html" role="menuitem">Panel administrativo</a>` : ""}
          <button type="button" class="nav__profile-menu-item nav__profile-menu-item--danger" id="btnLogout" role="menuitem">Cerrar sesión</button>
        </div>
      </div>
    `;

    setupProfileDropdown(navLinks);
  } else {
    cleanupProfileDropdown();
    navLinks.innerHTML = `
      <a class="${is("inicio")}" href="${prefix}Home/inicio.html">Inicio</a>
      <a class="${is("contacto")}" href="${prefix}Contacto/Contacto.html">Soporte</a>
      <a class="${is("login")}" href="${prefix}Login/login.html">Login</a>
      <a class="${is("registro")}" href="${prefix}Login/Registro/registro.html">Registro</a>
    `;
  }
}

function setupProfileDropdown(navLinks) {
  cleanupProfileDropdown();

  const wrap = navLinks.querySelector("[data-profile-menu]");
  const trigger = navLinks.querySelector("[data-profile-trigger]");
  const menu = navLinks.querySelector("[data-profile-dropdown]");
  if (!wrap || !trigger || !menu) return;

  profileMenuController = new AbortController();
  const { signal } = profileMenuController;

  const closeMenu = () => {
    menu.hidden = true;
    wrap.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    menu.hidden = false;
    wrap.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
  };

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (menu.hidden) {
      openMenu();
      return;
    }
    closeMenu();
  }, { signal });

  menu.addEventListener("click", () => {
    closeMenu();
  }, { signal });

  document.addEventListener("click", (event) => {
    if (!wrap.contains(event.target)) closeMenu();
  }, { signal });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  }, { signal });
}

function cleanupProfileDropdown() {
  if (!profileMenuController) return;
  profileMenuController.abort();
  profileMenuController = null;
}
