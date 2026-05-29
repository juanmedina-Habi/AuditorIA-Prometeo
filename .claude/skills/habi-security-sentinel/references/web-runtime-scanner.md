# web-runtime-scanner — live-URL checks (curl-based)

**Category:** runtime · **Default severity:** high · **CWE:** CWE-693, CWE-200, CWE-942, CWE-16 · **MITRE:** T1190, T1592, T1595 · **OWASP:** A05:2021, A07:2021

Self-contained re-implementation of the Sentinel's `scripts/runtime/web-security-check.sh` — uses only `curl` and `openssl`.

## Constraints

- Only `http://` and `https://` accepted. Reject anything else with: `target_url must use scheme http:// or https://`.
- If the user provides multiple URLs, scan one at a time and aggregate findings.
- The user is responsible for authorization. Never scan third-party sites the user does not own.

## Six phases

### 1. Connectivity

```bash
URL="https://example.com"
curl -sI -o /tmp/h.txt -w "code=%{http_code}\nbytes=%{size_download}\ntime=%{time_total}\n" --max-time 10 "$URL"
```

- Code 0 / timeout → **critical** "target unreachable".
- Code 5xx → **medium** "server error" (likely transient).

### 2. Security headers

```bash
curl -sIL --max-time 10 "$URL" > /tmp/h.txt
for h in content-security-policy x-frame-options x-content-type-options strict-transport-security referrer-policy permissions-policy; do
  grep -iq "^$h:" /tmp/h.txt || echo "MISSING:$h"
done
# info-disclosure (presence-based)
grep -iE '^(server|x-powered-by):' /tmp/h.txt
```

- Missing CSP → **medium** (CWE-693)
- Missing HSTS on https → **medium** (CWE-319)
- Missing X-Frame-Options + no `frame-ancestors` in CSP → **medium** (CWE-1021)
- Missing X-Content-Type-Options → **low** (CWE-693)
- Server / X-Powered-By present → **info** (CWE-200) — but if value is `Google Frontend`, `cloudflare`, `awselb`, treat as **info only**, not removable from the app (memory: managed-infra headers).

### 3. HTTPS / TLS

```bash
if [[ "$URL" == https://* ]]; then
  HOST=$(echo "$URL" | awk -F/ '{print $3}' | awk -F: '{print $1}')
  echo | openssl s_client -servername "$HOST" -connect "$HOST:443" 2>/dev/null \
    | openssl x509 -noout -dates -issuer -subject
fi
```

- Cert expires < 14 days → **high**
- Cert expired → **critical**
- Self-signed in production → **high**
- HTTP only (no https redirect) → **high** (CWE-319)

### 4. Sensitive paths (19 paths)

```bash
for p in /.env /.git/config /admin /actuator /actuator/health /actuator/env \
         /swagger /swagger-ui /swagger-ui.html /v2/api-docs /api-docs \
         /graphql /graphiql /phpinfo.php /server-status /console /debug \
         /backup.zip /db.sql; do
  CODE=$(curl -sk -o /tmp/body -w "%{http_code}" --max-time 5 "$URL$p")
  if [[ "$CODE" == "200" ]]; then
    # validate body matches expected signature, not just the SPA index (memory: scanner content validation)
    BYTES=$(wc -c < /tmp/body)
    case "$p" in
      /.env)         grep -qE '^[A-Z_]+=' /tmp/body && echo "FOUND:$p (env-like)" ;;
      /.git/config)  grep -qE '\[core\]|\[remote' /tmp/body && echo "FOUND:$p (git config)" ;;
      /admin)        grep -qiE 'login|admin|password' /tmp/body && echo "FOUND:$p (admin panel)" ;;
      /actuator*)    grep -qE '"status"|"links"' /tmp/body && echo "FOUND:$p (actuator)" ;;
      /swagger*|/v2/api-docs|/api-docs)
                     grep -qE '"swagger"|"openapi"|swagger-ui' /tmp/body && echo "FOUND:$p (swagger)" ;;
      /graphql*)     grep -qE 'GraphQL|"data"|"errors"' /tmp/body && echo "FOUND:$p (graphql)" ;;
      /phpinfo.php)  grep -qE 'phpinfo\(\)|PHP Version' /tmp/body && echo "FOUND:$p (phpinfo)" ;;
      /server-status) grep -qE 'Apache Server Status' /tmp/body && echo "FOUND:$p" ;;
      *)             [[ "$BYTES" -gt 200 ]] && echo "POSSIBLE:$p (code 200, $BYTES bytes — verify manually)" ;;
    esac
  fi
done
```

Severity:
- `/.env`, `/.git/config`, `/phpinfo.php`, `/actuator/env`, `/backup.zip`, `/db.sql` → **critical**
- `/admin` (login form returned), `/swagger`, `/graphql` (exposed schema) → **high**
- `/server-status`, `/console`, `/debug` → **high**
- Generic 200 without signature match → **info / verify manually** (memory: never flag medium without body validation).

### 5. HTTP methods

```bash
for m in TRACE PUT DELETE PATCH OPTIONS; do
  CODE=$(curl -skI -X "$m" -o /dev/null -w "%{http_code}" --max-time 5 "$URL")
  echo "$m $CODE"
done
```

- TRACE 200 → **medium** (CWE-200, XST risk).
- PUT/DELETE without 401/403/405 at root path → **high** (CWE-285).
- OPTIONS Allow header listing PUT/DELETE → **info**.

### 6. CORS

```bash
curl -sIH 'Origin: https://evil.example' --max-time 10 "$URL" \
  | grep -iE '^access-control-allow-(origin|credentials)'
```

- `access-control-allow-origin: *` AND `allow-credentials: true` → **critical** (CWE-942).
- Reflects `evil.example` back AND `allow-credentials: true` → **critical**.
- `access-control-allow-origin: *` alone → **medium**.

## Scoring

Start at 100. Subtract:

- 25 per critical
- 10 per high
- 5 per medium
- 0 per low/info

Verdict:
- score < 30 → **block**
- 30–59 → **warn**
- ≥ 60 → **pass**

## Mapping to finding

```
severity:    per phase rules
title:       "<phase>: <symptom>" e.g. "Headers: missing CSP"
file:        target URL (not a file)
line:        null (or HTTP status)
evidence:    relevant header line / response excerpt (truncated to 120 chars)
remediation: per phase
```

## Output template

```
runtime-scan: <url>
score: <N>/100  verdict: <pass|warn|block>

phase 1 (connectivity): code <N>, <ms>ms
phase 2 (headers): missing=<list>; present=<list>
phase 3 (tls): <subject>; expires=<date>
phase 4 (paths): found=<list>
phase 5 (methods): TRACE=<N> PUT=<N> DELETE=<N>
phase 6 (cors): allow-origin=<value> credentials=<bool>

findings:
  <severity>: <title> — <evidence>
    -> <remediation>
```
