# HomeHero Frontend — Project Skills

## Purpose

This file defines the project-specific AI agent skills for the HomeHero Next.js frontend.

All skills must follow the root `AGENTS.md`.

## Available Skills

### 1. homehero-frontend-migration

Path: `skills/homehero-frontend-migration/SKILL.md`

Use this skill for:

- Nestar → HomeHero frontend identity rename.
- Property UI → Service UI migration.
- GraphQL queries, mutations, types, and fragments.
- USER, AGENT, and ADMIN page adaptation.
- Apollo Client and backend integration.
- Private messaging frontend integration.

### 2. homehero-frontend-review

Path: `skills/homehero-frontend-review/SKILL.md`

Use this skill for:

- Frontend architecture and code reviews.
- Figma design consistency.
- Responsive layout and accessibility checks.
- GraphQL contract compatibility.
- Authentication and role-based UI reviews.
- Frontend performance and maintainability.
- Integration and regression risk analysis.

## Skill Usage Rules

1. Read root `AGENTS.md` before starting.
2. Read this `SKILLS.md`.
3. Read only the relevant skill for the current task.
4. Inspect the affected source code.
5. Prepare a minimal implementation plan.
6. Wait for explicit user approval before modifying anything.

## Development Constraints

- Preserve the existing Next.js architecture.
- Reuse existing components and styling patterns.
- Follow the approved HomeHero Figma design.
- Do not invent backend GraphQL operations.
- Do not install unnecessary dependencies.
- Do not modify backend source code.
- Do not create additional documentation files unless requested.
- Do not perform Git operations without explicit approval.

## Required Workflow

Analyze → Plan → Approval → Implement → Test → Review

## Default Rule

Analyze and prepare a plan only. DO NOT CHANGE ANYTHING. Wait for my explicit approval.
