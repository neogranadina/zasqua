# Phase 2: Component Updates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 02-component-updates
**Areas discussed:** Header nav styling, Homepage hero & masonry, Search page components, Description & repository pages

---

## Header Nav Styling

### Nav hover effect

| Option | Description | Selected |
|--------|-------------|----------|
| Periwinkle underline | Text stays dark on hover; periwinkle underline appears below via border-bottom | ✓ |
| Periwinkle text colour | Text changes to periwinkle, no underline | |
| Both colour + underline | Text shifts lighter AND periwinkle underline appears | |

**User's choice:** Periwinkle underline (Recommended)
**Notes:** Matches COMP-01 spec wording "periwinkle hover underlines"

### Header search pill

| Option | Description | Selected |
|--------|-------------|----------|
| Tokens only | Replace hardcoded hex with stone tokens. Visually unchanged | |
| Add burgundy accent | Search icon or button gets burgundy fill or hover effect | |
| You decide | Claude picks best approach | ✓ |

**User's choice:** You decide

### Header misc colours

| Option | Description | Selected |
|--------|-------------|----------|
| Map to stone tokens | #1C1917→stone-900, #dedede→stone-300, #f0f0f0→stone-100 | ✓ |
| Custom treatment | Some elements use brand colours instead of neutrals | |

**User's choice:** Map to stone tokens (Recommended)

---

## Homepage Hero & Masonry

### Hero search button

| Option | Description | Selected |
|--------|-------------|----------|
| Burgundy button only | bg-burgundy + white icon, hover becomes bg-periwinkle | |
| Full search bar restyle | Both input border and button get brand colours | |
| You decide | Claude picks based on Figma spec | |

**User's choice:** "leave it" — skip the burgundy button entirely
**Notes:** User confirmed this intentionally skips COMP-03's button criterion

### Hero title font

| Option | Description | Selected |
|--------|-------------|----------|
| Keep Crimson Text | COMP-03 says Crimson Text. Brand logotype font | ✓ |
| Switch to Cormorant Garamond | Use font-display for hero title as display heading | |

**User's choice:** "It looks fine as it is" — keep Crimson Text

### Masonry overlay

| Option | Description | Selected |
|--------|-------------|----------|
| Semi-transparent burgundy | Overlay becomes rgba burgundy on hover | ✓ |
| You decide | Claude picks opacity and approach | |

**User's choice:** Semi-transparent burgundy (Recommended)

---

## Search Page Components

### Active filter pills

| Option | Description | Selected |
|--------|-------------|----------|
| Burgundy for active | Active pills get bg-burgundy + white text | ✓ |
| Periwinkle for active | Active pills get bg-periwinkle + dark text | |
| Keep current styling | No change needed | |
| You decide | Claude picks based on implementation | |

**User's choice:** Burgundy for active (Recommended)

### Active pagination

| Option | Description | Selected |
|--------|-------------|----------|
| Periwinkle bg, dark text | Active page gets bg-periwinkle with stone-900 text | ✓ |
| Burgundy bg, white text | Active page gets bg-burgundy with white text | |
| You decide | Claude picks based on existing styling | |

**User's choice:** Periwinkle bg, dark text (Recommended)

### Sort/facet styling

| Option | Description | Selected |
|--------|-------------|----------|
| Stone tokens only | Neutral stone scale for sort, facets, borders | ✓ |
| Brand accents on facets | Facet headers or toggles get burgundy/periwinkle | |
| You decide | Claude maps to appropriate tokens | |

**User's choice:** Stone tokens only (Recommended)

---

## Description & Repository Pages

### Link colours

| Option | Description | Selected |
|--------|-------------|----------|
| All links burgundy | Every link uses text-burgundy-light consistently | |
| Only metadata links | Breadcrumb/nav stay stone-900; metadata links become burgundy | |
| You decide | Claude applies base link colours, adjusts where needed | ✓ |

**User's choice:** You decide

### Miller column selection

| Option | Description | Selected |
|--------|-------------|----------|
| Periwinkle background | Selected item gets bg-periwinkle with dark text | |
| Periwinkle left border | 3px periwinkle left border on selected item | |
| You decide | Claude picks based on existing implementation | |

**User's choice:** "They're fine as they are" — keep current styling, skip COMP-07 selection colour change

### Metadata section headers

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current styling | Just ensure token colours, not hardcoded values | ✓ |
| Add subtle accent | Burgundy left border or underline on section headers | |
| You decide | Claude cleans up and applies consistent tokens | |

**User's choice:** Keep current styling

---

## Claude's Discretion

- Header search pill visual treatment (D-02)
- Burgundy link placement on description pages (D-10)

## Deferred Ideas

None — discussion stayed within phase scope
