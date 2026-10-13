# HomeHero Frontend — Agent Instructions

## 1. Project Context

HomeHero is a portfolio-oriented home services platform built by modifying the original Nestar project.

This repository contains the Next.js frontend. The backend is a separate NestJS project named `homehero`.

The frontend must be migrated incrementally from Nestar to HomeHero while preserving the existing architecture wherever practical.

## 2. Primary Goals

- Replace Nestar project identity with HomeHero.
- Migrate Property-related UI and data operations to Service.
- Adapt the frontend to the agreed HomeHero Figma design.
- Integrate the existing HomeHero backend GraphQL contracts.
- Implement private USER–AGENT messaging using GraphQL and WebSocket.
- Keep the project understandable and suitable for technical interviews.

## 3. Roles

Preserve the backend role names:

- `USER` — customer who discovers services and contacts providers.
- `AGENT` — service provider who manages service listings.
- `ADMIN` — platform administrator.

Do not rename or redesign these roles without explicit approval.

## 4. HomeHero V1 Scope

The frontend should support:

- Home and service discovery.
- Service listing, filtering, and detail pages.
- AGENT service creation and management.
- USER favorites and comments.
- Community and Support pages according to the approved design.
- Private messaging between USER and AGENT.
- Role-based navigation and My Page.

Do not introduce booking, payment, scheduling, quote management, or unrelated features.

## 5. Architecture Rules

- Inspect the existing Next.js structure before proposing changes.
- Preserve the original Nestar architecture and existing working behavior wherever practical. Change them only when required by the approved HomeHero scope.
- Follow existing file organization, naming conventions, component patterns, and local coding style. Use readable multiline JSX and separate state, Apollo requests, effects, handlers, and rendering where helpful.
- Do not copy legacy defects or introduce extra state, effects, or abstractions solely to imitate old code.
- Preserve existing routing, Apollo Client, authentication, and styling patterns where practical.
- Preserve existing Apollo, authentication, routing, and verified backend contracts unless an explicitly approved change requires otherwise.
- Prefer existing components and implementation patterns over new abstractions. Introduce an abstraction only when the approved task clearly needs it.
- Keep frontend GraphQL operations consistent with the actual backend schema.
- Do not invent backend fields, queries, mutations, or WebSocket events.
- Do not introduce unnecessary dependencies or frameworks.
- Avoid broad refactoring unrelated to the approved migration phase.
- Write simple, clean, readable TypeScript and React code. Keep functions focused and easy to explain in a technical interview. Avoid overengineering and unnecessary state, refs, effects, or complex custom hooks.

## 6. Required Workflow

For every new development phase:

1. Read `AGENTS.md`, `SKILLS.md`, and the relevant skill.
2. Analyze the existing code and dependencies.
3. Prepare a small, clearly scoped implementation plan.
4. Wait for explicit user approval.
5. Implement only the approved scope.
6. Run appropriate validation.
7. Review the changes and report the results.
8. Stop before starting the next phase.

Once a specific phase and file scope are explicitly approved, continue within that scope without requesting the same approval again. If the scope materially expands, stop and request new approval.

Migration roadmaps are proposals, not implementation authorization or completion records.

Default instruction:

**Analyze and prepare a plan only. DO NOT CHANGE ANYTHING. Wait for my explicit approval.**

## 7. Development Restrictions

Unless separately approved:

- Do not modify files during analysis.
- Do not install or upgrade dependencies.
- Do not modify `.env` files or secrets.
- Do not modify backend source code.
- Do not perform Git commits, pushes, or deployments.
- Do not make unnecessary changes to project configuration.
- Do not start unrelated development phases.

## 8. Validation and Reporting

After an approved implementation:

- Run relevant TypeScript checks, linting, tests, or builds supported by the repository.
- Briefly explain the purpose of each changed file, its main logic, and important behavior changes.
- Explain any validation failures or unresolved integration issues.
- Identify breaking changes between frontend and backend.
- Do not claim runtime integration is verified unless it was actually tested.

Use Yarn for frontend project commands. Do not switch package managers or create additional lockfiles. Installing or upgrading dependencies still requires explicit approval.

For changes requiring these checks, use:

```bash
yarn tsc --noEmit --incremental false
yarn lint --no-cache
yarn build
```

If lint requests ESLint configuration, stop without creating files. Do not use automatic lint fixes or formatters without explicit approval.

After major changes affecting setup, architecture, public contracts, or important user flows, update relevant existing documentation only within the approved file scope. Include documentation paths in the implementation plan before approval. Update `README.md` and, when relevant, the existing `CHANGELOG.md`; small fixes do not require updates to every document.

If a strict file scope excludes documentation, do not modify additional files. Report the documentation gap in the final report. Create new documentation files only with explicit approval.

## 9. Communication

- Explain development progress to the user in Uzbek.
- Keep technical identifiers, code, file names, and Codex instructions in English.
- Use English for code comments and project documentation.
- Prefer incremental changes that the user can understand and explain in a technical interview.

## 10. Final Rule

Never begin implementation without explicit approval for the specific plan.

Analyze and prepare a plan only. DO NOT CHANGE ANYTHING. Wait for my explicit approval.

This is the default for new development requests. Implementation may begin after explicit approval for the specific phase and scope.
