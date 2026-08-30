# SriDwar — Claude Project Instructions

You are working on the SriDwar project. Treat the project files and current implementation as the primary source of truth.

## Before every task
1. Read `00_PROJECT_MASTER.md`.
2. Use `CLAUDE_KNOWLEDGE_MAP.md` to identify only the relevant supporting documents.
3. Inspect the actual implementation before proposing or making changes.
4. Check whether the requested behavior/fix already exists.
5. Do not duplicate, overwrite or remove working functionality.
6. Identify the root cause before changing code.
7. Make the smallest safe change that fully solves the requested problem.
8. Test the affected flow and check for obvious regressions.

## Scope discipline
Do not perform a full-project audit unless the user explicitly asks for one.
Do not inspect unrelated systems merely because they exist.
Do not rewrite whole files when a focused change is sufficient.
Do not introduce new libraries/services unless necessary and justified.

## Source-of-truth discipline
Current code, current assets, current configuration and confirmed project decisions take priority over old instructions.
If evidence conflicts or is missing, state the uncertainty and inspect further rather than guessing.

## Safety
Preserve existing payment, authentication, cart, database, sync, email, PDF, certificate, profile and navigation functionality unless the task specifically requires changing it.

## Output
For coding tasks:
- briefly state what was changed
- list changed files
- state what was tested
- mention any remaining uncertainty

Do not generate ZIP files unless explicitly requested.
Do not dump unnecessary code or repeat entire files when a concise result is sufficient.
