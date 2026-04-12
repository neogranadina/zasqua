---
phase: 11-description-linking
verified: 2026-04-12T19:30:00Z
status: human_needed
score: 7/7 must-haves verified
overrides_applied: 2
overrides:
  - must_have: "Entity links use /entidad/{code}/ URL pattern"
    reason: "URL scheme simplified post-plan: entity pages moved from /entidad/{code}/ to /{code}/ (ne- prefix identifies resource type). Place pages moved from /lugar/{display_name | safeSlug}/ to /nl-{id}/ (stable numeric IDs). Committed in 64dbbcf. This is a deliberate improvement — not a deviation from goal."
    accepted_by: "juancobo"
    accepted_at: "2026-04-12T12:06:41Z"
  - must_have: "official role label matches plan value Funcionario"
    reason: "Plan specified 'Funcionario' but a follow-up commit (06c8841) corrected it to 'Oficial' — a more accurate archival term. User-approved terminology correction, not a stub or error."
    accepted_by: "juancobo"
    accepted_at: "2026-04-12T08:51:41Z"
human_verification:
  - test: "Open a description page with linked entities and verify visual appearance"
    expected: "Entity names appear as clickable links under 'Personas y entidades relacionadas'. Resting state: stone-900 text with stone-300 underline. Hover state: burgundy-light text. Role labels appear as italic muted text after an em dash (e.g. 'José de Mosquera Figueroa — Productor')."
    why_human: "CSS hover states and visual link styling cannot be verified by static HTML inspection or grep."
  - test: "Click an entity link on a description page"
    expected: "Navigates to the correct entity detail page at /{entity_code}/ (e.g. /ne-00001/)."
    why_human: "Navigation behaviour requires a running browser session."
  - test: "Click a place link on a description page"
    expected: "Navigates to the correct place detail page at /nl-{place_id}/ (e.g. /nl-88577/)."
    why_human: "Navigation behaviour requires a running browser session."
  - test: "Open a description with no linked entities or places"
    expected: "The 'Personas y entidades relacionadas' and 'Lugares' sections are absent from the page."
    why_human: "Absence of a section is confirmed in the generated HTML (verified programmatically), but visual confirmation in the rendered page is needed to rule out layout side-effects."
  - test: "Apply an entity or place filter in Pagefind search"
    expected: "Filter counts appear and descriptions filter correctly by entity code or place ID."
    why_human: "Pagefind index is built at full-build time and its runtime behaviour requires an active Pagefind instance — cannot be verified by static HTML grep."
  - test: "Verify Spanish role labels read correctly for archival users"
    expected: "Labels like Remitente, Testigo, Demandado, Oficial, Escribano, Notario appear correctly and read naturally in context."
    why_human: "Archival terminology quality requires domain expert review — cannot be verified programmatically."
---

# Phase 11: Description Linking Verification Report

**Phase Goal:** Description pages link to their associated entity and place detail pages, and to the relevant explorer views
**Verified:** 2026-04-12T19:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Description pages show clickable links to entity detail pages for associated entities | VERIFIED | Generated HTML for `co-cihjml-acc-09188-civil-i-nt` contains `<a href="/ne-00001/">José de Mosquera Figueroa</a>` and `<a href="/ne-07170/">Colegio de Misiones de Popayán</a>` |
| 2 | Description pages show clickable links to place detail pages for associated places | VERIFIED | Same page contains `<a href="/nl-88577/">Popayán</a>` |
| 3 | Links are generated at build time from enriched lookup files | VERIFIED | `desc-entity-lookup.json` (94,988 keys) and `desc-place-lookup.json` (83,415 keys) exist with `{code, display_name, entity_type, roles}` and `{id, display_name}` respectively; `descriptions.js` reads them at build time |
| 4 | Entity and place names render correctly (not just codes) | VERIFIED | Generated HTML shows display names ("José de Mosquera Figueroa", "Popayán") — not raw codes |
| 5 | Entity links display Spanish role labels in italic after the entity name | VERIFIED | Generated HTML: `&mdash; <em class="text-stone-400">Productor</em>` and `&mdash; <em class="text-stone-400">Mencionado</em>` |
| 6 | Descriptions with no linked entities/places show no entities/places section | VERIFIED | `co-ahjci/index.html` (top-level fond with no entity links): "Personas y entidades relacionadas" and "Lugares" headings are absent from the page body |
| 7 | Pagefind entidad and lugar filter spans preserved | VERIFIED | Generated HTML contains `<span data-pagefind-filter="entidad">ne-00001</span>` and `<span data-pagefind-filter="lugar">88577</span>` — string values, not objects |

**Score:** 7/7 truths verified (2 URL pattern overrides applied)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `data/desc-entity-lookup.json` | Enriched entity lookup keyed by reference_code | VERIFIED | 94,988 keys; first entry: `{code, display_name, entity_type, roles}` confirmed |
| `data/desc-place-lookup.json` | Enriched place lookup keyed by reference_code | VERIFIED | 83,415 keys; first entry: `{id, display_name}` confirmed |
| `scripts/precompute-links.js` | Section 5 rewritten to produce enriched reverse lookups | VERIFIED | Section 5 contains `entityByCode`, `descToEntities`, `placeById`, `descToPlaces`; writes both enriched lookup files |
| `src/_data/ui.js` | Complete Spanish role vocabulary (29 roles) | VERIFIED | 29 keys confirmed; includes `sender: "Remitente"`, `witness: "Testigo"`, `official: "Oficial"` (terminology corrected in 06c8841) |
| `src/_data/descriptions.js` | Enriched entity/place objects attached to each description | VERIFIED | Loads `ui.js`, attaches `_entity_links` (with `role_labels`), `_place_links`, and derives `_entity_codes`/`_place_codes` as string arrays |
| `src/description.njk` | Entity and place linked sections | VERIFIED | Lines 192-217: loops over `_entity_links` and `_place_links`, renders `<a href="/{ent.code}/">` and `<a href="/nl-{place.id}/">` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/precompute-links.js` | `data/desc-entity-lookup.json` | `fs.writeFileSync` | WIRED | Line 215: `fs.writeFileSync(descEntityLookupPath, JSON.stringify(descEntityLookup))` |
| `scripts/precompute-links.js` | `data/desc-place-lookup.json` | `fs.writeFileSync` | WIRED | Line 244: `fs.writeFileSync(descPlaceLookupPath, JSON.stringify(descPlaceLookup))` |
| `src/_data/descriptions.js` | `data/desc-entity-lookup.json` | `fs.readFileSync` | WIRED | Line 42: reads `desc-entity-lookup.json` into `entityLookup` |
| `src/_data/descriptions.js` | `desc._entity_links` | enriched object attachment | WIRED | Lines 72-78: maps enriched objects with `role_labels` translation |
| `src/description.njk` | `desc._entity_links` | Nunjucks for loop | WIRED | Line 196: `{% for ent in desc._entity_links %}` |
| `src/description.njk` | `desc._place_links` | Nunjucks for loop | WIRED | Line 211: `{% for place in desc._place_links %}` |
| `src/description.njk` | `/{ent.code}/` | anchor href | WIRED (override) | Line 198: `<a href="/{{ ent.code }}/">` — simplified from plan's `/entidad/{code}/` (see override) |
| `src/description.njk` | `/nl-{place.id}/` | anchor href | WIRED (override) | Line 213: `<a href="/nl-{{ place.id }}/">` — simplified from plan's `/lugar/{name | safeSlug}/` (see override) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `description.njk` entities section | `desc._entity_links` | `desc-entity-lookup.json` → `descriptions.js` | Yes — 94,988 keys from production joins of `entity_links.json` (307,831 records) + `entities.json` (92,042 records) | FLOWING |
| `description.njk` places section | `desc._place_links` | `desc-place-lookup.json` → `descriptions.js` | Yes — 83,415 keys from production joins of `place_links.json` + `places.json` (7,068 records) | FLOWING |
| `description.njk` Pagefind spans | `desc._entity_codes`, `desc._place_codes` | Derived from `_entity_links`/`_place_links` in `descriptions.js` | Yes — string arrays derived from the same production data | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| desc-entity-lookup.json has enriched objects | `node -e "JSON.parse(...)[firstKey][0]"` | `{code, display_name, entity_type, roles}` confirmed | PASS |
| desc-place-lookup.json has enriched objects | `node -e "JSON.parse(...)[firstKey][0]"` | `{id, display_name}` confirmed | PASS |
| ui.roles has 29 keys | `Object.keys(ui.roles).length` | 29 | PASS |
| descriptions.js attaches enriched links | `require('./descriptions.js')` shape check | `_entity_links`, `_place_links`, `_entity_codes`, `_place_codes` all present with correct types | PASS |
| Generated HTML contains entity links | grep on `co-cihjml-acc-09188-civil-i-nt/index.html` | `<a href="/ne-00001/">José de Mosquera Figueroa</a>` found | PASS |
| Generated HTML contains place links | grep on same page | `<a href="/nl-88577/">Popayán</a>` found | PASS |
| Generated HTML contains Pagefind filter spans | grep on same page | `data-pagefind-filter="entidad">ne-00001` and `data-pagefind-filter="lugar">88577` found (string values) | PASS |
| Sections absent when no entity/place data | grep on `co-ahjci/index.html` | "Personas y entidades relacionadas" absent from body | PASS |
| Old plain-text fields removed | grep for `creator_display`, `place_display` in `description.njk` | 0 occurrences | PASS |
| No spurious `text-burgundy` class on entity/place links | grep in `description.njk` | Only occurrence is on repository link (correct, unchanged) | PASS |

### Requirements Coverage

No requirements IDs declared in plan frontmatter (`requirements: []` in both plans). Phase 11 success criteria from ROADMAP.md:

| Success Criterion | Status | Evidence |
|-------------------|--------|----------|
| Description pages show clickable links to entity detail pages | SATISFIED | Generated HTML verified |
| Description pages show clickable links to place detail pages | SATISFIED | Generated HTML verified |
| Links generated at build time from enriched lookup files | SATISFIED | Data pipeline verified end-to-end |
| Entity and place names render correctly (not raw codes) | SATISFIED | Display names confirmed in HTML output |

### Anti-Patterns Found

None. No TODOs, FIXMEs, placeholders, empty return values, or hardcoded empty arrays in the modified files. All data flows from production export files through the build pipeline to rendered HTML.

### Human Verification Required

Six items require human testing before this phase can be fully signed off. All automated checks pass — the outstanding items are visual correctness, navigation behaviour, Pagefind runtime behaviour, and archival terminology quality.

**1. Entity link visual appearance**

**Test:** Open a description page with linked entities (e.g. `/{reference_code}/` for a CIHJML-ACC item-level record)
**Expected:** Entity names appear as clickable links under "Personas y entidades relacionadas". Resting state: stone-900 text with stone-300 underline at 2px offset. Hover state: burgundy-light text. Role labels appear as italic muted text after an em dash.
**Why human:** CSS hover states and computed visual rendering cannot be verified from static HTML.

**2. Entity link navigation**

**Test:** Click an entity link on a description page
**Expected:** Navigates to the correct entity detail page at `/{entity_code}/` (e.g. `/ne-00001/`)
**Why human:** Requires a running browser session.

**3. Place link navigation**

**Test:** Click a place link on a description page
**Expected:** Navigates to the correct place detail page at `/nl-{place_id}/` (e.g. `/nl-88577/`)
**Why human:** Requires a running browser session.

**4. Empty section absence (visual)**

**Test:** Open a description with no linked entities (e.g. a fond or series with no items in the entity lookup)
**Expected:** "Personas y entidades relacionadas" and "Lugares" sections are completely absent — no empty heading or empty space
**Why human:** HTML absence is confirmed programmatically, but layout side-effects require visual inspection.

**5. Pagefind filter functionality**

**Test:** On the search page, apply an entity or place filter
**Expected:** Filter counts appear; descriptions filter correctly by entity code or place ID
**Why human:** Pagefind index runtime requires an active Pagefind instance — cannot be tested statically.

**6. Spanish role label quality review**

**Test:** Review role labels on several description pages (ideally CIHJML-ACC notarial and civil series)
**Expected:** Labels like Remitente, Testigo, Demandado, Oficial, Escribano, Notario read naturally and correctly for colonial-era archival records
**Why human:** Archival terminology quality requires domain expert review.

### URL Scheme Deviation (Informational)

The plan specified `/entidad/{code}/` and `/lugar/{display_name | safeSlug}/`. The implementation uses `/{code}/` (e.g. `/ne-00001/`) and `/nl-{id}/` (e.g. `/nl-88577/`). This was a deliberate post-plan improvement committed in `64dbbcf`:

- Entity URLs: `ne-` prefix already identifies entity pages; `/entidad/` segment is redundant
- Place URLs: stable numeric IDs (`nl-{id}`) prevent link breakage when place names are corrected; `/lugar/` segment removed for consistency

The deviation is intentional and an improvement over the plan. The phase goal — "description pages link to their associated entity and place detail pages" — is fully achieved with the new URL scheme.

---

_Verified: 2026-04-12T19:30:00Z_
_Verifier: Claude (gsd-verifier)_
