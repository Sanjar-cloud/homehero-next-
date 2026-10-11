---
name: homehero-frontend-migration
description: Plan and implement approved incremental migrations of the HomeHero Next.js frontend while preserving its existing architecture.
---

# HomeHero Frontend Migration Skill

## When to Use

Use this skill for:

- Nestar → HomeHero frontend identity rename.
- Property → Service UI migration.
- GraphQL queries, mutations, types, and fragments.
- Apollo Client and backend integration.
- USER, AGENT, and ADMIN page adaptation.
- Private messaging UI and WebSocket integration.
- Navigation and component migration.

## Workflow

1. Read root `AGENTS.md` and `SKILLS.md`.
2. Inspect the existing frontend source code.
3. Check relevant backend GraphQL contracts when available.
4. Prepare a minimal, clearly scoped implementation plan.
5. Wait for explicit user approval.
6. Implement only the approved changes.
7. Run relevant validation.
8. Report changed files, test results, and remaining issues.
9. Stop before starting the next phase.

## Architecture Rules

- Preserve the existing Next.js routing architecture.
- Preserve React, TypeScript, Apollo Client, and existing styling patterns.
- Reuse existing components where practical.
- Keep GraphQL operations aligned with the actual HomeHero backend.
- Follow the approved HomeHero Figma design.
- Avoid unrelated refactoring and unnecessary dependencies.
- Keep changes small and understandable for technical interviews.

## Migration Strategy

1. Analyze the existing Nestar frontend.
2. Rename project identity to HomeHero.
3. Migrate Property pages and components to Service.
4. Adapt role-based navigation and My Page.
5. Integrate private USER–AGENT messaging.
6. Validate frontend and backend integration.

Each implementation phase requires separate approval.

## Restrictions

- Do not modify files during analysis.
- Do not modify backend source code.
- Do not install or upgrade dependencies without approval.
- Do not modify `.env` files or secrets.
- Do not commit, push, or deploy without approval.
- Do not introduce booking, payment, or scheduling features.

## Expected Report

After an approved implementation, summarize:

- Changed files and components.
- Implemented behavior.
- GraphQL integration changes.
- Validation results.
- Remaining risks and next proposed step.

## Default Rule

Analyze and prepare a plan only. DO NOT CHANGE ANYTHING. Wait for my explicit approval.
