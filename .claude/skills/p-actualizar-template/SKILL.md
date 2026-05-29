---
name: p-actualizar-template
description: Actualiza la infraestructura del template (skills, CLAUDE.md, .cursorrules, scripts/, docs de workflow) desde el repositorio plantilla original sin tocar el codigo del usuario (Main.js y demas .js) ni su contexto del proyecto (docs/PRD.md, docs/milestones/, etc.). Backup automatico de archivos managed modificados localmente. No commitea — deja los cambios en el working dir para que el usuario los revise.
---

# /p-actualizar-template

Trae actualizaciones del template Prometeo al repo del usuario. **Solo toca infraestructura del template** (managed); el codigo de la automatizacion y los artefactos del proyecto (owned) quedan intactos.

## Configuracion del template

Esta skill apunta al repo plantilla oficial del proyecto Prometeo:

```
https://github.com/cristianpalacios-habi/appscript-prometeo.git
```

Si en el futuro el template se muda a otra URL (ej. una org oficial de Habi), el mantenedor debe actualizar las 3 referencias a esta URL en este archivo (`Pre-checks`, `Pasos detallados / 1. Configurar el remoto del template`, y este header).

## Cuando usar

- El usuario quiere traer mejoras del template al repo de su proyecto.
- El usuario dice: "actualiza las skills", "trae la ultima version del template", "hay updates?", "sincroniza con el template".
- Tras un aviso de auto-check ("hay v0.4 disponible, considera correr `/p-actualizar-template`").

## Audiencia

Usuario **no tecnico**. Habla en espanol claro. Explica que vas a cambiar antes de hacerlo. Pide aprobacion antes de sobrescribir.

## Concepto clave: managed vs owned

| Tipo | Ejemplos | Que pasa al actualizar |
| --- | --- | --- |
| **Managed** (infraestructura del template) | `.claude/skills/**`, `CLAUDE.md`, `.cursorrules`, `docs/WORKFLOW.md`, `docs/PROMPT-INSTALACION.md`, `docs/IDS.example.md`, `scripts/_lib.js`, `scripts/push.js`, `scripts/deploy.js`, `scripts/promote.js`, `scripts/open.js`, `scripts/logs.js`, `appsscript.json` (template), `environments.example.json`, `Main.js` (template), `TEMPLATE_VERSION`, `CHANGELOG.md` | Se actualizan desde el template. Si el usuario los modifico localmente, se hace backup antes. |
| **Owned** (del proyecto del usuario) | `docs/PRD.md`, `docs/milestones/**`, `docs/fixes/**`, `docs/IDS.md`, `environments.json`, `.planning/state.json`, archivos de codigo creados por el usuario (`Sheets.js`, `Gmail.js`, custom), modificaciones al `appsscript.json` y `Main.js` posteriores al setup | **No se tocan.** |
| **Hibrido** | `.gitignore`, `.claspignore`, `package.json` | Auto-merge inteligente: se agregan entradas/scripts nuevos del template, se conservan los del usuario. |

⚠️ **Excepcion sobre `appsscript.json` y `Main.js`**: el template trae versiones iniciales. Si el usuario los modifico (agrego scopes, escribio su entrypoint), **se consideran owned a partir de su primera modificacion** — no se sobrescriben. Como detector: hash del archivo en el commit donde se hizo el setup-inicial. Si es distinto, owned. **En la duda, NO sobrescribas** estos dos archivos.

## Pre-checks (aborta si falla)

```bash
test -d .git
test -f TEMPLATE_VERSION || echo "no-version"
```

- Si no es repo de git → "Esto no parece un repo de git. Esta skill necesita estar en un repo clonado."
- Si no existe `TEMPLATE_VERSION` → asume version "0.0.0" (proyecto creado con version pre-changelog); avisa al usuario.

Verifica conectividad con el remoto:

```bash
git ls-remote https://github.com/cristianpalacios-habi/appscript-prometeo.git HEAD >/dev/null 2>&1
```

Si falla → "No puedo conectar con el repo del template. Revisa tu internet y autenticacion de GitHub."

Verifica que las skills y archivos managed esperados existen (para confirmar que es un repo Prometeo):

```bash
test -d .claude/skills && test -f CLAUDE.md
```

Si falla → "Esto no parece un repo Prometeo (faltan .claude/skills/ o CLAUDE.md). No actualizo."

## Plan que anuncias al usuario

> Voy a revisar si hay actualizaciones del template Prometeo. El flujo es:
>
> 1. Comparo tu version local (`TEMPLATE_VERSION`) con la del template original.
> 2. Si estas al dia, te aviso y termino sin cambios.
> 3. Si hay actualizacion, te muestro **que cambia** (changelog del template).
> 4. **Solo si apruebas**, actualizo los archivos de infraestructura (skills, CLAUDE.md, scripts, docs/WORKFLOW.md, etc.).
> 5. Para archivos hibridos (.gitignore, .claspignore, package.json) hago auto-merge inteligente.
> 6. **Tu codigo del proyecto y `docs/PRD.md` no los toco.**
> 7. Si modificaste localmente algun archivo de infraestructura, hago backup a `.template-backup/<version>/` antes de sobrescribir.
> 8. **No commiteo** — los cambios quedan visibles en Source Control de Cursor para que los revises.
>
> ¿Procedo?

Solo continua si aprueba.

## Pasos detallados

### 1. Configurar el remoto del template

Verifica si el remoto `template` ya existe:

```bash
git remote get-url template 2>/dev/null
```

Si no existe, agregarlo:

```bash
git remote add template https://github.com/cristianpalacios-habi/appscript-prometeo.git
```

Fetch:

```bash
git fetch template
```

### 2. Leer versiones

```bash
LOCAL_VERSION=$(cat TEMPLATE_VERSION 2>/dev/null | tr -d '[:space:]' || echo "0.0.0")
REMOTE_VERSION=$(git show template/main:TEMPLATE_VERSION 2>/dev/null | tr -d '[:space:]')
```

Si `LOCAL_VERSION == REMOTE_VERSION` → "Estas al dia (`<version>`). Nada que actualizar." Termina.

Si `LOCAL_VERSION` > `REMOTE_VERSION` → "Tu version local (`<local>`) es mas nueva que el template (`<remoto>`). Probablemente estas en una rama de desarrollo del template. No actualizo." Termina.

Si `LOCAL_VERSION` < `REMOTE_VERSION` → continuar.

### 3. Mostrar changelog

Obten el CHANGELOG.md del template:

```bash
git show template/main:CHANGELOG.md
```

Extrae las secciones entre `## [<local_version>]` y `## [<remote_version>]` (ambas exclusivas) — son los cambios que el usuario va a recibir. Si no hay seccion para alguna version, muestra todo lo nuevo desde local.

Muestra al usuario:

> Tu version: **v<local>**
> Version disponible: **v<remote>**
>
> Cambios que vas a recibir:
>
> <changelog extraido>
>
> ¿Aplico la actualizacion?

Espera aprobacion.

### 4. Listar archivos managed

Lista los archivos managed. El template trae un manifest `.claude/template-manifest.json` con la lista canonica:

```bash
git show template/main:.claude/template-manifest.json 2>/dev/null
```

Si no existe, usa la lista hardcodeada por default:

```
.claude/skills/p-config-entorno/SKILL.md
.claude/skills/p-config-appsscript/SKILL.md
.claude/skills/p-planear-milestone/SKILL.md
.claude/skills/p-ejecutar-milestone/SKILL.md
.claude/skills/p-verificar-dev/SKILL.md
.claude/skills/p-promover-prod/SKILL.md
.claude/skills/p-diagnosticar-error/SKILL.md
.claude/skills/p-nuevo-milestone/SKILL.md
.claude/skills/p-arreglo-rapido/SKILL.md
.claude/skills/p-actualizar-template/SKILL.md
CLAUDE.md
.cursorrules
docs/WORKFLOW.md
docs/PROMPT-INSTALACION.md
docs/IDS.example.md
scripts/_lib.js
scripts/push.js
scripts/deploy.js
scripts/promote.js
scripts/open.js
scripts/logs.js
environments.example.json
TEMPLATE_VERSION
CHANGELOG.md
README.md
```

(`appsscript.json` y `Main.js` quedan fuera por defecto — son owned tras la primera modificacion del usuario. El template los provee solo en el primer clone.)

### 5. Detectar modificaciones locales y hacer backup

Para cada archivo managed:

a) Si **no existe en local**: marca para crear.
b) Si **existe local idéntico al template anterior** (LOCAL_VERSION en remoto): el usuario no lo modificó. Marca para sobrescribir directamente sin backup.
c) Si **existe local DISTINTO al template anterior**: el usuario lo modificó. Marca para backup + sobrescribir.

Para detectar (b) vs (c): compara con `git show template/<tag>:<archivo>` donde `<tag>` es la version local. Si los tags no existen (template antiguo sin tags), fallback: comparar con `template/main~N` donde N intenta acercarse a la version. En el peor caso, **trata todo como modificado** para no perder data (mas backup, no es problema).

Crear backup:

```bash
BACKUP_DIR=".template-backup/${LOCAL_VERSION}"
mkdir -p "$BACKUP_DIR/$(dirname <archivo>)"
cp <archivo> "$BACKUP_DIR/<archivo>"
```

### 6. Sobrescribir archivos managed

Para cada archivo managed que va a cambiar:

```bash
git show template/main:<archivo> > <archivo>
```

Si el archivo es nuevo (no existia en local), asegurate de crear el directorio padre antes.

Reporta al usuario:

> Actualice:
> - `<archivo 1>` (sobrescrito)
> - `<archivo 2>` (sobrescrito; backup en `.template-backup/<version>/<archivo 2>`)
> - `<archivo 3>` (nuevo)
> - ...

### 7. Auto-merge inteligente para archivos hibridos

#### .gitignore y .claspignore

Cada uno se trata igual:

```bash
# Lee version remota del archivo
git show template/main:.gitignore > /tmp/gitignore.remote

# Diff con local
diff /tmp/gitignore.remote .gitignore
```

Identifica lineas presentes en remoto pero no en local (entradas nuevas del template). Las agregalas al final de local con un comentario:

```
# --- agregado por /p-actualizar-template v<X.Y.Z> ---
<nuevas entradas>
```

NO elimines lineas que el local tiene de mas (son customizaciones del usuario).

Reporta al usuario las lineas agregadas y pide confirmacion.

#### package.json

Lee el `scripts:` del local y del template:

```bash
LOCAL_SCRIPTS=$(node -e "console.log(JSON.stringify(require('./package.json').scripts, null, 2))")
REMOTE_SCRIPTS=$(git show template/main:package.json | node -e "let d=''; process.stdin.on('data', c=>d+=c); process.stdin.on('end', ()=>console.log(JSON.stringify(JSON.parse(d).scripts, null, 2)))")
```

Compara keys:
- Scripts que estan en remoto pero no en local → agregar.
- Scripts que estan en ambos con valor diferente → preguntar al usuario cual prefiere.
- Scripts que estan solo en local → conservar.

Para todo lo demas en `package.json` (`name`, `dependencies`, `version`, `private`, etc.) → conservar el del usuario.

Aplica los cambios con node:

```bash
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.scripts = { ...pkg.scripts, ...{<scripts nuevos>} };
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
```

### 8. Actualizar TEMPLATE_VERSION

```bash
echo "$REMOTE_VERSION" > TEMPLATE_VERSION
```

### 9. Cierre

> Template actualizado a **v<remote>**.
>
> **Resumen**:
> - `<N>` archivos managed actualizados
> - `<M>` archivos managed nuevos
> - `<K>` archivos modificados localmente fueron respaldados en `.template-backup/<local_version>/`
> - Hibridos: `<lista de archivos editados>` (auto-merge aplicado)
>
> **Tu codigo del proyecto no se toco**:
> - `Main.js` y demas `.js` de tu automatizacion: intactos
> - `docs/PRD.md`, `docs/milestones/`, `docs/fixes/`: intactos
> - `environments.json`, `.planning/state.json`: intactos
>
> **Cambios sin commitear**: visibles en el panel Source Control de Cursor. Revisa el diff antes de decidir si los aceptas todos.
>
> **Siguiente paso**:
> - Si estabas en mitad de un milestone, retoma donde estabas (`/p-ejecutar-milestone`, `/p-verificar-dev`, etc.).
> - Si no, los cambios se incluyen en el commit del proximo `/p-promover-prod`.
> - Si quieres recuperar algo de tu version anterior, esta en `.template-backup/<local_version>/`.

## Errores comunes y como manejarlos

- **`git fetch template` falla con permisos** → el usuario no tiene acceso al repo template. Avisa que pida acceso en el canal de soporte.
- **TEMPLATE_VERSION del template no es parseable** → algun cambio en el formato. Usa version "9999.0.0" como bypass y avisa al usuario.
- **Un archivo managed tiene merge conflict** (raro porque no usamos merge real, pero por completitud) → para el archivo, hace backup, sobrescribe, avisa.
- **`.template-backup/` ya tiene una carpeta de version actual** (re-corriendo la skill el mismo dia) → agrega sufijo numerico `.template-backup/0.2.0-2/`.

## Que NO hacer

- **No toques codigo del usuario** (`docs/PRD.md`, `docs/milestones/**`, `docs/fixes/**`, `.planning/state.json`, `environments.json`, archivos `.js`/`.gs` creados por el usuario distintos a `Main.js` original).
- **No sobrescribas `Main.js` ni `appsscript.json`** si el usuario los modifico. En la duda, **no los toques** y avisa que estan fuera del scope de la actualizacion.
- **No commitees**. Sigue la regla del repo: el commit es responsabilidad de `/p-promover-prod` o del usuario si decide hacerlo aparte.
- **No hagas force push** a nada bajo ningun motivo.
- **No degrades la version**: si remoto < local, no hacer downgrade.
- **No borres `.template-backup/`** — es el unico rescate del usuario si algo sale mal. La carpeta esta gitignored, no afecta al repo.
- **No fuerces la actualizacion sin changelog**. Si CHANGELOG.md no muestra que cambia, pidele al mantenedor que lo actualice antes de proceder.
