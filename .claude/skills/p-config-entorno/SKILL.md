---
name: p-config-entorno
description: Configura el entorno de desarrollo local para un proyecto Prometeo (nvm, Node 20 LTS, clasp, git, autenticacion). Una sola vez por computador. Solo soporta macOS y Linux nativos.
---

# /p-config-entorno

Configura el entorno local para que el usuario pueda construir automatizaciones de Apps Script. **Una sola vez por computador.** Si vuelves a invocar la skill, debe ser idempotente: detecta lo que ya esta instalado y solo instala lo que falte.

## Cuando usar

- Primera vez que el usuario abre el repo en Cursor.
- El usuario dice cosas como: "configura mi entorno", "instala lo que necesito", "preparame para empezar".
- Despues de un `git clone` en un computador nuevo.

## Audiencia

Usuario **no tecnico**. Habla en espanol claro. Explica que es cada herramienta en una frase antes de instalarla. No asumas conocimiento previo.

## Sistemas soportados

- **macOS** (Intel y Apple Silicon)
- **Linux** nativo

**Windows queda fuera de esta skill.** El setup en Windows se hace via WSL siguiendo el Anexo A del doc de onboarding. Si detectas que estas corriendo en Windows nativo (no WSL), aborta y dirige al usuario a la [Guia Prometeo](https://chat.google.com/room/AAQAvHQfwAI?cls=7).

## Reglas de interaccion

1. **Anuncia el plan al inicio** y pide una sola confirmacion ("voy a hacer X, Y, Z — apruebas?"). No pidas confirmacion por cada paso.
2. **Reporta el progreso** despues de cada bloque (que se instalo, que ya estaba).
3. **Si algo falla**, captura el error completo, explicalo en lenguaje sencillo y propon el siguiente paso. No reintentes lo mismo dos veces sin avisar.
4. **No avances al siguiente bloque** si el anterior fallo.
5. **Cierra con un resumen** de versiones instaladas y los siguientes pasos del usuario.

## Plan que anuncias al usuario

> Voy a configurar tu computador para Prometeo. Esto incluye:
> 1. Verificar tu sistema operativo (macOS o Linux).
> 2. Instalar **nvm** (gestor de versiones de Node).
> 3. Instalar **Node 20 LTS** (motor que ejecuta JavaScript fuera del navegador, necesario para clasp).
> 4. Instalar **clasp** (CLI oficial de Google para sincronizar codigo con Apps Script).
> 5. Verificar la configuracion de **git** (nombre y email).
> 6. Verificar que **clasp** este autenticado con tu cuenta de Google.
>
> Tarda 5-10 minutos. Apruebas para empezar?

Solo continua si el usuario aprueba.

## Pasos detallados

### 1. Detectar el sistema operativo

```bash
uname -s
```

- Output `Darwin` → macOS, continua.
- Output `Linux` → revisa si es WSL (`grep -qi microsoft /proc/version` retorna 0 → es WSL; eso es valido). Continua.
- Cualquier otra cosa → aborta con mensaje:
  > "Detecte un sistema operativo no soportado. Esta skill funciona en macOS o Linux. En Windows nativo, usa el Anexo A del doc de onboarding (WSL)."

### 2. Verificar e instalar nvm

Verifica si nvm ya esta:

```bash
[ -s "$HOME/.nvm/nvm.sh" ] && echo "nvm presente" || echo "nvm ausente"
```

Si esta presente, salta a 3.

Si falta, instala con el script oficial. **Advertencia de seguridad al usuario antes de ejecutar**:

> Voy a instalar nvm usando el comando oficial recomendado por nvm-sh/nvm:
>
> ```
> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
> ```
>
> Este es el patron "pipe-to-shell": descarga un script y lo ejecuta directo. Es la forma oficial documentada por nvm, pero implica confiar en el repo `github.com/nvm-sh/nvm`. La URL apunta a la version `v0.40.1` etiquetada (no a HEAD) para que el script no cambie sin que sepamos. Si prefieres revisar el script antes, abre la URL en el navegador, leelo, y vuelve a confirmar.
>
> ¿Procedo?

Solo continua si el usuario confirma explicitamente. **No cambies la URL ni el tag** — debe ser exactamente el comando documentado por nvm.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Despues de instalar, **en TODOS los siguientes comandos** debes cargar nvm explicitamente porque la sesion de Bash de Cursor no recarga el shell:

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Verifica que funcione:

```bash
export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && nvm --version
```

### 3. Instalar Node 20 LTS

```bash
export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && nvm install 20 && nvm use 20 && nvm alias default 20
```

Verifica:

```bash
export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && node --version && npm --version
```

Reporta las versiones instaladas al usuario.

### 4. Instalar clasp globalmente

Verifica si esta:

```bash
export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && command -v clasp && clasp --version
```

Si no esta, instala:

```bash
export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && npm install -g @google/clasp
```

Verifica de nuevo la version. Explica al usuario:
> clasp es la herramienta oficial de Google. Sincroniza el codigo entre tu computador y Apps Script, asi nunca tienes que copiar y pegar en el editor web.

### 5. Verificar configuracion de git

```bash
git config --global user.name && git config --global user.email
```

Si alguno esta vacio:
- Pregunta al usuario su **nombre completo** (sugiere usar el que aparece en su correo Habi).
- Pregunta su **email corporativo de Habi** (debe terminar en `@habi.co`).
- **Antes de aplicar el `git config --global`, muestra al usuario los valores exactos que vas a setear y pide confirmacion explicita** (esta es una configuracion global que afectara todos los commits futuros en este computador, incluso en otros repos):

  > Voy a configurar tu identidad de git GLOBAL (afectara todos tus repos en este computador) con:
  > - `user.name`: `<nombre>`
  > - `user.email`: `<email>`
  >
  > Si esto es correcto, confirma. Si quieres cambiar algo, dime.

Solo despues de confirmacion, aplica:

```bash
git config --global user.name "<nombre>"
git config --global user.email "<email>"
```

Confirma el resultado.

### 6. Verificar autenticacion de clasp

⚠️ **Privacidad de credenciales**: el archivo `~/.clasprc.json` contiene tokens OAuth sensibles de la cuenta de Google del usuario. **La skill solo verifica su EXISTENCIA con `test -f`** — **NUNCA leas el contenido del archivo, NUNCA lo muestres en el chat, NUNCA lo copies a otra ubicacion**. Si por algun motivo el contenido del archivo aparece en tu razonamiento o output, redacta tipo `[REDACTADO: ~/.clasprc.json contiene tokens sensibles]`.

```bash
test -f ~/.clasprc.json && echo "clasp autenticado" || echo "clasp no autenticado"
```

Si no esta autenticado, ejecuta:

```bash
export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && clasp login
```

Explica al usuario:
> Se va a abrir tu navegador. Inicia sesion con tu cuenta **personal de Habi** (la misma del correo). Acepta los permisos. Cuando termines, vuelve a Cursor — ya quedaras autenticado.

`clasp login` bloquea hasta que el usuario confirma en el navegador. No reintentes mientras corre.

Cuando termine, verifica:

```bash
test -f ~/.clasprc.json && echo "OK: autenticado"
```

### 7. Dependencias del repo

Si el repo tiene `package.json` y `node_modules/` no existe, **muestra al usuario primero el contenido de las secciones `dependencies` y `devDependencies` de `package.json`** para que confirme. `npm install` ejecuta scripts post-install de cada paquete (vector de supply chain attack), asi que conviene revisar que solo se instalen paquetes esperados.

```bash
node -e "
  const p = require('./package.json');
  console.log('dependencies:', JSON.stringify(p.dependencies || {}, null, 2));
  console.log('devDependencies:', JSON.stringify(p.devDependencies || {}, null, 2));
"
```

Pide confirmacion:

> Estas son las dependencias que se van a instalar. ¿Las reconoces todas o quieres revisar alguna antes? Si todo bien, procedo con `npm install`.

Si confirma:

```bash
export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && npm install
```

(El template actual no tiene dependencias en `package.json`, pero proyectos derivados pueden tenerlas — la verificacion es defensiva para esos casos.)

### 8. Cierre

Resume al usuario en un mensaje:

> Entorno listo. Versiones instaladas:
> - Node: `<version>`
> - npm: `<version>`
> - clasp: `<version>`
> - git: configurado como `<nombre> <email>`
> - clasp: autenticado
>
> Siguiente paso: corre `/p-config-appsscript` para crear tus proyectos de Apps Script (dev y prod) y vincularlos al repo.

## Errores comunes y como resolverlos

- **`command not found: nvm`** despues de instalar → no cargaste nvm. Usa el bloque `export NVM_DIR=... && \. "$NVM_DIR/nvm.sh"` antes de cualquier comando de nvm/node/npm.
- **`EACCES` al instalar clasp global** → revisa que `npm config get prefix` apunte a un directorio del usuario (`~/.nvm/versions/...`), no a `/usr/local`. Con nvm bien instalado esto no deberia pasar.
- **`clasp login` se queda colgado** → el usuario probablemente cerro el navegador sin completar. Cancela con Ctrl+C, explica al usuario y vuelve a intentar.
- **macOS sin `curl`** → muy raro pero posible. Sugiere `brew install curl` o usa `wget` como fallback.

## Que NO hacer

- No instales nvm dentro de `sudo`. nvm va en el HOME del usuario.
- No edites manualmente `~/.zshrc` o `~/.bashrc` — el instalador de nvm ya lo hace.
- No instales Node con `brew install node` ni con apt: el control de versiones queda fuera de nvm y se rompe el flujo.
- No saltes la verificacion de `git config`. Sin ella, los commits salen con autor incorrecto.
- No cierres el chat hasta el cierre (paso 8) — el usuario necesita el resumen para saber que esta listo.
