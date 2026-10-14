# HomeHero Frontend Modification Instructions

This client project is being migrated incrementally from nestar-next
to homehero-next.

## Read First

- Read AGENTS.md, SKILLS.md and the relevant project skill.
- Read ../homehero/docs/ai when available.
- If backend documentation is missing, report it and verify the relevant
  contracts from ../homehero source code.

## Rules

- Preserve the current Next.js Pages Router architecture.
- Keep existing GraphQL/Apollo integration and authentication.
- Follow existing HomeHero/Nestar coding style and naming conventions.
- Use simple, readable TypeScript and multiline JSX.
- Prefer existing components and patterns over new abstractions.
- Do not rewrite the whole app.
- Improve UI incrementally using the approved HomeHero Figma reference.
- Do not invent backend fields, operations or functionality.

## Workflow

1. Analyze before editing.
2. Treat questions, explanations, analysis and planning as read-only
   unless the user explicitly approves implementation.
3. The expected local backend endpoint is http://localhost:3007/graphql.
   Verify runtime availability when integration testing requires it.
4. Make small incremental changes within the approved file scope.
5. Run typecheck after each implementation phase.
6. Do not remove working logic unless replaced safely.
7. Briefly report changed files, their purpose and validation results.
8. Do not modify backend code, database records, dependencies,
   environment files or Git history without separate approval.

## Communication

- Use English for code, comments, development instructions,
  documentation and naming.
- Communicate with the user in Uzbek.
- Keep technical terms, file names, class names, function names,
  commands and identifiers in English.
- Use Uzbek for explanations, technical reasoning, plans,
  questions, summaries and final reports.

## Package Manager

- Use Yarn for all frontend commands.
- Do not use npm or pnpm.
- Install dependencies only with explicit approval:

  yarn install

- Run typecheck using the installed tool:

  yarn tsc --noEmit --incremental false
