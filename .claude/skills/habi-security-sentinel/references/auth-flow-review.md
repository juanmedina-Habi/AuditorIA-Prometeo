# auth-flow-review — heuristics + recipe

**Category:** auth · **Default severity:** critical · **CWE:** CWE-287, CWE-285, CWE-862, CWE-863, CWE-639, CWE-326, CWE-327, CWE-347, CWE-521, CWE-208, CWE-916 · **MITRE:** T1078, T1110, T1556 · **OWASP:** A01:2021, A07:2021

The full Sentinel server uses LLM enrichment; this portable version is **heuristic-only**.

## When this runs

Class `sensitive-area` fires when any path matches:

```
/auth/|/login/|/session/|/oauth/|/jwt/|/permission/|/iam/|/admin/|/billing/|/payment/|/credit/|\.env|credentials
```

…or the content mentions: `jwt.sign`, `passport`, `bcrypt`, `oauth2`, `session.id`, `csrf`.

## Patterns

| ID  | Title                                     | Regex (PCRE)                                                                  | Severity | CWE     |
| --- | ----------------------------------------- | ----------------------------------------------------------------------------- | -------- | ------- |
| A01 | JWT `alg: none`                           | `algorithm\s*:\s*['"]none['"]`                                                | critical | CWE-347 |
| A02 | JWT signed with literal weak secret       | `jwt\.sign\([^)]*[,]\s*['"][^'"]{1,15}['"]`                                   | critical | CWE-326 |
| A03 | JWT signed with `'secret'` / `'changeme'` | `jwt\.sign\([^)]*['"]\s*(secret\|changeme\|test\|password\|123)\s*['"]`       | critical | CWE-798 |
| A04 | Password hashed with MD5/SHA1             | `(md5\|sha1)\s*\(\s*[^)]*(password\|passwd\|pwd)`                             | high     | CWE-327 |
| A05 | Password length policy < 8                | `password.{0,30}\.length\s*[<>]=?\s*[1-7]\b`                                  | high     | CWE-521 |
| A06 | Token comparison non-timing-safe          | `(token\|secret\|hmac\|signature)\s*[=!]==?\s*`                               | high     | CWE-208 |
| A07 | bcrypt cost factor < 8                    | `bcrypt(\.hash\|\.hashSync\|js\.hash)\s*\([^)]*,\s*[1-7]\b`                   | medium   | CWE-916 |
| A08 | Possible IDOR (req param into lookup)     | `find(One\|ById)?\s*\(\s*\{?\s*\w*[Ii]d\s*[:=]\s*req\.(params\|query\|body)\.` | high    | CWE-639 |
| A09 | Session id not regenerated on login       | `req\.session\..*=.*\n(?:(?!regenerate).)*$`                                  | medium   | CWE-384 |
| A10 | CSRF protection disabled                  | `csrf\s*:\s*false\|csurf.*\{\s*ignore`                                        | high     | CWE-352 |
| A11 | Cookie without secure/httpOnly            | `res\.cookie\([^)]*\)(?!.*(secure\|httpOnly))`                                | medium   | CWE-1004 |

## How to run

```bash
# decide the file set
FILES=$(find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.go" \) \
  -not -path "*/node_modules/*" -not -path "*/.git/*" \
  | xargs grep -lE 'jwt\.sign|passport|bcrypt|oauth2|session|csrf|/auth/|/login/' 2>/dev/null)

# run the pattern bank
cat > /tmp/auth.patterns <<'EOF'
algorithm\s*:\s*['"]none['"]
jwt\.sign\([^)]*[,]\s*['"][^'"]{1,15}['"]
jwt\.sign\([^)]*['"]\s*(secret|changeme|test|password|123)\s*['"]
(md5|sha1)\s*\(\s*[^)]*(password|passwd|pwd)
password.{0,30}\.length\s*[<>]=?\s*[1-7]\b
(token|secret|hmac|signature)\s*[=!]==?\s*
bcrypt(\.hash|\.hashSync|js\.hash)\s*\([^)]*,\s*[1-7]\b
find(One|ById)?\s*\(\s*\{?\s*\w*[Ii]d\s*[:=]\s*req\.(params|query|body)\.
csrf\s*:\s*false|csurf.*\{\s*ignore
EOF

[ -n "$FILES" ] && echo "$FILES" | xargs grep -InE -f /tmp/auth.patterns
```

## Mapping to finding

```
severity:    per table
title:       per pattern
cwe:         per table
remediation:
  A01:  "Pin algorithm explicitly (HS256/RS256) and reject 'none' on verify."
  A02:  "Use a 32+ byte random secret loaded from env or KMS."
  A04:  "Use bcrypt/argon2id with sane cost factor (≥10/12)."
  A05:  "Raise password policy to ≥12 chars or follow NIST 800-63B."
  A06:  "Use crypto.timingSafeEqual / hmac.compare_digest."
  A07:  "Raise bcrypt rounds to ≥10."
  A08:  "Verify resource ownership before returning. Don't trust client-supplied IDs."
  A10:  "Keep CSRF protection enabled for all state-changing endpoints."
  A11:  "Set { httpOnly: true, secure: true, sameSite: 'lax' } at minimum."
```

## When this blocks vs warns

- A01–A03 (JWT) → **critical / block**.
- A04, A05, A06, A08, A10 → **high / warn**.
- A07, A09, A11 → **medium / warn**.

## Note on parity with server version

The server-side `auth-flow-review` enriches these heuristics with an LLM (Anthropic/OpenAI/Groq/OpenRouter) when keys are available. This portable skill **never calls external LLMs** — it runs the heuristics only. Mention this in the report when this skill fires.
