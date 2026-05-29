---
name: p-arreglo-rapido
description: Ejecuta un cambio pequeno end-to-end (plan inline + ejecutar + verificar en DEV) y deja todo listo para que el usuario corra /p-promover-prod manualmente. Solo aplica sobre milestones ya promovidos a PROD. Aborta y redirige a /p-planear-milestone si detecta que el cambio es demasiado grande. Aplica versionado decimal: cada quick-fix promovido incrementa el minor (v2.3 -> v2.4).
---

# /p-arreglo-rapido

Atajo del loop por milestone para **cambios pequenos** sobre algo que ya esta en PROD. Hace plan inline + ejecutar + verificar en una sola corrida, sin pausas entre fases. **Nunca promueve sola** — siempre termina pidiendo al usuario que corra `/p-promover-prod` explicitamente.

## Cuando usar

Casos validos:
- Cambiar un destinatario de correo, un titulo de columna, un formato de fecha.
- Corregir un typo en un mensaje.
- Ajustar un umbral numerico, un filtro existente.
- Mover una constante hardcodeada a Script Properties.
- Pequeno fix sobre operacion en PROD que no requiere debugging profundo.

Casos NO validos (redirige a `/p-planear-milestone`):
- Funcionalidad nueva.
- Cambios que requieren un scope OAuth nuevo.
- Cambios que requieren Script Properties nuevas.
- Cambios que crean archivos nuevos (mas alla de helper trivial).
- Cambios en mas de 3 archivos.
- Cambios en triggers (frecuencia, evento, instalacion).
- Cambios en la estructura de datos compartida (columnas de hojas, esquema de inputs/outputs).

Si el usuario describe algo que cae en "no validos", la skill aborta y le dice:

> Lo que describes se ve como funcionalidad nueva, no como ajuste. Te recomiendo correr `/p-planear-milestone` para tratarlo como un milestone — sera **v<next_major>.0** en el historial.

## Auto-check ligero de version del template

Antes de los pre-checks, ejecuta este check no bloqueante (1 vez por sesion):

```bash
if git remote get-url template >/dev/null 2>&1; then
  git fetch template --quiet 2>/dev/null
  LOCAL_VER=$(cat TEMPLATE_VERSION 2>/dev/null | tr -d '[:space:]')
  REMOTE_VER=$(git show template/main:TEMPLATE_VERSION 2>/dev/null | tr -d '[:space:]')
  if [ -n "$REMOTE_VER" ] && [ -n "$LOCAL_VER" ] && [ "$LOCAL_VER" != "$REMOTE_VER" ]; then
    echo "AVISO_TEMPLATE: local=v$LOCAL_VER remoto=v$REMOTE_VER"
  fi
fi
```

Si detectas update disponible, avisa al usuario una sola vez al inicio (no interrumpas el flow):

> 💡 Aviso: el template Prometeo tiene una version mas nueva disponible (v<remoto>; tu estas en v<local>). Considera correr `/p-actualizar-template` despues de promover este fix.

Sigue con el flujo normal.

## Pre-checks (aborta si falla)

```bash
test -f .planning/state.json
test -f environments.json
```

Lee `.planning/state.json`. **Solo continua si**:

- `currentMilestoneNumber >= 1` — debe haber al menos un milestone en PROD. Si vale 0:
  > Aun no hay nada en PROD. /p-arreglo-rapido solo aplica como ajuste sobre algo ya promovido. Empieza con `/p-planear-milestone` para construir M1.
- `status` ∈ {`promoted`, `closed`} — no permite quick-fix sobre un milestone en `verified` (debe promoverse o cancelarse primero). Si el status es otro:
  > Hay un milestone activo en estado `<status>`. Termina `/p-promover-prod` o cancela antes de hacer un quick-fix.

Verifica repo limpio:

```bash
git status --porcelain
```

Si hay cambios → "Hay cambios sin commitear. Resuelvelos antes de un quick-fix."

Lee `dev.scriptId`. Si no esta configurado → dirige a `/p-config-appsscript`.

## Plan que anuncias al usuario

> Voy a hacer un quick-fix sobre **v<current_version>**. El flujo es:
>
> 1. Te pido que describas el cambio en 1-2 frases.
> 2. Verifico que el cambio es lo suficientemente pequeno para quick-fix (sin scopes nuevos, sin archivos nuevos, < 3 archivos modificados).
> 3. Te propongo un mini-plan rapido. Confirmas.
> 4. Implemento el cambio.
> 5. Subo a Apps Script DEV con `npm run deploy:dev` (mismo deploymentId, sin commit).
> 6. Reviso el codigo y autoverificacion con browser de Cursor.
> 7. **PAUSO** — te muestro el diff completo, te invito a revisarlo en Source Control de Cursor, y te paso la pelota para que tu corras `/p-promover-prod` cuando estes seguro.
>
> La version que se va a asignar cuando promuevas sera: **v<current_major>.<current_minor + 1>**.
>
> ¿Procedo?

Solo continua si aprueba.

## Pasos detallados

### 1. Capturar la descripcion del cambio

Pide:

> ¿Que quieres ajustar? Describelo en 1-2 frases. Ejemplos:
> - "Cambia el destinatario del reporte de auditoria de test@habi.co a calidad@habi.co"
> - "El titulo del correo dice 'Reporte Diaro' (typo), debe ser 'Reporte Diario'"
> - "El umbral de alerta de invasion esta en 15 dias, ponlo en 10"

### 2. Detector de complejidad — decide si redirige

Lee la descripcion del usuario y comparala con la base de codigo. Decide si encaja en quick-fix.

**Si encaja como quick-fix**: anuncia lo que vas a hacer y procede al paso 3.

**Si NO encaja** (cualquiera de los criterios "no validos" del inicio): aborta. Formato:

> ⚠️ Esto se sale de quick-fix.
>
> Razon: <texto especifico, ej. "requiere un scope OAuth nuevo (Gmail.send) que el manifest no tiene">
>
> Te recomiendo correr **`/p-planear-milestone`** y tratarlo como un milestone (sera **v<next_major>.0**). El loop completo (plan + ejecutar + verificar + promover) te da las pausas necesarias para algo asi.
>
> Si crees que se puede achicar a un quick-fix valido, reformulalo. ¿Como prefieres seguir?

No fuerces quick-fix si dudas. Es mejor escalar a milestone que romper algo en PROD.

### 3. Mini-plan inline

Propon un mini-plan al usuario en el chat (no escribes archivo todavia):

```
Mini-plan:
- Archivo `Gmail.js`: cambiar el valor de `RECIPIENT` en linea 12 de `test@habi.co` a `calidad@habi.co`.
- Sin cambios en scopes, properties, triggers.
- Archivos a modificar: 1.

Si esto es lo que querias, digo "ok" y procedo.
```

Espera aprobacion. Si pide ajustar, itera.

### 4. Marcar inicio en state.json

Actualiza:

```json
{
  "status": "quick-fixing",
  "lastUpdated": "<ISO now>"
}
```

### 5. Implementar

Aplica los cambios con Edit/Write sobre los archivos del mini-plan.

Valida sintaxis:

```bash
for f in <archivos modificados>; do node --check "$f"; done
```

Si falla, arregla antes de seguir.

### 6. Subir a Apps Script DEV

```bash
npm run deploy:dev
```

(reutiliza el deploymentId estable de DEV; no necesita descripcion nueva — sigue siendo el mismo deployment, solo se actualiza el codigo).

Si falla → diagnostica y muestra al usuario.

### 7. Fase A — Revision estatica + auditoria de seguridad

Mismo procedimiento que `/p-verificar-dev` Fase A, pero acotado al diff de los archivos modificados.

**A.1 Revision manual** — chequea:
- ¿API keys o secretos hardcodeados? (no debe haber)
- ¿Concuerda con el mini-plan?
- ¿Sintaxis valida (`node --check` por archivo modificado)?
- ¿`appsscript.json` valido si lo tocaste?
- ¿No introdujiste accidentalmente algo que saldria de los criterios de eligibilidad de quick-fix?

**A.2 Auditoria de seguridad con `habi-security-sentinel`** — obligatoria igual que en `/p-verificar-dev`:

```bash
git diff > /tmp/prometeo-fix-diff.patch
```

Invoca la skill `habi-security-sentinel` pasandole el diff del fix con el mensaje:

> "Habi-security-sentinel: revisa este diff de un quick-fix de Prometeo. Reporta verdict y hallazgos."
>
> <pegar contenido del diff>

Manejo del verdict:
- **`pass`** → sigue a Fase B.
- **`warn`** → revisa con el usuario; si son falsos positivos, continua; si reales, vuelve al sub-loop de fix.
- **`block`** (critical) → BLOQUEA. Vuelve al paso 5 para corregir. Si despues de 3 iteraciones sigue bloqueado, redirige a `/p-planear-milestone` (probablemente el cambio es mas grande de lo que parecia).
- ¿`appsscript.json` valido si lo tocaste?
- ¿No introdujiste accidentalmente algo que saldria de los criterios de eligibilidad de quick-fix?

Si falla → propone fix inline y vuelve a paso 5.

### 8. Fase B — Verificacion guiada con el usuario

**Apps Script no permite ejecutar funciones sin un usuario autenticado.** El asistente abre el editor; el usuario ejecuta y reporta; el asistente analiza.

8.1 — Abre el editor:

```bash
npm run open:dev
```

8.2 — Identifica la funcion principal afectada por el cambio (suele ser obvio del mini-plan).

8.3 — Pide al usuario:

> Te abri el editor de DEV. Para confirmar que el cambio funciona:
>
> 1. Selecciona la funcion `<nombre>` en el dropdown de arriba.
> 2. Pulsa Ejecutar.
> 3. Copia todo el contenido del panel "Registro de ejecuciones" y pegamelo aqui.
> 4. <Si el cambio toca outputs observables — un Sheet, un correo —> Tambien abre <URL> y dime que ves en <celda/fila>, o revisa tu bandeja en <recipient> por el correo con asunto `<X>`.

8.4 — Cuando el usuario pega el log o reporta lo que ve, analizalo:

- Busca errores rojos (`Exception`, stack traces).
- Verifica que el cambio se refleja en el output (la celda con el nuevo valor, el correo con el destinatario nuevo, etc.).
- Reporta veredicto al usuario:
  > Veo el log. <observaciones>. Veredicto: pasa ✓ / falla ✗ porque `<razon>`.

8.5 — Decision:

- **Pasa**: ve al paso 9.
- **Falla**: vuelve al paso 5 con el fix (sub-loop interno).

**Limite del sub-loop**: maximo 3 intentos. Si despues de 3 intentos el problema persiste, aborta:

> Llevo 3 intentos en este fix y el problema no se resuelve. Esto sugiere que el cambio es mas complejo de lo que se ve. Te recomiendo:
> 1. Cancelar el quick-fix (los cambios quedan en el working dir, los puedes descartar con `git restore`).
> 2. Tratar el problema como milestone con `/p-planear-milestone`, o como debug serio con `/p-diagnosticar-error`.

### 9. Escribir registro del fix

Calcula la version objetivo: `v<currentMilestoneNumber>.<currentFixNumber + 1>` (ej. v2.4 si state esta en 2.3).

Crea `docs/fixes/v<X.Y>-fix.md` con esta estructura:

```markdown
# Quick-fix v<X.Y>

> Generado por `/p-arreglo-rapido` el <YYYY-MM-DD HH:MM>. Pendiente de promover a PROD.

## Descripcion (del usuario)

<lo que el usuario dijo>

## Mini-plan ejecutado

- `<archivo>`: <cambio>
- ...

## Eligibilidad verificada

- [x] Sin scopes OAuth nuevos
- [x] Sin Script Properties nuevas
- [x] Sin archivos nuevos
- [x] <= 3 archivos modificados (modifico: <N>)
- [x] Sin cambios en triggers
- [x] Fase A — revision estatica pasa
- [x] Fase B — autoverificacion en DEV pasa

## Diff resumen

(diff abreviado, max 30 lineas, generado de `git diff --stat`)

## Autoverificacion

- Editor DEV: <que se ejecuto, que logs salieron>
- Artefactos inspeccionados: <Sheet X, Web App Y si aplica>

## Promocion

Pendiente. Cuando el usuario corra `/p-promover-prod`:
- Tag git: `v<X.Y>`
- Commit: `fix(v<X.Y>): <descripcion corta>`
- Deployment PROD con descripcion `v<X.Y> - <descripcion> - <fecha>`
```

Crea la carpeta `docs/fixes/` si no existe.

### 10. Marcar en state.json el tipo de release pendiente

```json
{
  "status": "fix-verified",
  "pendingReleaseType": "fix",
  "pendingFixDescription": "<descripcion corta>",
  "pendingFixVersion": "<X.Y>",
  "lastUpdated": "<ISO now>"
}
```

`/p-promover-prod` leera estos campos para hacer el versionado correcto.

### 11. Pausa muy explicita — fin de la skill

> ✅ Quick-fix listo en DEV.
>
> **Resumen del cambio**:
> - Archivos modificados: `<lista>`
> - Diff: `<stat>`
> - Autoverificacion: paso ✓
> - Registro: `docs/fixes/v<X.Y>-fix.md`
>
> **Version asignada cuando promuevas: v<X.Y>**
>
> ---
>
> 🛑 **Pausa para tu revision.**
>
> Tu siguiente paso (manual):
>
> 1. **Revisa el diff completo** en el panel **Source Control** de Cursor (icono de rama en la barra lateral izquierda). Tomate el tiempo que necesites.
> 2. Si todo se ve bien, **corre `/p-promover-prod`** en este chat.
> 3. Si algo se ve raro, dime que ajustar — entramos a otro fix loop — o cancela con `git restore .` para descartar los cambios.
>
> **No voy a invocar `/p-promover-prod` por ti.** El gatillo es tuyo. Asi te aseguras de que lo que esta a punto de tocar PROD lo viste con tus propios ojos.

Termina la skill aqui. **No promuevas. No commitees.**

## Errores comunes y como manejarlos

- **Usuario invoca `/p-arreglo-rapido` sin nada en PROD** → pre-check aborta. Dirige a `/p-planear-milestone`.
- **Cambio se ve trivial pero al implementar resulta que necesita un scope nuevo** → en paso 7 (Fase A) lo detectas. Abortas:
  > Al implementar descubri que necesitamos el scope OAuth `<scope>` que el manifest no tiene. Eso lo saca de quick-fix. Voy a revertir los cambios y te recomiendo `/p-planear-milestone` para tratarlo como milestone. Confirma para revertir.
  Si confirma:
  ```bash
  git restore .
  ```
- **Usuario olvida correr `/p-promover-prod` y desaparece** → no hay problema. Los cambios siguen en working dir, listos. La proxima vez que vuelva los puede revisar o descartar.
- **Usuario quiere modificar el quick-fix despues de la pausa** → vuelve al paso 3 con la nueva instruccion. Re-deploy a DEV. Re-verifica. Sustituye el archivo `docs/fixes/v<X.Y>-fix.md` con la version final.

## Que NO hacer

- **No promuevas.** /p-arreglo-rapido termina antes de PROD. Siempre.
- **No commitees.** El commit lo hace `/p-promover-prod`.
- **No fuerces eligibilidad.** Si el cambio se sale de los criterios, redirige a `/p-planear-milestone`. Mejor escalar que romper PROD.
- **No saltes Fase A o B.** Aunque sea pequeno, autoverifica. Es lo que justifica la skill.
- **No marques `status: "promoted"`.** Esa transicion la hace solo `/p-promover-prod`.
- **No reutilices la misma version** si el usuario decide hacer dos quick-fixes seguidos sin promover el primero. Verifica al inicio que `pendingReleaseType` no este seteado; si lo esta, dile al usuario que termine el ciclo actual antes.
