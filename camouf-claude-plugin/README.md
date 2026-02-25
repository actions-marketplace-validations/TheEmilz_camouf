# Camouf — Claude Code Plugin

> **Catches the mistakes AI coding assistants make** — broken contracts, phantom imports, signature drift, and architectural violations that traditional linters miss entirely.

## What is Camouf?

When AI agents generate code, they work with limited context windows. This causes predictable problems:

- **Function name drift** — the AI writes `getUser()` instead of the canonical `getUserById()`
- **Parameter mismatches** — the AI omits required parameters
- **Field name errors** — the AI writes `user.userEmail` instead of `user.email`
- **Phantom imports** — the AI imports from files that don't exist

These errors compile fine but **break at runtime**. ESLint doesn't catch them. TypeScript passes. Camouf catches them by comparing generated code against your canonical type definitions across the entire codebase.

## Plugin Components

### Skills

| Skill | Description |
|-------|-------------|
| `/camouf:validate` | Scan the project for AI-generated code mistakes and architectural violations |
| `/camouf:fix-mismatches` | Detect and fix function name drift, field mismatches, and contract violations |
| `/camouf:analyze-architecture` | Analyze project architecture before writing code to prevent mistakes |

### Agent

| Agent | Description |
|-------|-------------|
| `camouf:mismatch-detector` | Specialized agent that runs the full validate → fix → revalidate workflow |

### Hooks

| Event | Behavior |
|-------|----------|
| `PostToolUse` (Write/Edit) | Prompts Claude to validate after code changes that might introduce mismatches |
| `Stop` | Reminds Claude to run a final validation before finishing multi-file sessions |

### MCP Server

The plugin bundles the Camouf MCP server, which exposes three tools:

| Tool | Description |
|------|-------------|
| `camouf_validate` | Scans the project for violations with file paths, line numbers, and fix suggestions |
| `camouf_analyze` | Analyzes project structure, layers, dependencies, and naming conventions |
| `camouf_suggest_fix` | Returns specific fix steps for a given violation |

## Prerequisites

- Node.js 18+
- A project with `camouf.config.json` (run `npx camouf init` to create one)

## Quick Start

1. Install the plugin in Claude Code:
   ```bash
   claude plugin install camouf
   ```

2. Initialize camouf in your project (if not already done):
   ```bash
   npx camouf init
   ```

3. Use the skills:
   ```
   /camouf:validate
   /camouf:fix-mismatches
   /camouf:analyze-architecture
   ```

Or just let Claude use camouf automatically — the hooks will prompt validation after relevant edits.

## How It Works

```
  You write code with Claude
           │
           ▼
  Claude edits files (Write/Edit)
           │
           ▼
  PostToolUse hook fires
           │
           ▼
  Claude calls camouf_validate
           │
           ▼
  Camouf scans cross-file contracts
           │
      ┌────┴────┐
      │         │
   Clean    Violations found
      │         │
      ▼         ▼
   Continue   Claude calls camouf_suggest_fix
              │
              ▼
           Claude applies fixes
              │
              ▼
           Revalidate (up to 3x)
```

## What Camouf Catches (that other tools miss)

| Error Type | Example | ESLint | TypeScript | Camouf |
|------------|---------|--------|------------|--------|
| Function name drift | `getUser()` vs `getUserById()` | ❌ | ❌ | ✅ |
| Phantom imports | `import { x } from './nonexistent'` | ❌ | ⚠️ | ✅ |
| Field mismatch | `user.userEmail` vs `user.email` | ❌ | ❌* | ✅ |
| Context drift | Same concept named differently across files | ❌ | ❌ | ✅ |
| Missing parameters | `cancelOrder(id)` vs `cancelOrder(id, reason)` | ❌ | ❌* | ✅ |
| Layer violations | Frontend importing from backend | ❌ | ❌ | ✅ |

*TypeScript catches these only with strict typing and no `any` — which AI-generated code often lacks.

## Configuration

Camouf is configured via `camouf.config.json` in your project root. Minimal example:

```json
{
  "rules": {
    "function-signature-matching": "error",
    "ai-hallucinated-imports": "error",
    "inconsistent-casing": "warning"
  },
  "layers": [
    { "name": "shared", "path": "shared" },
    { "name": "client", "path": "client" },
    { "name": "server", "path": "server" }
  ]
}
```

See [configuring rules](https://github.com/TheEmilz/camouf/blob/master/docs/configuring-rules.md) for the full reference.

## Supported Languages

TypeScript, JavaScript, Python, Java, Go, Rust

## Links

- [GitHub Repository](https://github.com/TheEmilz/camouf)
- [Documentation](https://github.com/TheEmilz/camouf#readme)
- [MCP Agent Tutorial](https://github.com/TheEmilz/camouf/blob/master/docs/mcp-agent-tutorial.md)
- [Creating Plugins](https://github.com/TheEmilz/camouf/blob/master/docs/creating-plugins.md)

## License

Apache-2.0
