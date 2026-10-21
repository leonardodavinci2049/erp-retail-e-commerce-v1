# Repository Guidelines

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Architecture

Next.js v16.3.5 App Router monolith. Single-package (not a monorepo)

- **Frontend-only app** consuming data from external NestJS APIs
- **No middleware.ts** — Next.js v16.3.5 not use middleware file
- **Prefer Server Components** When client-side behavior is required, isolate it in a new reusable Client Component in its own file and keep the client boundary as low as possible.
- **Route pages must always start with a Server Component** delegate only the interactive parts to nested Client Components.

### Main technologies and dependencies

- **Package manager**: pnpm (lockfile: `pnpm-lock.yaml`)
- **React v19.3.0** with **React Compiler** enabled (`next.config.ts: reactCompiler: true`)
- **Tailwind CSS v4.3.3** via `@tailwindcss/postcss` (no `tailwind.config.*`)
- **shadcn/ui v4.21.0** — radix-luma style, path alias `@/components/ui`
- **@biomejs/biome v2.5.13** for lint + format (not ESLint/Prettier). Config: `biome.json`. Uses `biome check` and `biome format --write`.
- **Zod 4.6.4** for validation
- **better-auth v1.6.25** for auth (MySQL-backed, with E-mail e Password, admin plugin, Resend email)
- **mysql2 v3.24.4** for local DB (singleton pool in `DatabaseService`)
- **axios v1.20.0** for external API calls (server-only)
- **Path alias**: `@/*` → `./src/*`

## Placement of New Components and Server Actions

Keep route-specific files close to the routes that use them so a route can be copied to another project with its local components and Server Actions.

- Create a component used by only one route inside that route's `_components` folder, alongside its `page.tsx` or `layout.tsx`.
- Create a component shared by two or more routes inside an `_components` folder at the nearest common ancestor directory of those routes. Keep it within the smallest route scope that includes all its consumers.
- Use `src/components` only for installed components or components shared across the entire application. Sharing a component between a few routes alone does not justify placing it there.
- Apply the same scope rules to Server Actions: create actions used by one route in its `_actions` folder, alongside its `page.tsx` or `layout.tsx`; create actions shared by multiple routes in an `_actions` folder at their nearest common ancestor directory. Reserve `src/app/actions` for application-wide Server Actions.
- Use the exact folder names `_components` and `_actions` (plural) for new files; migrate existing files only when explicitly requested.
- Avoid importing route-specific components or Server Actions from a sibling route. When sharing becomes necessary, place the shared files at the nearest common ancestor of the consuming routes.



## Build and Development Commands

All scripts wrap through `dotenv -e .env` — **never** run `next` directly.

The port used by the project when running `pnpm dev` is defined by the `PORT` environment variable.

```shell
pnpm dev          # dev server (reads .env)
pnpm build        # production build (reads .env)
pnpm start        # start production server (reads .env)
pnpm lint         # biome check
pnpm format       # biome format --write
```

No testing framework or test runner is configured in this repository. Validation is limited to linting with `pnpm lint`, the production build with `pnpm build`, and TypeScript type checking performed as part of that build. There is no standalone `typecheck` script.

## Git workflow

- The project follows **git flow**.
- The base branch is `develop` — never work on `main`.
- For every new task that results in file changes, create a feature branch from a clean, up-to-date `develop` before editing files.
- If the user provides a branch name or task number, use it when it is compatible with the `feature/` prefix (for example, `feature/featr-NNN`).
- If the user does not provide a branch name or task number, do not stop only to ask for one. Derive a concise, descriptive kebab-case name from the task and create `feature/<task-slug>` (for example, `feature/use-manager-create-services`).
- Analysis-only work, continuation of an existing feature, or an explicit user instruction to work on the current branch are exceptions to automatic branch creation.
- If `develop` has uncommitted changes from previous work, do not stash, move, discard, or include them in a new feature. Ask the user to commit or otherwise resolve them before creating the branch.
- Do not merge, finish, delete, or push branches without explicit user authorization.
- The source of truth for project versioning is the `"version"` property in `package.json` (e.g. `"version": "1.1.2"`). The patch value must be incremented on each release and assigned to the release name, e.g. `release/1.8.0`, `hotfix/1.8.1`.


## Next.js Agent Workflow

- Keep project-specific instructions outside the Next.js-managed agent rules block so `next dev` does not replace them.
- Use the version-matched documentation under `node_modules/next/dist/docs/` as the primary reference for Next.js APIs, conventions, and implementation patterns. Use the online Next.js documentation for linked `/docs/messages` error pages that are not bundled.
- When `pnpm dev` is already running, connect to the existing server using the port defined by `PORT` and the runtime information in `.next/dev/lock`; do not start a duplicate development server or terminate the existing process without explicit authorization.
- Use the Next.js MCP tools when available to validate the project, verify framework conventions, gather additional technical context, and inspect routes, server logs, runtime errors, and compilation issues. Prefer `get_errors`, `get_compilation_issues`, and `compile_route` for focused development diagnostics.
- Treat MCP compilation checks as targeted development feedback, not as a replacement for the repository's final `pnpm lint` and `pnpm build` validation.
- For UI and browser behavior, use `agent-browser` when available to inspect the DOM, console, network activity, Web Vitals, and, with React DevTools enabled, the component tree and pending Suspense boundaries.
- Let reported Next.js errors drive the correction: read the linked `Learn more` page, compare the documented alternatives and trade-offs, apply the appropriate canonical pattern, and verify the result at runtime.
- When a production prerendering error does not provide a useful source trace, pass `--debug-prerender` through the project's `pnpm build` wrapper instead of invoking `next` directly.
- Use an appropriate installed Next.js Skill for multi-step framework workflows. Prefer `next-dev-loop` for iterative runtime verification when it is available; installing a new Skill still requires explicit user authorization.



## Before committing

1. `pnpm lint` (Biome check — will auto-organize imports)
2. `pnpm build` (catches type errors — no separate typecheck command)


## SEO

- Dynamic sitemaps in `src/app/(sitemaps)/` (7 route files)
- `robots.ts` in `src/app/`
- JSON-LD components in `src/components/seo/`: `OrganizationJsonLd`, `WebSiteJsonLd`, `LocalBusinessJsonLd`
- Product-level JSON-LD: `ProductJsonLd` (in `src/app/(catalog)/product/_components/`)
- Google Analytics via `src/components/analytics/GoogleAnalytics.tsx` (env: NEXT_PUBLIC_GA_MEASUREMENT_ID)
- GA4 events in `src/components/analytics/events.ts`

## Naming conventions

- **Files and folders**: kebab-case (e.g., `app-sidebar.tsx`, `user-profile/`)
- **Component exports**: **ALWAYS PascalCase** — every React component must be named and exported in PascalCase (e.g., `export function AppSidebar()`, `export function UserProfileCard()`).
- **Functions/hooks**: camelCase with `use` prefix for hooks
- **Types/Interfaces**: PascalCase, no `I` prefix

## Important Constraints

- The default development language is US English. Code comments, error messages, documentation, and file names should use English.
- User-facing messages, labels, and interface text: Brazilian Portuguese (Brazilian audience).
- A closer `AGENTS.md`/`AGENTS.override.md` may supplement or override these rules; read the most specific instructions first.

## Security and Env

- Never read private variables in Client Components; on the client, use only `NEXT_PUBLIC_*`.
- `.env` and `.env.local` are secrets. Do not log, copy, or expose values.
- Authentication does not replace authorization. Verify ownership, organization, and permissions in actions/services that mutate or return sensitive data.
- Do not import server-only modules in Client Components.
- Client-facing messages must be safe and generic; internal details belong in logs.

## Verification

- Documentation change: review Markdown; run `pnpm lint` if the change touches code examples or config.
- TS/React change: run `pnpm lint`.
- Route, build, Server Action, cache, config, or integration change: run `pnpm build` when viable.
- Visual/interactive change: validate in the browser/dev server; if the Next.js MCP is available, use it for errors, routes, and logs.
- If you cannot run an expected verification, state the reason in the final summary.


## Communication and Delivery

- After completing a task, suggest one to three related follow-up tasks that represent the natural next steps. Do not execute these additional tasks without my authorization.
