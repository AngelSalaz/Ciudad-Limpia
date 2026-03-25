# Plantilla de capturas (evidencias)

Este archivo define las evidencias visuales recomendadas para una documentacion completa.

## Reglas de captura

1. Formato recomendado: PNG.
1. Resolucion: conservar resolucion original de pantalla.
1. Ocultar datos sensibles si aplica (correos privados, tokens, etc.).
1. Guardar en: `docs/instalacion/assets/`
1. Nombrado: `captura-XX-descripcion.png` (XX con 2 digitos).

## Lista de evidencias

1. `captura-01-github-repo.png`
   - Pagina del repositorio en GitHub.
1. `captura-02-github-branches.png`
   - Lista de ramas (main/develop/feature/*).
1. `captura-03-github-branch-protection.png`
   - Configuracion de proteccion de rama `main` (Pull Request obligatorio).
1. `captura-04-clone.png`
   - Terminal con `git clone` y `cd`.
1. `captura-05-npm-ci.png`
   - Terminal con `npm ci` completado.
1. `captura-06-servidor-local.png`
   - Terminal con `http-server` o evidencia de Live Server.
1. `captura-07-inicio-local.png`
   - Pagina `Home/inicio.html` cargada en local.
1. `captura-08-login.png`
   - Pagina de login.
1. `captura-09-firebase-auth.png`
   - Firebase Console: Authentication habilitado (proveedor activo).
1. `captura-10-firebase-rtdb-datos.png`
   - Firebase Console: RTDB con nodos `/users`, `/reportes`, `/rutas` (si existen).
1. `captura-11-firebase-rtdb-reglas.png`
   - Firebase Console: reglas RTDB.
1. `captura-12-firebase-hosting.png`
   - Firebase Console: Hosting con deploy exitoso.
1. `captura-13-deploy-cli.png`
   - Terminal con `firebase deploy --only hosting` (resultado).
1. `captura-14-hosting-web.png`
   - Sitio funcionando en `*.web.app`.

## Insercion en la guia
Una vez guardadas las capturas en `assets/`, se pueden referenciar asi:

```md
![Descripcion](assets/captura-01-github-repo.png)
```

