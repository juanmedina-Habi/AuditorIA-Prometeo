# Workflow de Prometeo

Este documento describe **como se trabaja** en un proyecto Prometeo: el loop, los ambientes, las ramas de GitHub y que skill usar en cada momento.

> **Audiencia:** tu (usuario operativo) y el asistente de Cursor que te ayuda.
> **Idioma:** espanol.

---

## El loop por milestone

Tu PRD parte el proyecto en milestones entregables. **Cada milestone pasa por el mismo loop de 4 pasos**:

```
        ┌──────────┐    ┌───────────┐    ┌────────────┐    ┌──────────┐
   ┌──> │  PLANEAR │ ──>│ EJECUTAR  │ ──>│ VERIFICAR  │ ──>│ PROMOVER │──┐
   │    │ Plan Mode│    │ Agent Mode│    │   en DEV   │    │  a PROD  │  │
   │    └──────────┘    └───────────┘    └────────────┘    └──────────┘  │
   │                                                                      │
   └───────────────── siguiente milestone ────────────────────────────────┘
```

**Principio**: solo se arranca el siguiente milestone cuando el actual esta corriendo en PROD.

---

## Que hace cada skill (resumen operativo)

| Skill | Git local | GitHub | Apps Script |
| --- | --- | --- | --- |
| `/p-planear-milestone` | escribe plan + state.json (sin commit) | — | — |
| `/p-ejecutar-milestone` | escribe codigo (sin commit) | — | `npm run deploy:dev` (reutiliza mismo `deploymentId`) |
| `/p-verificar-dev` | fixes (sin commit) | — | `deploy:dev` por fix (mismo `deploymentId`); al cerrar, `deploy:dev` con descripcion VALIDADO |
| `/p-promover-prod` | **1 commit** `feat(<M>): <obj>` | push a `dev` luego a `main` | `npm run promote` (PROD) |

**No se commitea hasta `/p-promover-prod`.** Durante todo el milestone los cambios viven sin commitear en el working directory. El usuario los revisa cuando quiera en el panel **Source Control** de Cursor.

---

## Ambientes (Apps Script + GitHub)

```
   ┌─────────────────┐
   │  TU COMPUTADOR  │
   │     (local)     │
   │  Cursor + Git   │
   └────────┬────────┘
            │
            │  npm run deploy:dev   (durante el milestone, mismo deploymentId)
            ▼
   ┌─────────────────┐
   │   Apps Script   │
   │      DEV        │  ← sandbox, sin efectos reales
   │   (pruebas)     │
   └────────┬────────┘
            │
            │  /p-promover-prod:
            │    1. git commit
            │    2. git push origin main:dev   (GitHub)
            │    3. git push origin main:main  (GitHub)
            │    4. npm run promote            (Apps Script PROD)
            ▼
   ┌─────────────────┐
   │   Apps Script   │
   │      PROD       │  ← operacion real
   │  (operacion)    │
   └─────────────────┘
```

- **Local** — donde editas con Cursor. No corre nada todavia.
- **Apps Script DEV** — donde el codigo corre por primera vez. Sin impacto en operacion real.
- **Apps Script PROD** — operacion real. Lo que pase aqui tiene consecuencias reales.
- **GitHub `dev` (rama)** — codigo actualmente validado y desplegado en Apps Script DEV.
- **GitHub `main` (rama)** — codigo actualmente en Apps Script PROD.

**Promover, no editar.** Nunca editas codigo directamente en PROD ni en DEV. Toda edicion nace en local y fluye `local → DEV → PROD`. **No edites en el editor web de Apps Script**, ni siquiera para "fixes rapidos" — eso rompe la sincronizacion con GitHub.

---

## Las 4 fases en detalle

### 1. Planear — `/p-planear-milestone`

- Modo Cursor recomendado: **Plan Mode**.
- Que pasa: el asistente lee `docs/PRD.md`, identifica el milestone activo desde `.planning/state.json`, te propone un plan paso a paso (archivos, funciones, triggers, scopes OAuth, URLs de artefactos a verificar, checklist).
- Output: `docs/milestones/<M>-plan.md`.
- **No edita codigo ni commitea.**

### 2. Ejecutar — `/p-ejecutar-milestone`

- Modo Cursor: **Agent Mode**.
- Que pasa: el asistente implementa el plan en archivos separados por responsabilidad, valida sintaxis (`node --check`), y al final sube el codigo a Apps Script DEV con `npm run deploy:dev` (reutiliza el `deploymentId` estable de DEV — el URL del proyecto en DEV no cambia entre milestones).
- Solo pausa si encuentra una **desviacion** del plan (scope OAuth nuevo, propiedad nueva, archivo no contemplado, trigger distinto).
- **No commitea.** Cambios visibles en Source Control de Cursor.

### 3. Verificar en DEV — `/p-verificar-dev`

**4 fases internas**:

- **A. Revision estatica** — el asistente lee el diff y lo contrasta contra CLAUDE.md, el plan, el PRD y buenas practicas de Apps Script. Lo hace el asistente solo.
- **B. Verificacion guiada contigo** — el asistente abre el editor de Apps Script DEV (`npm run open:dev`). Recorre **contigo** el checklist del plan, item por item: te dice que funcion ejecutar, tu la ejecutas en el editor, copias el log y se lo pegas; el asistente lo analiza y reporta veredicto. Cuando hay side-effects observables (Sheet de salida, correo a destinatario), te dice que URL abrir y que valor confirmar.
- **C. Fix loop** — si A o B detectan problemas, propone fix, lo implementa, hace `npm run deploy:dev` (mismo `deploymentId`) y vuelve a B con el item afectado.
- **D. Marcar verificado** — `npm run deploy:dev` con descripcion "VALIDADO" (mismo `deploymentId` de siempre, solo actualiza metadata), sincroniza `docs/IDS.md`, marca state como `verified`.

**Por que no autoverificacion?** Apps Script no es una web app que se pueda previsualizar. Vive en `script.google.com` y ejecutar funciones requiere un usuario autenticado. El asistente NO puede apretar "Ejecutar" — siempre lo haces tu. El asistente si puede analizar logs que le pegues y diagnosticar lo que reportes.

**Sigue sin commitear.** Cuando termina, los cambios siguen visibles en Source Control.

### 4. Promover a PROD — `/p-promover-prod`

Orden estricto:

1. **Configurar Script Properties en PROD** (probablemente con valores DISTINTOS a DEV: destinatarios reales, API keys de produccion).
2. **Un solo commit** de todo lo acumulado del milestone: `feat(<M>): <objetivo>`.
3. **`git push origin main:dev`** — actualiza la rama `dev` en GitHub.
4. **`git push origin main:main`** — actualiza la rama `main` en GitHub.
5. **`npm run promote -- --desc "..."`** — push + deployment versionado a Apps Script PROD.
6. Smoke test minimo opcional en PROD.
7. Tag git `<M>-prod-<YYYYMMDD>`.
8. Cierra el milestone en `state.json` con history completo.

---

## Comandos npm (los corre la skill por ti)

| Comando | Que hace |
| --- | --- |
| `npm run push:dev` | Sube codigo a DEV sin tocar el deployment (uso raro, preferir `deploy:dev`) |
| `npm run deploy:dev` | Push + actualiza el deployment estable de DEV (reutiliza el mismo `deploymentId`; el primero se crea en `/p-config-appsscript`). Usado durante ejecutar, verificar y debug |
| `npm run push:prod` | Sube codigo a PROD sin crear deployment (raro — uso interno) |
| `npm run promote` | Push + deployment versionado en PROD (usado solo por /p-promover-prod) |
| `npm run open:dev` | Abre DEV en el navegador |
| `npm run open:prod` | Abre PROD en el navegador |
| `npm run logs:dev` | Logs de DEV |
| `npm run logs:prod` | Logs de PROD |

---

## Skills por momento

| Momento | Skill | Frecuencia |
| --- | --- | --- |
| Primer setup del computador | `/p-config-entorno` | 1 vez por computador |
| Crear proyectos Apps Script + rama `dev` GitHub | `/p-config-appsscript` | 1 vez por proyecto |
| Empezar milestone | `/p-planear-milestone` | 1 vez por milestone |
| Implementar plan | `/p-ejecutar-milestone` | 1 vez por milestone |
| Validar en dev | `/p-verificar-dev` | 1+ veces por milestone |
| Promover a prod | `/p-promover-prod` | 1 vez por milestone |
| Cerrar y empezar siguiente | `/p-nuevo-milestone` | 1 vez por milestone |
| Algo fallo | `/p-diagnosticar-error` | Cuando aplique |

---

## Quick-fix: ajustes pequenos despues de promover

Cuando ya tienes un milestone en PROD y necesitas hacer un cambio chico (cambiar destinatario, corregir typo, ajustar umbral), no tienes que pasar por el loop completo de 4 fases. Usa `/p-arreglo-rapido`.

### Que hace `/p-arreglo-rapido`

1. Te pide la descripcion del cambio en 1-2 frases.
2. Verifica que el cambio es lo suficientemente pequeno (sin scopes OAuth nuevos, sin Script Properties nuevas, sin archivos nuevos, < 3 archivos modificados).
3. Si NO es pequeno, aborta y te dirige a `/p-planear-milestone` (sera el siguiente milestone, v<X+1>.0).
4. Si SI es pequeno: mini-plan inline → implementa → `npm run deploy:dev` → autoverificacion (Fase A + B de verificar).
5. **Pausa explicita** mostrandote el diff. Tu revisas en Source Control de Cursor.
6. Tu corres `/p-promover-prod` cuando confirmes.

**No commitea, no promueve.** Misma logica que el resto del loop.

### Versionado decimal

```
M1 promovido      → v1.0
quick-fix 1       → v1.1
quick-fix 2       → v1.2
M2 promovido      → v2.0    (reset del minor)
quick-fix sobre M2 → v2.1
M3 promovido      → v3.0
```

- **Milestones**: incrementan el major (v1.0 → v2.0 → v3.0).
- **Quick-fixes**: incrementan el minor sobre el milestone vigente.
- **Tag git**: `v<major>.<minor>` (ej. `v2.3`).
- **Commits**: `feat(M3): <obj>` o `fix(v2.4): <desc>`.

La version actual vive en `.planning/state.json` (campo `currentVersion`) y se muestra en `docs/IDS.md`.

---

## Cuando algo se rompe en PROD

Si lo que se rompio ya estaba en PROD (no en el milestone que estas construyendo):

1. Trata el fix como un **mini-milestone de emergencia**.
2. Reproduce el error en DEV (`/p-verificar-dev` apunta logs a DEV).
3. Arregla con `/p-diagnosticar-error` o `/p-ejecutar-milestone`.
4. Verifica con `/p-verificar-dev`.
5. Promueve con `/p-promover-prod` (el commit incluye el fix; las ramas `dev` y `main` en GitHub quedan actualizadas; PROD recibe el nuevo deployment).

**Nunca toques PROD directamente** — ni en el editor web ni saltando el flujo de promote.
