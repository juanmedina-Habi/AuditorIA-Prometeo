# report-format — final output template

Use exactly this layout when reporting back to the user. It mirrors the server-side Sentinel's compact verdict block so users get a consistent experience whether they hit the local skill or the full server.

## Template

```
verdict: <pass|warn|block>  score: <N>/100  skills: <comma-separated names>
classes: <static|runtime|sensitive-area|ai-touching|skill-manifest>
counts:  critical=<N>  high=<N>  medium=<N>  low=<N>  info=<N>

<SEVERITY> (<count>)
  • <title> — <file>:<line>
    evidence: <truncated to 120 chars>
    -> <remediation>

<next severity> …

notes:
  • <any caveat: heuristic-only auth, FP on V12, content validation skipped, etc.>
```

## Rules

1. **Always lead with the verdict line.** No preamble.
2. **Group findings by severity, critical first.** Inside a group order by file path.
3. **Cap each severity group at 5 entries in the user-facing output.** If more, add `… and <N> more` at the end of the group. Keep the full list in `/tmp/sentinel-findings.json` for the user to dig into.
4. **Use [path](path) markdown links** when in VSCode, with `#L<line>` when a line number is present (matches the workspace `claudeMd` instruction).
5. **End with a one-line pointer.** If the full Sentinel server is reachable (`curl -sf -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:4317/api/sec-sentinel/health` returns 200), include `Dashboard: http://localhost:4317/sec-sentinel`. Otherwise, include `Tip: install the full Sentinel server for audit log + consensus.`
6. **Honesty.** If a check was skipped (e.g. no `target_url` provided so phase 3 didn't run, or LLM enrichment is unavailable), say so in `notes:`.

## Verdict thresholds (reminder)

- any `critical` → **block**
- any `high` (no critical) → **warn**
- ≥3 `medium` → **warn**
- otherwise → **pass**

## Examples

### Pass
```
verdict: pass  score: 98/100  skills: secrets-scanner, habi-internal-policies, owasp-injection
classes: static
counts:  critical=0  high=0  medium=1  low=0  info=2

MEDIUM (1)
  • TODO de seguridad sin resolver — src/auth/login.js:142
    evidence: // TODO: SEC review error path
    -> Resolver el TODO o crear ticket Jira y referenciarlo.

Tip: install the full Sentinel server for audit log + consensus.
```

### Block
```
verdict: block  score: 0/100  skills: secrets-scanner, owasp-injection, habi-internal-policies
classes: static, sensitive-area
counts:  critical=2  high=1  medium=0  low=0  info=0

CRITICAL (2)
  • Hardcoded secret: AWS Access Key — config/staging.env:3
    evidence: AKIA…CDEF
    -> Move to environment variable or secret manager. Rotate immediately.
  • Injection risk: eval() with dynamic input — server/handler.js:47
    evidence: eval(req.body.expr)
    -> Replace eval with a safe parser or dispatcher map.

HIGH (1)
  • Hash débil para password (MD5/SHA1) — src/auth/legacy.js:88
    evidence: md5(password)
    -> Use bcrypt / argon2id with cost ≥ 10.

Dashboard: http://localhost:4317/sec-sentinel
```
