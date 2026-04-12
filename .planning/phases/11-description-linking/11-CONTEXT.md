# Phase 11: Description Linking - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Description pages link to their associated entity and place detail pages. Links are generated at build time from enriched lookup data. Entity and place names render as clickable hyperlinks with role labels. This phase does NOT add explorer links — detail pages already link to explorers.

</domain>

<decisions>
## Implementation Decisions

### Link presentation
- **D-01:** Replace the current plain-text "Personas y entidades" and "Lugares" sections with clickable hyperlinks to entity/place detail pages
- **D-02:** Use plain anchor links (not chips/pills) — standard `<a>` elements styled like existing repository links (burgundy text, hover state)
- **D-03:** Only show entities/places that have a matching detail page in the lookup — skip unlinked names entirely (do not fall back to plain text for names without a matching code)
- **D-04:** Keep separate "Personas y entidades" and "Lugares" sections (existing section structure)

### Role display
- **D-05:** Show each entity once in a flat list with all its roles listed after the link
- **D-06:** Role labels appear as italic muted text after the entity link, comma-separated for multi-role entities (e.g. "Fernando de Ahumada — *Productor, Mencionado*")
- **D-07:** Use Spanish role labels from `ui.roles` (Productor, Colaborador, Editor, Materia, Mencionado)
- **D-08:** Places appear as plain linked names with no type label or role

### Data enrichment
- **D-09:** A new precompute script produces enriched lookup files that include display_name, entity_type, and role per entity per description — replacing the current code-only `desc-entity-lookup.json`
- **D-10:** The enriched entity lookup format: `{ "ref-code": [{"code": "ne-001", "display_name": "Name", "entity_type": "person", "roles": ["creator", "mentioned"]}, ...] }`
- **D-11:** The enriched place lookup includes display_name: `{ "ref-code": [{"id": 81553, "display_name": "Santafé de Bogotá"}, ...] }`
- **D-12:** `descriptions.js` reads the enriched lookups and attaches resolved entity/place objects (not just codes) to each description at build time
- **D-13:** Role data comes from the backend `entity_links` export (which has the `role` field) — the precompute script joins entity_links with entities.json to produce the enriched lookup

### Explorer links
- **D-14:** No explorer links on description pages — entity/place names link only to their detail pages (`/entidad/{code}/`, `/lugar/{name}/`)

### Claude's Discretion
- Exact CSS styling for entity/place links (follow existing anchor link patterns)
- How to handle descriptions with many linked entities (10+) — whether to truncate with "show more" or display all
- Precompute script naming and location within `scripts/`
- Whether to add entity_type colour distinction to links or keep them uniform

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Templates & data loaders
- `src/description.njk` — Current description page template; lines 193–211 show existing "Personas y entidades" and "Lugares" sections to be replaced
- `src/_data/descriptions.js` — Data loader that already reads desc-entity-lookup.json and attaches `_entity_codes` / `_place_codes` arrays (lines 41–72)
- `src/_data/ui.js` — Spanish UI strings including `ui.roles` (Productor, Colaborador, etc.) and section headers

### Existing lookup data
- `data/desc-entity-lookup.json` — Current format: `{ "reference_code": ["ne-code", ...] }` — to be replaced with enriched format
- `data/desc-place-lookup.json` — Current format: `{ "reference_code": ["place_id", ...] }` — to be replaced with enriched format
- `data/entities.json` — 92K entities with entity_code, display_name, entity_type, etc.
- `data/places.json` — 7,068 places with id, display_name, place_type, etc.

### Build pipeline patterns
- `scripts/precompute-entity-links.js` — Existing precompute script pattern (generates per-entity JSON shards)
- `build.sh` — Build orchestration script; precompute steps run before Eleventy

### Phase 4 context (pipeline patterns)
- `.planning/phases/04-build-pipeline-data-pre-compute/04-CONTEXT.md` — Established precompute script patterns and data loader conventions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `descriptions.js` data loader already reads lookup JSONs and attaches codes — extend to attach full objects
- `ui.roles` vocabulary already defines all Spanish role labels (Productor, Colaborador, Editor, Materia, Mencionado)
- Existing link styling on description pages (e.g. repository link at line 84 of description.njk): `class="text-burgundy hover:text-burgundy-light"`

### Established Patterns
- Precompute scripts in `scripts/` produce JSON consumed by `src/_data/` loaders
- Build order: download data → precompute → Eleventy build → Pagefind index
- Pagefind filters for `entidad` and `lugar` already exist on description pages (lines 35–40 of description.njk)

### Integration Points
- `description.njk` template sections "Personas y entidades" (line 193) and "Lugares" (line 203) — replace these blocks
- `descriptions.js` enrichment loop (line 71–72) — extend to attach full entity/place objects instead of just codes
- `build.sh` precompute section — add new enrichment script before Eleventy runs

</code_context>

<specifics>
## Specific Ideas

- "Make me links, not pills" — user explicitly wants plain hyperlinks, not the chip/pill pattern used on entity detail pages
- Role labels styled like: `Fernando de Ahumada` — *Productor, Mencionado* (link followed by italic role text)
- The backend entity_links export has a `role` field that maps to the `ui.roles` vocabulary — this is the source of truth for roles

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-description-linking*
*Context gathered: 2026-04-11*
