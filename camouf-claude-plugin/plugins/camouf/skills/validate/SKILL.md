---
name: validate
description: >
  Validate the current project for AI-generated code mistakes: function name drift,
  phantom imports, field mismatches, contract violations, and architectural issues.
  Use this skill BEFORE committing code, after generating new files, or when you
  suspect cross-file inconsistencies. Invokes `camouf_validate` via MCP.
---

# Camouf Validate

You have access to the `camouf_validate` MCP tool. Use it to scan the current project
for architecture violations and AI-generated code mistakes.

## When to use

- After generating or modifying code in multiple files
- Before committing changes
- When the user asks to check for mismatches, violations, or architecture issues
- When you suspect a function name, type field, or import might be wrong

## Workflow

1. Call `camouf_validate` with no arguments to scan the full project
2. Review the returned violations — each includes:
   - `ruleId`: which rule detected the issue (e.g., `function-signature-matching`)
   - `severity`: `error`, `warning`, or `info`
   - `file` and `line`: exact location
   - `message`: human-readable explanation
   - `suggestion`: how to fix it
3. Summarize the violations grouped by severity
4. For ERROR violations, explain the specific mismatch (e.g., "You wrote `getUser()` but the canonical function is `getUserById()`")
5. Suggest concrete fixes

## Interpreting results

- **ERROR**: Must fix. The code will compile but fail at runtime (wrong function name, missing parameter, wrong field).
- **WARNING**: Should fix. Architectural smell that may cause problems later (circular dependency, layer violation).
- **INFO**: Nice to fix. Style inconsistency or orphaned code.

## Common violation types

| Rule ID | What it catches |
|---------|----------------|
| `function-signature-matching` | Function renamed by AI (e.g., `getUser` vs `getUserById`) |
| `contract-mismatch` | API call doesn't match OpenAPI/GraphQL schema |
| `ai-hallucinated-imports` | Import from a file or module that doesn't exist |
| `phantom-type-references` | Using a type that was never defined |
| `inconsistent-casing` | Mixed `camelCase` / `snake_case` in the same project |
| `orphaned-functions` | Functions defined but never called |
| `circular-dependencies` | Circular import chains |
| `layer-dependencies` | Frontend importing from backend, etc. |

## Example output interpretation

If camouf returns:
```
function-signature-matching ERROR in client/user.ts:42
  Called: getUser(userId)
  Defined: getUserById(id) in shared/api.ts:15
  Similarity: 75%
```

Explain: "You're calling `getUser(userId)` but the actual exported function is `getUserById(id)`. This is a common AI context-loss error — the AI generated a plausible but incorrect function name. Fix: rename `getUser` to `getUserById`."
