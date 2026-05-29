---
name: habi-security-sentinel
description: Runs Habi Security Sentinel checks (secrets, OWASP injection, auth, XPIA, OWASP LLM16, Habi internal policies, web runtime scan) on diffs, files, snippets, skill/MCP manifests, or live URLs — fully self-contained, no server required. Realizado por Victor Pinzón · Ciberseguridad Habi. Trigger on "scan for secrets", "is this safe to commit", "review this diff for security", "audita este código", "revisa seguridad", "check this for injection", "is this MCP safe", "validate this skill manifest", "check the headers of this URL", "runtime scan", "scan secrets", "consensus review".
author: Victor Pinzón · Ciberseguridad Habi
version: 1.0.0
---

# Habi Security Sentinel (portable)

Self-contained security review skill — the portable counterpart of the Habi Security Sentinel server. Runs the same 7 check families using only the host's `bash`, `grep`, `python3` and `curl`, so it can be shared by zipping or copying this folder into any `~/.claude/skills/` directory.

## When to invoke

Activate on any of:

- User pastes a diff/file/snippet and asks "is this safe?", "review for security", "scan for secrets", "check injection", "audit auth".
- User gives a `.md` that looks like a skill/agent/MCP manifest (`name:` + `description:` frontmatter, `SKILL.md`, `AGENT.md`, `.mcp.json`) and asks if it is safe to install.
- User provides a URL and asks "check the headers", "is this site secure", "runtime scan".
- User asks for a "consensus" / "second opinion" — note that this portable version does *not* call multiple LLMs; tell the user and offer to escalate to the full Sentinel server if available.

Do **not** activate for general security education ("what is OWASP A03?") — answer those directly.

## Input contract

Classify the input first, then load the matching reference(s) from `references/`:

| Input shape                              | Classes triggered             | References to load                                                                                                              |
| ---------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Unified diff                             | `static`                      | `secrets-scanner.md`, `owasp-injection.md`, `habi-internal-policies.md`                                                         |
| Source files (one or more)               | `static` (+ derived)          | as above, plus auth/xpia/skill-trust if paths match                                                                             |
| Inline text                              | `static`                      | as diff                                                                                                                         |
| Path touches `/auth/` `/login/` `bcrypt` | + `sensitive-area`            | add `auth-flow-review.md`                                                                                                       |
| Content mentions LLM provider / MCP      | + `ai-touching`               | add `xpia-defense.md`                                                                                                           |
| `.md` with skill frontmatter / `.mcp.json` | + `skill-manifest`          | add `skill-trust-validator.md`                                                                                                  |
| Live URL                                 | `runtime`                     | only `web-runtime-scanner.md`                                                                                                   |

Always load `report-format.md` at the end to format the final verdict block.

## Workflow

1. **Detect classes.** Apply the rules in the table above. Be explicit in the response about which classes fired ("classes: static, sensitive-area") so the user can see what was checked.
2. **Load the matching reference(s)** with the `Read` tool. Each reference is a runnable recipe: a list of `grep`/`curl` invocations you execute via `Bash`. Do **not** invent additional checks — if the reference does not list a pattern, do not flag it.
3. **Execute the recipes.** Collect every match as a `finding` with `severity`, `title`, `file`, `line`, `evidence`, `remediation`. Skip lines containing placeholder markers (`example`, `placeholder`, `fake`, `test`, `fixture`, `sample`, `dummy`, `your-key`, `changeme`).
4. **Score the verdict.**
   - any `critical` → **block**
   - any `high` (no critical) → **warn**
   - only `medium`/`low`/`info` → **warn** if ≥3 mediums, else **pass**
   - nothing → **pass**
5. **Report** using `references/report-format.md`. Always include: verdict, counts by severity, list of skills run, top 5 findings grouped by severity, dashboard hint.

## Critical rules

- **Do not reimplement patterns from memory.** Always load the reference and use the patterns it ships. This is what guarantees consistency across users who share the skill.
- **Do not invent findings.** If grep returns nothing, the verdict is `pass`. Do not add speculative "but you might want to check…" items unless the user explicitly asks for extra suggestions.
- **For URLs, only http/https.** Reject `file://`, `ftp://` with a clear error.
- **Honor placeholder markers.** A pattern hit on a line containing `example|placeholder|fake|test|fixture|sample|dummy|your-key|changeme|todo` is filtered out (matches the server behavior).
- **Pass full context.** When the user gives a diff, scan the whole diff including filenames — `secrets-scanner` matches against headers like `+++ b/.env`.
- **Bypass discipline.** Never tell the user "skip the check" unless they explicitly need a hotfix during an incident; even then, recommend documenting the bypass.

## Limits of this portable version

- No persistent audit log (the server stores every review in `sec_reviews`; this skill does not).
- No multi-model `consensus` endpoint — only the single Claude session running this skill.
- LLM-powered `auth-flow-review` falls back to heuristic-only mode.
- No `target_url` allowlist enforcement — the user must ensure they are authorized to scan the target.

If the user needs any of those, point them to the full server: clone the repo containing `lib/sec-engine.js` and `npm start` to expose `http://localhost:4317`.

## Quick decision tree

| User said…                                  | Skills that run                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| "scan this for secrets"                     | secrets-scanner + habi-internal-policies                                                         |
| "is this diff safe to commit?"              | secrets + owasp + habi-policies (+ xpia if AI code, + auth-flow if sensitive path)               |
| "scan this URL"                             | web-runtime-scanner only                                                                         |
| "is this MCP / skill safe to install?"      | secrets + owasp + habi-policies + skill-trust-validator (+ xpia if AI code)                      |
| "review this auth flow"                     | secrets + owasp + habi-policies + auth-flow-review (+ xpia if LLM-touching)                      |
| "give me a consensus / second opinion"      | Run the normal set, then **state explicitly** that consensus needs the full Sentinel server.     |
