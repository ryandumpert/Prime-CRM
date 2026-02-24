# Pipeline Kanban Board — Full Implementation Plan

## 1. Current System Assessment

### 1.1 Database Schema (What Exists Today)
| Model | Key Fields | Notes |
|-------|-----------|-------|
| `Lead` | `status: LeadStatus`, `statusUpdatedAt`, `priority`, `lastContactedAt` | Status is a flat enum with 15 values. No pipeline concept exists. |
| `LeadStatus` (enum) | `NEW`, `ATTEMPTED_CONTACT`, `CONTACTED`, `PREQUAL_IN_PROGRESS`, `DOCS_REQUESTED`, `DOCS_RECEIVED`, `SUBMITTED_TO_LENDER`, `UNDERWRITING`, `CONDITIONAL_APPROVAL`, `CLEAR_TO_CLOSE`, `CLOSED_FUNDED` + 4 terminal | All 15 statuses live in a single flat list — no grouping by pipeline. |
| `Interaction` | `type`, `direction`, `outcome`, `summary` | Tracks calls, emails, texts, notes, status changes. **Keep as-is.** |
| `AuditLog` | `entityType`, `entityId`, `action`, `before`, `after` | **Keep as-is.** |

### 1.2 Constants / Business Rules (`src/lib/constants.ts`)
- `LEAD_STATUSES` — flat array of all 15 statuses
- `TERMINAL_STATUSES` — `CLOSED_FUNDED`, `NOT_INTERESTED`, `UNQUALIFIED`, `LOST`, `DO_NOT_CONTACT`
- `ALLOWED_TRANSITIONS` — hardcoded map from each status to its allowed next statuses
- `STATUS_LABELS` / `STATUS_COLORS` — display metadata
- `CALL_LIST_DAYS_THRESHOLD = 5` — drives the daily call list
- `isValidTransition()` — used by `PATCH /api/leads/[id]` to validate status changes

### 1.3 Frontend Pages (What Exists Today)
| Page | Path | Purpose | Impact |
|------|------|---------|--------|
| **Dashboard** | `/dashboard` | Stats cards + call list preview + pipeline pie chart + advisor performance | **MODIFY** — pipeline filter dropdown, update stats per-pipeline |
| **Leads List** | `/leads` | Paginated table with filters | **KEEP but also add Kanban view toggle** |
| **Lead Detail** | `/leads/[id]` | Full lead profile + interaction history + status change | **MODIFY** — show which pipeline the lead is in, update status dropdown to only show statuses for that pipeline |
| **Call List** | `/call-list` | Leads not contacted in 5+ days, session mode | **MODIFY** — filter to Cold Leads pipeline only |
| **Import** | `/import` | Upload spreadsheets, map columns | **MODIFY** — imported leads default to Cold Leads pipeline |
| **Reports** | `/reports` | Status distribution, export | **MODIFY** — add pipeline filter |
| **Users** | `/users` | Admin user management | **NO CHANGE** |
| **Settings** | `/settings` | CRM config reference | **MINOR** — add pipeline config reference |
| **Profile** | `/profile` | User profile editing | **NO CHANGE** |

### 1.4 API Routes
| Route | Purpose | Impact |
|-------|---------|--------|
| `GET /api/leads` | List leads with filters | **MODIFY** — add `pipeline` query param |
| `POST /api/leads` | Create lead | **MODIFY** — accept `pipeline` field |
| `PATCH /api/leads/[id]` | Update lead (including status) | **MODIFY** — validate status belongs to the lead's pipeline; handle pipeline transfer logic |
| `GET /api/dashboard/stats` | Dashboard stats | **MODIFY** — break down stats by pipeline |
| `POST /api/import` | Import spreadsheet | **MODIFY** — default pipeline = `cold_leads` |
| All other routes | Unchanged | **NO CHANGE** |

---

## 2. Pipeline Architecture Design

### 2.1 The Three Pipelines

#### Pipeline 1: Cold Leads (Outreach & Daily Call List)
> *Purpose: Simple outreach. Drives the daily call list.*

| Column (Status) | Description |
|-----------------|-------------|
| `NEW` | Fresh lead, never contacted |
| `ATTEMPTED_CONTACT` | Called/texted but didn't connect |
| `CONTACTED` | Had a conversation |

**Special behaviors:**
- The Daily Call List (`/call-list`) draws exclusively from this pipeline
- Leads not contacted in 5+ days appear on call list (existing logic, scoped to this pipeline)
- When a lead is warmed up, advisor drags it "out" → moves to Warm Leads pipeline

#### Pipeline 2: Warm Leads (Active Cultivation)
> *Purpose: Advisor is in regular contact, working toward a loan application.*

| Column (Status) | Description |
|-----------------|-------------|
| `CONTACTED` | Initial warm contact established |
| `PREQUAL_IN_PROGRESS` | Running pre-qualification |
| `DOCS_REQUESTED` | Documents have been requested |
| `DOCS_RECEIVED` | Documents received from borrower |

**Special behaviors:**
- No daily call list integration (advisor manages contact manually)
- When docs are received and loan is submitted → moves to Processing pipeline

#### Pipeline 3: Processing (Loan Lifecycle)
> *Purpose: Loan has been submitted, tracking through underwriting to close.*

| Column (Status) | Description |
|-----------------|-------------|
| `SUBMITTED_TO_LENDER` | Loan submitted |
| `UNDERWRITING` | Underwriting requirements provided |
| `CONDITIONAL_APPROVAL` | Processing requirements |
| `CLEAR_TO_CLOSE` | Final underwriting / clear to close |
| `CLOSED_FUNDED` | Loan closed ✅ |

**Special behaviors:**
- `CLOSED_FUNDED` is a terminal status (card stays but cannot be moved further)
- Status transitions are strictly sequential (can skip forward but not backward unless admin)

#### Terminal / Exit Statuses (shared across all pipelines)
These are not "columns" in any Kanban view — they are exit destinations:
- `NOT_INTERESTED`
- `UNQUALIFIED`
- `LOST`
- `DO_NOT_CONTACT`

A lead can be moved to a terminal status from **any** pipeline (e.g., right-click or action menu on the card). Terminal leads disappear from the Kanban board and are accessible via the existing list view with filters.

### 2.2 Pipeline Membership Rule
> **A lead exists in exactly ONE pipeline at a time.**

The pipeline is determined by the lead's current `status`:
- If status ∈ {`NEW`, `ATTEMPTED_CONTACT`} → **Cold Leads**
- If status ∈ {`CONTACTED`, `PREQUAL_IN_PROGRESS`, `DOCS_REQUESTED`, `DOCS_RECEIVED`} → **Warm Leads**
- If status ∈ {`SUBMITTED_TO_LENDER`, `UNDERWRITING`, `CONDITIONAL_APPROVAL`, `CLEAR_TO_CLOSE`, `CLOSED_FUNDED`} → **Processing**
- If status ∈ {`NOT_INTERESTED`, `UNQUALIFIED`, `LOST`, `DO_NOT_CONTACT`} → **Archived/Terminal** (not shown on boards)

> **Key Decision:** Pipeline is **derived from status**, not stored as a separate field. This eliminates the need for a migration of existing data and ensures a lead can never be in a status that contradicts its pipeline.

Note: `CONTACTED` appears as the **last column in Cold Leads** AND the **first column in Warm Leads**. When a cold lead reaches "Contacted", the advisor can choose to keep working it in cold (keep calling) or promote it to warm. We'll handle this with a "Move to Warm Leads" action on the card, which keeps the status as `CONTACTED` but logically moves it. To distinguish this, we'll add a `pipeline` field on the Lead model that is set explicitly when a lead crosses pipeline boundaries.

**REVISED:** Actually, to avoid ambiguity with `CONTACTED` appearing in two pipelines, we need to store the pipeline explicitly on each lead:

---

## 3. Schema Changes

### 3.1 New Prisma Enum: `Pipeline`

```prisma
enum Pipeline {
  cold_leads
  warm_leads
  processing
}
```

### 3.2 New Field on `Lead` Model

```prisma
model Lead {
  // ... existing fields ...
  pipeline  Pipeline  @default(cold_leads)
  // ...
}
```

### 3.3 Updated `LeadStatus` Enum
No changes to the enum values themselves — all 15 statuses remain. The pipeline field determines WHICH statuses are valid/visible for a given lead.

### 3.4 Database Index

```prisma
@@index([pipeline])
@@index([pipeline, status])
```

### 3.5 Migration Strategy
- Add `pipeline` column with default `cold_leads`
- Run a data migration script that:
  - Sets `pipeline = 'processing'` for leads with status in {`SUBMITTED_TO_LENDER`, `UNDERWRITING`, `CONDITIONAL_APPROVAL`, `CLEAR_TO_CLOSE`, `CLOSED_FUNDED`}
  - Sets `pipeline = 'warm_leads'` for leads with status in {`PREQUAL_IN_PROGRESS`, `DOCS_REQUESTED`, `DOCS_RECEIVED`}
  - Sets `pipeline = 'warm_leads'` for leads with status `CONTACTED` that have 3+ interactions (heuristic for "warm")
  - Leaves all others as `cold_leads`

---

## 4. Constants Changes (`src/lib/constants.ts`)

### 4.1 New Pipeline Configuration

```typescript
export const PIPELINES = ['cold_leads', 'warm_leads', 'processing'] as const;
export type PipelineType = typeof PIPELINES[number];

export const PIPELINE_LABELS: Record<PipelineType, string> = {
  cold_leads: 'Cold Leads',
  warm_leads: 'Warm Leads',
  processing: 'Processing',
};

// Which statuses appear as columns in each pipeline's Kanban board
export const PIPELINE_STATUSES: Record<PipelineType, LeadStatusType[]> = {
  cold_leads: ['NEW', 'ATTEMPTED_CONTACT', 'CONTACTED'],
  warm_leads: ['CONTACTED', 'PREQUAL_IN_PROGRESS', 'DOCS_REQUESTED', 'DOCS_RECEIVED'],
  processing: ['SUBMITTED_TO_LENDER', 'UNDERWRITING', 'CONDITIONAL_APPROVAL', 'CLEAR_TO_CLOSE', 'CLOSED_FUNDED'],
};
```

### 4.2 Updated Transition Rules
Update `ALLOWED_TRANSITIONS` to be pipeline-aware. Within a pipeline, drag-and-drop is free (any column → any column within that pipeline). Cross-pipeline moves are handled by specific "promote" actions.

### 4.3 Pipeline Transfer Rules

```typescript
export const PIPELINE_TRANSFERS: Record<PipelineType, PipelineType[]> = {
  cold_leads: ['warm_leads'],          // Cold → Warm (promote)
  warm_leads: ['cold_leads', 'processing'], // Warm → Cold (demote) or Warm → Processing (submit loan)
  processing: [],                       // Processing → nowhere (terminal pipeline)
};
```

---

## 5. API Changes

### 5.1 `GET /api/leads` — Add Pipeline Filter

```
GET /api/leads?pipeline=cold_leads&status=NEW&page=1&pageSize=100
```

New query parameter: `pipeline` — filters leads by pipeline field.

For the Kanban view, we'll fetch ALL leads for a pipeline at once (no pagination), grouped by status. This requires either:
- **Option A:** New dedicated endpoint `GET /api/leads/kanban?pipeline=cold_leads` that returns leads grouped by status columns
- **Option B:** Use existing endpoint with `pageSize=1000` and group on the client

**Recommendation: Option A** — New `GET /api/leads/kanban` endpoint that returns:
```json
{
  "pipeline": "cold_leads",
  "columns": {
    "NEW": { "leads": [...], "count": 12 },
    "ATTEMPTED_CONTACT": { "leads": [...], "count": 5 },
    "CONTACTED": { "leads": [...], "count": 8 }
  }
}
```

### 5.2 `PATCH /api/leads/[id]` — Pipeline-Aware Status Changes

Add logic:
1. If `status` is changing AND the new status belongs to a different pipeline, update `pipeline` field automatically
2. If `pipeline` is being changed explicitly (e.g., "Move to Warm Leads"), validate the lead's current status is compatible with the target pipeline
3. Validate the new status is a valid column in the lead's (new) pipeline

### 5.3 New: `PATCH /api/leads/[id]/move` — Drag-and-Drop Endpoint

A dedicated lightweight endpoint for Kanban card moves:
```json
// Request body
{
  "status": "ATTEMPTED_CONTACT",
  "position": 2  // optional: ordering within the column
}
```

This is optimized for speed (no full lead reload) and creates a status_change interaction automatically.

### 5.4 `GET /api/dashboard/stats` — Pipeline-Aware

Add `pipeline` query param. Return pipeline-specific counts and aggregations.

---

## 6. Frontend Architecture (Mobile-First)

> **⚠️ CRITICAL REQUIREMENT: Advisors use mobile phones just as often as desktops. Every component must be designed mobile-first and work flawlessly on both form factors.**

### 6.1 Responsive Strategy Overview

The Kanban board has **two completely different layouts** depending on screen size:

| Viewport | Layout | Interaction Model |
|----------|--------|-------------------|
| **Desktop** (≥768px) | Side-by-side columns, horizontal scroll | **Drag-and-drop** cards between columns |
| **Mobile** (<768px) | Stacked single-column with tab/swipe navigation | **Tap-to-select + "Move to" action sheet** (no drag-and-drop) |

**Why no drag-and-drop on mobile?** Drag-and-drop conflicts with native phone scrolling and is frustrating on small screens. The mobile experience should feel like a native app — tap a card, see options, tap "Move to Contacted". Fast and intuitive.

### 6.2 Mobile Layout — Single Column with Tab Navigation

On mobile, the pipeline board renders as:

```
┌─────────────────────────────────┐
│  🔽 Cold Leads ▾               │  ← Pipeline dropdown (full width)
├─────────────────────────────────┤
│ [New (12)] [Attempted (5)] [Contacted (8)] │  ← Horizontal scrollable tab bar
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐    │
│  │ John Smith          ⓘ  │    │  ← Full-width card
│  │ 📱 (555) 123-4567      │    │
│  │ 🔴 High  ⏰ 3 days ago │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Jane Doe            ⓘ  │    │
│  │ 📱 (555) 987-6543      │    │
│  │ 🟡 Normal ⏰ Today     │    │
│  └─────────────────────────┘    │
│                                 │
│  ... (vertical scroll)          │
│                                 │
└─────────────────────────────────┘
```

**Key mobile behaviors:**
- **Tab bar** shows all columns for the selected pipeline as horizontally scrollable tabs with lead counts
- **Tapping a tab** shows only the cards in that column (vertical scrollable list)
- **Tapping a card** opens a **bottom sheet** (slides up from bottom, native-feeling) with:
  - Full lead details
  - "Move to" button → shows column options as a list
  - Quick action buttons (Call, Text, Email)
  - "Move to Pipeline" option for cross-pipeline transfers
- **Swipe left/right** on the card area switches between column tabs (optional enhancement)
- **Pull to refresh** reloads the current column's data

### 6.3 Desktop Layout — Side-by-Side Columns with Drag-and-Drop

On desktop (≥768px), the classic Kanban board:

```
┌──────────────────────────────────────────────────────────────────────┐
│  🔽 Cold Leads ▾          Total: 25 leads                          │
├──────────────┬──────────────┬──────────────────────────────────────────┤
│ NEW (12)     │ ATTEMPTED(5) │ CONTACTED (8)                           │
├──────────────┼──────────────┼──────────────────────────────────────────┤
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐                           │
│ │ Card 1   │ │ │ Card 1   │ │ │ Card 1   │                           │
│ └──────────┘ │ └──────────┘ │ └──────────┘                           │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐                           │
│ │ Card 2   │ │ │ Card 2   │ │ │ Card 2   │                           │
│ └──────────┘ │ └──────────┘ │ └──────────┘                           │
│ ...          │              │                                        │
└──────────────┴──────────────┴──────────────────────────────────────────┘
```

**Key desktop behaviors:**
- Columns render side-by-side with equal width, each independently scrollable
- Drag a card from one column and drop it into another to change status
- Click a card to open a **slide-out detail panel** (right side, 400px wide)
- Drop zone highlights when dragging over a valid column
- Smooth spring animation when card snaps into new position

### 6.4 New Components to Build

| Component | File | Description |
|-----------|------|-------------|
| `PipelineSelector` | `src/components/pipeline/pipeline-selector.tsx` | Dropdown to switch pipelines. Full-width on mobile, inline on desktop. |
| `KanbanBoard` | `src/components/pipeline/kanban-board.tsx` | Renders `KanbanBoardDesktop` or `KanbanBoardMobile` based on viewport |
| `KanbanBoardDesktop` | `src/components/pipeline/kanban-board-desktop.tsx` | Side-by-side columns with `@dnd-kit` drag-and-drop context |
| `KanbanBoardMobile` | `src/components/pipeline/kanban-board-mobile.tsx` | Tab bar + single column view + "Move to" action sheet |
| `KanbanColumn` | `src/components/pipeline/kanban-column.tsx` | Single column: header with count, scrollable card list, drop zone (desktop) |
| `KanbanCard` | `src/components/pipeline/kanban-card.tsx` | Individual lead card. Full-width on mobile, fixed-width on desktop. Touch target ≥48px. |
| `CardDetailPanel` | `src/components/pipeline/card-detail-panel.tsx` | **Desktop:** Right-side slide-out panel. **Mobile:** Bottom sheet modal. |
| `MoveToSheet` | `src/components/pipeline/move-to-sheet.tsx` | Mobile-only bottom sheet showing column options + pipeline transfer options |
| `ColumnTabs` | `src/components/pipeline/column-tabs.tsx` | Mobile-only horizontal scrollable tab bar for switching between columns |

### 6.5 Drag-and-Drop Library

**Recommendation: `@dnd-kit/core` + `@dnd-kit/sortable`**
- Modern, React 18/19 compatible
- Lightweight (~12KB gzipped)
- Excellent keyboard accessibility
- Built-in touch sensor (for tablets — optional enhancement)
- Active maintenance

`@dnd-kit` is used **only on desktop** (≥768px). On mobile, we use a tap-based "Move to" workflow instead, which is far more reliable and user-friendly on phones.

### 6.6 Card Design

#### Compact card (used in both mobile and desktop):
```
┌─────────────────────────────┐
│ John Smith              ⓘ  │  ← Name + expand icon (tap target ≥48px)
│ 📱 (555) 123-4567           │  ← Phone (tappable → initiates call on mobile)
│ 🔴 High  ·  ⏰ 3 days ago  │  ← Priority + last contacted in one row
└─────────────────────────────┘
```

**Mobile card sizing:**
- Full viewport width minus page padding (100% - 2rem)
- Minimum height: 72px (for comfortable touch targets)
- Padding: `1rem` (16px)
- Font sizes: Name 15px, details 13px
- Tap anywhere on card → opens detail panel/bottom sheet
- Phone number tap → opens native phone dialer (`tel:` link)

**Desktop card sizing:**
- Column width / 1 (fills column)
- Minimum width: 220px
- Padding: `0.875rem` (14px)
- Cursor: grab (draggable)
- Click → opens slide-out panel on the right

#### Expanded detail view:

**Desktop** — Slide-out panel (right side, 420px wide):
```
┌──────────────────────────────────────────┐
│  ✕  John Smith                          │
│  Pipeline: Cold Leads → Warm Leads [▶]  │
├──────────────────────────────────────────┤
│  📱 (555) 123-4567  [Call] [Text]       │
│  📧 john@email.com  [Email]             │
│  Status: Contacted  [Change ▾]          │
│  Priority: High     [Change ▾]          │
│  Last Contact: 3 days ago               │
├──────────────────────────────────────────┤
│  Activity Timeline                      │
│  ─ Call connected  Feb 21               │
│  ─ Status → Contacted  Feb 21           │
│  ─ Call attempted  Feb 18               │
│  ...                                    │
├──────────────────────────────────────────┤
│  [Add Note] [Archive] [View Full Page]  │
└──────────────────────────────────────────┘
```

**Mobile** — Bottom sheet (slides up from bottom, 85% viewport height):
```
┌─────────────────────────────────────┐
│  ─── (drag handle) ───              │
│                                     │
│  John Smith                     ✕   │
│  Cold Leads · Contacted             │
├─────────────────────────────────────┤
│  [📞 Call]  [💬 Text]  [📧 Email]  │  ← Large touch buttons (56px tall)
├─────────────────────────────────────┤
│  Move to: [Attempted] [Contacted]   │  ← Status change buttons
│  Move to Pipeline: [Warm Leads ▶]   │
├─────────────────────────────────────┤
│  Activity                           │
│  Call connected · Feb 21            │
│  Status changed · Feb 21            │
│  ...                                │
├─────────────────────────────────────┤
│  [View Full Details]  [Archive]     │
└─────────────────────────────────────┘
```

### 6.7 Responsive Breakpoint Strategy

| Breakpoint | Layout | Board Behavior | Card Interaction |
|------------|--------|----------------|------------------|
| **< 640px** (phone portrait) | Single column + tab bar | One column visible at a time, swipe tabs | Tap → bottom sheet, "Move to" buttons |
| **640–767px** (phone landscape / small tablet) | Single column + tab bar | Same as above, slightly wider cards | Same as above |
| **768–1023px** (tablet) | Side-by-side columns | 2-3 columns visible, horizontal scroll for more | Drag-and-drop enabled, click → slide-out panel |
| **≥1024px** (desktop) | Side-by-side columns | All columns visible (3 for Cold, 4 for Warm, 5 for Processing) | Drag-and-drop, click → slide-out panel |

### 6.8 Mobile-Specific Touch Interactions

| Gesture | Action |
|---------|--------|
| **Tap card** | Open bottom sheet with details + actions |
| **Tap phone number** | Open native phone dialer (`tel:` link) |
| **Tap column tab** | Switch to that column's card list |
| **Swipe left/right on card area** | Switch to adjacent column tab |
| **Pull down** | Refresh current column data |
| **Tap "Move to [Status]"** | Move card to target column (with confirmation toast) |
| **Tap "Move to [Pipeline]"** | Transfer lead to another pipeline |
| **Long-press card** | Show quick actions (Call / Text / Move) — optional enhancement |

### 6.9 Mobile Performance Considerations

- **Lazy-load column data:** Only fetch cards for the currently active tab on mobile (not all columns at once)
- **Virtual scrolling:** If a column has 50+ cards, use a virtual list to avoid rendering all DOM nodes
- **Optimistic updates:** When tapping "Move to", immediately move the card in the UI before the API call completes
- **Lightweight card data:** The Kanban API returns only the fields displayed on cards (name, phone, priority, lastContactedAt) — not full lead objects
- **Skeleton loading:** Show skeleton cards while data loads (matches existing app patterns)

### 6.10 Navigation Changes

**Sidebar (`src/components/layout/sidebar.tsx`):**

Current advisor nav items:
```
Dashboard | My Leads | Daily Call List | My Profile
```

New advisor nav items:
```
Dashboard | Pipeline Board | My Leads | Daily Call List | My Profile
```

Current admin nav items:
```
Dashboard | All Leads | Daily Call List | Import | Reports | Users | Settings | My Profile
```

New admin nav items:
```
Dashboard | Pipeline Board | All Leads | Daily Call List | Import | Reports | Users | Settings | My Profile
```

> On mobile, "Pipeline Board" should be the **second item** in the sidebar (right after Dashboard) since it's the primary workflow tool for advisors.

### 6.11 Dashboard Updates

The dashboard page gets a mini pipeline view:
- Replace the current "Pipeline Overview" static status badge list with interactive pipeline cards showing counts per pipeline
- Each pipeline card shows the count of leads per column
- Click/tap to navigate to that pipeline's Kanban board
- **Mobile:** Pipeline cards stack vertically, each card is full-width with large tap targets

---

## 7. Features Inventory: What Moves, Changes, or Stays

### ✅ KEEP UNCHANGED
- Login / authentication flow
- User management (`/users`)
- Profile page (`/profile`)
- Interaction logging (calls, emails, texts, notes)
- Audit logging
- Lead archiving functionality
- Import spreadsheet functionality (just add default pipeline)
- Compliance fields (DNC, consent)

### 🔄 MODIFY
| Feature | Current | New |
|---------|---------|-----|
| Lead status | Flat list of 15 statuses, single status dropdown | Status constrained by pipeline; drag-and-drop + dropdown |
| Leads list (`/leads`) | Table-only view with status filter | Add view toggle: Table view ↔ Kanban board; add pipeline filter |
| Daily call list | All non-terminal leads not contacted in 5+ days | Scoped to **Cold Leads pipeline only** |
| Dashboard | Static pipeline overview | Per-pipeline stats cards; mini pipeline preview |
| Reports | Status distribution across all leads | Filter by pipeline |
| Status transitions | `ALLOWED_TRANSITIONS` map validated server-side | Pipeline-aware transitions; within-pipeline drag is unrestricted; cross-pipeline requires explicit action |
| Lead creation | Always `status: NEW` | Always `pipeline: cold_leads, status: NEW` |
| Lead detail page | Shows status dropdown with allowed transitions | Shows current pipeline; status dropdown limited to pipeline's statuses; "Move to Pipeline" button |

### ➕ ADD NEW
| Feature | Description |
|---------|-------------|
| Pipeline Board page (`/pipeline`) | Full-width Kanban board with pipeline dropdown |
| Pipeline selector component | Dropdown used on board, leads list, dashboard |
| Kanban drag-and-drop | Drag cards between columns within a pipeline |
| Card expand/detail view | Click a card to see full details in a panel |
| Cross-pipeline promotion | "Move to Warm Leads" / "Submit to Processing" actions |
| Pipeline field on Lead model | New database column |

### ❌ REMOVE
Nothing is being removed. All existing functionality is preserved. The Kanban board is an **additional view**, not a replacement.

---

## 8. Implementation Phases

### Phase 1: Database & Backend Foundation (Est. 1 session)
1. Add `Pipeline` enum and `pipeline` field to Prisma schema
2. Run migration + data backfill script
3. Add pipeline constants to `constants.ts` (pipeline statuses, labels, colors, transfer rules)
4. Update `GET /api/leads` to support `pipeline` query filter
5. Update `PATCH /api/leads/[id]` for pipeline-aware validation
6. Create `GET /api/leads/kanban` endpoint
7. Update `GET /api/dashboard/stats` for pipeline breakdown

### Phase 2: Kanban UI Components (Est. 1-2 sessions)
1. Install `@dnd-kit/core` and `@dnd-kit/sortable`
2. Build `PipelineSelector` component
3. Build `KanbanCard` component (compact card design)
4. Build `KanbanColumn` component (header + scrollable card list + drop zone)
5. Build `KanbanBoard` component (horizontal column layout + DnD context)
6. Build `KanbanCardDetail` component (expanded view panel/modal)
7. Add Kanban-specific CSS to `globals.css` (column layout, card styles, drag animations)

### Phase 3: Pipeline Board Page & Integration (Est. 1 session)
1. Create `/pipeline` page with `PipelineSelector` + `KanbanBoard`
2. Wire up DnD events to `PATCH /api/leads/[id]` for status changes
3. Implement card click → detail panel
4. Add cross-pipeline transfer actions (card menu → "Move to Warm Leads" etc.)
5. Update sidebar navigation to add "Pipeline Board" link
6. Update dashboard with pipeline-aware stats and mini preview cards

### Phase 4: Existing Page Updates (Est. 1 session)
1. Update `/leads` page with pipeline filter dropdown
2. Update `/leads/[id]` detail page with pipeline context
3. Scope daily call list (`/call-list`) to Cold Leads pipeline
4. Update `/reports` with pipeline filter
5. Update `/import` to default imported leads to `cold_leads`
6. Update `/settings` to reference pipeline configuration

### Phase 5: Mobile Polish & Cross-Device Testing (Est. 1 session)
1. Test mobile bottom sheet on iOS Safari and Android Chrome — verify smooth slide-up animation and scroll containment
2. Test tap targets are ≥48px on all interactive elements (cards, tabs, action buttons)
3. Test phone number `tel:` links open native dialer on mobile
4. Test column tabs with swipe navigation (if implemented)
5. Test pipeline selector dropdown on mobile (full-width, large touch targets)
6. Keyboard accessibility for DnD on desktop
7. Optimistic UI updates for both drag-and-drop (desktop) and "Move to" taps (mobile)
8. Loading states: skeleton cards while data loads
9. Smooth drag animations (desktop) and move confirmation toasts (mobile)
10. Test all pipeline transitions end-to-end on both mobile and desktop
11. Test landscape orientation on phones — verify tab bar and cards adapt
12. Deploy and verify on real mobile devices

---

## 9. Technical Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Large lead counts cause slow Kanban rendering** | Limit to 50 cards per column on mobile (100 on desktop), add "Load more" button |
| **DnD library compatibility with React 19** | `@dnd-kit` is actively maintained and React 19 compatible; test early in Phase 2 |
| **Cross-pipeline moves could create invalid states** | Server-side validation ensures status always matches pipeline; use transactions |
| **Existing leads have no `pipeline` value after migration** | Default to `cold_leads`; backfill script infers from status |
| **`CONTACTED` status ambiguity** | Resolved by explicit `pipeline` field — a lead can be `CONTACTED` in either Cold or Warm pipeline |
| **Drag-and-drop conflicts with mobile scrolling** | DnD is desktop-only (≥768px). Mobile uses tap + "Move to" action sheet instead |
| **Bottom sheet blocks underlying page on mobile** | Use a proper backdrop with `overflow: hidden` on body when sheet is open; swipe-down to dismiss |
| **Mobile data usage / slow networks** | Lazy-load only the active column's cards on mobile; use lightweight card payloads |
| **Tap targets too small on phones** | Enforce minimum 48×48px touch targets on all interactive elements (iOS/Android guidelines) |
| **Phone number display is not tappable** | Wrap phone numbers in `<a href="tel:...">` links so tapping opens the native dialer |

---

## 10. File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | **MODIFY** | Add `Pipeline` enum, `pipeline` field on Lead |
| `src/lib/constants.ts` | **MODIFY** | Add pipeline types, labels, colors, status mappings, transfer rules |
| `src/app/api/leads/route.ts` | **MODIFY** | Add pipeline query filter |
| `src/app/api/leads/[id]/route.ts` | **MODIFY** | Pipeline-aware status validation |
| `src/app/api/leads/kanban/route.ts` | **CREATE** | New Kanban data endpoint |
| `src/app/api/dashboard/stats/route.ts` | **MODIFY** | Pipeline breakdown in stats |
| `src/app/(dashboard)/pipeline/page.tsx` | **CREATE** | New Pipeline Board page |
| `src/components/pipeline/pipeline-selector.tsx` | **CREATE** | Pipeline dropdown (full-width mobile, inline desktop) |
| `src/components/pipeline/kanban-board.tsx` | **CREATE** | Viewport-aware wrapper (renders desktop or mobile board) |
| `src/components/pipeline/kanban-board-desktop.tsx` | **CREATE** | Desktop: side-by-side columns with DnD context |
| `src/components/pipeline/kanban-board-mobile.tsx` | **CREATE** | Mobile: tab bar + single column + action sheet |
| `src/components/pipeline/kanban-column.tsx` | **CREATE** | Individual column component (desktop DnD drop zone) |
| `src/components/pipeline/kanban-card.tsx` | **CREATE** | Compact lead card (touch-friendly, ≥48px targets) |
| `src/components/pipeline/card-detail-panel.tsx` | **CREATE** | Desktop: slide-out panel / Mobile: bottom sheet |
| `src/components/pipeline/move-to-sheet.tsx` | **CREATE** | Mobile bottom sheet for status/pipeline moves |
| `src/components/pipeline/column-tabs.tsx` | **CREATE** | Mobile horizontal scrollable tab bar |
| `src/components/layout/sidebar.tsx` | **MODIFY** | Add Pipeline Board nav item |
| `src/app/(dashboard)/dashboard/page.tsx` | **MODIFY** | Pipeline-aware stats |
| `src/app/(dashboard)/leads/page.tsx` | **MODIFY** | Add pipeline filter |
| `src/app/(dashboard)/leads/[id]/page.tsx` | **MODIFY** | Show pipeline context |
| `src/app/(dashboard)/call-list/page.tsx` | **MODIFY** | Scope to cold_leads pipeline |
| `src/app/(dashboard)/reports/page.tsx` | **MODIFY** | Pipeline filter |
| `src/app/(dashboard)/import/page.tsx` | **MODIFY** | Default pipeline on import |
| `src/app/globals.css` | **MODIFY** | Kanban board + mobile bottom sheet styling |
| `package.json` | **MODIFY** | Add @dnd-kit dependencies |
| `scripts/migrate-pipelines.mjs` | **CREATE** | One-time data backfill script |

**Total: 10 files modified, 12 files created**
