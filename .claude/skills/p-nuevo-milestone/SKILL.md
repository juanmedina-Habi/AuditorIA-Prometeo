---
name: p-nuevo-milestone
description: Cierra el milestone activo (que ya fue promovido a PROD) y arranca el siguiente leyendo el PRD. Actualiza .planning/state.json con el cambio de milestone activo y agrega entrada al historial. Apunta al usuario a /p-planear-milestone.
---

# /p-nuevo-milestone

Transicion entre milestones. **Cierra el activo y arranca el siguiente.** No replanea ni codifica — solo gestiona el estado del proyecto.

## Cuando usar

- Despues de `/p-promover-prod` exitoso del milestone activo.
- El usuario dice: "siguiente milestone", "cerremos este y vamos al proximo", "ya terminamos M1, sigue M2".

## Pre-checks (aborta si falla)

```bash
test -f .planning/state.json
test -f docs/PRD.md
```

Lee `.planning/state.json`. Casos:

- **`status` ≠ `promoted` y ≠ `closed`** → "El milestone activo no esta en PROD todavia. No se cierra un milestone que no llego a produccion. Sigue el loop con `/p-verificar-dev` y `/p-promover-prod`."
- **`activeMilestone` vacio** → "No hay milestone activo. Probablemente este es el primer milestone del proyecto. Corre `/p-planear-milestone` y especifica con cual arrancar."

## Plan que anuncias al usuario

> Voy a cerrar **`<milestone>`** y arrancar el siguiente. El flujo es:
> 1. Confirmar el cierre del milestone activo (ya esta en PROD).
> 2. Leer el PRD y listar los milestones pendientes.
> 3. Proponer el siguiente segun el orden del PRD.
> 4. Tu confirmas o eliges otro.
> 5. Actualizo `.planning/state.json`: el actual pasa a historial, el nuevo queda como activo.
>
> Esto NO planea el nuevo milestone — eso lo haces despues con `/p-planear-milestone`.
>
> ¿Procedo?

## Pasos detallados

### 1. Confirmar cierre del milestone activo

Muestra resumen del milestone que se cierra (lee de state.json + environments.json + plan):

> Cerrando **`<milestone>`**:
>
> - Objetivo: `<del plan>`
> - Deployment DEV: `<dev.deploymentId>`
> - Deployment PROD: `<prod.deploymentId>` — `<descripcion>`
> - Tag git: `<TAG si existe en history>`
> - Promovido el: `<promotedAt>`
>
> ¿Cerramos? Si dices que si, ya no se vuelve a marcar como activo (aunque puedes seguir trabajando en bugs sobre este milestone con `/p-diagnosticar-error`).

Espera confirmacion.

### 2. Listar milestones pendientes del PRD

Lee `docs/PRD.md`. Busca la seccion de milestones (tipicamente seccion 6 o tabla `## Milestones`).

Extrae todos los milestones. Filtra los que ya estan en `history` de state.json (los cerrados). Los restantes son candidatos.

Si no hay mas milestones:

> Felicitaciones — este era el ultimo milestone del proyecto.
>
> **Acciones pendientes**:
> 1. Medir el KPI definido en la seccion 3 del PRD y comparar con la meta.
> 2. Actualizar `docs/PRD.md` con el resultado final del KPI.
> 3. Avisar a stakeholders.
> 4. Si quieres extender el proyecto, agrega nuevos milestones al PRD y corre `/p-planear-milestone`.
>
> Marco el proyecto como completo en state.json. ¿Confirmas?

Si confirma:

```json
{
  "activeMilestone": null,
  "status": "project-complete",
  "completedAt": "<ISO now>",
  "history": [...]
}
```

Cierra la skill.

### 3. Proponer el siguiente milestone

Si hay milestones pendientes:

> Milestones pendientes segun PRD:
> - `M2`: `<titulo M2>` ← siguiente segun orden
> - `M3`: `<titulo M3>`
> - `M4`: `<titulo M4>`
>
> Recomiendo arrancar con **M2** (orden del PRD). ¿Vamos con M2, o prefieres otro?

Espera respuesta. Si elige uno fuera de orden, alerta:

> Estas eligiendo `<X>` antes que `<Y>`, que aparece primero en el PRD. ¿Tienes razon para invertir el orden? (a veces tiene sentido — pero confirmemos).

Si responde con razon valida, continua. Sino, sugiere mantener el orden.

### 4. Actualizar state.json

Actualiza `.planning/state.json`:

```json
{
  "activeMilestone": "<nuevo milestone>",
  "status": "not-started",
  "previousMilestone": "<milestone que se cerro>",
  "lastUpdated": "<ISO now>",
  "history": [
    ...entradas previas,
    {
      "milestone": "<milestone cerrado>",
      "closedAt": "<YYYY-MM-DD>",
      "deploymentIdDev": "<dev.deploymentId>",
      "deploymentIdProd": "<prod.deploymentId>",
      "tag": "<TAG>",
      "objetivo": "<del plan>"
    }
  ]
}
```

### 5. Commit del cambio de estado

```bash
git add .planning/state.json
git commit -m "chore: cerrar <milestone anterior> y arrancar <nuevo milestone>"
```

Pregunta si hace push.

### 6. Cierre

Lee `currentVersion` de state.json para mostrar el contexto:

> Cambio de milestone listo.
>
> - Cerrado: **`<milestone anterior>`** — version **v<X.Y>** en PROD
> - Activo: **`<nuevo milestone>`** — `<titulo>` (sera **v<X+1>.0** cuando se promueva)
>
> Siguiente paso: `/p-planear-milestone` para arrancar la planeacion del nuevo milestone.
>
> Si en algun momento necesitas hacer un ajuste pequeno sobre lo que ya esta en PROD sin meterlo a este milestone, recuerda que `/p-arreglo-rapido` esta disponible (sera v<X>.<Y+1>).

## Errores comunes

- **PRD sin seccion de milestones identificable** → pregunta al usuario que liste los milestones manualmente y agrega esa lista al PRD para futuras invocaciones.
- **state.json corrupto o sin history** → reconstruye desde `environments.json` (que tiene el ultimo deploymentId de prod) y de los tags de git (`git tag --list`).
- **Usuario quiere "saltarse" milestones** → ok, pero registra los saltados en history con `closedAt: skipped` para mantener el orden.

## Que NO hacer

- No planees el nuevo milestone aqui. Esa es la responsabilidad de `/p-planear-milestone`.
- No cierres milestones que no estan en PROD. El criterio de cierre es **deployment a PROD exitoso**.
- No borres entradas del `history`. Es el log auditable del proyecto.
- No marques `project-complete` sin confirmacion explicita del usuario.
- No modifiques `docs/PRD.md` desde aqui. Si el usuario quiere agregar milestones nuevos, que lo haga el mismo o con `/p-planear-milestone`.
