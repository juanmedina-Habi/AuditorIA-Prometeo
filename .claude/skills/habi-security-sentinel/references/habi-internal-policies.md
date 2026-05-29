# habi-internal-policies — Habi fintech rules + recipe

**Category:** compliance · **Default severity:** high · **CWE:** CWE-200, CWE-359, CWE-532, CWE-1059, CWE-798 · **OWASP:** A02:2021

Habi-specific compliance rules. Runs whenever `static` class is present.

## Rules (verbatim from `sec-skills/habi-internal-policies.md`)

| ID  | Title                                       | Regex (PCRE, case-insensitive)                                           | Severity | CWE       |
| --- | ------------------------------------------- | ------------------------------------------------------------------------ | -------- | --------- |
| H01 | Posible número de cédula en código/log      | `\b\d{6,12}\b(?=.*c[eé]dula)`                                            | high     | CWE-359   |
| H02 | Número de cuenta bancaria expuesto          | `\b\d{10,11}\s*(@bancolombia\|@davivienda\|@bbva\|@itau\|@bogota)\b`     | critical | CWE-200   |
| H03 | console.log con PII                         | `console\.log\(.*\b(password\|cedula\|email\|telefono\|cuenta\|tarjeta)` | high     | CWE-532   |
| H04 | TODO de seguridad sin resolver              | `TODO[:_-]?\s*(SEC\|SECURITY\|VULN\|AUTH)`                               | medium   | CWE-1059  |
| H05 | Referencia a key interna de Habi sin env    | `habi[._-]?(internal\|admin\|root)[._-]?key`                             | critical | CWE-798   |

## How to run

```bash
ROOT="."
cat > /tmp/habi.patterns <<'EOF'
\b\d{6,12}\b(?=.*c[eé]dula)
\b\d{10,11}\s*(@bancolombia|@davivienda|@bbva|@itau|@bogota)\b
console\.log\(.*\b(password|cedula|email|telefono|cuenta|tarjeta)
TODO[:_-]?\s*(SEC|SECURITY|VULN|AUTH)
habi[._-]?(internal|admin|root)[._-]?key
EOF

grep -RInEi -f /tmp/habi.patterns "$ROOT" \
  --include="*.js" --include="*.ts" --include="*.tsx" --include="*.py" --include="*.go" \
  --include="*.java" --include="*.rb" --include="*.php" --include="*.sql" \
  --include="*.yaml" --include="*.yml" --include="*.json" --include="*.md" --include="*.sh" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build \
  2>/dev/null
```

## Mapping to finding

```
severity:    per table
title:       per rule
cwe:         per table
remediation:
  H01: "No loguear cédulas. Hashear o redactar antes de persistir/loguear."
  H02: "Mover a env/secret manager. Nunca loguear cuentas completas."
  H03: "Usar logger estructurado con redacción automática (logger.js)."
  H04: "Resolver el TODO o crear ticket Jira y referenciarlo."
  H05: "Mover a process.env.HABI_INTERNAL_KEY y rotar."
```

## Common false positives

- The rule definitions inside this file may match themselves when scanning the skill repo. Whitelist the path of this very file before grepping if needed.
- Test fixtures with realistic-looking cédulas should be moved under `__tests__/fixtures/` and tagged with `// fixture` to be filtered.
