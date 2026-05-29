# skill-trust-validator — 16 vectors OWASP LLM01–LLM10

**Category:** ai-skill-trust · **Default severity:** critical · **CWE:** CWE-77, CWE-94, CWE-200, CWE-1039, CWE-1357 · **MITRE:** T1059, T1565, T1195 · **ATLAS:** AML.T0051, AML.T0054, AML.T0070 · **OWASP-LLM:** LLM01–LLM10

## When this runs

Class `skill-manifest` fires when **any** of these is true:

- A file path ends in `SKILL.md`, `AGENT.md`, `.skill.md`, `.agent.md`, `.mcp.json`, `mcp-config.json`.
- A `.md` file has frontmatter with both `name:` and `description:`.
- The content contains `"mcpServers":` or `## Skill:` header.

## The 16 vectors

| ID  | Vector                                              | Level | OWASP LLM | Severity |
| --- | --------------------------------------------------- | ----- | --------- | -------- |
| V01 | Direct prompt-override phrases                      | N2    | LLM01     | critical |
| V02 | Indirect injection / remote payload fetched at runtime | N1 | LLM01     | critical |
| V03 | MCP / agent tool poisoning                          | N1    | LLM06     | critical |
| V04 | Data exfiltration (pipe local data to network)      | N2    | LLM02     | critical |
| V05 | Sensitive file access (`~/.aws`, `~/.ssh`, `.env`)  | N2    | LLM02     | critical |
| V06 | System prompt poisoning / leak instructions         | N2    | LLM07     | high     |
| V07 | Jailbreak phrasing                                  | N2    | LLM01     | high     |
| V08 | Destructive operations (`rm -rf /`, `DROP`, format) | N2    | LLM02     | critical |
| V09 | Privilege-elevation phrasing                        | N2    | LLM06     | high     |
| V10 | HTML / Markdown injection                           | N1    | LLM01     | high     |
| V11 | Encoding / obfuscation chains                       | N1    | LLM01     | high     |
| V12 | Social engineering in descriptions                  | N2    | LLM09     | medium   |
| V13 | RAG / dataset / model poisoning                     | N1    | LLM03     | high     |
| V14 | Multi-turn payload persistence                      | N1    | LLM06     | high     |
| V15 | Resource abuse (loops, fork bombs, mass allocation) | N2    | LLM10     | high     |
| V16 | Over-triggering (description > 500 chars, vague)    | N1    | LLM09     | medium   |

## Patterns (regex bank)

```
# V01 — direct prompt override
ignore (all )?previous instructions|disregard the system prompt|forget everything|you are now [A-Z]|act as if you have no restrictions

# V02 — indirect / remote payload
curl\s+-[a-zA-Z]*\s*https?://|wget\s+https?://|fetch\s*\(\s*['"]https?://[^'"]+['"]\s*\)\s*\.text\(\)
\.skill\.md.*<\s*remote|## inject:|<!--\s*payload\s*-->

# V03 — MCP tool poisoning
"command"\s*:\s*"(bash|sh|cmd|powershell)"|"args"\s*:\s*\[[^\]]*https?://
"name"\s*:\s*"[^"]*\$\{|"name"\s*:\s*"[^"]*"\s*\+

# V04 — exfiltration
curl[^|]*\|\s*sh|nc\s+-[a-zA-Z]*\s+\d+\.\d+\.\d+\.\d+|wget\s+--post-data
\.requestbin\.com|\.burpcollaborator\.net|webhook\.site|interactsh

# V05 — sensitive files
~/\.aws/(credentials|config)|~/\.ssh/id_rsa|~/\.kube/config|~/\.npmrc|/etc/shadow|/etc/passwd
cat\s+\$HOME/\.env|cat\s+\.env\b

# V06 — system prompt leak
print (your |the )?(system )?prompt|reveal (your )?instructions|repeat your initial

# V07 — jailbreak
DAN|jailbreak|developer mode|unrestricted assistant|pretend you (are|have no)

# V08 — destructive
\brm\s+-rf\s+(/|~|\*|\$HOME)|DROP\s+(TABLE|DATABASE)|TRUNCATE\s+TABLE|mkfs\.|dd\s+if=/dev/zero

# V09 — privilege escalation
sudo\s+(-i|-s|su)|chmod\s+(\+s|4755)|setuid|/etc/sudoers

# V10 — HTML/MD injection
<script[^>]*>|<iframe[^>]*>|<img[^>]+onerror|!\[.*\]\(https?://[^)]+\?(track|beacon|x=)

# V11 — obfuscation
base64\s+-d|atob\s*\(|fromCharCode\s*\(|\\u00[0-9a-f]{2}.{0,10}\\u00[0-9a-f]{2}.{0,10}\\u00

# V12 — social engineering in description
\b(urgent|asap|critical|trust me|admin says|official policy|must run immediately)\b

# V13 — RAG/model poisoning
huggingface\.co/[^/]+/[^/]+(?!.*revision=)|pip install [a-z0-9_-]+(?!==)|npm install [a-z0-9_-]+(?!@)

# V14 — persistence
remember this for (all|every) future|store this in memory|persist this instruction|save to (\.claude|CLAUDE\.md)

# V15 — resource abuse
while\s*\(\s*true\s*\)|:(\)\s*\{\s*:\|:&\s*\}\s*;\s*:|for.*range\(10\*\*[6-9]\)

# V16 — over-triggering: applied as a heuristic on description length / vagueness, not a regex
```

## How to run

```bash
# 1. Identify the manifest(s) to validate
MANIFESTS=$(find . -type f \( -name "SKILL.md" -o -name "AGENT.md" -o -name "*.skill.md" -o -name "*.agent.md" -o -name "*.mcp.json" -o -name "mcp-config.json" \) -not -path "*/node_modules/*" -not -path "*/.git/*")

# 2. Also include .md files with skill-like frontmatter
FRONTMATTER=$(grep -lE '^---$' $(find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*") 2>/dev/null \
  | xargs grep -lE '^name:.*\n.*description:' 2>/dev/null)

ALL="$MANIFESTS
$FRONTMATTER"

# 3. Run the regex bank
cat > /tmp/skill-trust.patterns <<'EOF'
ignore (all )?previous instructions|disregard the system prompt|forget everything
curl\s+-[a-zA-Z]*\s*https?://|wget\s+https?://
"command"\s*:\s*"(bash|sh|cmd|powershell)"
curl[^|]*\|\s*sh|nc\s+-[a-zA-Z]*\s+\d+\.\d+\.\d+\.\d+
\.requestbin\.com|\.burpcollaborator\.net|webhook\.site|interactsh
~/\.aws/(credentials|config)|~/\.ssh/id_rsa|/etc/shadow|/etc/passwd
print (your |the )?(system )?prompt|reveal (your )?instructions
DAN|jailbreak|developer mode|unrestricted assistant
\brm\s+-rf\s+(/|~|\*|\$HOME)|DROP\s+(TABLE|DATABASE)|TRUNCATE\s+TABLE|mkfs\.
sudo\s+(-i|-s|su)|chmod\s+(\+s|4755)|setuid
<script[^>]*>|<iframe[^>]*>|<img[^>]+onerror
base64\s+-d|atob\s*\(|fromCharCode\s*\(
huggingface\.co/[^/]+/[^/]+
remember this for (all|every) future|store this in memory|persist this instruction
while\s*\(\s*true\s*\)|:\(\)\s*\{\s*:\|:&\s*\}
EOF

echo "$ALL" | grep -v '^$' | xargs grep -InEi -f /tmp/skill-trust.patterns 2>/dev/null

# 4. V16 — over-triggering: parse frontmatter description length
python3 - <<'PY'
import re, sys, os
for root, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d not in {"node_modules", ".git", "dist"}]
    for f in files:
        if not f.endswith(".md"): continue
        p = os.path.join(root, f)
        try:
            with open(p, encoding="utf-8", errors="replace") as fh:
                text = fh.read()
        except Exception: continue
        m = re.match(r'^---\s*\n(.*?)\n---', text, re.S)
        if not m: continue
        fm = m.group(1)
        d = re.search(r'^description:\s*(.+)$', fm, re.M)
        if d and len(d.group(1)) > 500:
            print(f"{p}:V16:over-triggering: description {len(d.group(1))} chars")
PY
```

## Mapping to finding

For each match emit `severity` per the table above, with `vector` field set to `V01..V16`.

Dedupe by `(file, line, vector)`.

## Common false positives

- **V12 (social engineering)** fires on legitimate security skill language like "Critical rules", "Stop signals", "must validate". When V12 is the *only* finding on a skill that is clearly security-oriented, mark it as **info** and note the FP in the report.
- **V09** can fire on doc snippets explaining how attackers escalate privileges (educational content). Treat as info if the surrounding context is `## How attackers do X` or `### Educational`.
- **V11** can fire on legitimate base64-encoded asset embeds (small icons in CSS). Only flag when paired with `eval`, `Function`, or `exec`.

## When this blocks vs warns

- Any **critical-level vector** (V01, V02, V03, V04, V05, V08) → **block**.
- Any **high vector** (V06, V07, V09, V10, V11, V13, V14, V15) → **warn**.
- V12, V16 only → **pass with notes** (and call out the likely FP).
