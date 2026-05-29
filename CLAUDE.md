# Guia para asistentes de IA — Proyecto Prometeo

Este repositorio es una **plantilla del proyecto Prometeo** (Habi / Inteligencia de Mercados). El usuario es del equipo operativo y construye automatizaciones en Google Apps Script con tu ayuda (vibecoding). **No es desarrollador.**

## Antes de hacer cualquier cosa

**1. Lee `docs/PRD.md`.** Es la fuente de verdad del proyecto: define problema, alcance, KPI, milestones y plan de ejecucion. Si el archivo no existe todavia, pidele al usuario que copie su PRD aprobado al repo antes de continuar.

**2. Lee `docs/WORKFLOW.md`.** Explica el loop de trabajo (planear → ejecutar → verificar → promover) y los ambientes (local / dev / prod).

**3. Identifica el milestone activo.** Cada conversacion trabaja sobre **un milestone especifico** del PRD. Si no esta claro cual, pregunta antes de planear o escribir codigo.

## Idioma

**Trabaja en espanol.** Mensajes, commits, comentarios, nombres de funciones cuando corresponda. El usuario habla espanol y los stakeholders tambien.

## Reglas duras (no negociables)

### 1. Nunca edites el editor web de Apps Script

Todo cambio de codigo nace en local (Cursor + repo) y se sincroniza con `clasp`. El editor de [script.google.com](https://script.google.com) se abre **solo** para:

- Revisar logs (`npm run logs:dev` o `logs:prod`).
- Ejecutar manualmente una funcion durante la verificacion.
- Autorizar permisos OAuth la primera vez.

Si el usuario te pide "edita esto en Apps Script", reorientalo: explicale que vamos a hacer el cambio en local y desplegarlo con `npm run deploy:dev`.

### 2. Mantente dentro del scope del milestone activo

El antipatron mas comun es construir cosas de M2 mientras se trabaja en M1. Cuando planees:

- Recorta el plan al milestone activo del PRD.
- Si surge una idea util pero fuera de scope, registra una nota — no la implementes.
- Si dudas si algo entra en este milestone, **pregunta al usuario antes de codificar**.

### 3. Secretos nunca van en el codigo

API keys, tokens, credenciales: viven en `PropertiesService.getScriptProperties()`. Si el usuario quiere usar un servicio externo:

1. Pide la API key por chat.
2. Guia para configurarla en `Settings del proyecto > Script properties` (esto se hace en el editor web, es una excepcion permitida).
3. Lee la propiedad desde el codigo con `PropertiesService.getScriptProperties().getProperty('NOMBRE_KEY')`.

**Nunca pegues una API key en un archivo .js / .gs.**

#### Patron opcional: propiedad `AMBIENTE`

El modelo Prometeo separa DEV y PROD por dos vias suficientes para la mayoria de proyectos:

- Distintos proyectos en Apps Script (distintos `scriptId`).
- Distintos valores por ambiente en las propiedades del milestone (ej. `RECIPIENT_EMAIL=test@habi.co` en DEV vs `cliente@empresa.com` en PROD).

**Por lo tanto, no es obligatorio** que cada proyecto tenga una propiedad `AMBIENTE`. Solo añadela cuando el milestone necesite branching explicito en codigo. Casos tipicos donde aporta:

- Operaciones con efectos irreversibles (envios masivos, borrar datos, llamadas a APIs de pago) — quieres un guard `if (isDev()) { ... limitar alcance ... }`.
- Logs y banners de inicio que digan en que ambiente se esta corriendo.
- Feature flags temporales (codigo experimental que solo corre en DEV).
- Validaciones extras costosas que no quieres en PROD.

Cuando el plan lo amerite:

1. Crear `AMBIENTE = dev` en Script Properties de DEV y `AMBIENTE = prod` en PROD (paso manual del usuario en Settings, igual que el resto de propiedades).
2. Helpers en `Config.js`:

   ```js
   function getEnvironment() {
     const env = PropertiesService.getScriptProperties().getProperty('AMBIENTE');
     if (!env) throw new Error('Falta la propiedad AMBIENTE en Settings.');
     return env; // 'dev' o 'prod'
   }

   function isDev()  { return getEnvironment() === 'dev'; }
   function isProd() { return getEnvironment() === 'prod'; }
   ```

3. Si el plan del milestone añade esta propiedad, listala en su seccion `## Property Service`.

Si el milestone es puro flujo de datos (leer hoja → procesar → escribir hoja) sin riesgo de efectos masivos, **no la agregues** — es ruido innecesario.

### 4. Codigo en archivos separados por responsabilidad

No archivo gigante. Estructura sugerida:

```
Main.js        — punto de entrada y triggers
Config.js      — constantes y lectura de PropertiesService
Sheets.js      — lectura/escritura en Google Sheets
Gmail.js       — envio de correos
Ai.js          — llamadas a APIs de IA (si aplica)
Api.js         — otras integraciones externas
Utils.js       — helpers generales
```

Solo crea archivos que el milestone necesite. No anticipes archivos para milestones futuros.

### 5. La fuente de verdad es el repo, no el Google Doc

Si durante la ejecucion cambia algo del PRD (alcance, decisiones, milestones), actualiza `docs/PRD.md` en el repo. El Google Doc original lo actualiza el usuario despues.

## Como trabajar con el usuario

**Es perfil no-tecnico.** Tres principios:

- **Explica antes de actuar.** En una frase: "voy a X porque Y". No narres tu razonamiento interno extenso.
- **No avances sin confirmacion en pasos grandes.** Cambios chicos (renombrar una variable, mover una linea): procede. Cambios estructurales (crear archivos, instalar paquetes, desplegar): muestra y espera.
- **Pregunta cuando dudes.** Es mejor una pregunta de mas que codigo en la direccion equivocada. Especialmente sobre alcance del milestone.

## Skills disponibles

El repo trae skills en `.claude/skills/` que orquestan el flujo. Usalas en el momento correcto en lugar de improvisar:

| Momento | Skill | Que hace con git / GitHub / Apps Script |
| --- | --- | --- |
| Setup inicial | `/p-config-entorno` | Instala Node, nvm, clasp (1 vez por computador) |
| Setup inicial | `/p-config-appsscript` | Crea proyectos DEV/PROD; crea rama `dev` en GitHub |
| Planear milestone | `/p-planear-milestone` | Escribe plan + state.json (**sin commit**) |
| Ejecutar plan | `/p-ejecutar-milestone` | Escribe codigo (**sin commit**) + `npm run deploy:dev` (reutiliza mismo `deploymentId`) |
| Validar en dev | `/p-verificar-dev` | Revision estatica + verificacion guiada con el usuario (asistente abre editor, usuario ejecuta, asistente analiza logs). Fix loop con `deploy:dev` mismo ID; al cerrar marca "VALIDADO" |
| Promover a prod | `/p-promover-prod` | **Un commit** + push a ramas `dev` y `main` en GitHub + `npm run promote` (PROD) |
| Diagnostico | `/p-diagnosticar-error` | Fix en local (sin commit) + `deploy:dev` mismo ID |
| Cerrar milestone | `/p-nuevo-milestone` | Cierra activo + arranca siguiente |
| Ajuste pequeno sobre PROD | `/p-arreglo-rapido` | Plan inline + ejecutar + verificar (sin commit, sin promover). Solo aplica sobre milestones ya en PROD. |
| Auditoria de seguridad | `habi-security-sentinel` | Skill de Victor Pinzon (Ciberseguridad Habi). NO es de Prometeo — es transversal de Habi. Se invoca automaticamente desde `/p-verificar-dev` y `/p-arreglo-rapido` (Fase A) sobre el diff del milestone/fix. Bloquea con verdict `block` si encuentra criticals. |
| Actualizar el template | `/p-actualizar-template` | Trae actualizaciones de skills + docs + scripts desde el repo plantilla. No toca codigo del usuario (Main.js, PRD, milestones). Backup automatico. |

**Principio clave de git**: los cambios se acumulan **sin commitear** durante todo el milestone (plan → ejecutar → verificar). El usuario los revisa en el panel **Source Control** de Cursor cuando quiera. **El commit unico se hace en `/p-promover-prod`**, con todos los cambios juntos. Esto le da al usuario una vista clara de "que cambia este milestone" antes de promoverlo.

**Ramas en GitHub**:

- `main` — codigo actualmente en Apps Script PROD.
- `dev` — codigo actualmente validado en Apps Script DEV (creada por `/p-config-appsscript`).
- Trabajo local va sobre `main`. `/p-promover-prod` empuja a `dev` y luego a `main` en GitHub.

**Versionado decimal** (mantenido en `.planning/state.json`):

- Cada **milestone** promovido incrementa el major: M1→v1.0, M2→v2.0, M3→v3.0.
- Cada **quick-fix** promovido incrementa el minor sobre el milestone vigente: v2.0→v2.1→v2.2...
- El **tag git** y la **descripcion del deployment en PROD** usan la version: `v2.3`.
- Los **commits**: `feat(M3): <obj>` para milestones, `fix(v2.4): <desc>` para quick-fixes.
- Si el usuario te pregunta "en que version vamos?", lee `currentVersion` de `state.json`.

Si el usuario describe una intencion que matchea con una skill, **invoca la skill** en vez de improvisar. Las skills aseguran consistencia entre proyectos Prometeo.

## Comandos del repo (referencia)

- `npm run push:dev` — sube codigo a dev sin tocar el deployment (uso raro, preferir `deploy:dev`)
- `npm run deploy:dev` — push + actualiza el deployment estable de dev (mismo `deploymentId` siempre; el primero se crea en `/p-config-appsscript`)
- `npm run promote` — promueve dev validado a prod (push + deploy en prod)
- `npm run open:dev` / `open:prod` — abre el editor en el ambiente correcto
- `npm run logs:dev` / `logs:prod` — muestra logs del ambiente

Estos comandos usan `environments.json` (gitignored). El `scriptId` y `deploymentId` reales viven ahi.

## Archivos clave

- `docs/PRD.md` — contexto del proyecto (lo creas/actualizas)
- `docs/IDS.md` — IDs de scriptId/deploymentId reales (gitignored, lo genera `config-appsscript`)
- `docs/WORKFLOW.md` — diagrama del loop y ambientes
- `environments.json` — IDs reales (gitignored, gestionado por scripts)
- `.claspignore` — define que sube a Apps Script (solo codigo `.js`/`.gs`/`.html`)
- `.gitignore` — define que sube a GitHub (sin secretos, sin notas locales)

## Division de roles en verificacion

**Apps Script no es una web app que se pueda previsualizar.** Vive en `script.google.com` y ejecutar funciones requiere un usuario humano autenticado en su cuenta. Por eso, en `/p-verificar-dev` y `/p-arreglo-rapido`:

- **El asistente** hace lo que puede hacer solo: revision estatica de codigo (lee diffs vs PRD/plan/CLAUDE.md), analisis de logs que el usuario le pega, diagnostico de side-effects que el usuario describe, propuesta de fixes.
- **El usuario** hace lo que requiere su autenticacion: ejecutar funciones en el editor de Apps Script, copiar logs y pegarlos al asistente, abrir Sheets de salida e inspeccionarlas, revisar su bandeja de Gmail por correos esperados.

**NO intentes ejecutar funciones de Apps Script con herramientas de browser** (Claude in Chrome, Claude Preview, etc.). No funciona — siempre es el usuario. Tu rol es conductor + analista, no ejecutor.

## Antipatrones a evitar

- Construir features completas del proyecto en una sola conversacion sin parar a verificar en dev.
- Crear archivos "por si acaso" que el milestone activo no necesita.
- Agregar manejo de errores complejo en el primer milestone — la version mas simple va primero.
- Sugerir abrir el editor web para "editar rapido".
- Saltar a prod sin validar en dev.
- Mantener silencio mientras escribes codigo durante minutos. Avisa que estas avanzando.
