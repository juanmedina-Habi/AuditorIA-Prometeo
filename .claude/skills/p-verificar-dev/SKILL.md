---
name: p-verificar-dev
description: Valida el milestone implementado en 4 fases — revision estatica del codigo, verificacion guiada con el usuario en el editor de Apps Script (el usuario ejecuta, el asistente analiza logs y outputs), fix loop si encuentra problemas, y marcar como verificado. Itera con push a Apps Script DEV sin commits intermedios.
---

# /p-verificar-dev

Ejecuta la fase de **verificacion** del loop. **No commitea ni promueve** — solo valida y itera. Si todo pasa, marca el milestone como verificado y queda listo para `/p-promover-prod`.

## Principio importante

**Apps Script no es una web app que se pueda previsualizar.** Vive en `script.google.com` y ejecutar funciones requiere un usuario humano autenticado. Por eso:

- **El asistente** hace revision estatica de codigo (lee diffs), conduce la verificacion (abre el editor, guia el recorrido del checklist), y analiza logs y outputs que el usuario le pega o describe.
- **El usuario** ejecuta funciones en el editor, copia logs, abre Sheets de salida, revisa correos en su bandeja, confirma side-effects.

El asistente NO intenta ejecutar funciones del editor por su cuenta. Cualquier idea de "abrir el browser de Cursor para correr `main()` y leer logs" no funciona en Apps Script — siempre se hace via el usuario.

## Cuando usar

- Despues de `/p-ejecutar-milestone` (codigo en Apps Script DEV, cambios sin commitear).
- El usuario dice: "validemos en dev", "verifica que funcione", "probemoslo", "revisemos".

## Las 4 fases

```
A. Revision estatica    →   B. Verificacion guiada    →   C. Fix loop si falla
   (asistente solo)         (asistente + usuario)         (volver a B)
                                                                │
                                                                ▼
                                                       D. Marcar verificado
                                                          (deploy:dev VALIDADO)
```

## Pre-checks (aborta si falla)

```bash
test -f .planning/state.json
test -f environments.json
```

Lee `.planning/state.json`. Casos:

- **`status` ≠ `executed` y ≠ `verifying`** → segun valor:
  - `planning` / `planned` → "El milestone no esta implementado. Corre `/p-ejecutar-milestone` primero."
  - `executing` → "La implementacion no termino. Termina `/p-ejecutar-milestone`."
  - `promoted` / `closed` → "Milestone cerrado. Para re-validar, replanea o trata como debug."
- **`status` = `verifying`** → estamos retomando o iterando, eso es normal con esta skill.

Verifica `dev.scriptId` y el plan: `docs/milestones/<activeMilestone>-plan.md`.

**Nota sobre cambios sin commitear**: es ESPERADO que haya cambios pendientes. NO obligues a commitear.

## Plan que anuncias al usuario

> Voy a verificar el milestone **`<milestone>`** en 4 fases:
>
> 1. **Revision estatica** — leo el codigo recien escrito y lo contrasto contra el plan, el PRD y las reglas de CLAUDE.md. Lo hago yo solo.
> 2. **Verificacion guiada contigo** — abro el editor de Apps Script DEV en tu navegador. Tu ejecutas las funciones y me pegas los logs; yo los analizo. Recorremos paso a paso el checklist del plan: para cada item te digo que hacer, tu lo haces, me reportas resultado.
> 3. **Fix loop** — si la revision estatica encuentra algo, o tu reportas un fallo durante la verificacion, planeo el fix, lo implemento, subo a DEV y volvemos a verificar el item.
> 4. **Marcar como verificado** — registro un deployment versionado en DEV (`deploy:dev VALIDADO`), sincronizo `docs/IDS.md`, dejo el milestone listo para `/p-promover-prod`.
>
> **No commiteo nada en esta skill** — los cambios se acumulan y el commit se hace en `/p-promover-prod`.
>
> ¿Procedo?

Solo continua si aprueba.

## Fase A — Revision estatica del codigo

### A.1 Marcar inicio

```json
{ "status": "verifying", "lastUpdated": "<ISO now>" }
```

### A.2 Leer cambios pendientes

```bash
git status --short
git diff
```

Para cada archivo modificado o nuevo, revisa contra:

**1. Reglas de CLAUDE.md:**
- ¿Hay API keys / tokens hardcodeados? (deben venir de `PropertiesService`)
- ¿Hay archivo gigante con responsabilidades mezcladas?
- ¿Hay funciones que se nombran o organizan distinto a lo que dice el plan?

**2. Plan del milestone:**
- ¿Estan todos los archivos del plan implementados?
- ¿Falta algo de la lista de pasos?
- ¿Los nombres de funciones / parametros corresponden?

**3. PRD:**
- ¿La logica refleja el alcance del milestone?
- ¿Hay algo que se salio del scope?

**4. Buenas practicas Apps Script:**
- Triggers en funcion `installTriggers()` separada (no instalados en `main()`).
- Manejo de errores minimo en limites externos (`UrlFetchApp`, `SpreadsheetApp.openById`, etc.).
- Logs en `Logger.log()` con info util para debugging futuro.
- Sin `console.log` (en Apps Script V8 funciona, pero la convencion es `Logger.log`).
- Sin loops con llamadas a `SpreadsheetApp` repetidas (`getRange().getValue()` adentro del loop) — preferir batch.

**5. Sintaxis y manifest:**

```bash
for f in $(git diff --name-only -- '*.js' '*.gs'); do node --check "$f"; done
```

Verifica `appsscript.json` valido:

```bash
node -e "JSON.parse(require('fs').readFileSync('appsscript.json','utf8'))"
```

### A.3 Auditoria de seguridad con habi-security-sentinel

Despues de la revision manual, **invoca obligatoriamente la skill `habi-security-sentinel`** (de Victor Pinzon, Ciberseguridad Habi) sobre el diff acumulado del milestone. Esta skill corre 7 familias de checks: secretos hardcodeados, OWASP injection, problemas de auth, XPIA / prompt injection, OWASP LLM, politicas internas de Habi (cedulas, cuentas, prefijos `HABI_`), runtime web.

Como invocarla:

1. Genera el diff completo del milestone:

   ```bash
   git diff > /tmp/prometeo-milestone-diff.patch
   ```

2. Invoca la skill `habi-security-sentinel` pasandole el contenido del diff. En este chat, basta con decirle algo como:

   > "Habi-security-sentinel: revisa este diff para seguridad. Es un milestone de un proyecto Prometeo (Apps Script). Reporta verdict, conteos por severidad, y lista de hallazgos."
   >
   > <pegar contenido del diff>

3. Lee el reporte que devuelve. La skill ya viene incluida en el repo en `.claude/skills/habi-security-sentinel/` y se carga automaticamente.

**Manejo del verdict**:

- **`pass`** → ningun hallazgo. Sigue a Fase B.
- **`warn`** (mediums/lows/highs sin critical) → revisa con el usuario:
  > La auditoria de seguridad encontro hallazgos no criticos:
  > <lista de hallazgos>
  >
  > Opciones:
  > - Si son falsos positivos (placeholders, ejemplos), confirma y seguimos a Fase B.
  > - Si son reales, los tratamos como problemas → Fase C (Fix loop).
- **`block`** (algun `critical`) → **BLOQUEA y NO avances a Fase B**. Trata cada critical como problema obligatorio a resolver en Fase C antes de continuar. Ejemplos tipicos en Prometeo:
  - API key hardcodeada en codigo (debe ir a PropertiesService).
  - JWT con `alg: none` (raro en Apps Script pero posible si llama JWT externo).
  - Validacion de input ausente en endpoint sensible (web app `doGet`/`doPost`).
  - Cedulas, cuentas Habi o IDs sensibles en `Logger.log()`.
  - Secretos en logs o comentarios.

Si por algun motivo `habi-security-sentinel` no esta disponible (no deberia pasar — viene con el template), avisa al usuario y deja una nota en el cierre que NO se hizo auditoria automatizada. **No fuerces el flujo sin la auditoria si hay codigo nuevo que toca scopes sensibles** (Gmail, Drive, llamadas a APIs externas con `UrlFetchApp`, manejo de datos personales).

### A.4 Decision

- **Sin problemas en sintaxis ni seguridad**: pasa a Fase B.
- **Problemas encontrados**: ve a Fase C (Fix loop) con la lista de problemas. Indica al usuario que problemas encontraste y propon el plan del fix. Los hallazgos de `habi-security-sentinel` con verdict `block` son obligatorios; los `warn` son negociables con el usuario.

## Fase B — Verificacion guiada con el usuario

Aqui el asistente actua como conductor. El usuario ejecuta; el asistente analiza.

### B.1 Abrir el editor de DEV para el usuario

```bash
npm run open:dev
```

Avisa al usuario:

> Te abri el editor de Apps Script DEV en el navegador. Vamos a recorrer juntos el checklist del milestone. Yo no puedo ejecutar funciones por ti — esto requiere que estes logueado con tu cuenta. Pero te voy a guiar paso a paso, tu ejecutas, me pegas los resultados, y yo analizo.
>
> **Recordatorio importante**: en el editor solo vamos a ejecutar y leer. **No edites codigo en el editor.** Si encontramos algo que cambiar, lo hacemos en local desde Cursor y volvemos a desplegar a DEV.

### B.2 Recorrer el checklist item por item

Lee el bloque `## Checklist de verificacion (para /p-verificar-dev)` del plan. Para cada item, sigue esta plantilla:

#### Item de ejecucion manual de funcion

> **Item**: <texto del item>
>
> Pasos para ti:
> 1. En el editor de DEV (ya abierto), selecciona la funcion `<nombre>` en el dropdown de arriba.
> 2. Pulsa **Ejecutar**.
> 3. Si te pide autorizar permisos OAuth, acepta con tu cuenta Habi (solo la primera vez por scope).
> 4. Cuando termine, abajo aparece el panel **"Registro de ejecuciones"**. Copia TODO el contenido y **pegamelo aqui**.
> 5. Tambien dime si la ejecucion completo OK o si salio rojo con error.

Espera. Cuando el usuario pegue el log:

- **Lee el log completo.** Busca:
  - Lineas `Logger.log` esperadas (segun el plan)
  - Errores rojos (`Exception`, `Error`, stack traces)
  - Warnings
  - Tiempos de ejecucion sospechosamente largos (>30s para scripts simples)

- **Validacion de frescura del log** (anti-log-stale): verifica que el log corresponda a una ejecucion reciente comparando el timestamp del log con la hora actual:

  ```bash
  date +"%Y-%m-%d %H:%M"
  ```

  Si el log no tiene timestamp visible, **pidelo al usuario antes de analizarlo**:

  > Para verificar que estoy mirando el log correcto: ¿que timestamp aparece arriba del log en el panel "Registro de ejecuciones"? Tambien dime la hora actual en tu computador. Si la diferencia es mayor a 5 minutos, ejecuta la funcion de nuevo y mandame el log fresco.

  Si la diferencia es > 10 minutos, no te fies del log — pide ejecucion fresca. Esto previene que un log viejo de una ejecucion exitosa enmascare un bug actual.

- **Analiza con transparencia**. Reporta al usuario tu razonamiento, no solo el veredicto:
  > Veo el log. Lo que detecto:
  > - <observacion 1: que linea del log, que valor, por que importa>
  > - <observacion 2>
  >
  > Razonamiento: <por que esto significa pasa o falla, contra que parte del plan/PRD lo estas comparando>
  >
  > Veredicto: <pasa ✓ / falla ✗>
  >
  > Si ves algo en el log que yo no mencione y crees que es relevante, dimelo — puedo estar pasando por alto algo.

  Este formato da al usuario la oportunidad de cuestionar el analisis (mitiga LLM05: el asistente puede equivocarse interpretando outputs).

#### Item con side-effects observables (Sheet, correo)

> **Item**: <texto del item>
>
> Pasos para ti:
> 1. <Ejecutar la funcion, como arriba>
> 2. Una vez termine, abre <URL del Sheet de salida / la hoja `<X>`> y revisa que veas:
>    - En la celda `<Y>` debe aparecer `<valor esperado>`.
>    - En la fila `<Z>` debe haber `<contenido>`.
> 3. <Si aplica> Revisa tu bandeja de `<recipient>` en Gmail; debe llegar un correo con asunto `<asunto>`. Confirma que llego y que el contenido se ve correcto.
> 4. Dime "ok" si todo cuadra, o pegame screenshot / descripcion de lo que ves si algo se ve raro.

Cuando responda, analiza:
- Si confirmo OK → item pasa.
- Si reporto algo raro → puede ser bug en codigo o configuracion (Script Properties con valor de prueba que no aplica, formato de fecha, zona horaria, etc.). Ve a Fase C.

#### Item de trigger time-driven

> **Item**: <texto del item>
>
> Dos opciones para validar:
>
> **Opcion A — Validacion inmediata (recomendada)**: ejecuta la funcion subyacente `<nombre>` directamente desde el editor (igual que un item de ejecucion manual). Esto simula lo que el trigger hara cuando se dispare.
>
> **Opcion B — Validacion del trigger en su horario natural**: ejecuta `installTriggers()` para instalar el trigger en DEV, espera al horario natural (ej. 07:00), y vuelve a revisar logs.
>
> ¿Cual prefieres? Para el primer milestone, recomiendo A — es mas rapido.

Si elige A: mismo flujo de ejecucion manual.

Si elige B: 
- Le pides que ejecute `installTriggers()`.
- Marcas el item como "pending — esperar horario natural" en state.json y terminas la skill, dejandolo continuar despues.

### B.3 Decision al terminar el checklist

- **Todos los items pasan**: ve a Fase D.
- **Algun item fallo**: ve a Fase C con la info especifica de lo que fallo.

## Fase C — Fix loop

Cuando A reporta problemas, o B reporta fallas en algun item, ejecutas un mini-ciclo de fix.

### C.1 Reportar problema y proponer fix

> 🔧 Encontre un problema:
>
> **Sintoma**: <que vi en el log / que reportaste tu>
> **Causa probable**: <hipotesis basada en el codigo + el log>
> **Plan del fix**:
> 1. ...
> 2. ...
> **Archivos a modificar**: <lista>
>
> ¿Apruebas el fix o ajustamos?

Espera aprobacion.

### C.2 Implementar el fix

Aplica los cambios. Misma logica que `/p-ejecutar-milestone`:
- Edit/Write sobre los archivos.
- `node --check` por archivo modificado.
- Sin commits, sin push a GitHub.

### C.3 Subir a Apps Script DEV

```bash
npm run deploy:dev
```

(reutiliza el deploymentId estable; no genera version nueva — solo actualiza el codigo en DEV).

### C.4 Documentar el fix en el plan

Agrega entrada en `docs/milestones/<milestone>-plan.md` al final, bajo `## Fixes durante verificacion`:

```markdown
## Fixes durante verificacion

- **<YYYY-MM-DD HH:MM>**: <sintoma>. Causa: <causa>. Fix: <descripcion> en `<archivo>`.
```

### C.5 Volver al item fallido

Pidele al usuario que vuelva a ejecutar el item que fallo, ahora con el codigo corregido:

> Aplique el fix y volvi a subir a DEV. Vuelve a ejecutar `<funcion>` y pegame el log para confirmar.

Si despues de 3 ciclos de fix el mismo item sigue fallando, pausa y replantea con el usuario:

> Llevo 3 intentos en este problema. Probablemente mi modelo del bug esta mal. ¿Hablamos del sintoma con mas detalle antes de seguir intentando?

## Fase D — Marcar como verificado

### D.1 Crear deployment versionado en DEV

Hasta ahora todos los pushes a DEV han sido sin cambio de descripcion. Ahora que esta validado, crea un deployment marcado como VALIDADO:

Construye descripcion sugerida del deployment:

```
v<version> - <milestone> - VALIDADO - <YYYY-MM-DD HH:MM>
```

(donde `<version>` es la version objetivo que tendra en PROD: `v<currentMilestoneNumber + 1>.0` si es milestone)

Pregunta al usuario:

> Voy a marcar el deployment de DEV como VALIDADO con esta descripcion:
> > `<descripcion sugerida>`
>
> ¿La uso?

Ejecuta:

```bash
npm run deploy:dev -- --desc "<descripcion final>"
```

Esto actualiza `environments.json` con la nueva descripcion (mismo `dev.deploymentId` estable).

### D.2 Sincronizar docs/IDS.md

Lee `environments.json` y reescribe `docs/IDS.md` (gitignored) con la tabla de IDs actualizada.

### D.3 Actualizar estado

```json
{
  "status": "verified",
  "pendingReleaseType": "milestone",
  "verifiedAt": "<ISO now>",
  "lastUpdated": "<ISO now>"
}
```

### D.4 Cierre

> Verificacion de `<milestone>` completa ✓
>
> **Fase A — Revision estatica**: paso ✓
> **Fase B — Verificacion guiada contigo**: todos los items del checklist pasan ✓
> **Fixes durante verificacion**: <n> (registrados en el plan)
> **Deployment DEV**: marcado como VALIDADO con descripcion `<descripcion>`
> **docs/IDS.md**: sincronizado
>
> **Cambios sin commitear**: visibles en el panel Source Control de Cursor.
>
> Siguiente paso: `/p-promover-prod` cuando estes listo para mover este milestone a produccion (sera **v<X.0>**). Esa skill hace el commit unico, lo sube a GitHub (`dev` y `main`) y despliega a Apps Script PROD.

## Errores comunes y como manejarlos

- **Autorizacion OAuth pendiente** en la primera ejecucion → el usuario debe aprobar en el dialogo del editor. Es normal, no es error.
- **Trigger no se ejecuta en horario esperado** → revisar `timeZone` en `appsscript.json` (`"America/Bogota"`).
- **`PropertiesService` retorna null** → propiedad no configurada en DEV. Pausa, recuerda al usuario configurarla en Settings, retoma.
- **Logs vacios despues de ejecutar** → el panel "Registro de ejecuciones" puede estar cerrado. Guialo a abrirlo (icono abajo izquierda).
- **Usuario reporta "no entiendo el log"** → ofrece interpretarlo si lo pega completo. No le pidas que adivine.
- **Fix loop entra en circulo** (mismo sintoma despues de 3 intentos) → replantear con el usuario.

## Autonomia del usuario

La verificacion guiada es **un acompanamiento, no un automatismo obligatorio**. El usuario tiene autoridad para:

- **Saltar items del checklist** que considere irrelevantes (ej. "este item ya lo probe ayer manualmente, marcalo como pasa sin re-ejecutar").
- **Detener la skill en cualquier momento** sin tener que justificar.
- **Cuestionar el veredicto** del asistente. Si el usuario dice "no estoy de acuerdo con tu interpretacion del log", el asistente debe re-leer y explicar mejor, no insistir.
- **Pedir saltarse la autorizacion OAuth** si encuentra que la skill pide permisos que no esperaba — en ese caso, parar y revisar contra el plan que scopes realmente se necesitan.

Si el usuario decide saltarse algo, registralo en el cierre:

> Verificacion completa. **Items saltados a peticion del usuario**: `<lista>`. Estos items NO fueron validados en esta corrida.

Esto previene que el asistente induzca "consentimiento por agotamiento" al usuario.

## Que NO hacer

- **No intentes ejecutar funciones de Apps Script por tu cuenta** (con herramientas de browser o lo que sea). No funciona; siempre es el usuario.
- **No commitees**. Esto es responsabilidad de `/p-promover-prod`.
- **No hagas `git push` a GitHub.** Tambien de `/p-promover-prod`.
- **No despliegues a PROD ni corras `npm run promote`.** Esta skill solo toca DEV.
- **No edites codigo en el editor web.** Si el usuario reporta que edito ahi, reorientalo: el cambio se hace en local y vuelve a `npm run deploy:dev`.
- **No marques `status: "verified"` si algun item del checklist no paso.**
- **No saltes la verificacion guiada con el usuario.** La revision estatica (A) es complemento, no reemplazo de la validacion real con la ejecucion.
- **No instales triggers automaticamente.** `installTriggers()` se ejecuta manualmente.
- **No interpretes logs sin que el usuario te los pegue completos.** Pedir el log entero es mejor que asumir.
