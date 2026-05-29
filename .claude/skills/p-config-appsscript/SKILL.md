---
name: p-config-appsscript
description: Crea los proyectos dev y prod en Apps Script, vincula los scriptIds al repo, hace el primer deploy en ambos ambientes y corre un smoke test para validar que todo funciona. Una sola vez por proyecto.
---

# /p-config-appsscript

Crea y vincula los proyectos dev y prod en Apps Script al repo local. **Una sola vez por proyecto.** Si el usuario ya tiene scriptIds reales en `environments.json`, salta a la verificacion y smoke test.

## Cuando usar

- Despues de `/p-config-entorno` (Node, clasp, autenticacion ya listos).
- El usuario dice cosas como: "crea los proyectos en Apps Script", "configura mis ambientes", "vincula el repo a Apps Script", "estoy listo para empezar a construir".
- Cuando `environments.json` no existe o tiene scriptIds con placeholder.

## Audiencia

Usuario **no tecnico**. Espanol claro. Tu rol es ejecutar las acciones; las preguntas son minimas y claras.

## Principio fundamental

**El usuario nunca abre script.google.com a editar.** Si esta skill va bien, los dos proyectos en Apps Script existen pero el usuario nunca tuvo que entrar a crearlos manualmente. El editor web se abre **solo** para el smoke test (ejecutar la funcion `main()` y leer logs).

## Nota sobre dependencias (clasp y supply chain)

Esta skill depende de `@google/clasp` — paquete oficial de Google publicado en npm. Es un eslabon de la cadena de suministro: si `@google/clasp` fuera comprometido (publicacion de version maliciosa, takeover de cuenta del mantenedor en npm), todos los proyectos Prometeo se verian afectados.

Mitigaciones presentes:
- La instalacion de clasp ocurre en `/p-config-entorno` (paso 4), no en esta skill — esta skill ya asume clasp instalado.
- En `/p-config-entorno` la instalacion es `npm install -g @google/clasp` apuntando al nombre oficial; no usamos paquetes con nombres similares.
- Los `environments.json` con IDs reales estan gitignored — un comprometido de clasp no se llevaria automaticamente los IDs via git.

Si en algun momento `@google/clasp` cambia de mantenedor, publica una version con permisos extra, o emite avisos de seguridad, el equipo Prometeo debe actualizar el template (`/p-actualizar-template`) y notificar a los usuarios.

## Pre-checks (aborta si falla alguno)

Antes de empezar verifica:

```bash
command -v clasp && clasp --version
test -f ~/.clasprc.json && echo "clasp autenticado"
test -f package.json && test -f .clasp.json && test -f environments.example.json
git rev-parse --is-inside-work-tree
```

Si algo falla, no improvises:

- `clasp` no esta o no autenticado → dirige al usuario a `/p-config-entorno`.
- Archivos del template faltan → avisa que parece no estar en un repo Prometeo y aborta.
- No es un repo de git → avisa y aborta.

## Plan que anuncias al usuario

> Voy a configurar los dos proyectos de Apps Script vinculados a este repo:
> 1. Detectar el nombre del repo para usarlo como base del nombre de los proyectos.
> 2. Crear el proyecto **DEV** en tu cuenta de Apps Script.
> 3. Crear el proyecto **PROD** en tu cuenta de Apps Script.
> 4. Guardar los IDs en `environments.json` (gitignored).
> 5. Hacer el primer deploy en DEV y PROD.
> 6. Smoke test: abrir DEV, pedirte que ejecutes una funcion de prueba y verificar logs.
> 7. Generar `docs/IDS.md` con los IDs y links a los editores.
>
> Tarda 3-5 minutos. **Importante:** nunca vas a tener que editar codigo en el editor web — todo se hace desde Cursor. El editor solo se usa para el smoke test (ejecutar funcion + ver logs).
>
> Apruebas?

Solo continua si el usuario aprueba.

## Pasos detallados

### 1. Detectar el nombre del repo

```bash
basename "$(git rev-parse --show-toplevel)"
```

Guarda este valor como `REPO_NAME`. Los proyectos se llamaran `<REPO_NAME> - DEV` y `<REPO_NAME> - PROD`.

Si el nombre del repo es generico (ej. `appscript-prometeo`, `prometeo-template`), pregunta al usuario si quiere otro nombre base. Si no, usa el del repo.

### 2. Preparar environments.json

```bash
test -f environments.json || cp environments.example.json environments.json
```

Lee el archivo. Si `dev.scriptId` y `prod.scriptId` ya tienen IDs reales (no empiezan con `PEGA_AQUI`), confirma con el usuario:

> Ya tienes scriptIds configurados:
> - DEV: `<id>...`
> - PROD: `<id>...`
>
> ¿Los uso tal cual o los regenero (eso crea proyectos NUEVOS en Apps Script y descarta los actuales)?

Si decide regenerar, continua. Si decide mantener, salta al paso 5.

### 3. Crear proyecto DEV

```bash
mkdir -p .tmp-appsscript/dev
cd .tmp-appsscript/dev
clasp create --type standalone --title "<REPO_NAME> - DEV" --rootDir .
```

`clasp create` genera un `.clasp.json` en `.tmp-appsscript/dev/` con el scriptId. Capturalo:

```bash
node -e "console.log(require('./.tmp-appsscript/dev/.clasp.json').scriptId)"
```

Guarda ese ID en `environments.json` bajo `dev.scriptId`. Usa Node para escribir el JSON de forma segura:

```bash
node -e "
  const fs = require('fs');
  const env = JSON.parse(fs.readFileSync('environments.json', 'utf8'));
  const id = require('./.tmp-appsscript/dev/.clasp.json').scriptId;
  env.dev.scriptId = id;
  fs.writeFileSync('environments.json', JSON.stringify(env, null, 2) + '\n');
  console.log('dev.scriptId =', id);
"
```

### 4. Crear proyecto PROD

Igual que paso 3 pero con sufijo PROD:

```bash
mkdir -p .tmp-appsscript/prod
cd .tmp-appsscript/prod
clasp create --type standalone --title "<REPO_NAME> - PROD" --rootDir .
```

Captura scriptId y guarda en `environments.json` bajo `prod.scriptId`.

Despues, **limpia los temporales**:

```bash
rm -rf .tmp-appsscript
```

Verifica el estado final de environments.json:

```bash
cat environments.json
```

### 5. Primer deploy en DEV

```bash
npm run deploy:dev -- --desc "Setup inicial"
```

Esto:
- Hace push del codigo del repo al proyecto DEV.
- Crea un deployment con descripcion "Setup inicial".
- Guarda `deploymentId` y `deployedAt` en `environments.json`.

Si falla, captura el error y diagnostica. Causas comunes:
- `scriptId invalido` → algo salio mal en el paso 3.
- `User has not enabled the Apps Script API` → el usuario debe ir a [script.google.com/home/usersettings](https://script.google.com/home/usersettings) y activar la API. Esta es **la unica excepcion** donde el usuario entra al sitio (no al editor). Guialo.

### 6. Primer deploy en PROD

```bash
npm run deploy:prod -- --desc "Setup inicial"
```

Mismo manejo de errores. Si falla, NO continues — el smoke test debe correr sobre un dev funcional.

### 7. Smoke test

Explica al usuario:

> Voy a abrir tu proyecto DEV en el navegador. Quiero que:
> 1. En el editor, busca la funcion `main` arriba (debe estar selecionada por default).
> 2. Pulsa el boton **"Ejecutar"** (icono de play).
> 3. La primera vez te va a pedir autorizar permisos — acepta con tu cuenta de Habi.
> 4. Cuando termine, en el panel de abajo deberias ver: **"Hola desde Apps Script!"**.
> 5. Vuelve a Cursor y dime si lo viste.
>
> **Recuerda: no edites nada en el editor. Solo ejecutar y leer.**

Abre el editor:

```bash
npm run open:dev
```

Espera la respuesta del usuario:

- **Vio el log esperado** → smoke test pasa, continua al paso 8.
- **No lo vio o hubo error** → pide que pegue el error o screenshot. Diagnostica. No avances hasta que pase.

### 8. Generar docs/IDS.md

Lee `environments.json` y escribe `docs/IDS.md` (gitignored). El archivo debe verse asi:

```markdown
# IDs del proyecto

> Generado por `/p-config-appsscript`. Este archivo esta gitignored — no se sube a GitHub.

## Resumen

| Recurso | DEV | PROD |
| --- | --- | --- |
| Script ID | `<dev_script_id>` | `<prod_script_id>` |
| Deployment ID | `<dev_deployment_id>` | `<prod_deployment_id>` |
| Ultima descripcion | `<dev_desc>` | `<prod_desc>` |
| Ultimo deploy | `<dev_deployedAt>` | `<prod_deployedAt>` |

## Links a los editores

> Solo para revisar logs o ejecutar funciones. **No editar codigo en el editor.**

- DEV: https://script.google.com/d/<dev_script_id>/edit
- PROD: https://script.google.com/d/<prod_script_id>/edit

## Repositorio

- `<remote_url_si_existe>`

## Regenerar este archivo

Corre `/p-config-appsscript` de nuevo. Los IDs se sincronizan con `environments.json`.
```

Usa el tool de Write con la ruta `docs/IDS.md`. Crea `docs/` si no existe.

Para el remote URL:

```bash
git config --get remote.origin.url || echo "(sin remoto configurado todavia)"
```

### 9. Crear rama `dev` en GitHub

`/p-promover-prod` espera que la rama `dev` exista en GitHub. La creamos vacia (apuntando al mismo commit de main) para que el primer milestone pueda promover sin friccion.

Verifica si ya existe:

```bash
git ls-remote --heads origin dev | grep -q dev
```

Si no existe:

```bash
git push origin main:refs/heads/dev
```

Verifica que existe ahora:

```bash
git ls-remote --heads origin dev
```

Si el repo no tiene `main` en remoto todavia (caso raro tras clone fresh de template), primero:

```bash
git push -u origin main
```

Si falla por permisos del remoto, da pasos concretos al usuario en lugar de un mensaje generico:

> No puedo hacer push a `origin`. Causas probables y soluciones:
>
> 1. **No tienes permisos de write en el repo**: ve a `https://github.com/<owner>/<repo>/settings/access`. Si la URL te da 404, no eres ni admin ni maintainer; pide acceso al dueno del repo (en el canal `prometeo-ayuda` o a quien te compartio el repo).
> 2. **No autorizaste SSO para este token**: ve a `https://github.com/settings/tokens`, encuentra el token de `gh CLI`, click "Configure SSO" → autoriza para `cristianpalacios-habi` (o la org de tu repo).
> 3. **El `origin` no apunta a tu repo**: corre `git remote -v` para verificar. Si apunta al template plantilla en lugar de tu fork/repo, hay que actualizar el remote.
>
> Cuando resuelvas, vuelve y corre `/p-config-appsscript` de nuevo — la skill es idempotente.

### 10. Inicializar estado del proyecto

Crea `.planning/state.json` con valores iniciales si no existe (`/p-planear-milestone` lo creara si falta, pero hacerlo aqui asegura que los contadores de version arrancan limpios desde el setup):

```bash
mkdir -p .planning
test -f .planning/state.json || cat > .planning/state.json <<'EOF'
{
  "currentVersion": "0.0",
  "currentMilestoneNumber": 0,
  "currentFixNumber": 0,
  "activeMilestone": null,
  "status": "not-started",
  "pendingReleaseType": null,
  "lastUpdated": "<ISO now>",
  "history": []
}
EOF
```

Si `.planning/state.json` ya existe, no lo toques.

### 12. Recordatorio sobre el PRD

Verifica si existe `docs/PRD.md`:

```bash
test -f docs/PRD.md && echo "PRD presente" || echo "PRD ausente"
```

Si no existe, recuerda al usuario:

> No detecte `docs/PRD.md`. Antes de planear el primer milestone, copia tu PRD aprobado al repo siguiendo la seccion 2.3 de la [Guia Prometeo](https://chat.google.com/room/AAQAvHQfwAI?cls=7). Sin PRD, las skills `/p-planear-milestone` y `/p-ejecutar-milestone` no tienen contexto del proyecto.

### 13. Cierre

Resume al usuario:

> Setup completo. Estado actual:
>
> **Apps Script**
> - DEV creado y desplegado: `<dev_script_id>`
> - PROD creado y desplegado: `<prod_script_id>`
> - Smoke test: pasa ✓
>
> **Archivos**
> - `environments.json` actualizado (gitignored)
> - `docs/IDS.md` generado (gitignored)
>
> **Siguientes pasos**
> 1. Si todavia no copiaste tu PRD aprobado al repo, hazlo ahora en `docs/PRD.md`.
> 2. Cuando este listo, corre `/p-planear-milestone` para planear M1.
>
> A partir de aqui, todo el flujo es: planear → ejecutar → verificar → promover. **Nunca tocas el editor web.**

## Errores comunes y como resolverlos

- **`Apps Script API not enabled`** → enviar al usuario a https://script.google.com/home/usersettings y activar la API. Esperar y reintentar.
- **`Error: User has not enabled the Apps Script API.`** durante `clasp create` → mismo fix anterior.
- **`Cannot read property 'scriptId' of undefined`** parseando `.clasp.json` → `clasp create` fallo silenciosamente. Verifica el output del comando anterior.
- **`environments.json` con scriptIds incorrectos** → si paso 3 o 4 fallaron a mitad, el archivo puede tener un dev real pero prod en placeholder. Verifica con `cat environments.json` antes del primer deploy.
- **Smoke test sin logs visibles** → el usuario ejecuto pero el panel de ejecuciones esta cerrado. Guialo a abrirlo (icono "Registro de ejecuciones" abajo a la izquierda).

## Que NO hacer

- No le pidas al usuario que cree los proyectos manualmente en script.google.com. Si `clasp create` falla, diagnostica el error real.
- No commitees `environments.json` ni `docs/IDS.md` — ambos estan en `.gitignore`. Si por error aparecen en `git status` rastreados, avisa al usuario.
- No edites codigo del template durante la skill (Main.js, appsscript.json, etc.). Esos cambios pertenecen a `/p-ejecutar-milestone`.
- No saltes el smoke test. Es la unica garantia de que la cadena local → clasp → Apps Script funciona end-to-end.
- No abras PROD en el smoke test. PROD existe, esta desplegado, pero no se ejecuta nada en el hasta que se promueva un milestone real.
