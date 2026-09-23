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

**Status:** ready-for-agent

- [ ] Evals: a one-line fix goes straight to editing with no tickets, and a multi-module feature request starts with grill and spec.
- [ ] A test keeps Tuner at 200 tokens or fewer (characters ÷ 4).
