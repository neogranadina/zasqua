# Zasqua (legacy frontend)

> **Archived.** This repository was the original static-site frontend for
> [zasqua.org](https://zasqua.org). It has been superseded and is preserved
> here, read-only, as a historical reference.
>
> To make Zasqua easier for others to deploy, what this single repository used
> to do is now split into three parts:
>
> - **The Zasqua engine** — [`UCSB-AMPLab/zasqua`](https://github.com/UCSB-AMPLab/zasqua)
>   (on npm as [`@ucsb-ampl/zasqua`](https://www.npmjs.com/package/@ucsb-ampl/zasqua)).
>   A deployment-agnostic command-line tool that compiles a six-file JSON
>   dataset into a complete static archival website — no application server,
>   no database, no search backend at request time.
> - **The Neogranadina instance** — [`neogranadina/zasqua-neogranadina`](https://github.com/neogranadina/zasqua-neogranadina).
>   The thin, deployment-specific repository (configuration and theming) that
>   builds zasqua.org on top of the engine.
> - **A starter template** — [`UCSB-AMPLab/zasqua-template`](https://github.com/UCSB-AMPLab/zasqua-template).
>   A fork-and-go starting point for standing up your own Zasqua site.
>
> If you are looking for the current code, start with the engine.

## What this was

This repository generated the public site at [zasqua.org](https://zasqua.org) —
over 106,000 archival descriptions, 78,000 entity authority records, and 6,900
place authority records from five repositories in Colombia and Peru — as a fully
static site: pre-rendered HTML for every record, client-side search, on-demand
JSON for hierarchical navigation, and IIIF Level 0 static image tiles, with no
server-side process at runtime. That minimal-computing approach carries straight
into the engine that replaces it.
