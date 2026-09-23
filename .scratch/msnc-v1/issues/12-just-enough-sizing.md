# 12: "Just enough" sizing

**Why:** User story 35. Process should appear only where it pays for itself.

**What to build:** A sizing rule in Tuner, which the planner agent also applies. Before planning multi-step work, size the task and say the size and why in one line:
- **small:** just do it, with Trim and Proof
- **medium:** `/msnc:tickets`, then `/msnc:implement`
- **large:** `/msnc:grill`, then `/msnc:spec`, `/msnc:tickets` and `/msnc:implement`

Take the size signals from ECC's orch-pipeline classifier: files touched, unknowns, irreversible steps, modules crossed. Credit it in the notices; if you copy its wording, also add a LICENSE and UPSTREAM.md. Tuner must stay small.

**Context:**
- ECC 2.2.0 cache: `skills\orch-pipeline\SKILL.md`, section "Step 0 — Classify size".
- Tuner text in ticket 03.

**Blocked by:** 03, 08

**Status:** done

- [x] Evals (written, run in ticket 09): a one-line fix goes straight to editing with no tickets, and a multi-module feature request starts with grill and spec.
- [x] A test keeps Tuner at 200 tokens or fewer (characters ÷ 4).

## Comments

- 2026-09-23 · Sizing paraphrased from ECC orch-pipeline "Step 0" at pinned `5064474` (identical to the 2.2.0 cache); no text copied, so only a credit line in `THIRD_PARTY_NOTICES.md`.
- Tuner tightened to 784 chars (~196 tokens) to fit the new ≤ 200-token test; "That is the caller check" dropped (Trim already says it). Only ~16 chars of headroom left for ticket 13.
- `/msnc:tickets`, `/msnc:spec`, `/msnc:implement` are typed-only, so for medium/large tasks the model can only tell the user to type them.
- Open: spec also credits sizing to ProcessDriven; where that credit goes is ticket 10's call.
