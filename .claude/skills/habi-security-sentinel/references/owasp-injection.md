# owasp-injection — patterns + recipe

**Category:** injection · **Default severity:** critical · **CWE:** CWE-89, CWE-78, CWE-90, CWE-943, CWE-94 · **MITRE:** T1190, T1059 · **OWASP:** A03:2021

Detects unsafe concatenation between user input and dangerous primitives (SQL, command, NoSQL, LDAP, dynamic eval).

## Patterns

| ID  | Title                            | Regex (PCRE, multiline)                                                                                       | Severity |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------- |
| I01 | `eval(` with dynamic input       | `\beval\s*\([^)]*\b(req\|request\|input\|params\|query\|body\|argv\|stdin\|process\.env)`                     | critical |
| I02 | `eval(` (any)                    | `\beval\s*\(`                                                                                                 | critical |
| I03 | `new Function(`                  | `new\s+Function\s*\(`                                                                                         | critical |
| I04 | `setTimeout`/`setInterval` with string | `set(Timeout\|Interval)\s*\(\s*['"]\w`                                                                  | high     |
| I05 | SQL concat (JS)                  | `(query\|execute\|raw)\s*\(\s*[`'"][^`'"]*['"`]\s*\+\s*(req\|request)\.(body\|query\|params)`                  | critical |
| I06 | SQL template literal w/ req      | `\`[^\`]*\$\{[^}]*req\.(body\|query\|params)`                                                                 | critical |
| I07 | Python SQL f-string with input   | `(execute\|cursor\.execute\|raw)\s*\(\s*f["'].*\{[^}]*(request\|input\|argv)`                                 | critical |
| I08 | Command injection (child_process)| `child_process\.(exec\|execSync\|spawn\|spawnSync)\s*\(\s*[`"][^`"]*\$\{`                                     | critical |
| I09 | Command injection (exec w/ req)  | `\b(exec\|execSync\|spawn)\s*\([^)]*\b(req\|request\|input\|params\|query\|body)\b`                           | critical |
| I10 | Python os.system / subprocess shell=True | `(os\.system\|subprocess\.(call\|run\|Popen))\s*\([^)]*shell\s*=\s*True`                              | high     |
| I11 | NoSQL `$where` interpolation     | `\$where[^,}]*\$\{`                                                                                           | high     |
| I12 | LDAP search no escape            | `ldap\.search\s*\([^)]*\+`                                                                                    | high     |
| I13 | XSS-prone innerHTML w/ input     | `\.innerHTML\s*=\s*[^;]*\b(req\|request\|input\|params\|query\|body)\b`                                       | high     |
| I14 | `document.write` with dynamic    | `document\.write\s*\(\s*[^)]*\$\{`                                                                            | high     |

## Ignore filter

Skip the line when any of:

- The file is under `__tests__/`, `tests/`, `spec/`, `samples/`, ends with `.test.js`/`.spec.js`/`.test.ts`/`.spec.ts`.
- The line contains a safe-ORM marker: `sequelize.findAll`, `Sequelize.literal`, `prisma\.[a-zA-Z]+\.(findUnique|findFirst|findMany|create|update)`, `knex\(`, `bookshelf`, `mongoose\.Model\.find(One)?\(\s*\{`.
- The line is a comment in the convention of the file (`#`, `//`, `/*`) AND the regex did not match a string literal.

## How to run

```bash
ROOT="."
cat > /tmp/inj.patterns <<'EOF'
\beval\s*\(
new\s+Function\s*\(
set(Timeout|Interval)\s*\(\s*['"]\w
(query|execute|raw)\s*\(\s*[`'"][^`'"]*['"`]\s*\+\s*(req|request)\.(body|query|params)
\`[^\`]*\$\{[^}]*req\.(body|query|params)
(execute|cursor\.execute|raw)\s*\(\s*f["'].*\{[^}]*(request|input|argv)
child_process\.(exec|execSync|spawn|spawnSync)\s*\(\s*[`"][^`"]*\$\{
\b(exec|execSync|spawn)\s*\([^)]*\b(req|request|input|params|query|body)\b
(os\.system|subprocess\.(call|run|Popen))\s*\([^)]*shell\s*=\s*True
\$where[^,}]*\$\{
ldap\.search\s*\([^)]*\+
\.innerHTML\s*=\s*[^;]*\b(req|request|input|params|query|body)\b
document\.write\s*\(\s*[^)]*\$\{
EOF

grep -RInE -f /tmp/inj.patterns "$ROOT" \
  --include="*.js" --include="*.ts" --include="*.tsx" --include="*.jsx" \
  --include="*.py" --include="*.rb" --include="*.php" --include="*.go" --include="*.java" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build \
  2>/dev/null \
  | grep -viE 'sequelize\.|prisma\.|knex\(|bookshelf|/__tests__/|/tests/|/spec/|/samples/|\.test\.|\.spec\.'
```

## Mapping to finding

```
severity:   per table
title:      "Injection risk: <pattern title>"
cwe:        depends on pattern (CWE-89 SQL, CWE-78 OS, CWE-94 eval, CWE-90 LDAP, CWE-943 NoSQL, CWE-79 innerHTML)
remediation:
  SQL:    "Use parameterized queries / prepared statements. Pass user input as bind variable, never concatenate into the SQL string."
  CMD:    "Avoid spawning a shell with user input. Use execFile with an args array, or whitelist allowed values."
  EVAL:   "Replace eval / new Function with a safe parser or a small dispatcher map."
  NoSQL:  "Validate and whitelist the operator. Never let user input set $where / $function."
  XSS:    "Use textContent or a sanitizer (DOMPurify) instead of innerHTML."
```

## When this blocks vs warns

- eval/Function/SQL/cmd injection with dynamic input → **critical / block**.
- LDAP, NoSQL, generic eval without verified dynamic input, Python shell=True → **high / warn**.
- innerHTML / document.write XSS → **high / warn**.
