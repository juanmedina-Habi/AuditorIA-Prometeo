---
name: p-ejecutar-milestone
description: Implementa el plan aprobado del milestone activo. Escribe codigo local en archivos separados por responsabilidad, sube el codigo a Apps Script DEV (push, sin deployment). No hace commits — los cambios quedan en el working directory para que el usuario los revise en el panel Source Control de Cursor.
---

# /p-ejecutar-milestone

Ejecuta el plan generado por `/p-planear-milestone`. **Escribe codigo local y lo sube a Apps Script DEV.** No commitea — los cambios se acumulan sin commitear hasta `/p-promover-prod`, asi el usuario puede ver toda la diferencia del milestone en un solo lugar (Source Control de Cursor).

## Cuando usar

- Despues de `/p-planear-milestone` (plan aprobado y escrito en `docs/milestones/<milestone>-plan.md`).
- El usuario dice: "ejecuta el plan", "implementalo", "vamos con la implementacion", "ya esta el plan, codifica".

## Pre-checks (aborta si falla)

```bash
test -f .planning/state.json
test -f docs/PRD.md
test -f environments.json
```

Lee `.planning/state.json`. Casos:

- **Sin `state.json` o `activeMilestone` vacio** → "No hay milestone activo. Corre `/p-planear-milestone` primero."
- **`status` ≠ `planned` y ≠ `executing` y ≠ `verifying`** → segun valor:
  - `planning` → "El plan no esta aprobado todavia. Termina `/p-planear-milestone` primero."
  - `promoted` o `closed` → "Este milestone ya esta en una fase posterior. Si quieres re-ejecutarlo, replanea con `/p-planear-milestone`."

Si `status` = `executing` o `verifying`, **estamos retomando o iterando** — eso es normal con esta skill porque no hay commits intermedios; los cambios pendientes ya estan en el working directory.

Verifica que exista el plan:

```bash
test -f docs/milestones/<activeMilestone>-plan.md
```

Si no existe → "El plan del milestone activo no esta. Corre `/p-planear-milestone`."

Verifica `dev.scriptId`:

```bash
node -e "const e=require('./environments.json'); if(!e.dev?.scriptId || e.dev.scriptId.startsWith('PEGA_AQUI')) process.exit(1)"
```

Si falla → "DEV no esta configurado. Corre `/p-config-appsscript`."

## Plan que anuncias al usuario

> Voy a implementar el plan de **`<milestone>`** que esta en `docs/milestones/<milestone>-plan.md`.
>
> **Forma de trabajar**:
> - Implemento todos los pasos del plan de corrido.
> - **No commiteo nada** — los cambios quedan visibles en el panel Source Control de Cursor.
> - **Solo pauso si encuentro una desviacion** del plan (scope OAuth nuevo, propiedad nueva, archivo extra no contemplado, trigger distinto).
> - Detalles internos (helpers, naming, formato) los resuelvo sin pausar.
> - Al terminar, **subo el codigo a Apps Script DEV** con `npm run deploy:dev` (push + actualiza el deployment de DEV reutilizando el mismo ID — el URL del proyecto en DEV no cambia entre milestones).
> - El commit se hace despues, en `/p-promover-prod`, con todos los cambios del milestone juntos.
>
> ¿Procedo?

Solo continua si aprueba.

## Pasos detallados

### 1. Marcar inicio de ejecucion

Actualiza `.planning/state.json`:

```json
{
  "activeMilestone": "<sin cambio>",
  "status": "executing",
  "lastUpdated": "<ISO now>"
}
```

### 2. Leer plan y PRD

Carga en memoria:

- `docs/milestones/<milestone>-plan.md` — fuente de verdad de QUE construir.
- `docs/PRD.md` — fuente de verdad del POR QUE y del scope global.
- `CLAUDE.md` — guias de organizacion (archivos por responsabilidad, secretos en PropertiesService, etc.).

### 3. Implementar

Recorre la tabla `## Archivos` del plan y aplica cada cambio. Para cada archivo:

- Si `crear`: usa Write con la ruta indicada.
- Si `modificar`: usa Read primero, luego Edit con el cambio puntual.

Reglas de organizacion (de CLAUDE.md):

- **Responsabilidad unica por archivo.** Si el plan dice "agregar funcion de envio de correo a Main.js" pero la responsabilidad es correo, considera ponerla en `Gmail.js`. Si eso difiere del plan → es una desviacion (ver paso 5).
- **Secretos en PropertiesService.** Si el plan menciona una API key, no la pongas en codigo. Genera `Config.js` (o usa el existente) con un wrapper como:

  ```js
  function getProperty(key) {
    const value = PropertiesService.getScriptProperties().getProperty(key);
    if (!value) throw new Error(`Falta la propiedad: ${key}`);
    return value;
  }
  ```

  Documenta al usuario en el cierre que debe configurar las propiedades en el editor de DEV (Settings > Script Properties). Es la unica excepcion donde entra al editor — y solo a Settings, no a editar codigo.

- **`appsscript.json`**: si el plan agrega scopes nuevos, edita el manifest con los scopes listados. No agregues scopes que el plan no menciona.

- **Triggers**: si el plan menciona un trigger time-driven, no lo crees con codigo de `ScriptApp.newTrigger(...)` en una funcion `main()`. Crea una funcion separada `installTriggers()` que el usuario corre una sola vez en el editor durante la verificacion. La skill `/p-verificar-dev` lo recuerda.

### 4. Validacion sintactica local

Despues de cada archivo `.js`/`.gs` escrito, valida sintaxis con Node:

```bash
node --check <archivo>
```

Si falla, **arregla antes de continuar**. No acumules errores de sintaxis para el final.

### 5. Manejo de desviaciones

Una desviacion = cambio en el contrato del plan con el usuario. **Pausa y pide aprobacion** si:

- Necesitas un **scope OAuth** no listado en el plan.
- Necesitas una **propiedad de Script** no listada.
- Necesitas un **archivo nuevo** que el plan no menciona (mas alla de helpers triviales).
- El **trigger** debe ser distinto al planeado.
- Una **regla de negocio** se interpreta distinto al PRD.

Formato de pausa:

> ⚠️ Desviacion del plan:
>
> **Plan dice**: <texto literal del plan>
> **Encontre que**: <explicacion>
> **Propongo**: <ajuste>
> **Impacto**: <efecto en el milestone o en futuros milestones>
>
> ¿Apruebas el ajuste?

Si aprueba, **actualiza `docs/milestones/<milestone>-plan.md`** con el cambio y continua.

No pauses por: naming de variables, estructura interna de funciones, helpers privados, comentarios.

### 6. Subir codigo y actualizar deployment de DEV

Construye una descripcion estable para el deployment del milestone. Sugiero:

```
<milestone> - <objetivo del plan, max 60 char>
```

Ejemplo: `M1 - Procesar tickets pendientes y mandar reporte diario`

No incluyas timestamp — la descripcion se mantiene durante todo el milestone, lo que cambia es el codigo subido.

Ejecuta:

```bash
npm run deploy:dev -- --desc "<milestone> - <objetivo>"
```

Esto:
1. Sube el codigo al proyecto DEV (`clasp push --force`).
2. **Reutiliza el `deploymentId` existente** que esta en `environments.json` (creado en `/p-config-appsscript`), actualizando solo el codigo y la descripcion. **El URL del deployment NO cambia** — el humano puede tener abierta la pestana de DEV y solo refrescar para ver el codigo nuevo.
3. Guarda la fecha del ultimo deploy en `environments.json` (`deployedAt`).

Verifica el output: debe decir `Deployment ID (reutilizado): <id>`. Si dice "Creando deployment nuevo", es que el deploymentId no estaba registrado — eso pasaria si `/p-config-appsscript` se salto el primer deploy. En ese caso, el nuevo ID se guarda automaticamente y futuras corridas lo reutilizaran.

Si falla:
- **Apps Script API not enabled** → guia al usuario a `script.google.com/home/usersettings` para habilitarla.
- **Otro error** → diagnostica antes de avanzar.

### 7. Resumen de cambios al usuario

Muestra:

```bash
git status --short
git diff --stat
```

Resumen:

> Implementacion lista. Cambios pendientes (sin commit):
> - `Main.js` (modificado, +12 lineas)
> - `Sheets.js` (nuevo, 45 lineas)
> - `appsscript.json` (modificado, +1 scope)
> - `docs/milestones/<milestone>-plan.md` (si hubo desviacion aprobada)
> - `.planning/state.json`
>
> **Codigo subido a Apps Script DEV** ✓ (deployment de DEV actualizado, mismo URL de siempre)
>
> Puedes revisar todos los cambios en el panel **Source Control** de Cursor (icono de rama en la barra lateral). **No hay commit aun** — el commit se hace en `/p-promover-prod` con todo el milestone junto.

### 8. Marcar fin de ejecucion

Actualiza `.planning/state.json` (incluye marca de tipo de release pendiente para que `/p-promover-prod` versione correctamente):

```json
{
  "status": "executed",
  "pendingReleaseType": "milestone",
  "lastUpdated": "<ISO now>"
}
```

### 9. Cierre

> Implementacion de `<milestone>` lista.
>
> **Codigo en Apps Script DEV** ✓
> **Cambios pendientes de commit**: visibles en Source Control de Cursor
>
> **Acciones manuales pendientes** (si aplica):
> - Configurar propiedades en el editor de Apps Script DEV (Settings > Script Properties):
>   - `RECIPIENT_EMAIL` = <valor de prueba>
>   - `OTRA_KEY` = <valor de prueba>
>
> **Siguiente paso**: `/p-verificar-dev` para validar codigo, autoverificar con el browser de Cursor, y guiar el checklist contigo.

Si hay propiedades pendientes, **lista las claves** que el usuario debe configurar.

## Errores comunes y como manejarlos

- **`npm run deploy:dev` falla con "Apps Script API not enabled"** → guia a `script.google.com/home/usersettings`.
- **`npm run deploy:dev` falla con "deployment not found"** → el `deploymentId` guardado en `environments.json` ya no existe en Apps Script (puede pasar si el usuario borro el deployment manualmente). Borra el campo `deploymentId` de `environments.json` para el ambiente afectado y vuelve a correr — creara uno nuevo.
- **`node --check` falla** → corrige sintaxis antes de seguir.
- **Plan ambiguo o vacio** → no inventes. Pausa y dile al usuario: "el plan no detalla X. ¿Cual es la decision?". Si es importante, actualiza el plan antes de seguir.
- **`git status` muestra archivos rastreados que deberian ser gitignored** (`environments.json`, `docs/IDS.md`, `node_modules/`) → alerta al usuario, hay un fallo en `.gitignore`.

## Que NO hacer

- **No commitees.** Ningun `git commit`, ni `git add` (excepto si necesitas inspeccionar `git status`). El commit es responsabilidad de `/p-promover-prod`.
- **No hagas `git push` a GitHub.** Eso tambien es de `/p-promover-prod`.
- No corras `deploy:prod` ni `promote` aqui — eso es de `/p-promover-prod`.
- No abras el editor de Apps Script en esta skill — salvo recordarle al usuario que configure Script Properties al final.
- No agregues "mejoras" fuera del plan (refactors, logging extra, manejo de errores para casos no previstos). Si crees que vale la pena, registralo como sugerencia en el cierre, no en el codigo.
- No saltes `node --check`. Es la unica validacion local antes del push a DEV.
- No marques `status: "executed"` si hubo errores no resueltos o si `npm run deploy:dev` fallo.
