<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Frontend & Component Architecture Rules

## 1. Component Strategy & Shadcn UI Priority
- **Prioritize Shadcn Components**: Always prefer using `shadcn/ui` components over standard raw HTML tags (e.g., use `<Button>`, `<Input>`, `<Dialog>`, `<Select>`, `<Table>` instead of `<button>`, `<input>`, custom `<div>` modals, `<select>`, `<table>`).
- **Avoid Raw HTML Tags**: Do not use raw HTML elements for UI components when a corresponding component exists or can be added.

## 2. Component Acquisition Workflow
1. **Check Local Components**: Check if the required component exists locally in `@/components/ui/`.
2. **Install via CLI**: If missing locally but available in `shadcn/ui`, install it using the CLI before using:
   ```bash
   npx shadcn@latest add <component-name>
   ```
3. **Build Reusable Components**: If no `shadcn` component exists even online for your use case, create a clean, reusable component in `@/components/ui/` or `@/components/common/` using standard `shadcn` architectural patterns (`cva`, `cn()` helper, `forwardRef`, etc.) and consume that component.

## 3. Styling & Customization Guidelines
- **No Ad-Hoc Utility Classes on Consuming Components**: Do not pass custom styling/utility classes directly onto `shadcn` component instances in page/feature files for design modifications.
- **Customize Base Components**: If design or variant changes are required, modify the main component file inside `@/components/ui/<component>.tsx` directly (e.g., extending `cva` variants or adjusting base styles). This keeps the design system consistent and centralized.

## 4. Frontend Best Practices
- **Strict Typing**: Explicitly define TypeScript types/interfaces for all props and state. Avoid using `any`.
- **Modular Component Organization**:
  - Reusable primitive components: `@/components/ui/`
  - Reusable composite components: `@/components/common/`
  - Feature-specific components: `@/components/features/` or co-located within feature routes.
- **Path Aliases**: Always use `@/` path aliases for module imports.
- **Accessibility & UX**: Ensure components maintain proper ARIA properties, keyboard interaction, and consistent visual focus states.
