# Changelog de la plantilla Prometeo

Este archivo lleva el historial de cambios de la **plantilla** (no de los proyectos derivados). Los usuarios que ya crearon su repo desde la plantilla pueden correr `/p-actualizar-template` para traer los cambios listados aqui a su repo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/) y la version usa SemVer simple (`major.minor.patch`).

## [0.3.0] — 2026-05-16

### Added
- **Skill `/p-arreglo-rapido`** — atajo para cambios pequenos sobre milestones ya promovidos a PROD. Detector de complejidad: aborta y redirige a `/p-planear-milestone` si el cambio se sale de criterios (scopes OAuth nuevos, propiedades nuevas, archivos nuevos, > 3 archivos, triggers). Hace plan inline + ejecutar + verificar; nunca promueve sola. Escribe `docs/fixes/v<X.Y>-fix.md` como registro auditable.
- **Skill `/p-actualizar-template`** — actualiza la infraestructura del template (skills, CLAUDE.md, .cursorrules, docs/WORKFLOW.md, docs/PROMPT-INSTALACION.md, scripts/) desde la plantilla original sin tocar el codigo ni el contexto del usuario (Main.js, docs/PRD.md, docs/milestones/, etc.). Backup automatico de archivos managed que el usuario haya modificado.
- **Versionado decimal** en `.planning/state.json`: cada milestone promovido incrementa el major (v1.0, v2.0); cada quick-fix incrementa el minor sobre el milestone vigente (v2.1, v2.2). Tag git, descripcion del deployment en PROD y commit message usan la version.
- **Archivo `TEMPLATE_VERSION`** al root del repo: la plantilla lleva su propia version SemVer, separada de la del proyecto del usuario.
- **`CHANGELOG.md`** del template (este archivo).
- **Auto-check ligero** en `/p-planear-milestone` y `/p-arreglo-rapido`: al inicio comparan `TEMPLATE_VERSION` local vs remoto y avisan al usuario si hay actualizacion disponible (sin bloquear).
- **Carpeta `docs/fixes/`** auto-creada por `/p-arreglo-rapido` para guardar el registro de cada quick-fix.
- **Carpeta `.template-backup/`** (gitignored) creada por `/p-actualizar-template` para hacer backup de archivos managed modificados antes de sobrescribirlos.

### Changed
- **Prefijo `p-` en todas las skills**: `config-entorno` → `p-config-entorno`, `plan-milestone` → `p-planear-milestone`, `debug-error` → `p-diagnosticar-error`, `quick-fix` → `p-arreglo-rapido`, etc. Todas las skills viven bajo el namespace `p-` (visualmente agrupadas en el listado de Cursor).
- **`/p-verificar-dev` ahora tiene 4 fases** (antes 5): revision estatica, verificacion guiada con el usuario en el editor de Apps Script, fix loop, marcar verificado. Eliminada la fase de "autoverificacion con browser de Cursor" que no funcionaba — Apps Script no es previsualizable, ejecutar funciones requiere el usuario autenticado.
- **Modelo de git sin commits intermedios**: durante todo el milestone (`/p-planear-milestone` → `/p-ejecutar-milestone` → `/p-verificar-dev`) no se commitea. Todos los cambios se acumulan visibles en el panel Source Control de Cursor. `/p-promover-prod` hace un solo commit con todo el milestone.
- **Ramas en GitHub**: `/p-promover-prod` ahora empuja a la rama `dev` (checkpoint pre-prod) y luego a `main`, antes de tocar Apps Script PROD. La rama `dev` la crea `/p-config-appsscript` en setup inicial.
- **Deployment estable de DEV**: el `deploymentId` de DEV se crea una sola vez (en `/p-config-appsscript`) y se reutiliza en cada `npm run deploy:dev`. El URL del editor de Apps Script DEV no cambia entre milestones.
- **`/p-promover-prod` con versionado**: commit message usa `feat(M3): <obj>` o `fix(v2.4): <desc>`; tag git es `v<major>.<minor>` (ej. `v3.0`, `v2.4`); descripcion del deployment en PROD incluye la version.

### Removed
- **Cualquier intento de autoverificacion con browser del asistente** (`mcp__Claude_in_Chrome__*`, `mcp__Claude_Preview__*`) en las skills. Apps Script no permite ejecutar funciones sin un usuario autenticado, por lo que esa direccion se descartó.

### Notes for migration from 0.2.x
- Si tienes proyectos creados con versiones anteriores del template, corre `/p-actualizar-template` para alinearte con 0.3.0.
- Los nombres viejos de skills (`/plan-milestone`, `/quick-fix`, etc.) ya no funcionan — usa los nuevos con prefijo `p-`.
- `state.json` viejo (sin `currentVersion`, `currentMilestoneNumber`, `currentFixNumber`) se inicializa automaticamente con valores 0 cuando corras `/p-actualizar-template` o el primer `/p-promover-prod`.

---

## [0.2.0] — Estado pre-PR (no publicado formalmente)

Estado del template antes de este PR — incluye:
- Skills iniciales: `config-entorno`, `config-appsscript`, `plan-milestone`, `ejecutar-milestone`, `verificar-dev`, `promover-prod`, `debug-error`, `nuevo-milestone`.
- Refactor de "un solo commit en promover-prod" y "browser self-verify" en `verificar-dev` (luego ambos modificados en 0.3.0).
- Workflow de 4 fases por milestone.
- Scripts de Node (`push.js`, `deploy.js`, `promote.js`, `open.js`, `logs.js`).
- `.gitignore` y `.claspignore` reforzados.
- Documentacion: `CLAUDE.md`, `.cursorrules`, `docs/WORKFLOW.md`, `docs/PROMPT-INSTALACION.md`.

## [0.1.0] — Plantilla original (Cristian Palacios)

Estado inicial del repo como starter de Apps Script con `clasp` multi-ambiente.
