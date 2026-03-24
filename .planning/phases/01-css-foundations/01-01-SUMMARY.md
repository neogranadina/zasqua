---
phase: 01-css-foundations
plan: 01
subsystem: css-pipeline
tags: [tailwind, css, build-pipeline, design-tokens, fonts]
dependency_graph:
  requires: []
  provides: [tailwind-pipeline, brand-tokens, font-stack]
  affects: [src/css/main.css, src/_layouts/base.njk]
tech_stack:
  added: [tailwind-css-v4-standalone-cli]
  patterns: [@theme tokens, @layer base resets, @layer components placeholder]
key_files:
  created:
    - src/css/input.css
    - scripts/check-css-tokens.sh
  modified:
    - src/_layouts/base.njk
    - build.sh
    - .github/workflows/deploy.yml
    - .gitignore
    - src/css/main.css
key_decisions:
  - source("..") in @import resolves to src/ from src/css/input.css — not source("../src") as written in the plan
  - check-css-tokens.sh checks input.css for token definitions rather than compiled main.css — tokens only appear in compiled output when utility classes are used in templates
metrics:
  duration: "172s (~3 min)"
  completed: "2026-03-24"
  tasks_completed: 2
  files_changed: 6
---

# Phase 01 Plan 01: Tailwind CSS v4 Pipeline and Design Tokens Summary

**One-liner:** Tailwind v4 standalone CLI wired into local and CI builds, all 9 brand colour tokens and 3 font tokens defined in @theme, Google Fonts updated to DM Sans/Crimson Text/Cormorant Garamond.

## What Was Built

### Task 1: Tailwind input stylesheet and Google Fonts update (7ca2124)

Created `src/css/input.css` with the full Tailwind v4 source structure:
- `@import "tailwindcss" source("..")` scanning the `src/` directory for utility classes
- `@theme` block with 9 brand colour tokens (burgundy, burgundy-deep, burgundy-light, burgundy-dark, pale-rose, ochre, sage, periwinkle, bg) and 3 font stacks (sans/DM Sans, serif/Crimson Text, display/Cormorant Garamond)
- `:root` block with layout constants `--max-width: 1200px` and `--header-height: 70px` (not in @theme — used in calc() not as utility tokens)
- `@layer base` with html/body/heading/anchor/img resets adapted from the old main.css
- `@layer components` empty placeholder for Plans 02 and 03

Updated `src/_layouts/base.njk` Google Fonts link: replaced Cormorant Garamond (300/400/500/700), IM Fell DW Pica, and Lato (300/400/700) with DM Sans (400/600), Crimson Text (400/700), and Cormorant Garamond (600) per D-06. Added trailing slashes to preconnect links.

### Task 2: Build pipeline and verification script (48bddbe)

Updated `build.sh`: added Tailwind CLI download-and-compile step (arch-aware binary selection) between npm ci and npx eleventy. Binary download is conditional — only downloads if `./tailwindcss` doesn't already exist.

Updated `.github/workflows/deploy.yml`: added "Build CSS with Tailwind" step downloading `tailwindcss-linux-x64` from GitHub releases, placed before "Build site with Eleventy".

Updated `.gitignore`: added `tailwindcss` and `tailwindcss-*` to exclude the downloaded binary.

Created `scripts/check-css-tokens.sh`: automated COL-01/COL-03/COL-04 verification — checks all 9 brand tokens are defined in `input.css`, and checks compiled `main.css` has no legacy blue or orange accent values.

Compiled Tailwind v4.2.2 against `src/css/input.css` — exit 0, 8.6 KB output (small at this stage — no template utilities yet; Plans 02/03 will expand it).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected source() path in @import directive**
- **Found during:** Task 2 (Tailwind CLI compilation)
- **Issue:** Plan and research specified `source("../src")` in `input.css`. From `src/css/input.css`, that path resolves to `src/css/../src` = `src/src/` which does not exist. The CLI returned an error: "The `source(../src)` does not exist or is not a directory."
- **Fix:** Changed to `source("..")` which resolves from `src/css/` up to `src/` — the correct Eleventy source directory.
- **Files modified:** `src/css/input.css`
- **Commit:** 48bddbe (included in Task 2 commit)

**2. [Rule 1 - Bug] Updated check-css-tokens.sh to verify input.css not compiled main.css**
- **Found during:** Task 2 (running verification script)
- **Issue:** Original script checked compiled `main.css` for token variable names. Tailwind v4 only outputs `@theme` variables to the compiled CSS when utility classes referencing them are present in scanned templates. At Plan 01 stage, only 2 of 9 tokens appear in the compiled output (those used in `@layer base` via `@apply`). The script was failing for 6 tokens that are correctly defined in `@theme` but not yet used in templates.
- **Fix:** Changed the token presence check to look in `src/css/input.css` (source of truth for `@theme` definitions). Kept the blue/orange accent checks against compiled `main.css` (correct — checking absence of legacy values in output). Added a comment explaining the rationale.
- **Files modified:** `scripts/check-css-tokens.sh`
- **Commit:** 48bddbe

## Success Criteria Status

- [x] Tailwind v4 standalone CLI compiles `input.css` to `main.css` without errors (exit 0, v4.2.2)
- [x] All 9 brand colour tokens and 3 font tokens are defined in @theme
- [x] Google Fonts loads DM Sans (400, 600), Crimson Text (400, 700), Cormorant Garamond (600) — no Lato, no IM Fell DW Pica
- [x] Build pipeline runs Tailwind before Eleventy in both local and CI contexts
- [x] Background colour is warm white (#FAFAF9) via @layer base html rule using var(--color-bg)
- [x] Verification script exists, is executable, and all checks pass

## Requirements Addressed

- VIS-01: Google Fonts updated — DM Sans/Crimson Text/Cormorant Garamond loading at trimmed weights
- VIS-02: @theme defines --font-sans, --font-serif, --font-display mapping to the three typefaces
- COL-01: All brand colour tokens defined in @theme block in input.css

## Self-Check: PASSED

- src/css/input.css — FOUND
- scripts/check-css-tokens.sh — FOUND
- src/css/main.css — FOUND
- Commit 7ca2124 — FOUND (Task 1: Tailwind input stylesheet and Google Fonts update)
- Commit 48bddbe — FOUND (Task 2: build pipeline and verification script)
