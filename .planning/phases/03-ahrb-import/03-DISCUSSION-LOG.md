# Phase 3: AHRB Import - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 03-ahrb-import
**Areas discussed:** Backend export coordination, AHRB display details, Deploy & verification, Data completeness, Porting

---

## Backend Export Coordination

| Option | Description | Selected |
|--------|-------------|----------|
| Current data is fine | The March 24 export is complete and ready | |
| Need fresh export | Backend data has changed since March 24 | ✓ |
| Not sure yet | Need to check the backend state first | |

**User's choice:** Need fresh export
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Prerequisite | User runs export_frontend_data and uploads to B2 before phase starts | |
| Include in phase | Phase 3 documents and executes the export steps | ✓ |

**User's choice:** Include in phase
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Run it together | Execute export commands here with user approval | ✓ |
| Document only | Write commands in plan but user runs them | |

**User's choice:** Run it together
**Notes:** None

---

## AHRB Display Details

| Option | Description | Selected |
|--------|-------------|----------|
| Subtitle is correct | Keep current subtitle as-is | ✓ |
| Needs updating | User provides correct subtitle | |

**User's choice:** Subtitle is correct
**Notes:** Current subtitle: "Materiales digitalizados por Neogranadina en el Archivo Histórico Regional de Boyacá, Tunja, Colombia."

---

| Option | Description | Selected |
|--------|-------------|----------|
| Image exists and is correct | AHRB_front.jpg is ready | ✓ |
| Image needs replacing | User provides new image | |
| Need to check | Verify during phase | |

**User's choice:** Image exists and is correct
**Notes:** None

---

## Deploy & Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Bump to v0.4.0 | Last phase of milestone — bump and deploy | ✓ |
| Don't bump yet | Version bump during release/porting | |
| Bump but don't release | Update in dev repo only | |

**User's choice:** Bump to v0.4.0
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Build log + spot checks | Verify page count, check AHRB pages, IIIF viewer | ✓ |
| Build log only | Confirm build succeeds, user verifies site | |
| Browser verification | Chrome automation to verify rendering | |

**User's choice:** Build log + spot checks
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Trigger together | Push and trigger GitHub Actions from session | ✓ |
| I'll trigger it | User handles push and deploy | |

**User's choice:** Trigger together
**Notes:** None

---

## Data Completeness

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, 542 was approximate | Rough count of notarial volumes — actual count may differ | ✓ |
| Only volumes matter | Import only ~549 file-level volumes | |
| All 10,524 records | Full dataset at all levels | |

**User's choice:** Yes, 542 was approximate
**Notes:** Full AHRB dataset includes 549 file-level, 9,948 items, 27 upper-level records

---

| Option | Description | Selected |
|--------|-------------|----------|
| Expected — not all are digitised | ~880 IIIF manifests out of 10,524 is correct | ✓ |
| Needs backend fix | More items should have IIIF manifests | |
| Check after export | Verify after fresh export | |

**User's choice:** Expected — not all are digitised
**Notes:** None

---

## Porting (emerged during discussion)

| Option | Description | Selected |
|--------|-------------|----------|
| Port then deploy | Port all Phase 1–3 changes to public repo, then deploy | ✓ |
| Deploy from dev repo | Push directly from dev repo | |
| Port separately | Phase 3 handles export + rebuild only | |

**User's choice:** Port then deploy
**Notes:** Public repo lacks Tailwind CLI step and all visual identity changes from Phases 1–2

---

| Option | Description | Selected |
|--------|-------------|----------|
| Full porting process | Thematic commits, review each, verify in public repo | ✓ |
| Streamlined | Fewer, broader commits | |

**User's choice:** Full porting process
**Notes:** Follow CLAUDE.md porting guidelines

---

## Claude's Discretion

- Ordering and grouping of porting commits
- Which specific AHRB pages to spot-check post-deploy

## Deferred Ideas

None
