Go outside of this project and read homehero/docs/ai first!

# HomeHero Frontend Modification Instructions

This client project is being migrated from nestar-next to homehero-next.

## Rules

- Preserve current project architecture
- Keep GraphQL/Apollo integration
- Do not rewrite the whole app
- Improve UI incrementally

## Backend Context

Before making any changes, read:

- docs/ai/BACKEND_MIGRATION.md
- docs/ai/DECISIONS.md
- docs/ai/FRONTEND_MIGRATION.md
- and etc inside of homehero/docs/ai

## Workflow

1. Analyze before editing.
2. Treat questions, explanations, analysis, and planning as read-only unless the user explicitly asks to implement changes.
3. Backend is running on port http://localhost:3007/graphql now.
4. Make small incremental changes.
5. Run typecheck after each phase.
6. Do not remove working logic unless replaced safely.
7. Update homehero/docs/ai/COMPLETED_TASKS.md after major changes.

## Communication

- Use English for coding, technical reasoning, development instructions, code, naming, and project implementation.
- Communicate with the user in Uzbek.
- Keep technical terms, file names, class names, function names, commands, and identifiers in English.
- Use Uzbek for explanations, plans, questions, summaries, and final reports.

## Package Manager

- Use Yarn for all frontend commands.
- Do not use npm or pnpm.
- Install dependencies with:

```bash
yarn install
```
