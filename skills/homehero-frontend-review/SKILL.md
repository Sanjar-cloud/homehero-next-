---
name: homehero-frontend-review
description: Perform read-only code, architecture, UI/UX, and integration reviews of the HomeHero Next.js frontend.
---

# HomeHero Frontend Review Skill

## When to Use

Use this skill for:

- Frontend architecture and code reviews.
- Next.js routing and component structure.
- Apollo Client and GraphQL integration.
- Authentication and role-based navigation.
- HomeHero Figma design consistency.
- Responsive design and accessibility.
- Private messaging UI and WebSocket integration.
- Performance and maintainability reviews.

## Review Workflow

1. Read root `AGENTS.md` and `SKILLS.md`.
2. Inspect the relevant frontend source code.
3. Identify concrete issues and their affected files.
4. Evaluate compatibility with the HomeHero backend.
5. Check consistency with the approved Figma design.
6. Assess severity and potential impact.
7. Recommend minimal, understandable solutions.
8. Report findings without modifying files.

## Review Checklist

- Existing Next.js architecture is preserved.
- Components and pages follow established project patterns.
- GraphQL queries and mutations match the actual backend schema.
- Authentication state and role-based navigation behave correctly.
- USER, AGENT, and ADMIN interfaces follow approved permissions.
- Service listings, filters, and detail pages display correct data.
- Private messaging shows only authorized conversation data.
- WebSocket events are handled without duplicate messages.
- Responsive layouts work across common screen sizes.
- Forms include appropriate validation and error handling.
- Loading, empty, and error states are handled.
- Unnecessary dependencies and unrelated refactoring are avoided.

## Constraints

- Reviews are strictly read-only.
- Do not modify source code or documentation.
- Do not install or upgrade dependencies.
- Do not modify `.env` files or secrets.
- Do not perform Git operations.
- Do not change backend source code.
- Do not automatically fix discovered issues.
- Follow the root `AGENTS.md`.

## Expected Report

For each important finding, provide:

- Issue and severity.
- Affected file or component.
- Evidence from the source code.
- Potential impact.
- Recommended solution.
- Verification status.

## Default Rule

Analyze and prepare a plan only. DO NOT CHANGE ANYTHING. Wait for my explicit approval.
