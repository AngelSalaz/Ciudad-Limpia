# Ciudad Limpia

Version: **v2.19.0**

## Documentacion

- Guia de instalacion (local + hosting): `docs/instalacion/GUIA_INSTALACION.md`
- Plantilla de evidencias (capturas): `docs/instalacion/PLANTILLA_CAPTURAS.md`

## Flujo de trabajo (ramas)

Se recomienda trabajar con:

- `main`: rama estable (solo por Pull Request)
- `develop`: integracion
- `feature/*`: cambios por modulo/tarea

## Inicio rapido (local)

```powershell
git clone https://github.com/AngelSalaz/Ciudad-Limpia.git
cd Ciudad-Limpia
npm ci
npx http-server . -p 5501 -c-1
```

Abrir: `http://127.0.0.1:5501/`

