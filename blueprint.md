# blueprint.md — Prime Loan Advisors CRM (Non-QM) Build Specification

## Overview

Prime Loan Advisors needs a lightweight, advisor-first CRM optimized for **non-qualified mortgage (Non-QM / non-QM)** lead follow-up. The CRM’s primary objective is to **convert inbound leads into funded loans** by ensuring:
1. Advisors can **call/email/text** quickly.
2. Leads are categorized and progressed through a **standard, enforceable status flow**.
3. A **Daily Call List** surfaces leads needing follow-up, specifically: **any lead not contacted in the last 5 days**.

This document defines **exactly what to build**. `agent.md` defines how to execute.

---

## Assumptions & Decisions Log

### Assumptions (used unless contradicted by source data)
- The spreadsheet “master leads list” is the only initial data source.
- Sheet1 row 1 is the header row and all subsequent rows are leads.
- Column **L** contains an advisor identifier (name/email/label) mapping to one of 4 advisors.
- At minimum, each lead contains one contact method (phone or email). If both are missing, lead is still imported but marked “Incomplete Contact”.
- The CRM is not a full loan origination system (LOS); it tracks **lead engagement + pipeline stage** only.

### Decisions (to keep implementation deterministic)
- Store raw imported row data to prevent loss and reduce coupling to spreadsheet schema drift.
- Treat “contacted” as a successful two-way connection OR an outbound message sent, per **Contact Semantics**.
- Daily Call List excludes terminal states defined in **Status Flow**.

---

## Users, Roles, and Access

### Roles
- **Admin**
  - Full access to all leads, users, imports, reporting.
  - Can reassign leads, update statuses, and edit contact permission flags (DNC/opt-out).
- **Advisor** (4 total initially)
  - Access only to leads assigned to them (unless Admin grants expanded scope).
  - Can contact leads, log interactions, change status (within allowed transitions), add notes, set next action date.

### Access Rules (server-enforced)
- Advisors cannot view or export leads assigned to other advisors.
- Admin can impersonate/preview advisor view for troubleshooting.
- Any lead reassignment is logged as an audit event.

---

## Data Model

### Core Entities

#### `users`
- `id` (PK)
- `role` (`admin` | `advisor`)
- `display_name`
- `email` (unique)
- `active` (boolean)
- `created_at`, `updated_at`

#### `leads`
- `id` (PK)
- `external_source` (default: `master_leads_list`)
- `external_row_id` (string; stable id if derivable; else generated)
- `assigned_advisor_user_id` (FK → `users.id`)  
- **Contact fields (mapped when possible)**
  - `first_name`
  - `last_name`
  - `full_name` (derived or stored)
  - `phone_primary` (E.164 normalized when possible)
  - `email_primary`
- **Pipeline**
  - `status` (enum; see **Status Flow**)
  - `status_updated_at`
- **Follow-up**
  - `last_contacted_at` (timestamp; see **Contact Semantics**)
  - `next_action_at` (timestamp; optional, advisor-controlled)
  - `priority` (`low` | `normal` | `high`) default `normal`
- **Compliance**
  - `do_not_call` (boolean)
  - `do_not_text` (boolean)
  - `do_not_email` (boolean)
  - `consent_sms` (boolean | null)
  - `consent_call` (boolean | null)
  - `opt_out_at` (timestamp | null)
- **Raw import preservation**
  - `raw_import_payload` (JSON object: the full row keyed by header)
  - `raw_import_hash` (string; used for idempotency)
- `created_at`, `updated_at`

#### `interactions`
Immutable activity timeline items.
- `id` (PK)
- `lead_id` (FK)
- `user_id` (FK; actor)
- `type` (`call` | `text` | `email` | `note` | `status_change` | `assignment_change`)
- `direction` (`outbound` | `inbound` | `internal`) nullable for internal
- `outcome` (string enum by type; see below)
- `summary` (short text)
- `body` (long text; optional)
- `occurred_at` (timestamp)
- `metadata` (JSON; provider ids, message ids, etc.)
- `created_at`

**Outcome enums**
- For `call`: `attempted` | `connected` | `left_voicemail` | `no_answer` | `wrong_number`
- For `text`: `sent` | `delivered` | `failed` | `inbound_reply`
- For `email`: `sent` | `bounced` | `opened` (only if tracked; otherwise omit) | `inbound_reply`
- For `status_change`: `from:<status>` `to:<status>` stored in metadata and summary

#### `imports`
Track each import run.
- `id`
- `source_name` (default `master_leads_list`)
- `sheet_name` (default `Sheet1`)
- `started_at`, `completed_at`
- `rows_processed`, `rows_inserted`, `rows_updated`, `rows_failed`
- `error_log` (JSON array of row-level errors)

#### `audit_log`
- `id`
- `actor_user_id`
- `entity_type` (`lead` | `user` | `import`)
- `entity_id`
- `action` (string)
- `before` (JSON)
- `after` (JSON)
- `occurred_at`

---

## Import & Dedup

### Source
- File: **master leads list**
- Sheet: **Sheet1**
- Header row: **Row 1**
- Advisor assignment: **Column L**

### Mapping Rules
- Read headers from row 1 and store every row as `raw_import_payload` keyed by header.
- Map the following if present (case/whitespace-insensitive header matching):
  - Name: `first name`, `last name`, `name`, `full name`
  - Phone: `phone`, `mobile`, `cell`, `primary phone`
  - Email: `email`, `email address`
  - Timestamp: `date`, `created`, `lead date` (optional)
- Advisor assignment:
  - If column L contains a name/email that matches an existing advisor user, assign.
  - If no match, set `assigned_advisor_user_id` to null and flag for admin review.

### Idempotency & Updates
- Compute `raw_import_hash` from a stable serialization of `raw_import_payload`.
- Dedup key priority:
  1. normalized `email_primary` if present
  2. normalized `phone_primary` if present
  3. else `external_row_id`
- On re-import:
  - If dedup match found: update mapped fields only if new values are non-empty.
  - Always update `raw_import_payload` and `raw_import_hash`.
  - Do not overwrite advisor assignment unless spreadsheet provides a value in column L.

### Error Handling
- Continue import even if some rows fail.
- Log row failures to `imports.error_log` with:
  - row index
  - error type
  - offending values

---

## Status Flow (Standard Lead Lifecycle)

### Status Enum (exact strings)
1. `NEW`
2. `ATTEMPTED_CONTACT`
3. `CONTACTED`
4. `PREQUAL_IN_PROGRESS`
5. `DOCS_REQUESTED`
6. `DOCS_RECEIVED`
7. `SUBMITTED_TO_LENDER`
8. `UNDERWRITING`
9. `CONDITIONAL_APPROVAL`
10. `CLEAR_TO_CLOSE`
11. `CLOSED_FUNDED`
12. `NOT_INTERESTED` (terminal)
13. `UNQUALIFIED` (terminal)
14. `LOST` (terminal)
15. `DO_NOT_CONTACT` (terminal)

### Allowed Transitions (enforce)
- `NEW` → `ATTEMPTED_CONTACT` | `CONTACTED` | `DO_NOT_CONTACT`
- `ATTEMPTED_CONTACT` → `ATTEMPTED_CONTACT` | `CONTACTED` | `NOT_INTERESTED` | `UNQUALIFIED` | `DO_NOT_CONTACT`
- `CONTACTED` → `PREQUAL_IN_PROGRESS` | `NOT_INTERESTED` | `UNQUALIFIED` | `DO_NOT_CONTACT`
- `PREQUAL_IN_PROGRESS` → `DOCS_REQUESTED` | `UNQUALIFIED` | `LOST` | `DO_NOT_CONTACT`
- `DOCS_REQUESTED` → `DOCS_RECEIVED` | `LOST` | `DO_NOT_CONTACT`
- `DOCS_RECEIVED` → `SUBMITTED_TO_LENDER` | `LOST` | `DO_NOT_CONTACT`
- `SUBMITTED_TO_LENDER` → `UNDERWRITING` | `LOST`
- `UNDERWRITING` → `CONDITIONAL_APPROVAL` | `LOST`
- `CONDITIONAL_APPROVAL` → `CLEAR_TO_CLOSE` | `LOST`
- `CLEAR_TO_CLOSE` → `CLOSED_FUNDED` | `LOST`
- Any non-terminal → `DO_NOT_CONTACT`
- Terminal statuses do not transition except Admin override (logged).

---

## Contact Semantics (last_contacted_at rules)

### What updates `last_contacted_at`
Set `last_contacted_at = occurred_at` when an interaction meets either condition:
- A **successful outbound** communication is sent:
  - `text.sent`
  - `email.sent`
  - `call.connected` OR `call.left_voicemail`
- Any **inbound** reply:
  - `text.inbound_reply`
  - `email.inbound_reply`
  - `call.connected` (inbound/outbound)

### What does NOT update `last_contacted_at`
- `call.no_answer`
- `call.wrong_number` (also triggers phone verification prompt)
- `note`
- `status_change`
- `assignment_change`

---

## Daily Call List

### Daily Call List Eligibility (exact)
A lead is eligible if:
- `assigned_advisor_user_id = current_user.id`
- `status` NOT IN (`CLOSED_FUNDED`, `NOT_INTERESTED`, `UNQUALIFIED`, `LOST`, `DO_NOT_CONTACT`)
- AND (
  - `last_contacted_at IS NULL`
  - OR `last_contacted_at < (now - 5 days)`
)

### Sorting / Prioritization (exact)
Order by:
1. `priority` DESC (`high` > `normal` > `low`)
2. `next_action_at` ASC (nulls last)
3. `last_contacted_at` ASC (nulls first)
4. `created_at` ASC

---

## Acceptance Criteria

### Import
- Spreadsheet imports from Sheet1 with header row.
- Column L correctly assigns leads to advisors when matching.
- Re-import does not duplicate leads (dedup rules apply).

### Advisor Workflow
- Advisor can open assigned lead, call/text/email (or deep link), and log outcome.
- Status changes are validated against allowed transitions.
- Timeline shows all interactions in order.

### Daily Call List
- Shows only eligible leads per eligibility rules.
- A lead contacted (per Contact Semantics) disappears from the list immediately.
- Terminal statuses never appear.

