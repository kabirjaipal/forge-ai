# AGENTS.md — Universal AI Agent Guidelines for ForgeAI

This document defines core behavioral, architectural, and operational guidelines for AI coding agents operating across modern agentic IDEs and tools (e.g., Cursor, Windsurf, Antigravity, Claude Code, GitHub Copilot).

---

## 1. Core Operating Principles

1. **Correctness & Safety First**
   - Code must be production-ready, handle edge cases, and follow safe defaults.
   - Always adhere strictly to [`PLAN.MD`](file:///media/rhys/Programming/Codes/Github-Projects/ForgeAI/PLAN.MD) architectural specifications, tech stack choices, and feature roadmaps.
   - For Authentication, use **Better Auth** (`better-auth` with `@better-auth/prisma-adapter`) as mandated in `PLAN.MD`.
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

## 3. Frontend Architecture & Component Rules (`client/`)

### Component Strategy & Shadcn UI Priority
- **Prioritize Shadcn Components**: Always prefer using `shadcn/ui` components over standard raw HTML tags (e.g., use `<Button>`, `<Input>`, `<Dialog>`, `<Select>`, `<Table>` instead of `<button>`, `<input>`, custom `<div>` modals, `<select>`, `<table>`).
- **Avoid Raw HTML Tags**: Do not use raw HTML elements for UI components when a corresponding component exists or can be added.

### Component Acquisition Workflow
1. **Check Local Components**: Check if the required component exists locally in `@/components/ui/`.
2. **Install via CLI**: If missing locally but available in `shadcn/ui`, install it using the CLI:
   ```bash
   npx shadcn@latest add <component-name>
   ```
3. **Build Reusable Components**: If no `shadcn` component exists even online for your use case, create a clean, reusable component in `@/components/ui/` or `@/components/common/` using standard `shadcn` architectural patterns (`cva`, `cn()` helper, `forwardRef`, etc.).

### Styling & Customization Guidelines
- **No Ad-Hoc Utility Classes on Consuming Components**: Do not pass custom styling/utility classes directly onto `shadcn` component instances in page/feature files for design modifications.
- **Customize Base Components**: If design or variant changes are required, modify the main component file inside `@/components/ui/<component>.tsx` directly (e.g., extending `cva` variants or adjusting base styles).

### Strict Theme & Color Palette Rules
- **Exclusive Light Theme**: Only use a Light / White theme across the entire application. Dark mode and dark theme variations are strictly prohibited.
- **Strict Semantic Color Palette**: Use ONLY defined design system theme tokens (`primary`, `secondary`, `success`, `danger`, `info`, `warning`, `muted`, `background`, `foreground`, `border`). Do NOT use any other ad-hoc or arbitrary hardcoded color classes (e.g., no `bg-[#090d16]`, `bg-indigo-600`, `text-emerald-400`, `bg-purple-500`, etc.) in component or page files.

### Next.js Scope & Backend Boundary Rules
- **Frontend Presentation Only**: Use Next.js strictly for frontend UI, client-side rendering, layout management, and page navigation.
- **No Next.js API Routes or Server Actions**: Do NOT create or use Next.js API route handlers (`app/api/...`), Server Actions, or Next.js backend endpoint logic.
- **External Backend Communication**: All backend operations, business logic, data persistence, and API endpoints must reside in the separate backend server (`server/`). All frontend data fetching must target the dedicated backend API directly (`http://localhost:3001/api/v1`).

---

## 4. Backend Architecture & API Rules (`server/`)

- **Three-Layer Architecture**: Keep clear boundaries between Controller (HTTP routing/validation), Service (Business Logic), and Repository/Prisma (Data Access).
- **Strict Validation**: Use Zod schemas to validate all request bodies, query params, and environment variables at startup.
- **Error Handling**: Throw typed operational errors (`AppError`) and handle them via global Express error middleware. Return consistent JSON error payloads `{ success: false, error: { code, message } }`.
- **Database Access**: Perform all schema modifications via Prisma migrations. Use raw vector query helpers or Prisma extensions for pgvector vector similarity searches.

---

## 5. Code Style & Engineering Standards

- **Strict Type Safety**: Explicitly define TypeScript types/interfaces for all props, APIs, and state. Avoid using `any`.
- **Path Aliases**: Always use `@/` path aliases in `client/` and relative ESM extensions (`.js`) in `server/`.
- **Immutability & Purity**: Prefer pure functions for business logic; keep side-effects explicit and isolated.
- **Concise & Direct Output**: Focus output on actionable code, precise diffs, and brief summaries.
