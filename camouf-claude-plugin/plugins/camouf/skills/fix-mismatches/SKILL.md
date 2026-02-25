---
name: fix-mismatches
description: >
  Fix detected mismatches in AI-generated code: rename drifted functions, correct
  field names, add missing parameters, and resolve contract violations. Uses
  `camouf_suggest_fix` to get precise fix instructions, then applies edits.
  Use after running validate when ERROR violations are found.
---

# Camouf Fix Mismatches

You have access to `camouf_validate` and `camouf_suggest_fix` MCP tools. Use them
to detect and fix architecture violations caused by AI-generated code.

## When to use

- After `camouf:validate` found ERROR violations
- When the user asks to fix mismatches, signature drift, or contract violations
- When you need to align generated code with canonical type definitions

## Workflow: Validate → Fix → Revalidate

Follow this exact loop (maximum 3 iterations):

### Iteration 1

1. **Validate**: Call `camouf_validate` to get all current violations
2. **Triage**: Focus on ERROR violations first (they cause runtime failures)
3. **Get fix guidance**: For each ERROR violation, call `camouf_suggest_fix` with:
   - `ruleId`: the rule that flagged the violation
   - `file`: the file containing the violation
   - `line`: the line number
   - `violationId`: the violation ID (if available)
4. **Apply fixes**: Edit the source files to apply the suggested changes:
   - Rename functions to match canonical definitions
   - Fix field/property names to match type definitions
   - Add missing parameters with sensible default values
   - Update import paths to match actual file locations
5. **Revalidate**: Call `camouf_validate` again to confirm fixes worked

### Iteration 2-3 (if needed)

Repeat steps 1-5 for any remaining violations. Stop after 3 iterations or when
zero ERROR violations remain.

## Fix strategies by violation type

### Function name drift
```
// Before (wrong):  getUser(userId)
// After (fixed):   getUserById(userId)
```
Rename the function call to match the canonical exported name.

### Missing parameters
```
// Before (wrong):  cancelOrder(orderId)
// After (fixed):   cancelOrder(orderId, reason)
```
Read the surrounding code to determine the correct value for the missing parameter.
Check request bodies, user inputs, or use a sensible default.

### Field name mismatch
```
// Before (wrong):  user.userEmail
// After (fixed):   user.email
```
Replace the incorrect field name with the one defined in the shared type.

### Phantom imports
```
// Before (wrong):  import { validate } from './helpers'
// After (fixed):   import { validateInput } from './utils/validation'
```
Find the actual module and function name, update the import path and binding.

## Important

- Always read the canonical type/function definition before applying a fix
- When adding missing parameters, use context from the surrounding code
- After applying fixes, ALWAYS revalidate to confirm
- If a fix introduces new violations, prioritize fixing those in the next iteration
