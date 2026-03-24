# Coding Conventions

**Analysis Date:** 2026-03-24

## Naming Patterns

**Files:**
- Nunjucks templates: lowercase with hyphens for pages (`src/buscar.njk`, `src/404.njk`)
- Nunjucks includes: lowercase with hyphens, prefixed with nothing (`src/_includes/header.njk`, `src/_includes/breadcrumb.njk`)
- Nunjucks layouts: lowercase with hyphens (`src/_layouts/base.njk`)
- Data files: lowercase camelCase-free singular nouns (`src/_data/site.js`, `src/_data/ui.js`, `src/_data/descriptions.js`)
- CSS: single file, lowercase (`src/css/main.css`)
- JS: lowercase, named after the page or component they serve (`src/js/search.js`, `src/js/tree.js`, `src/js/description.js`, `src/js/header.js`)
- Scripts: lowercase with hyphens (`scripts/upload-to-r2.py`)

**Functions (JavaScript):**
- camelCase for all functions and methods: `parseUrlParams()`, `renderSearchResults()`, `handleItemClick()`
- Constructor classes use PascalCase: `SearchPage`, `MillerColumnsTree`

**Variables (JavaScript):**
- camelCase for local variables and properties: `repoCode`, `levelLabels`, `totalPages`
- UPPER_SNAKE_CASE for constants only in Python scripts: `CONTENT_TYPES`, `CACHE_CONTROL`

**CSS Classes:**
- Kebab-case throughout: `site-header`, `search-results-list`, `miller-column-header`
- BEM-like convention using single hyphens (not strict BEM with `__`): `miller-item-content`, `detail-field`, `repo-header-title`
- State modifiers use descriptive names: `nav-open`, `selected`, `selected-ancestor`, `viewer-expanded`, `sidebar-open`, `toggle-open`

**CSS Variables:**
- Prefixed with category: `--bg-color`, `--text-dark`, `--font-body`, `--spacing-md`, `--max-width`

**Eleventy Data:**
- Snake_case for data fields from the Django backend: `reference_code`, `description_level`, `scope_content`, `date_expression`
- Underscore-prefixed for computed/enriched fields added at build time: `desc._ancestors`, `desc._repo`

## Code Style

**Formatting:**
- No automated formatter configured (no Prettier, ESLint, or EditorConfig detected)
- Indentation: 2 spaces in all JS, Nunjucks, and YAML files
- CSS uses 2-space indentation
- Python scripts use 4-space indentation (PEP 8)

**Linting:**
- No linter configured. No `.eslintrc`, `.prettierrc`, `biome.json`, or `.editorconfig` present.
- Follow existing indentation and style by example.

**JavaScript Style:**
- `src/js/description.js` uses `var` and ES5-style `for` loops (older code)
- `src/js/header.js` uses `const` and arrow functions (IIFE pattern)
- `src/js/tree.js` and `src/js/search.js` use ES6 classes, `const`/`let`, arrow functions, `async/await`
- When writing new JS, use the modern style from `src/js/search.js` and `src/js/tree.js`: ES6 classes, `const`/`let`, arrow functions, template literals, `async/await`

**Nunjucks Style:**
- Template comments use `{# ... #}` syntax
- Section comments label ISAD(G) areas where relevant: `{# Section: Condiciones de acceso (ISAD 3.4) #}`
- Conditional rendering uses `{% if field %}...{% endif %}` guards for every optional field
- Variables set with `{% set %}` at the top of template blocks

## Template Architecture

**Layout inheritance:**
- Single base layout: `src/_layouts/base.njk`
- All pages extend base via front matter: `layout: base.njk`
- Base provides `{% block head %}`, `{% block content %}`, `{% block scripts %}` extension points
- Header and footer are included partials, not blocks

**Page types:**
- Static pages: `src/index.njk`, `src/buscar.njk`, `src/404.njk` -- single instances with fixed permalinks
- Paginated pages: `src/description.njk`, `src/repository.njk` -- use Eleventy pagination to generate one page per data item

**Pagination pattern:**
```njk
---
pagination:
  data: descriptions
  size: 1
  alias: desc
permalink: "/{{ desc.reference_code | safeSlug }}/"
layout: base.njk
eleventyComputed:
  title: "{{ desc.title }}"
---
```

**Partials:**
- `src/_includes/header.njk` -- site header with nav and search
- `src/_includes/footer.njk` -- site footer with credits
- `src/_includes/breadcrumb.njk` -- reusable breadcrumb (though description.njk inlines its own breadcrumb)

**Data access in templates:**
- `site.*` for site metadata (`src/_data/site.js`)
- `ui.*` for all UI strings and labels (`src/_data/ui.js`)
- `descriptions` for the full descriptions array
- `repositories` for the repositories array
- `desc` aliased from pagination for individual description pages
- `repo` aliased from pagination for individual repository pages

## UI String Management

**All user-facing strings live in `src/_data/ui.js`.**

- Strings are organized by page/component: `ui.nav.*`, `ui.search.*`, `ui.description.*`, `ui.fields.*`, `ui.levels.*`, etc.
- Templates reference strings via `{{ ui.section.key }}` -- never hardcode Spanish text in templates
- Exception: some strings in `src/index.njk` and `src/js/search.js` are still hardcoded in Spanish (intro paragraphs, search hints)
- When adding new UI-facing text, add the string to `src/_data/ui.js` first, then reference it in the template

## CSS Architecture

**Single-file approach:**
- All styles in `src/css/main.css` (2,489 lines)
- No preprocessor (no Sass, Less, or PostCSS)
- No CSS modules or scoping -- everything is global

**Organization pattern (section comments):**
```css
/* ==================== */
/* Section Name         */
/* ==================== */
```

Major sections in order:
1. CSS Variables (`:root`)
2. Reset & Base
3. Layout (`.container`, `.page-content`)
4. Header
5. Hero
6. Home Sections (`.section`, `.repo-grid`)
7. Footer
8. Buttons
9. Breadcrumb
10. Cards
11. Detail Page (description metadata layout)
12. Repository Header
13. Description List
14. Search Results
15. Search Page (facets, pagination, states)
16. Utilities
17. Miller Columns Tree
18. Description Page (viewer, badges, notices)
19. Children Tree
20. Error Page

**Design tokens via CSS custom properties:**
```css
:root {
  --bg-color: #ffffff;
  --text-color: #757575;
  --text-dark: #000000;
  --accent-primary: rgba(41,98,255,0.8);
  --font-body: 'Lato', sans-serif;
  --font-serif: 'Cormorant Garamond', serif;
  --font-logo: 'IM Fell DW Pica', serif;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --max-width: 1200px;
}
```

**Responsive approach:**
- Mobile-first is NOT used; desktop is the default, with `@media (max-width: ...)` overrides
- Breakpoints: `768px` (mobile), `1024px` (tablet), `480px` (small mobile)
- Breakpoints are inline in each section, not centralized

## JavaScript Architecture

**No build step or bundler.** All JS files are vanilla, loaded directly via `<script>` tags.

**Loading pattern:**
- `src/js/header.js` loads on every page (via `base.njk`)
- `src/js/description.js` loads on description pages
- `src/js/tree.js` loads on description and repository pages that have children
- `src/js/search.js` loads only on the search page

**Class-based pattern for complex components:**
```javascript
class SearchPage {
  constructor(container) {
    this.container = container;
    this.state = { /* ... */ };
    this.init();
  }
  async init() { /* ... */ }
  async search() { /* ... */ }
  renderSearchResults(data) { /* ... */ }
}
```

**IIFE pattern for simple components:**
```javascript
(function () {
  const btn = document.querySelector('.hamburger-toggle');
  // ...
})();
```

**DOM-ready pattern:**
```javascript
document.addEventListener('DOMContentLoaded', function() { /* ... */ });
// or
document.addEventListener('DOMContentLoaded', () => { /* ... */ });
```

**All DOM manipulation is imperative** -- `document.createElement()`, `appendChild()`, class toggling. No framework, no virtual DOM.

## Eleventy Filters

Custom filters are defined in `eleventy.config.js`. Use existing filters when applicable:

| Filter | Purpose | Example |
|--------|---------|---------|
| `limit` | Slice array | `arr \| limit(5)` |
| `splitPipe` | Split pipe-delimited string | `desc.scope_content \| splitPipe` |
| `safeSlug` | Strip `?` and `#` from strings | `desc.reference_code \| safeSlug` |
| `formatDate` | Format date (currently passthrough) | `desc.date_start \| formatDate` |
| `numberFormat` | Format number with `.` thousands separator | `count \| numberFormat` |
| `sortByOrder` | Sort array by explicit order array | `repositories \| sortByOrder(repoOrder)` |
| `filterByRepo` | Filter by repository_code | `descriptions \| filterByRepo("co-ahr")` |
| `filterByLevel` | Filter by description_level | `descriptions \| filterByLevel("fonds")` |
| `findByRef` | Find item by reference_code | `descriptions \| findByRef(refCode)` |
| `siblingsOf` | Get siblings of a description | `descriptions \| siblingsOf(desc)` |
| `extractYear` | Extract YYYY from date string | `desc.date_start \| extractYear` |
| `truncate` | Truncate with ellipsis | `text \| truncate(150)` |

## Import Organization

**No module imports in browser JS.** Pagefind is the sole dynamic import:
```javascript
this.pagefind = await import('/pagefind/pagefind.js');
```

**Node.js data files use CommonJS:**
```javascript
const fs = require('fs');
const path = require('path');
module.exports = async function() { /* ... */ };
```

**Eleventy config uses CommonJS:**
```javascript
module.exports = function(eleventyConfig) { /* ... */ };
```

## Error Handling

**JavaScript:**
- `try/catch` around async operations (Pagefind init, fetch calls)
- `console.error()` for error logging
- Graceful fallbacks: if Pagefind fails, `showError()` renders an error state
- Null guards throughout: `if (!arr || !refCode) return null;`

**Templates:**
- Every optional field wrapped in `{% if field %}...{% endif %}`
- Filters return safe defaults for null/undefined input

## Comments

**When to comment:**
- Section headers in CSS use the `/* ==== */` banner pattern
- JSDoc-style block comments on class definitions and complex methods in `src/js/tree.js` and `src/js/search.js`
- ISAD(G) standard references in template section comments: `{# Section: Condiciones de acceso (ISAD 3.4) #}`
- Inline comments for non-obvious logic (e.g., Pagefind filter semantics, TIFY popup workaround)

**JSDoc usage:**
```javascript
/**
 * Miller Columns Tree Navigation
 *
 * Displays hierarchical data in columns where clicking an item
 * reveals its children in the next column.
 */
```
- Used for class-level and method-level documentation
- Not used for every function -- only complex ones

## Commit Conventions

- Short imperative messages, no emojis, no co-author lines
- `feat:` prefix used for feature commits (e.g., `feat: replace children tree with Miller columns`)
- `fix:` prefix used for bug fixes
- Unprefixed for chores, config, and deployment changes
- No Conventional Commits enforcement -- prefixes are optional
- Phase prefixes (e.g., `feat(04-01):`) are used in the backend dev repo but not observed here

## Vendor Dependencies

- Third-party assets live in `src/vendor/`: currently only TIFY IIIF viewer (`src/vendor/tify/`)
- Vendor files are passed through to `_site` via `addPassthroughCopy`
- Google Fonts loaded via CDN link in `src/_layouts/base.njk` (Lato, Cormorant Garamond, IM Fell DW Pica, Material Symbols Outlined)
- Cloudflare Web Analytics snippet in `src/_layouts/base.njk`
- Pagefind generated at build time by `npx pagefind --site _site` -- not checked into source

---

*Convention analysis: 2026-03-24*
