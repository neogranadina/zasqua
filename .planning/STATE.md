---
gsd_state_version: 1.0
milestone: v1.0.0
milestone_name: milestone
status: executing
stopped_at: "Plans 13-09 through 13-14 batch complete (description + entity + place + explorers all ported); 14/15 plans done — Plan 13-15 pending user approval (Eleventy removal)"
last_updated: "2026-04-17T22:45:00.000Z"
last_activity: 2026-04-17 -- Batch port complete. All Eleventy templates (base, partials, home, 404, buscar, repository, description, entity, place, entity+place explorers) ported to Hugo with visual+functional identity. Zero WARNs. Eleventy src/ still on disk — Plan 13-15 is the destructive cutover.
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 15
  completed_plans: 14
  percent: 93
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-16)

**Core value:** Open-access discovery interface for digitised historical archives — fast, cacheable, no runtime server dependency.
**Current focus:** Phase 13 — hugo-foundation

## Current Position

Phase: 13 (hugo-foundation + full template port) — AWAITING USER CHECKPOINT for Plan 13-15
Plan: 15 of 15 (batch 13-09 through 13-14 just completed)
Status: Template port complete. Plan 13-15 (integration + Eleventy removal) requires user approval before execution — destructive cutover.
Last activity: 2026-04-17 -- Batch template port complete across 13-09 through 13-14. All page types ported with visual+functional identity to zasqua.org. See 13-BATCH-SUMMARY.md.

Progress: █████████░ 93% (0/3 phases complete; 14/15 plans complete within reshaped Phase 13)

## Accumulated Context

### Roadmap Evolution

v1.0.0 phases 13–15 defined 2026-04-16. Originally 4 phases (13–16); consolidated to 3 by merging old Phase 13 (scaffolding) and Phase 14 (enrichment script) into a single Hugo Foundation phase — enrichment output format depends on data architecture decisions, so both must be done together.

**2026-04-17 reshape:** Phase 13 expanded from 5 plans to 15 after a failed first attempt at Plan 13-04 produced template stubs rather than faithful ports. Reverted stub commits (`abandoned/phase-13-04-first-attempt` tag preserves them) and re-scoped: Phase 13 now front-loads the full visual+functional Nunjucks → Go template port (previously Phase 14's job). Phase 14 becomes a paranoid visual-diff audit. Phase 15 deploy pipeline unchanged.

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
Stopped at: 14/15 plans done. Batch port of 13-09 through 13-14 complete — description, entity, place, and both explorer pages all ported with visual+functional identity. Plan 13-15 (Eleventy removal) awaits user checkpoint before destructive operations.
Resume file: .planning/phases/13-hugo-foundation/13-BATCH-SUMMARY.md (consolidated summary of batch work); Plan 13-15 is the final scoped plan to execute after approval.
