# Zasqua Frontend — Development Instance

This is the development repo for Zasqua Frontend. Code developed here is periodically ported to the public `zasqua-frontend/` repo.

## Language

- UK English when speaking to the user
- US English in all English-language user-facing code, docs, and UI strings
- Colombian Spanish in all Spanish-language docs, materials, and archival descriptions
- **Spanish style guide**: Follow `~/Notes/.claude/colombian-spanish-style-guide.md`
- **Zasqua-specific terminology**: ISAD(G) field names and description levels as defined in `src/_data/ui.js`

## Repo structure

- **Code lives here** — `zasqua-frontend-dev/`
- **GSD and planning** — `.planning/` in this repo, used normally
- **Workspace docs** — `../docs/frontend/` (guidelines, images, plans)
- **Public repo** — `zasqua-frontend/` receives ported code only

## Rules

- Keep commit messages short, no emojis, no co-author
- Pull before commits, commit along the way
- Update scratchpad and changelog immediately when changing files
- Ask before moving on to another major task
- Present drafts for review before committing
- Run tests relevant to your changes before committing
- Show test output — don't just verify tests pass silently
- No phase/plan prefixes in commit messages
- **Porting**: at the end of each major milestone, remind the user to port to `zasqua-frontend/` and wait for approval. Never port automatically

## Never

- Commit or port AI or GSD artefacts (`.planning/`, `CLAUDE.md`, `.claude/`) to the public `zasqua-frontend/` repo
- Reference Claude, Claude Code, or AI assistance in public-facing commits, CHANGELOGs, or docs
- Commit untested features directly to main branch
- Commit secrets or credentials
- Generate placeholder or dummy text without asking first

## Before starting a new type of task

- Consult the guidelines file first — not existing code examples
- Guidelines live in `../docs/frontend/guidelines/`
- When in doubt, ask: "Is there a guidelines file for this?"

## Stack

- Eleventy 3 (static site generator)
- Nunjucks (templates)
- Pagefind (client-side search)
- Cloudflare R2 + Worker (site hosting)
- Backblaze B2 (data storage — JSON exports downloaded at build time)
- GitHub Actions (CI/CD — build + parallel upload to R2)
- TIFY v0.31.0 (IIIF deep-zoom viewer, self-hosted)
