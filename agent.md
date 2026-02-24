# agent.md — Prime Loan Advisors CRM Build Agent (Anti-Gravity)

## Purpose

This file tells the Anti-Gravity build agent **exactly how to execute** the CRM build for **Prime Loan Advisors** (non-qualified mortgage / non-QM / alternative documentation loans) using the requirements and specification in `blueprint.md`.

**Rule:** `agent.md` defines *how to build and stay on track*. `blueprint.md` defines *what to build*.
**Do not restate the full product requirements here**—reference `blueprint.md` sections instead.

---

## Operating Rules

### Scope Control (Hard Guardrails)
- Build **only** what is specified in `blueprint.md`.
- If a feature is not in `blueprint.md`, do **not** implement it.
- Do not introduce unrelated modules (marketing automation, full LOS, pricing engines, document OCR, AI chatbots, dialer replacement) unless explicitly specified.
- Implement in **increments** with working software at each step.

### Canonical Source of Truth
- `blueprint.md` is the canonical product spec.
- The uploaded spreadsheet **“master leads list”** (Sheet1) is the canonical seed dataset and import format.
- Preserve all imported columns even if not immediately used (store as raw JSON + mapped fields). See `blueprint.md` → **Data Model**.

### Assumptions Policy
If missing details block implementation, make **minimal, conservative assumptions** and record them in:
- `blueprint.md` → **Assumptions & Decisions Log**
Then proceed without pausing.

### Definitions (Do Not Redefine)
Use the definitions in `blueprint.md` for:
- Lead status flow
- “Contacted” vs “Attempted”
- “Last contacted”
- Daily call list eligibility logic
- Roles & permissions

---

## Execution Plan (Build Order)

### Phase 0 — Repo + Baseline (Deliverable: running skeleton)
1. Create repo structure and standard tooling (linting, formatting, env templates).
2. Implement base web app shell + API server + database connection.
3. Implement authentication and role model **exactly** as defined in `blueprint.md` → **Roles & Access**.
4. Create migrations framework; ensure repeatable local setup.

**Exit criteria:** App runs locally; users can sign in; database migrations apply cleanly.

---

### Phase 1 — Data Foundation + Import (Deliverable: imported leads visible)
1. Create database tables per `blueprint.md` → **Data Model**.
2. Implement spreadsheet import pipeline:
   - Input: “master leads list” spreadsheet, Sheet1, header row at row 1.
   - Advisor assignment is in **column L** (store as `assigned_advisor`).
   - Map known fields; store full row raw payload.
   - Validate and log import errors without aborting the full import.
3. Implement deduplication rules per `blueprint.md` → **Import & Dedup**.
4. Implement basic leads list view with filtering by advisor.

**Exit criteria:** Leads appear in CRM with correct advisor assignment; import can be rerun idempotently.

---

### Phase 2 — Lead Workspace (Deliverable: advisors can work leads)
1. Implement lead detail “workspace” UI per `blueprint.md` → **Lead Workspace UX**:
   - One-click actions: call/email/text (deep links + integrated provider if specified)
   - Timeline of interactions
   - Status updates along the standard flow
   - Notes + next action date
2. Implement interaction logging:
   - Calls, emails, texts, notes, status changes
   - Update `last_contacted_at` only per rules in `blueprint.md` → **Contact Semantics**
3. Implement compliance markers:
   - Consent flags, opt-out, DNC behavior
   - Audit trail

**Exit criteria:** An advisor can open any lead, contact them, record the result, and move status forward.

---

### Phase 3 — Daily Call List (Deliverable: daily workflow automation)
1. Implement Daily Call List per `blueprint.md` → **Daily Call List**:
   - Per-advisor list
   - Includes leads not contacted in last **5 days**
   - Excludes terminal statuses
   - Sort + prioritization rules
2. Implement “Call List Session” UX:
   - Next lead, quick actions, disposition logging
   - Auto-advance behavior if specified
3. Add reminders / tasks only if in `blueprint.md`.

**Exit criteria:** Each advisor has a reliable daily list that matches the eligibility logic and updates live after contact logging.

---

### Phase 4 — Reporting + Admin Controls (Deliverable: operational visibility)
1. Implement dashboards and export features only as specified:
   - Advisor activity
   - Pipeline counts by status
   - Contact attempts vs contacts
2. Implement admin tools for:
   - User management
   - Import runs review
   - Status taxonomy config **only if required**

**Exit criteria:** Admin can oversee pipeline health and ensure lead distribution is correct.

---

## Build Standards

### UX Standards
- Optimize for **speed**: minimal clicks to call/text/email.
- Every lead screen must surface:
  - Name + phone + email (if present)
  - Assigned advisor
  - Current status
  - Last contacted + next action
- “Record outcome” must be available immediately after contact action.

### Data Integrity Standards
- Every change to a lead’s status or assignment must be logged (audit trail).
- Contact events must be immutable records.
- `last_contacted_at` must be computed/updated consistently per `blueprint.md`.

### Security & Compliance Standards
- Role-based access enforced server-side.
- Protect PII at rest and in transit.
- Implement opt-out and DNC handling strictly per `blueprint.md` → **Compliance & Security**.

### Testing Standards
- Minimum tests required:
  - Import mapping + dedup rules
  - Daily Call List query logic
  - Status transition validation
  - Permission boundaries
- Add smoke tests for core workflows.

---

## Implementation Checklist (Do Not Skip)

### Must-Haves Before “Done”
- [ ] Import works from spreadsheet “master leads list” Sheet1 with header row
- [ ] Column L advisor assignment recognized and enforced in UI + permissions
- [ ] Advisors can call/email/text from lead detail with one click
- [ ] Status flow matches `blueprint.md` exactly (names + order + terminal statuses)
- [ ] Contact logging updates `last_contacted_at` correctly
- [ ] Daily Call List shows leads not contacted in last 5 days (per advisor)
- [ ] DNC/opt-out prevents texting/calling where required
- [ ] Audit trail exists for key actions
- [ ] Deployment instructions included

---

## File/Section References (Use These, Don’t Re-Interpret)
- Requirements: `blueprint.md` → **Product Requirements**
- Lead Status Flow: `blueprint.md` → **Status Flow**
- Data Model: `blueprint.md` → **Data Model**
- Import Mapping: `blueprint.md` → **Import & Dedup**
- Lead Workspace: `blueprint.md` → **Lead Workspace UX**
- Daily Call List: `blueprint.md` → **Daily Call List**
- Compliance: `blueprint.md` → **Compliance & Security**
- Acceptance Criteria: `blueprint.md` → **Acceptance Criteria**

---

## Definition of “Contacted in Last 5 Days” (Enforced)
Use the exact logic in `blueprint.md` → **Daily Call List Eligibility**.
Do **not** approximate this rule.

---

## Deliverables Packaging
At completion, ensure:
- Environment variables documented
- DB migrations included
- Seed/import instructions included
- A single command path to run locally
- Production deploy notes captured

---

## Stop Conditions (When to Halt)
Only halt if:
- The spreadsheet file is unreadable/corrupt
- Auth cannot be implemented with the chosen stack
Otherwise proceed using the assumption policy and log decisions in `blueprint.md`.

