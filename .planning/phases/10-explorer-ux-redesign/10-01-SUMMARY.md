---
phase: 10-explorer-ux-redesign
plan: 01
status: complete
started: 2026-04-04T12:00:00Z
completed: 2026-04-04T13:00:00Z
---

## Summary

Figma designs created and approved for both explorer pages in the Figma Make project (LBeOKVLOkLXsJRe6zYdLyt).

## Design Decisions

- **Graph panel placement (D-06):** Full width above the search layout, not beside the sidebar
- **Deep-link highlight:** Focused entity gets pale rose background (#F5E6EA) + 4px burgundy left border in results list, plus centred/highlighted node in graph with glow pulse
- **Deep-link search:** The `?nodo=` parameter affects graph focus only, not Pagefind search state — the highlighted result is surfaced independently
- **Legend:** Three entries (Persona, Entidad corporativa, Fuerza del vínculo); deep-link state adds "Entidad enfocada"
- **Place explorer:** Same layout structure as entity explorer — map replaces graph, clustered burgundy markers with count labels

## Approved Pages

1. **Entity explorer (default):** EntityExplorerPage — full-width graph panel, sidebar+results below
2. **Entity explorer (deep-link):** EntityExplorerDeepLinkPage — focused node with neighbours, highlighted result card
3. **Place explorer:** PlaceExplorerPage — map panel with clustered markers, place type/coordinates/authority filters

## Key Files

- key-files.created: []
- key-files.modified: []

## Self-Check: PASSED

All checkpoint criteria met:
- [x] Entity explorer mockup exists with graph panel placement decided (full width above results)
- [x] Place explorer mockup exists with visual coherence to detail pages
- [x] User approved designs with graph panel placement confirmed
