# Phase 11: Description Linking - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 11-description-linking
**Areas discussed:** Link presentation, Role display, Data enrichment, Explorer links

---

## Link Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Clickable chips | Rounded chip/pill links grouped under section headers | |
| Inline linked text | Standard `<a>` hyperlinks, less visual weight | ✓ |
| Structured list | Vertical list with entity type icon, display name link, role label | |

**User's choice:** Inline linked text (explicitly "LINKS not pills")
**Notes:** User tested a playground with chip styles and explicitly rejected pills in favour of plain hyperlinks.

### Fallback for unlinked names

| Option | Description | Selected |
|--------|-------------|----------|
| Plain text fallback | Show name as plain text when no matching code exists | |
| Only show linked | Only display entities/places with a matching detail page | ✓ |

**User's choice:** Only show linked

---

## Role Display

### Multi-role handling

| Option | Description | Selected |
|--------|-------------|----------|
| Repeat under each role | Entity chip appears under every role group | |
| Show once, list roles | Entity appears once with all roles listed | ✓ |
| Primary role only | Entity appears once under most important role | |

**User's choice:** Show once, list roles

### Role label position

| Option | Description | Selected |
|--------|-------------|----------|
| After the link | Role labels as italic muted text after the link | ✓ |
| Inside chip (two-line) | (rejected — not using chips) | |
| As badge pills | (rejected — not using chips) | |

**User's choice:** After the link, as italic text (decided via playground exploration)

### Place roles

**User's choice:** Plain links, no type label

---

## Data Enrichment

### Build pipeline approach

| Option | Description | Selected |
|--------|-------------|----------|
| Enrich in descriptions.js | Load entities.json/places.json in data loader, build maps in memory | |
| Enrich in precompute script | New script produces enriched lookup files before Eleventy runs | ✓ |
| Client-side fetch | Description pages fetch names on demand from JSON shards | |

**User's choice:** Precompute script (Claude's recommendation — avoids OOM risk, aligns with Phase 4 patterns)

### Role data source

| Option | Description | Selected |
|--------|-------------|----------|
| Enrich lookup with roles | Update precompute to include role per entity per description | ✓ |
| Use creator_display fallback | Infer creator role from text matching | |
| Skip roles for now | Show links without role labels | |

**User's choice:** Enrich lookup with roles

---

## Explorer Links

| Option | Description | Selected |
|--------|-------------|----------|
| No explorer links | Names link only to detail pages | ✓ |
| Explorer link per section | One "Explorar entidades vinculadas" link per section | |
| Explorer link per entity | Secondary explorer link on each entity | |

**User's choice:** No explorer links — detail pages already link to explorers

---

## Claude's Discretion

- Exact CSS styling for entity/place links
- Handling descriptions with many linked entities (10+)
- Precompute script naming and location
- Whether to add entity_type colour distinction to links

## Deferred Ideas

None
