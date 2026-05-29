# Habi Security Sentinel — portable skill

> **Autoría:** Realizado por **Victor Pinzón · Ciberseguridad Habi**.
> Para una guía completa de uso, ver [`MANUAL.md`](MANUAL.md).

Self-contained Claude Code skill that runs the Habi Security Sentinel security checks (secrets, OWASP injection, auth, XPIA, OWASP LLM16, Habi compliance, web runtime) using only the host's `bash`, `grep`, `python3` and `curl`. No server, no dependencies, no API keys required.

## What it does

When invoked, Claude classifies the input (diff / files / snippet / skill manifest / URL), loads the matching reference files from `references/`, runs the regex/curl recipes those references prescribe, and reports a verdict + list of findings in a consistent format.

Equivalent to the full Sentinel server's `/api/sec-sentinel/review` and `/api/sec-sentinel/runtime-scan` endpoints — but **stateless** (no audit log) and **single-model** (no consensus).

## Install

### Option 1 — user-level (every project)

```bash
cp -r .claude/skills/habi-security-sentinel ~/.claude/skills/
```

Restart Claude Code (or run `/reload`) and the skill becomes available everywhere on that machine.

### Option 2 — project-level (only one repo)

Drop the folder into the target project at `.claude/skills/habi-security-sentinel/` and commit it. Anyone who clones the repo gets the skill scoped to that project.

### Option 3 — share via zip

```bash
cd .claude/skills
zip -r habi-security-sentinel.zip habi-security-sentinel
```

Send the zip. Recipient unzips into `~/.claude/skills/`.

## How to invoke

Plain language inside Claude Code — no slash command needed. Any of:

- "scan this for secrets"
- "review this diff for security"
- "is this MCP safe to install?"
- "audita este código"
- "check the headers of https://example.com"

Claude will load `SKILL.md`, classify the input, run the relevant references, and respond with a verdict block.

You can also call it explicitly: `/skill habi-security-sentinel` followed by your request.

## File layout

```
.claude/skills/habi-security-sentinel/
├── SKILL.md                          # entrypoint Claude reads first
├── INSTALL.md                        # this file
└── references/
    ├── secrets-scanner.md            # AWS, GCP, Stripe, JWT, Habi prefixes…
    ├── owasp-injection.md            # SQL, cmd, eval, NoSQL, XSS
    ├── auth-flow-review.md           # JWT alg:none, weak hash, IDOR
    ├── xpia-defense.md               # prompt injection in LLM code
    ├── habi-internal-policies.md     # cédulas, cuentas, HABI_ keys
    ├── skill-trust-validator.md      # 16 vectors OWASP LLM01-LLM10
    ├── web-runtime-scanner.md        # curl-based headers + paths + CORS
    └── report-format.md              # output template
```

## Limits vs the full server

| Capability                  | Portable skill | Full Sentinel server         |
| --------------------------- | -------------- | ---------------------------- |
| Same regex / heuristic bank | yes            | yes                          |
| Persistent audit log        | no             | yes (`sec_reviews` table)    |
| Multi-model consensus       | no             | yes (`/api/.../consensus`)   |
| LLM-enriched `auth-flow`    | no             | yes                          |
| Editable policies via UI    | no             | yes (`/sec-sentinel` panel)  |
| Hot reload of new skills    | no             | yes (`/api/.../skills/from-md`) |
| Pre-commit hook             | yes            | yes                          |
| Works offline, zero install | yes            | no (needs Node, port 4317)   |
| Shareable as `.zip`         | yes            | no                           |

If you need the missing capabilities, clone the full Sentinel repo and run `npm start` — this skill will detect the server at `http://localhost:4317` and add a dashboard link to its report.

## Optional: pre-commit hook

The skill is a Claude Code skill, but the patterns it ships are plain regexes — you can wire them into a git hook for shell-only enforcement:

```bash
# .git/hooks/pre-commit
#!/usr/bin/env bash
set -e
DIFF=$(git diff --cached --unified=0 | grep -E '^\+[^+]')
echo "$DIFF" | grep -EnI -f ~/.claude/skills/habi-security-sentinel/references/secrets.patterns && {
  echo "ERROR: secret detected by habi-security-sentinel"
  exit 1
}
```

(Generate `secrets.patterns` once by extracting the regexes from `references/secrets-scanner.md`.)

## Updating

The skill has no version pinning — replace the folder with a newer one. Patterns are regexes inside markdown, so diffing two versions is trivial:

```bash
diff -ru old/habi-security-sentinel new/habi-security-sentinel
```

## Autoría

**Victor Pinzón · Ciberseguridad Habi** — diseño del catálogo, reglas, packaging y validación.

Refleja el catálogo de `sec-skills/*.md` del servidor del Security Sentinel. Reportar issues o sugerir nuevos patrones a Victor Pinzón (`victorpinzon@habi.co`) — se backportean también al servidor.
