# Camouf Plugin — Architecture Guardrails for AI-Generated Code

This project uses **Camouf** to detect cross-file mismatches in AI-generated code.
You have access to 3 MCP tools: `camouf_validate`, `camouf_analyze`, `camouf_suggest_fix`.

---

## Skill: Validate

Use `camouf_validate` (no arguments) to scan the project for architecture violations.

**When to use:**
- After generating or modifying code in multiple files
- Before committing changes
- When you suspect a function name, type field, or import might be wrong

**Interpreting results:**
- **ERROR**: Must fix — code compiles but fails at runtime (wrong function name, missing parameter, wrong field)
- **WARNING**: Should fix — architectural smell that may cause problems later
- **INFO**: Nice to fix — style inconsistency or orphaned code

**Common violation types:**

| Rule ID | What it catches |
|---------|----------------|
| `function-signature-matching` | Function renamed by AI (e.g., `getUser` vs `getUserById`) |
| `contract-mismatch` | API call doesn't match OpenAPI/GraphQL schema |
| `ai-hallucinated-imports` | Import from a file or module that doesn't exist |
| `phantom-type-references` | Using a type that was never defined |
| `inconsistent-casing` | Mixed `camelCase` / `snake_case` in the same project |
| `orphaned-functions` | Functions defined but never called |

---

## Skill: Fix Mismatches

After `camouf_validate` finds ERROR violations, use this loop (max 3 iterations):

1. **Validate**: Call `camouf_validate`
2. **Triage**: Focus on ERROR violations first
3. **Fix**: For each ERROR, call `camouf_suggest_fix` with `ruleId`, `file`, `line`
4. **Apply**: Edit source files (rename functions, fix field names, add missing params, fix imports)
5. **Revalidate**: Call `camouf_validate` again to confirm fixes worked

Fix strategies:
- **Function name drift**: Rename call to match canonical export (e.g., `getUser` → `getUserById`)
- **Missing parameters**: Add missing param with value from surrounding context
- **Field name mismatch**: Replace with the field defined in the shared type (e.g., `user.userEmail` → `user.email`)
- **Phantom imports**: Find actual module/function, update import path

**Important**: Always fix the *consuming* code, not the canonical definition.

---

## Skill: Analyze Architecture

Use `camouf_analyze` BEFORE writing new code to understand:
- Layer structure (client, server, shared)
- Naming conventions (camelCase vs snake_case)
- Existing shared types (so you don't reinvent them)
- Dependency direction (don't import server from client)

This is the "analyze first, generate second" approach.

---

## Agent: Mismatch Detector

For comprehensive validation, follow this 5-phase protocol:

1. **Analyze**: `camouf_analyze` → understand architecture
2. **Validate**: `camouf_validate` → find violations
3. **Fix**: For each ERROR, `camouf_suggest_fix` → apply fixes to consuming code
4. **Revalidate**: `camouf_validate` → confirm fixes (max 3 iterations)
5. **Report**: Summarize found/fixed/remaining violations

**Rules**: Never modify canonical definitions. Max 3 iterations. Ask user when uncertain.

---

## Post-Edit Reminder

After modifying code files (.ts, .js, .tsx, .jsx, .py, .java, .go, .rs), if the edit
involves function signatures, type definitions, imports, or API contracts, run
`camouf_validate` to check for cross-file mismatches.

Before finishing a multi-file session, run a final `camouf_validate`.
