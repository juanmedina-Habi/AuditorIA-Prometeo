# xpia-defense — patterns + recipe

**Category:** ai-security · **Default severity:** high · **CWE:** CWE-77, CWE-94, CWE-1039 · **MITRE:** T1059, T1565 · **ATLAS:** AML.T0051, AML.T0054 · **OWASP-LLM:** LLM01, LLM02

Cross-Prompt-Injection defense for code that touches LLMs.

## When this runs

Class `ai-touching` fires when content mentions any of:

```
anthropic|openai|gemini|groq|openrouter|@anthropic-ai/sdk|openai/sdk
mcp_server|mcpServers|tool_call|tools\s*:\s*\[
messages\.push|messages\s*=\s*\[
system\s*:\s*["'`]|systemPrompt
```

## Patterns

| ID  | Title                                              | Regex                                                                                          | Severity |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------- |
| X01 | innerHTML / dangerouslySetInnerHTML w/ LLM output  | `(innerHTML\|dangerouslySetInnerHTML)[^;]*\b(completion\|response\|message\|llm_out\|content)` | critical |
| X02 | Tool name from external source                     | `name\s*:\s*[^,}]*\b(req\|request\|fetch\|input\|external)`                                    | critical |
| X03 | Tool description from external source              | `description\s*:\s*[^,}]*\b(req\|request\|fetch\|input\|external)`                             | critical |
| X04 | `JSON.parse` output fed into tool/agent call       | `(tool\|agent)\.(call\|invoke)\s*\(\s*JSON\.parse`                                             | high     |
| X05 | Substring jailbreak check (trivially bypassable)   | `\.includes\s*\(\s*['"](jailbreak\|ignore previous\|DAN)['"]\s*\)`                             | medium   |
| X06 | Concat prompt + req input w/o role separation      | `messages\.push\s*\(\s*\{[^}]*content\s*:\s*[^,}]*\+\s*req\.(body\|query\|params)`             | high     |
| X07 | System prompt embedding secret-like substrings     | `system\s*:\s*['"]\`[^'"]*\b(token\|api[_-]?key\|secret\|password)\b`                          | high     |
| X08 | Direct echo of user content as system role         | `\{\s*role\s*:\s*['"]system['"][^}]*content\s*:\s*[^,}]*req\.`                                 | critical |

## How to run

```bash
ROOT="."
# 1. Find AI-touching files first
AI_FILES=$(grep -RInlE -i 'anthropic|openai|gemini|groq|openrouter|mcpServers?|@anthropic-ai/sdk|messages\.push|tools\s*:\s*\[' \
  "$ROOT" --include="*.js" --include="*.ts" --include="*.tsx" --include="*.jsx" --include="*.py" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist 2>/dev/null)

# 2. Run XPIA patterns only against those files
[ -z "$AI_FILES" ] && { echo "no ai-touching files"; exit 0; }

cat > /tmp/xpia.patterns <<'EOF'
(innerHTML|dangerouslySetInnerHTML)[^;]*\b(completion|response|message|llm_out|content)
name\s*:\s*[^,}]*\b(req|request|fetch|input|external)
description\s*:\s*[^,}]*\b(req|request|fetch|input|external)
(tool|agent)\.(call|invoke)\s*\(\s*JSON\.parse
\.includes\s*\(\s*['"](jailbreak|ignore previous|DAN)['"]\s*\)
messages\.push\s*\(\s*\{[^}]*content\s*:\s*[^,}]*\+\s*req\.(body|query|params)
system\s*:\s*['"]\`[^'"]*\b(token|api[_-]?key|secret|password)\b
\{\s*role\s*:\s*['"]system['"][^}]*content\s*:\s*[^,}]*req\.
EOF

echo "$AI_FILES" | xargs grep -InE -f /tmp/xpia.patterns 2>/dev/null
```

## Mapping to finding

```
severity:   per table
remediation:
  X01: "Sanitize LLM output with DOMPurify or render with React text nodes (no dangerouslySetInnerHTML). Never trust model output as HTML."
  X02/X03: "Define tool name/description statically. Treat them as part of the trust boundary, not user-provided data."
  X04: "Validate the JSON.parse output against a schema (zod, ajv) before passing to the tool."
  X05: "Substring jailbreak checks are bypassable. Use a structured guardrail (LlamaGuard, Anthropic safety classifier) or reject via the model itself."
  X06/X08: "Always wrap user content in role=user. Never concatenate user input into the system prompt."
  X07: "Inject secrets via tools (function-calling) at runtime — don't bake them into the system prompt where the model can echo them."
```

## When this blocks vs warns

- X01, X02, X03, X08 → **critical / block**.
- X04, X06, X07 → **high / warn**.
- X05 → **medium / info**.
