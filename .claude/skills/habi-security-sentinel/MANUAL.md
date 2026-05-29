# Manual — Habi Security Sentinel (skill portable)

> **Autoría**
> Realizado por **Victor Pinzón** — equipo de **Ciberseguridad Habi**.
> Contacto: `victorpinzon@habi.co`.
> Versión: 1.0.0 · Fecha de release: 2026-05-15.

---

## 1. ¿Qué es este skill?

Es la versión **portable** del **Habi Security Sentinel** — un agente de ciberseguridad que revisa código, diffs, manifiestos de skills/agentes/MCP y URLs en vivo contra el catálogo de checks que mantiene el equipo de Ciberseguridad Habi.

A diferencia del servidor (`http://localhost:4317` con `npm start`), esta variante es **un único directorio markdown** que se copia a `~/.claude/skills/` y queda listo para usar — sin Node, sin puerto, sin API keys, sin red. Cualquier persona con Claude Code puede ejecutarla con solo recibir la carpeta.

El catálogo es el mismo que el del servidor:

| Skill                      | Detecta                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `secrets-scanner`          | Credenciales AWS/GCP/Stripe/Slack/SendGrid/Twilio, JWTs, llaves privadas, HABI_*   |
| `owasp-injection`          | SQL/Cmd/eval/NoSQL/LDAP injection + XSS por `innerHTML`                            |
| `auth-flow-review`         | JWT `alg:none`, hash débil, IDOR, comparación no timing-safe, bcrypt cost bajo     |
| `xpia-defense`             | Inyección de prompts, tool poisoning, `dangerouslySetInnerHTML` con output LLM     |
| `habi-internal-policies`   | Cédulas, cuentas bancarias CO, console.log con PII, TODOs SEC, HABI_INTERNAL_KEY   |
| `skill-trust-validator`    | 16 vectores OWASP LLM01–LLM10 (XPIA N1–N4) en manifiestos de skills/agentes/MCP    |
| `web-runtime-scanner`      | Headers de seguridad, TLS, paths sensibles, métodos HTTP, CORS, vía `curl`         |

---

## 2. Cómo se invoca

Lenguaje natural dentro de Claude Code — **no requiere slash command**. Frases que activan el skill:

| Lo que escribes                                   | Skills que corren                                       |
| ------------------------------------------------- | ------------------------------------------------------- |
| "scan this for secrets"                           | secrets + habi-policies                                 |
| "revisa seguridad este diff"                      | secrets + owasp + habi-policies (+ auth/xpia si aplica) |
| "is this MCP safe to install?"                    | secrets + owasp + habi-policies + skill-trust + xpia    |
| "audita este código de autenticación"             | secrets + owasp + habi-policies + auth-flow             |
| "check the headers of https://staging.habi.co"    | web-runtime-scanner                                     |
| "validate this skill manifest"                    | skill-trust-validator                                   |

También se puede invocar explícitamente: `/skill habi-security-sentinel <tu petición>`.

### Ejemplo en sesión

```
Tú:  scan this for secrets
LLM: [carga SKILL.md → references/secrets-scanner.md + references/habi-internal-policies.md
      → ejecuta los grep en tu repo → reporta verdict block/warn/pass con findings]
```

---

## 3. Cómo se instala

Tres opciones según el alcance:

### Opción 1 — Por usuario (todos tus proyectos)

```bash
cp -r .claude/skills/habi-security-sentinel ~/.claude/skills/
```

### Opción 2 — Por proyecto (un solo repo)

Copia la carpeta a `.claude/skills/habi-security-sentinel/` dentro del repo y commitea. Todos los que clonen ese repo heredan el skill.

### Opción 3 — Compartir por zip

```bash
cd .claude/skills
zip -r habi-security-sentinel.zip habi-security-sentinel
```

El receptor descomprime en `~/.claude/skills/` y listo.

> Tras instalar, reiniciar Claude Code (o ejecutar `/reload`) para que aparezca en el listado de skills.

---

## 4. Estructura del skill

```
.claude/skills/habi-security-sentinel/
├── SKILL.md                          # Punto de entrada que Claude lee primero
├── MANUAL.md                         # Este documento (uso, autoría)
├── INSTALL.md                        # Solo pasos de instalación
└── references/
    ├── secrets-scanner.md            # 14 patrones de secretos + recipe grep
    ├── owasp-injection.md            # 14 patrones de inyección + recipe grep
    ├── auth-flow-review.md           # 11 heurísticas de auth + recipe grep
    ├── xpia-defense.md               # 8 patrones LLM/MCP + recipe grep
    ├── habi-internal-policies.md     # 5 reglas Habi + recipe grep
    ├── skill-trust-validator.md      # 16 vectores OWASP LLM + recipe grep
    ├── web-runtime-scanner.md        # 6 fases con curl (headers/TLS/paths/CORS)
    └── report-format.md              # Plantilla del verdict block
```

Cada referencia es **autocontenida**: tabla de patrones, mapeo a severidad/CWE/MITRE, recipe de bash listo para ejecutar, lista de falsos positivos conocidos.

---

## 5. Formato del reporte

El skill responde con un bloque compacto idéntico al del servidor:

```
verdict: <pass|warn|block>  score: <N>/100  skills: <lista>
classes: <static|runtime|sensitive-area|ai-touching|skill-manifest>
counts:  critical=<N>  high=<N>  medium=<N>  low=<N>  info=<N>

<SEVERIDAD> (<count>)
  • <título> — <file>:<line>
    evidence: <evidencia truncada a 120 chars>
    -> <remediación>

notes:
  • <caveats: heurística-only, FP conocidos, etc.>
```

Reglas del veredicto:

- Cualquier `critical` → **block**
- Cualquier `high` sin críticos → **warn**
- ≥3 `medium` → **warn**
- Lo demás → **pass**

---

## 6. Capacidades — paridad con el servidor

| Capability                            | Skill portable | Servidor Sentinel `:4317`         |
| ------------------------------------- | -------------- | --------------------------------- |
| Mismo banco regex / heurísticas       | ✅              | ✅                                 |
| Audit log persistente (`sec_reviews`) | ❌              | ✅                                 |
| Consensus multi-modelo                | ❌              | ✅ (`/api/sec-sentinel/consensus`) |
| `auth-flow-review` enriquecido con LLM | ❌             | ✅                                 |
| Políticas editables vía UI            | ❌              | ✅ (`/sec-sentinel` panel)         |
| Hot reload de skills nuevas           | ❌              | ✅ (`/api/.../skills/from-md`)     |
| Pre-commit hook                       | ✅ (manual)     | ✅ (auto)                          |
| Funciona offline, cero instalación    | ✅              | ❌                                 |
| Compartible como `.zip`               | ✅              | ❌                                 |

Si el usuario necesita audit log, consensus o LLM enrichment, debe correr el servidor completo. Cuando este skill detecta el servidor en `:4317`, añade un link al dashboard al final del reporte.

---

## 7. Falsos positivos comunes

| Skill                  | FP frecuente                                                      | Cómo manejarlo                                                                |
| ---------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `secrets-scanner`      | Variables con nombre `HABI_RECON_SECRET` que solo declaran env    | El patrón S12 (`HABI_/HBI_` prefix) acepta esto — reporta y se discute en PR  |
| `secrets-scanner`      | Tokens placeholder con `example`, `your-key`                      | Auto-filtrado por la línea de "ignore" del recipe                             |
| `owasp-injection`      | `eval()` dentro de docs/comentarios                               | El recipe deduplica por path; revisar manualmente si es markdown              |
| `skill-trust-validator` | V12 (social engineering) en skills de seguridad con tono imperativo | Reportar como **info**, no como warn — el manual lo aclara en `references/skill-trust-validator.md` |
| `web-runtime-scanner`  | Headers de infra gestionada (Google Frontend, cloudflare, awselb) | Reportar como **info**, no como medium — no son removibles desde la app       |
| `habi-internal-policies` | El propio archivo `habi-internal-policies.md` que define las reglas | El recipe excluye explícitamente esa ruta                                  |

---

## 8. Mantener y extender

### Agregar un patrón nuevo

1. Editar el `.md` correspondiente en `references/` y añadir una fila a la tabla.
2. Replicar el patrón en el bloque de bash recipe.
3. Probar con un fixture conocido.
4. Si el patrón también va al servidor, abrir PR contra `sec-skills/<archivo>.md` del repo del Sentinel.

### Actualizar el skill

No hay versionado pinneado — se reemplaza la carpeta entera:

```bash
diff -ru ~/.claude/skills/habi-security-sentinel new/habi-security-sentinel
cp -r new/habi-security-sentinel ~/.claude/skills/
```

### Wire-up opcional con pre-commit

Extraer los patrones de `references/secrets-scanner.md` a un `.patterns` plano y enchufarlo en `.git/hooks/pre-commit` para bloquear commits con secretos sin pasar por Claude. Ver el ejemplo en [INSTALL.md](INSTALL.md#optional-pre-commit-hook).

---

## 9. Soporte

- **Issues / sugerencias** → `victorpinzon@habi.co` (Victor Pinzón, Ciberseguridad Habi).
- **Backport al servidor** → cualquier patrón nuevo que se valide aquí debe replicarse en `sec-skills/*.md` del Sentinel server.
- **Documentación del servidor** → ver `SECURITY_SENTINEL.md` en el repo del Sentinel.

---

## 10. Créditos

- **Diseño, reglas, packaging y validación:** Victor Pinzón — Ciberseguridad Habi.
- **Catálogo de checks:** derivado del Habi Security Sentinel server (`sec-skills/*.md`).
- **Inspiración:** `amplihack` security agent pattern; OWASP LLM Top 10 (2025); OWASP Top 10 2021; ATLAS framework.

Habi · Ciberseguridad · 2026.
