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
- Preserve existing routing, Apollo Client, authentication, and styling patterns where practical.
- Reuse existing components before introducing new abstractions.
- Keep frontend GraphQL operations consistent with the actual backend schema.
- Do not invent backend fields, queries, mutations, or WebSocket events.
- Do not introduce unnecessary dependencies or frameworks.
- Avoid broad refactoring unrelated to the approved migration phase.

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
- Report changed files and important behavior changes.
- Explain any validation failures or unresolved integration issues.
- Identify breaking changes between frontend and backend.
- Do not claim runtime integration is verified unless it was actually tested.

## 9. Communication

- Explain development progress to the user in Uzbek.
- Keep technical identifiers, code, file names, and Codex instructions in English.
- Prefer incremental changes that the user can understand and explain in a technical interview.

## 10. Final Rule

Never begin implementation without explicit approval for the specific plan.

Analyze and prepare a plan only. DO NOT CHANGE ANYTHING. Wait for my explicit approval.
