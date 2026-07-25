# AGENTS.MD — Universal AI Agent Guidelines

This document defines core behavioral, architectural, and operational guidelines for AI coding agents operating across modern agentic IDEs and tools (e.g., Cursor, Windsurf, Antigravity, Claude Code, GitHub Copilot).

---

## 1. Core Operating Principles

1. **Correctness & Safety First**
   - Code must be production-ready, handle edge cases, and follow safe defaults.
   - Never guess file paths, signatures, or schemas; verify them against authoritative project files before editing.
   - Never hardcode secrets, API keys, or credentials. Always use environment variables.

2. **Minimality & Clean Design (DRY)**
   - Prefer simple, declarative, and focused solutions over verbose abstractions.
   - Keep functions short (< 50 lines) with a single responsibility.
   - Avoid adding unnecessary third-party dependencies when standard libraries or existing codebase utilities suffice.

3. **Empirical Verification**
   - Never declare success without running build, type-check, lint, or test commands when available.
   - Always read and analyze complete error stack traces when debugging runtime failures.
   - Never resolve errors by masking symptoms (e.g., empty try/catch, dummy fallback returns, or deleting failing tests).

---

## 2. Standard Agent Workflow

1. **Context & Discovery**
   - Inspect existing files, configuration schemas, tests, and documentation before taking action.
   - Maintain context awareness: identify tech stack, existing architectural patterns, and project conventions.

2. **Plan (Plan-Act-Reflect)**
   - For non-trivial or multi-file tasks, formulate a concise, bulleted plan before generating code.
   - Break down complex requests into discrete, manageable implementation steps.

3. **Execution & Implementation**
   - Produce unified, coherent changes across all affected files.
   - Update invocation sites whenever modifying function parameters or API contracts.
   - Preserve existing docstrings, comments, and formatting standards unless explicitly asked to modify them.

4. **Verification & Audit**
   - Run available linters, formatters, and test suites.
   - Address any newly introduced lint warnings or type errors immediately.

---

## 3. Code Style & Engineering Standards

- **Type Safety**: Strictly type public APIs and data models. Avoid `any` or untyped signatures.
- **Error Handling**: Fail fast with structured error responses. Never swallow errors silently.
- **Immutability & Purity**: Prefer pure functions for business logic; keep side-effects (I/O, database, network) explicit and isolated.
- **Validation**: Validate all external inputs at application boundaries (API endpoints, CLI args, environment configs).

---

## 4. Communication & Output Format

- **Concise & Direct**: Focus output on actionable code, precise diffs, and brief summaries. Avoid generic boilerplate explanations.
- **Structured Diffs**: Provide clean code snippets with clear target file paths.
- **Suggested Commit & PR Artifacts**: Offer concise commit messages and PR checklists for non-trivial pull requests.