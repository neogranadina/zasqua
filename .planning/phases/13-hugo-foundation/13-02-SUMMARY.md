---
phase: 13-hugo-foundation
plan: 02
status: complete
date_completed: 2026-04-17
---

# Plan 13-02 Summary — Enrichment Port to generate-content.js

## What shipped

- `scripts/enrichment/date-format.js` — direct port of `formatDateNarrative` and `SPANISH_MONTHS` from `eleventy.config.js:37-64`.
- `scripts/enrichment/number-format.js` — direct port of `numberFormat` from `eleventy.config.js:68-71`.
- `scripts/enrichment/ancestor-chain.js` — `buildAncestorChain` with 20-hop cycle guard (throws, exit code 2).
- `scripts/enrichment/link-enrichment.js` — `enrichEntityLinks` (with Colombian Spanish role label translation) and `enrichPlaceLinks`.
- `scripts/generate-content.js` — single entry point. Reads `exports/*.json` + reverse-lookup files + `src/_data/ui.js` roles, emits sharded enriched output.
- `assets/hugo-data/.gitkeep` — directory exists in git, generated output is gitignored.

## Record counts (full run)

Descriptions are sharded by a **fixed record count** (`SHARD_SIZE = 20,000`), sorted by `(repository_code, reference_code)` before sharding so each shard stays locally browsable. Fixed-count sharding is data-distribution-agnostic — works on any corpus, including heavily lopsided ones.

| Output | Records | Size |
|---|---|---|
| `descriptions/000.json` | 20,000 | 109 MB |
| `descriptions/001.json` | 20,000 | 109 MB |
| `descriptions/002.json` | 20,000 | 108 MB |
| `descriptions/003.json` | 20,000 | 89 MB |
| `descriptions/004.json` | 20,000 | 123 MB |
| `descriptions/005.json` | 6,529 | 70 MB |
| **Total descriptions** | **106,529** | **608 MB across 6 shards** |
| `entities.json` | 78,476 | 35 MB |
| `places.json` | 6,722 | 2.4 MB |
| `descriptions-index.json` | 106,529 keys | 3.8 MB |

## Timings

- Full enrichment: 3.8 s (descriptions 2.3 s, entities 0.3 s, places <0.1 s; streaming JSON writes)
- `DEV_LIMIT=100` run: 1.3 s
- Full vitest enrichment suite: 13.76 s (includes loading all shards for ancestor-chain walk validation)

## Test results

- `npx vitest run tests/enrichment/` — 25 tests pass across 4 files.
- `DEV_LIMIT=100 npx vitest run tests/enrichment/enriched-counts.test.js` — 4 tests pass.
- Build tests (`tests/build/`) still correctly skipped (gated by `SKIP_BUILD_TESTS`) — Plan 13-05 turns them on.

## Deviations from plan

### 1. Sharded descriptions output (the big one)

The plan specified a single `assets/hugo-data/descriptions.json`. After a successful run, that file weighs 610 MB. V8 imposes a 512 MiB maximum string length (`0x1fffffe8` characters), which means:

- `require('./assets/hugo-data/descriptions.json')` throws `ERR_STRING_TOO_LONG`.
- `JSON.parse(fs.readFileSync(path, 'utf8'))` throws the same.
- Every test assertion in the plan that loads the full file would fail.

The output is now sharded by a **fixed record count** (`SHARD_SIZE = 20,000`): `assets/hugo-data/descriptions/000.json` through `005.json`. A companion `descriptions-index.json` provides O(1) `reference_code → shard_filename` lookup so Plan 13-03's Hugo adapter (or any consumer) can locate a record without iterating shards. Records are sorted by `(repository_code, reference_code)` before sharding, so each shard stays locally browsable.

Fixed-count sharding was chosen over per-repository sharding after a review by the user. Per-repo sharding happens to work on the current corpus (biggest shard 302 MB) but is data-dependent: a future lopsided ingest with a single 650 MB repo would re-break enrichment. A record-count shard is universal — bounded by design regardless of how records are distributed across repositories or how big individual records grow in future enrichment passes.

User approved this route via two AskUserQuestion rounds during execution.

### 2. `_linked_count` via pre-aggregated index

The plan called for counting linked descriptions by reading each entity's per-code shard file from `exports/entity-links/{code}.json`. That would mean 78,476 file reads for entities and 6,722 for places on every run — perhaps a minute of I/O on the full corpus. The existing Eleventy loader (`src/_data/entities.js`) already uses `exports/entity-index.json`, which `precompute-links.js` produces with `linked_description_count` already baked in. Switching to the index file matches existing behavior and completes in one file read per type.

### 3. Three commits, not one

The plan's success criterion #6 called for a single commit `phase 13-02: port enrichment logic to generate-content.js`. In practice the execute-plan protocol commits atomically per task:

- `c9706b7` — port formatDateNarrative and numberFormat (Task 1)
- `655f149` — port full enrichment pipeline (initial per-repo sharding)
- `139da49` — switch to fixed record-count shards (universal bound)

## Forward pointer for Plan 13-03

The Hugo adapter (`content/descripcion/_content.gotmpl`) must now iterate **every shard** under `assets/hugo-data/descriptions/` (glob the directory; shard filenames are opaque zero-padded indices like `000.json`, not semantic repo codes) and emit one page per record across all shards. Access to an arbitrary description by `reference_code` (e.g. for cross-links from an entity page) should go through `descriptions-index.json` to find the right shard. Entities and places remain single-file loads.

The `repository` field is inlined per description (D-10), so content-detail templates don't need a separate lookup — but a global `data/repositories.yaml` still makes sense for the index/home page if Plan 13-03 wants a repository listing.
