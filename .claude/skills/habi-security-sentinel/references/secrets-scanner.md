# secrets-scanner — patterns + recipe

**Category:** secrets · **Default severity:** critical · **CWE:** CWE-798, CWE-200, CWE-312 · **MITRE:** T1552, T1552.001, T1552.004 · **OWASP:** A02:2021

Detects hardcoded credentials, API keys, tokens, private keys and high-entropy strings in code and diffs.

## Patterns

| ID  | Title                          | Regex (PCRE)                                                       | Severity |
| --- | ------------------------------ | ------------------------------------------------------------------ | -------- |
| S01 | AWS Access Key                 | `\b(AKIA\|ASIA)[0-9A-Z]{16}\b`                                     | critical |
| S02 | AWS Secret Access Key (bound)  | `aws_secret_access_key\s*=\s*['"][A-Za-z0-9/+=]{40}['"]`           | critical |
| S03 | GCP service account JSON       | `"type":\s*"service_account"`                                      | critical |
| S04 | Azure client secret            | `[a-zA-Z0-9_~.-]{34,40}\.[a-zA-Z0-9_~.-]{40,60}`                   | high     |
| S05 | GitHub PAT (classic/fine/oauth/install/refresh) | `\b(ghp\|gho\|ghs\|ghu\|ghr)_[A-Za-z0-9]{36,}\b`  | critical |
| S06 | Stripe live key                | `\b(sk\|pk)_live_[A-Za-z0-9]{20,}\b`                               | critical |
| S07 | Slack token                    | `\bxox[abprs]-[A-Za-z0-9-]{10,}\b`                                 | critical |
| S08 | SendGrid API key               | `\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b`                     | critical |
| S09 | Twilio API key (SK)            | `\bSK[a-f0-9]{32}\b`                                               | critical |
| S10 | JWT (3-segment)                | `\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b`   | high     |
| S11 | Private key block              | `-----BEGIN ((RSA\|EC\|DSA\|OPENSSH\|PGP) )?PRIVATE KEY-----`      | critical |
| S12 | Habi internal token prefix     | `\b(HABI_\|HBI_)[A-Z0-9_]{8,}\b`                                   | critical |
| S13 | Bound high-entropy assignment  | `(secret\|token\|password\|api[_-]?key\|auth[_-]?token\|access[_-]?key)\s*[:=]\s*['"][A-Za-z0-9+/=_-]{24,}['"]` | high (medium if length<32) |
| S14 | Generic bearer token literal   | `Bearer\s+[A-Za-z0-9_\-\.]{20,}`                                   | medium   |

## Ignore filter (false positives)

Skip any match whose **line** matches (case-insensitive):

```
example|placeholder|fake|test|fixture|sample|dummy|your-key|your_token|changeme|todo|xxxxx|<.*>
```

## How to run

### Against a directory tree (files)

```bash
# choose your scan root
ROOT="."
# build a pattern file
cat > /tmp/secrets.patterns <<'EOF'
\b(AKIA|ASIA)[0-9A-Z]{16}\b
aws_secret_access_key\s*=\s*['\"][A-Za-z0-9/+=]{40}['\"]
"type":\s*"service_account"
\b(ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{36,}\b
\b(sk|pk)_live_[A-Za-z0-9]{20,}\b
\bxox[abprs]-[A-Za-z0-9-]{10,}\b
\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b
\bSK[a-f0-9]{32}\b
\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b
-----BEGIN ((RSA|EC|DSA|OPENSSH|PGP) )?PRIVATE KEY-----
\b(HABI_|HBI_)[A-Z0-9_]{8,}\b
(secret|token|password|api[_-]?key|auth[_-]?token|access[_-]?key)\s*[:=]\s*['\"][A-Za-z0-9+/=_-]{24,}['\"]
Bearer\s+[A-Za-z0-9_\-\.]{20,}
EOF

# scan, excluding obvious noise dirs
grep -RInE -f /tmp/secrets.patterns "$ROOT" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=dist \
  --exclude-dir=build \
  --exclude-dir=vendor \
  --exclude=package-lock.json --exclude=yarn.lock --exclude=pnpm-lock.yaml \
  2>/dev/null \
  | grep -viE "example|placeholder|fake|fixture|dummy|your-key|your_token|changeme|todo|xxxxx" \
  > /tmp/secrets.hits
wc -l /tmp/secrets.hits
head -50 /tmp/secrets.hits
```

### Against a unified diff

```bash
DIFF=/tmp/d.diff   # path the user supplied
# limit to added lines only (skip diff metadata)
grep -nE '^\+[^+]' "$DIFF" | grep -EnF -f /tmp/secrets.patterns \
  | grep -viE "example|placeholder|fake|fixture|dummy|your-key|your_token|changeme|todo|xxxxx"
```

### High-entropy heuristic (optional, slower)

When the user explicitly asks for "deep secret hunt":

```bash
python3 - "$ROOT" <<'PY'
import os, re, math, sys
ROOT = sys.argv[1]
NAME = re.compile(r'(secret|token|password|api[_-]?key|auth[_-]?token|access[_-]?key)\s*[:=]\s*["\']([A-Za-z0-9+/=_\-]{24,})["\']', re.I)
SKIP = re.compile(r'example|placeholder|fake|fixture|dummy|your-key|changeme|todo|xxxxx', re.I)
SKIPDIR = {"node_modules", ".git", "dist", "build", "vendor"}

def entropy(s):
    if not s: return 0
    from collections import Counter
    c = Counter(s); n = len(s)
    return -sum((v/n) * math.log2(v/n) for v in c.values())

hits = []
for root, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in SKIPDIR]
    for f in files:
        p = os.path.join(root, f)
        try:
            with open(p, encoding="utf-8", errors="replace") as fh:
                for i, line in enumerate(fh, 1):
                    if SKIP.search(line): continue
                    m = NAME.search(line)
                    if m and entropy(m.group(2)) > 4.5:
                        hits.append((p, i, m.group(1), m.group(2)[:8]+"…"))
        except Exception:
            pass
for p, i, name, ev in hits[:200]:
    print(f"{p}:{i}\t{name}\t{ev}")
PY
```

## Mapping to finding

For each match emit:

```
severity:   per table above
title:      "Hardcoded secret: <name>"
file:       grep output (path:line)
line:       grep output line number
evidence:   first 40 chars of the matched substring, last 4 chars preserved, middle redacted with "…"
cwe:        ["CWE-798"]
mitre:      ["T1552", "T1552.001", "T1552.004"]
remediation: "Move to environment variable or secret manager (Vault, AWS Secrets Manager, GCP Secret Manager). Rotate immediately if this was ever committed."
```

## When this blocks vs warns

- Any named-pattern hit (S01-S03, S05-S09, S11-S12) → **critical / block**.
- JWT (S10), Azure (S04), bound entropy (S13) → **high / warn**.
- Generic bearer (S14) → **medium / warn**.
