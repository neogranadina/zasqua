# Phase 5: PMTiles Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 05-pmtiles-infrastructure
**Areas discussed:** Tile Worker domain & routing, Tippecanoe tile generation, Worker deployment & repo location, CI pipeline integration

---

## Tile Worker Domain & Routing

| Option | Description | Selected |
|--------|-------------|----------|
| tiles.zasqua.org | Dedicated subdomain routed to a separate Worker. Clean separation, simplest CORS setup | ✓ |
| zasqua.org/tiles/* | Path-based routing on existing domain. Requires modifying site Worker or route rule | |
| Direct R2 public URL | R2's built-in public access. Limited CORS/caching control | |

**User's choice:** tiles.zasqua.org
**Notes:** User asked what subdomains already exist. No subdomains found in codebase config — domain routing is configured in Cloudflare dashboard. User confirmed tiles.zasqua.org.

---

## Tippecanoe Tile Generation

### Where Tippecanoe runs

| Option | Description | Selected |
|--------|-------------|----------|
| CI only | Install Tippecanoe in GitHub Actions, generate during deploy workflow | ✓ |
| Local generation | Run locally, upload manually | |
| Both CI and local | CI generates on deploy, local workflow for testing | |

**User's choice:** CI only

### Tile feature properties

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal — code + name only | place_code and display_name. Tiny file. Explorers use place-index.json for filtering | ✓ |
| Medium — code, name, type | Add place_type for colour-coding from tile data | |
| Full — all index fields | Embed everything from place-index.json | |

**User's choice:** Minimal (after asking for explanation of the trade-offs)
**Notes:** User asked "Explain" before choosing. Explanation covered why minimal works well given place-index.json is already loaded in memory by the explorer page.

---

## Worker Deployment & Repo Location

| Option | Description | Selected |
|--------|-------------|----------|
| worker-tiles/ in this repo | Alongside existing worker/ folder. Same repo, same deploy pipeline | ✓ |
| Separate repository | Dedicated repo. Full independence but cross-repo coordination | |
| Inside worker/ folder | Second entrypoint in existing worker dir. Risks coupling | |

**User's choice:** worker-tiles/ in this repo

---

## CI Pipeline Integration

### Workflow strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Same deploy workflow | Add to deploy.yml. Tiles regenerated every deploy, always in sync | ✓ |
| Separate workflow | Dedicated deploy-tiles.yml. Decouples tile generation | |
| Same workflow, conditional | Add to deploy.yml but skip if places.json unchanged | |

**User's choice:** Same deploy workflow

### R2 bucket

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated bucket | New zasqua-tiles bucket. Clean separation, independent caching | ✓ |
| Same zasqua-site bucket | Upload alongside site files. Simpler but risk of interference | |

**User's choice:** Dedicated bucket

---

## Claude's Discretion

- Zoom level range, clustering strategy, GeoJSON conversion approach
- Worker caching strategy, R2 upload method, Tippecanoe installation method in CI

## Deferred Ideas

None — discussion stayed within phase scope
