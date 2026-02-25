---
name: analyze-architecture
description: >
  Analyze the project's architecture: layer structure, dependency graph, naming
  conventions, and module coupling. Use this to understand the codebase before
  writing new code, or when planning refactoring. Invokes `camouf_analyze` via MCP.
---

# Camouf Analyze Architecture

You have access to the `camouf_analyze` MCP tool. Use it to understand the
project's architecture before generating or modifying code.

## When to use

- Before writing new code in an unfamiliar project
- When planning a refactoring or restructuring
- When the user asks about project architecture, dependencies, or conventions
- To understand layer boundaries before adding cross-module imports

## Workflow

1. Call `camouf_analyze` to get the full architecture analysis
2. Review the output, which includes:
   - **Layers**: the project's architectural layers (e.g., client, server, shared)
   - **Dependencies**: which modules depend on which
   - **Naming conventions**: casing patterns used in the project (camelCase, snake_case, etc.)
   - **Import patterns**: how modules reference each other
   - **Metrics**: file count, function count, type count per layer
3. Use this information to:
   - Follow existing naming conventions when generating new code
   - Respect layer boundaries (don't import server code from client)
   - Use the correct shared types instead of inventing new ones
   - Understand the dependency direction before adding imports

## How this prevents AI mistakes

AI agents with limited context windows often:

1. **Invent function names** instead of using existing ones → leads to signature drift
2. **Create new types** instead of importing shared ones → leads to type duplication
3. **Import across layer boundaries** (client → server) → breaks architecture
4. **Use inconsistent casing** (camelCase in a snake_case project) → breaks conventions

Running `camouf_analyze` BEFORE writing code gives you the context to avoid these mistakes.

## Example usage

Before generating a new API endpoint:
1. Run `camouf:analyze-architecture` to see existing layers and conventions
2. Identify the shared types that already exist for the domain
3. Check naming patterns (are functions `getX()` or `fetchX()`?)
4. Generate code that matches the existing patterns

This is the "analyze first, generate second" approach that prevents most AI context-loss errors.
