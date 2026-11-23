# README Voice Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `README.md` in the app's voice and remove the status/changelog narration.

**Architecture:** Docs-only. Keep only stable facts; write them in the voice law of `design/copy/copy-deck.md` §0.4. Status lives in the plan and the board, never in the README.

**Tech Stack:** Markdown; `scripts/check-paths.mjs`, `scripts/canon-check.mjs`, `scripts/table-integrity.mjs`.

**Spec:** `design/copy/copy-deck.md` §0.4 (voice law), `PRD.md` §5/§7 (privacy and non-goals).

## Global Constraints

- Voice: playful, warm, dry. The household takes the museum seriously; that is the joke. Never sarcastic at Elsa's expense, never corporate-cheerful.
- No marketing voice, no gift framing, no invented measurements, no gambling flavour.
- Canon: **Die Sammlung / The Collection**; verb **gesammelt / collected**; **Der Abfahrtsaal / The Departure Hall**; no water content.
- No status section, no gate count, no pending-ticket list, no "what exists today".

## Review Focus

- Does the opening sound like the household, not an engineering blog? (the failure that prompted this ticket)
- Is every stable fact present exactly once, with no defensive asides?
- Do all relative links resolve, and do `canon` and `gate:tables` stay green?

---

### Task 1: Rewrite the README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Produces: a README with the sections House rules, Stack, Run it, Photos, Deploy, Privacy, Where things live.

- [ ] **Step 1: Replace the status/changelog prose with the stable facts, in the voice law.**

- [ ] **Step 2: Run the gates**

Run: `node scripts/canon-check.mjs && node scripts/table-integrity.mjs && node scripts/check-paths.mjs`
Expected: `clean`, `clean`, `clean`.

- [ ] **Step 3: Read the opening aloud.** If it sounds like a museum press release, rewrite it. It should sound like someone who is slightly ridiculous about their dog.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/superpowers/plans/2026-11-22-readme-voice.md
git commit -m "docs(readme): rewrite in the app's voice (#117)"
```
