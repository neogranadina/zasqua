---
gsd_state_version: 1.0
milestone: v1.0.0
milestone_name: milestone
status: executing
stopped_at: "Plan 13-03 complete (Hugo scaffold); 3/5 plans done — Plan 13-04 next (templates + Tailwind v4 + static asset relocation)"
last_updated: "2026-04-17T16:00:00.000Z"
last_activity: 2026-04-17 -- Plan 13-03 complete (hugo.toml, three content adapters, data/ui.yaml)
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 5
  completed_plans: 3
  percent: 60
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-16)

**Core value:** Open-access discovery interface for digitised historical archives — fast, cacheable, no runtime server dependency.
**Current focus:** Phase 13 — hugo-foundation

## Current Position

Phase: 13 (hugo-foundation) — EXECUTING
Plan: 4 of 5 (Plan 13-03 just completed)
Status: Executing Phase 13 — Plan 13-04 next (templates + Tailwind v4 + static asset relocation)
Last activity: 2026-04-17 -- Plan 13-03 complete (hugo.toml, three content adapters, data/ui.yaml); 191,733 pages verified via smoke build

Progress: ██████░░░░ 60% (0/3 phases complete; 3/5 plans complete within Phase 13)

## Accumulated Context

### Roadmap Evolution

v1.0.0 phases 13–15 defined 2026-04-16. Originally 4 phases (13–16); consolidated to 3 by merging old Phase 13 (scaffolding) and Phase 14 (enrichment script) into a single Hugo Foundation phase — enrichment output format depends on data architecture decisions, so both must be done together.

Phase 12 (Place Explorer & Detail Page Rework) was the last phase of v0.5.0 — completed 2026-04-14.

### Decisions

Carried from v0.5.0:

- Visual identity: Figma Make file (bOunUsW8BHk1eqZrJu7Nxt) is the spec source
- Porting done in thematic commits — version bump last

v1.0.0 decisions:

- Hugo Extended replaces Eleventy — Eleventy OOMs at 192K pages with 7 GB heap (CI exit code 134)
- Hugo content adapters (`_content.gotmpl`) generate pages from JSON — no stub markdown files
- Large JSON loaded via `resources.Get` in content adapters, NEVER via `.Site.Data` (OOM risk)
- Descriptions adapter uses `resources.Match` over sharded files (`assets/hugo-data/descriptions/*.json`) — a unified file would exceed V8's 512 MiB max-string-length ceiling
- Spanish date formatting and number formatting pre-computed in Node.js (`generate-content.js`) — no Hugo equivalent
- Tailwind CSS v4 must use `@tailwindcss/cli` via npm (Hugo ≥ v0.146.0 PATH security patch blocks standalone binary)
- `hugo_stats.json` bridged to Tailwind v4 via a `module.mounts` entry (`assets/notwatching/hugo_stats.json`) — overrides D-22's "just keep it out of .gitignore" stance; the mount is robust against future devs reflexively gitignoring it
- Pagefind upgraded to v1.5.2, three indices built in parallel CI jobs (no incremental indexing — not supported)
- R2 diff upload extends existing Node.js parallel uploader with ETag/MD5 comparison — rclone and r2sync both ruled out
- DEV_LIMIT environment variable for fast local builds introduced in Phase 13

### Pending Todos

- B2 export counts verified 2026-04-16 against `data/*.json` (2026-04-15 export): 106,529 descriptions, 78,476 entities, 6,722 places — these are the canonical numbers for Phase 13 validation. Prior drafts cited 92K (stale entities.json) and 83K (zasqua-entities Phase 10 estimate); both are superseded.
- v0.5.1 is blocked from deploying to zasqua.org by CI OOM — this milestone unblocks it

### Blockers/Concerns

- None at roadmap start — all critical technical decisions researched and documented

## Session Continuity

Last session: 2026-04-17
Stopped at: Plan 13-03 complete (Hugo scaffold) — 3/5 plans done within Phase 13; next is Plan 13-04 (templates + Tailwind v4 + static asset relocation)
Resume file: .planning/phases/13-hugo-foundation/13-03-SUMMARY.md (forward pointer at bottom names the files Plan 13-04 adds)
