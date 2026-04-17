# Phase 13: Hugo Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 13-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 13-hugo-foundation
**Areas discussed:** Project layout & Eleventy coexistence, Enrichment pipeline architecture, DEV_LIMIT semantics, Pre-computed output contract

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Project layout & Eleventy coexistence | Subfolder vs in-place replacement vs hard cut-over during the ~4-week migration | ✓ |
| Enrichment pipeline architecture | Composition of generate-content.js with existing precompute-links.js and _data/*.js logic; denormalisation depth | ✓ |
| DEV_LIMIT semantics | First-N vs representative sample vs drop entirely | ✓ |
| Pre-computed output contract | date_formatted shape, URL permalink preservation | ✓ |

**User's choice:** All four selected (multi-select).

---

## Project Layout & Eleventy Coexistence

### Q1: Where should the Hugo project scaffold live?

| Option | Description | Selected |
|--------|-------------|----------|
| At project root, keep Eleventy files alongside | Hugo owns root; Eleventy stays buildable as a safety net through Phase 14; remove Eleventy at start of Phase 15. Zero-risk rollback. | |
| Hugo in hugo/ subfolder during migration | hugo/ contains the full Hugo project; assets/hugo-data/ becomes hugo/assets/hugo-data/. Cleaner separation but diverges from the path contract in the success criteria. | |
| Hard cut-over — delete Eleventy in Phase 13 | Remove src/, eleventy.config.js, _site/, @11ty/eleventy as part of Phase 13. Cleanest final layout; git is the only rollback path. | ✓ |

**User's choice:** Hard cut-over — delete Eleventy in Phase 13.
**Notes:** Accepted because v0.5.1 is already blocked from deploying to zasqua.org by CI OOM (per STATE.md), so the "keep Eleventy for hotfix deploys" argument is moot.

### Q2: How should the hard cut-over handle client-side assets (JS, CSS, TIFY, images)?

| Option | Description | Selected |
|--------|-------------|----------|
| Move to Hugo locations in Phase 13 | src/js/* → assets/js/, src/css/main.css → assets/css/main.css, src/vendor/tify/ → static/vendor/tify/, src/img/ → static/img/. Phase 14 templates have zero file-moving work. | ✓ |
| Delete everything Eleventy in Phase 13, move assets in Phase 14 | Cleaner Phase 13 scope but Phase 14 carries more file churn. | |
| Keep src/js, src/css, src/vendor, src/img in place temporarily | Configure Hugo to read from src/ paths. Minimises churn but non-standard Hugo layout. | |

**User's choice:** Move to Hugo locations in Phase 13.

---

## Enrichment Pipeline Architecture

### Q3: How should generate-content.js relate to scripts/precompute-links.js?

| Option | Description | Selected |
|--------|-------------|----------|
| Two-step pipeline: precompute-links.js → generate-content.js | Keep precompute-links.js (client-facing shards/graph/lookups untouched); generate-content.js consumes its outputs + raw JSON, writes denormalised records to assets/hugo-data/. | ✓ (Claude recommendation accepted) |
| One unified generate-content.js | Fold precompute-links.js logic in. Simpler single script but bigger refactor and blurs client-facing vs Hugo-facing concerns. | |
| Refactor to shared modules + two orchestrators | Extract enrichment into scripts/enrichment/*.js; both scripts become thin orchestrators. Cleanest long-term, adds significant scope to Phase 13. | |

**User's choice:** "I don't know, what do you recommend?" → Claude recommended Option 1 (two-step pipeline). Accepted.
**Notes:** Preserves stable client-facing contract from precompute-links.js; keeps Phase 13 refactor scope contained; shared-module refactor deferred to post-Phase 14 if duplication proves painful.

### Q4: How denormalised should each description record be?

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal inline link enrichment | Each description carries ancestor_chain, date_formatted, repository object, entity_links/place_links as arrays of {code, display_name, role_label}. Full entity/place detail stays in entities.json and places.json. | ✓ |
| Deep inline enrichment | Every description carries full entity and place records inline. Description templates need zero cross-lookups but descriptions.json grows toward 400+ MB. | |
| Join-key only | Each description carries only entity_codes and place_codes as strings; display names resolved at template time. Conflicts with "no formatting logic remains for Go templates" success criterion. | |

**User's choice:** Minimal inline link enrichment (with note "I don't know! Tell me what you suggest.").
**Notes:** User chose the option Claude would have recommended — it matches the "fully denormalised" phase goal without bloating description JSON, and keeps detail pages as the canonical source for full entity/place data.

---

## DEV_LIMIT Semantics

### Q5a (original): What should DEV_LIMIT=100 actually limit?

Initially presented representative-sample vs first-N vs configurable flags. User clarified before answering that the Eleventy DEV_MODE predecessor has never been used in practice because it's incompatible with Pagefind. Question was reframed.

### Q5b (reframed): Given DEV_MODE has never been used, what role should DEV_LIMIT play?

| Option | Description | Selected |
|--------|-------------|----------|
| Drop it — Hugo is fast enough for full local builds | Remove DEV_LIMIT from Phase 13 scope; update ROADMAP success criteria 1 and 5 to drop the requirement. | ✓ |
| CI smoke-test only — first-N slice | Keep DEV_LIMIT as a PR check that builds 100 descriptions end-to-end. First-N is enough for a smoke test. | |
| Keep original plan — representative sample | Build the representative-sample version in case future devs want it. | |

**User's choice:** Drop it — Hugo is fast enough for full local builds.
**Notes:** Triggers downstream doc updates: ROADMAP Phase 13 criteria 1 & 5, REQUIREMENTS ENRICH-05, STATE v1.0.0 decisions bullet. Listed as follow-ups in CONTEXT.md.

---

## Pre-computed Output Contract

### Q6: Lock date_formatted to existing Eleventy formatDate output (byte-for-byte)?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — match existing output byte-for-byte | Port formatDateNarrative (eleventy.config.js:37-64) verbatim to generate-content.js. Same month names, same range separator, zero visible change vs current site. | ✓ |
| Revise format as part of the port | Treat Phase 13 as an opportunity to revisit (padding, separator, BCE handling). Opens a rabbit hole. | |

**User's choice:** Yes — match existing output byte-for-byte.

### Q7 (initial): Confirm URL scheme — preserve existing URLs per HUGO-03?

Claude initially presented options referencing `/lugar/{display_name}/` and `/entidad/{code}/` as the current scheme. User selected "Preserve existing URLs" — then flagged the premise: current URLs are not `/lugar/{name}/` or `/entidad/{code}/`; they are the flat-code scheme `/nl-XXXXXX/` and `/ne-XXXXXX/`.

### Q7 (corrected after verification): What is the real current URL structure?

Verified from source templates:
- `src/entidad.njk:6` — `permalink: "/{{ ent.entity_code }}/"` → `/ne-xxxxxx/`
- `src/lugar.njk:6` — `permalink: "/{{ place.place_code }}/"` → `/nl-xxxxxx/`
- `src/repository.njk:6` — `permalink: "/{{ repo.code }}/"` → `/co-ahr/`
- `src/explorar/entidades.njk:4` — `permalink: /entidades/`
- `src/explorar/lugares.njk:4` — `permalink: /lugares/`

**Resolution:** Hugo content adapters override permalinks to strip content-section prefixes (`/descripcion/`, `/entidad/`, `/lugar/`) so resources publish at the existing flat-code paths.

**Follow-up action:** Planning docs (PROJECT.md, REQUIREMENTS.md PLACE-01/ENT-01/PEXP-01/EEXP-01, ROADMAP.md Phase 14 criterion 5) had drifted to the wrong URL scheme — corrected in commit eda9e3c before writing CONTEXT.md.

---

## Claude's Discretion

The following were deferred to Claude's judgement during planning:
- Exact additional fields in entity and place enriched records beyond the success-criteria-mandated display_name and role_label (finalise in Phase 13 planning)
- Which content type gets the Phase 13 smoke-test template (description likely — largest dataset, most plumbing exercised)
- Hugo config structural choices (module mounts, output format defaults, minify options)
- Directory layout for shared partials

## Deferred Ideas

- Shared enrichment modules refactor — revisit after Phase 14
- Representative-sample DEV_LIMIT — if a future workflow needs it
- CI smoke-test subset build — reasonable for Phase 15 if CI time becomes a problem
- Hugo custom Go function for formatDate — not needed given pre-computation approach
- Diff-based rendering — future optimisation phase
- Refresh `.planning/codebase/*.md` intel docs (dated 2026-03-24, now stale)
