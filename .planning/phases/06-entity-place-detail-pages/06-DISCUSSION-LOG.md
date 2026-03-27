# Phase 6: Entity & Place Detail Pages - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 06-entity-place-detail-pages
**Areas discussed:** Page layout & visual design, Map embed behaviour, Linked descriptions display, Spanish UI strings & labels

---

## Page Layout & Visual Design

Explored via an interactive HTML playground (`entity-place-playground.html`) with controls for layout, typography, badges, variants, authority links, description display, and field layout. User tested multiple presets and configurations.

| Option | Description | Selected |
|--------|-------------|----------|
| Single column | Full-width metadata, no aside | |
| Two columns (metadata + aside) | Match description page pattern, map/timeline in aside | ✓ |

**User's choice:** Two-column layout for both page types. Place pages get map + timeline in aside; entity pages get timeline alone. All visual conventions match the existing description page: DM Sans titles, periwinkle badges, DM Sans uppercase section headers, stacked field labels, inline variant tags.

**Notes:** User's guiding principle: "use all the existing conventions, and in the case of places put a map where the IIIF viewer would be."

---

## Map Embed Behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Centred, zoomed in (~z12) | City-level zoom, neighbourhood context | |
| Country-level context (~z6–8) | Wider zoom for geographic orientation | ✓ |
| Claude decides by place type | Adaptive zoom | |

**User's choice:** Country-level context (~z6–8)
**Notes:** Colonial-era places need geographic orientation — users may not know where they are.

| Option | Description | Selected |
|--------|-------------|----------|
| Omit map section entirely | Falls back to single column | |
| Show placeholder notice | "Ubicación no disponible" with icon | ✓ |
| Claude decides | Based on aside content | |

**User's choice:** Placeholder notice, matching the "Material no digitalizado" pattern.

| Option | Description | Selected |
|--------|-------------|----------|
| Single column for entities | No aside content | |
| Two-column with summary card | Summary in aside | |
| Claude decides | Based on content volume | |

**User's initial choice:** Single column for entities. **Revised** during linked descriptions discussion — user proposed a scrolling chronological timeline in the aside, making two-column layout viable for entities too.

---

## Linked Descriptions Display

Discussion evolved significantly from initial options.

**Initial question:** How to handle "Show more" for linked descriptions on a static page.

**User's proposal:** Link to the search page instead of client-side pagination — `/buscar/?lugar={place_code}` or `/buscar/?entidad={entity_code}` — so users can apply facets and filters.

**User's second proposal:** Add a scrolling chronological timeline in the aside column showing each archival appearance with role and link to document. "Descripciones vinculadas" section becomes just a single link to the search page.

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side show/hide from shard | Fetch shard, render first N, button reveals rest | |
| Link to search page | `/buscar/?entidad={code}` with full facets | ✓ (combined) |
| Aside timeline + search link | Chronological timeline in aside, search link in main | ✓ (final) |

**User's choice:** Aside timeline for chronological browsing + search page link for faceted filtering. No inline description list on the detail page.
**Notes:** Timeline is purely visual chronology — no filtering or role toggle. Entries show date, role, title, link. Requires Pagefind filter additions on description pages and reverse lookups in precompute script.

---

## Spanish UI Strings & Labels

| Option | Description | Selected |
|--------|-------------|----------|
| ISAAR(CPF) terms | Persona, Entidad corporativa, Familia | ✓ |
| Simpler terms | Persona, Organización, Familia | |

**User's choice:** ISAAR(CPF) terminology for entity types.

| Option | Description | Selected |
|--------|-------------|----------|
| Plain Spanish geographic terms | Lugar poblado, División administrativa, etc. | ✓ |
| GeoNames feature class terms | Spanish GeoNames equivalents | |

**User's choice:** Plain Spanish geographic terms for place types.

| Option | Description | Selected |
|--------|-------------|----------|
| ISAAR-aligned section headers | Identificación, Historia, Relaciones, Fuentes | ✓ |
| Friendlier headers | Datos generales, Biografía, Documentos, Enlaces | |

**User's choice:** ISAAR(CPF) section headers, consistent with ISAD(G) usage on description pages.

---

## Claude's Discretion

- Template structure (shared partial vs separate templates)
- MapLibre configuration details
- Timeline visual treatment (CSS/SVG)
- Handling very many timeline entries

## Deferred Ideas

None — discussion stayed within phase scope.
