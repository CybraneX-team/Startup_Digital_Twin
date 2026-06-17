# Product Workspace — Implementation Report

**Scope (exclusive):** the **Product / Founder Workspace** — the one opened by the **"Open Workspace"** text on the 3D page, which slides in the **left and right side panels** and whose **active canvas expands to fullscreen**. Everything below applies to this workspace only. The separate per-node `ActionNodeWorkspace` (new browser tab) is **out of scope** except as a *source* that exports nodes *into* this workspace (§6).

**Source material:** `Work_OS_Glassmorphic_Sphere_Canvas_Workspace_Specification.docx`, `BDT_IDT_Workspace_Project_Goal_Execution_System (1).docx`, and a full read of the workspace code.

---

## 0. TL;DR

- This workspace is rendered by **`TwinWorkspaceLayout`** (3D page) and **`ProductWorkspace`** (BDT `/universal` page) — the **same four panels** under one provider: `WorkspaceLeftPanel`, `WorkspaceRightPanel`, `WorkspaceActiveCanvas`, `WorkspaceBottomDock`, all inside `FounderWorkspaceProvider`.
- The "too large / doesn't make sense" feeling comes from three things: (1) the **active canvas is a 3,913-line monolith** doing six jobs; (2) the **`scrollExpansion` 0→100 morph** continuously resizes the whole grid (side panels 228/268px → 0, hero 34vh → 0) which is disorienting; (3) all content is **hardcoded demo data** with no real objects to act on.
- **Nothing persists.** The entire workspace state lives in React memory (`FounderWorkspaceContext`); it is gone on refresh. There are **no Supabase tables** for workspace/cards/projects/tasks/goals.
- **RBAC exists but is company/module-level**, not project-level — so "managers create projects and assign to multiple members" isn't expressible yet.
- **Voice AI can talk but not act** on this workspace — no tools, no workspace context injected.

---

## 1. How this workspace works today (exact components)

### 1.1 Open / close flow (the 3D-page path)
1. `pages/Universe3D.tsx:1361` renders `<OpenWorkspaceCue onClick={handleOpenWorkspace} />` (the "Open Workspace" text + chevrons, `components/OpenWorkspaceCue.tsx`).
2. `handleOpenWorkspace` runs a camera zoom, then schedules panels via the `TwinWorkspacePhase` state machine (`lib/twinWorkspaceTransition.ts`: `closed → zooming → entering → open → closing`).
3. When phase is `entering/open/closing`, `components/twin/TwinWorkspaceLayout.tsx` mounts the panels **over the live universe** (universe stays as the background — no opaque shell).
4. Close: the "Close Workspace" chevron; if expanded it dispatches `collapse-workspace-canvas`, waits 2.2s, then calls `onClose`.

> The BDT `/universal` page (`ProductWorkspace.tsx`) is the same panel set but with an opaque shell + a `WorkspacePlanetHero` (rendered at `scale-125`) and the `coreWorkspaceTransition` dive animation.

### 1.2 The four panels

| Panel | File | What it shows |
|---|---|---|
| **Left side panel** | `components/workspace/panels/WorkspaceLeftPanel.tsx` | Nav groups: **MY UNIVERSE** (Sphere, Canvas, Signals), **MY WORK** (Projects, Tasks, Goals, Notes, Files), **SHORTCUTS** (AI Product Roadmap, Fundraising Prep, Customer Interviews, Competitor Analysis). "Projects" expands to the in-memory workspace list with rename/delete/switch. |
| **Right side panel** | `components/workspace/panels/WorkspaceRightPanel.tsx` | **Live Signals** (`WORKSPACE_LIVE_SIGNALS` — hardcoded news) + **Focus Today** (`WorkspaceFocusToday`). Minimap is commented out. |
| **Active canvas** | `components/workspace/WorkspaceActiveCanvas.tsx` (**3,913 lines**) | The work surface — see §1.3. |
| **Bottom dock** | `components/workspace/WorkspaceBottomDock.tsx` | Toolbar buttons: Note, Task, File, Link, Table, Chart, Code, **AI Assistant** — **none are wired** (no onClick). |

### 1.3 The active canvas (the monolith)
`WorkspaceActiveCanvas.tsx` switches on `activeSidebarTab` and renders one of:
- **Canvas (default):** 6 glass cards positioned by absolute `x/y/w/h %` (`WORKSPACE_CANVAS_CARDS`): `company_hub`, `metrics`, `departments`, `goals`, `risks`, `gtm`, with light-thread connections (`WORKSPACE_CANVAS_CONNECTIONS`). Clicking a card sets `activeDetailCard` (expands it to 100%).
- **Tasks** → `WorkspaceTasksKanban` (drag-drop columns: Highlighted / In Progress / Done).
- **Goals** → `WorkspaceGoalsDashboard` (active/completed goals + a fake "AI assessment" banner).
- **Notes** → block editor (h1/h2/h3/text/todo/table).
- **Files** → files dashboard (SOC2 pdf, runway xlsx, onboarding txt — all hardcoded).

### 1.4 The expansion mechanics (root of "too large")
State lives in `FounderWorkspaceContext`: `scrollExpansion` (0–100) and derived `isFullscreen` (true at 100).

- In `TwinWorkspaceLayout` the grid **morphs continuously** with `p = scrollExpansion/100`:
  `gridTemplateColumns: (1-p)*228px | 1fr | (1-p)*268px` and `gridTemplateRows: (1-p)*34vh | 1fr`.
  → As you expand, **both side panels shrink to zero and the hero row collapses**, the active canvas fills the screen.
- Inside the canvas, fullscreen also **re-lays the 6 cards** from free `x/y%` positions into a uniform top strip (`width 15.5%`, `height 110px`, `left = index*16.9%`). This double transformation (grid morph + card re-layout) is what feels unpredictable.

### 1.5 State container
`context/FounderWorkspaceContext.tsx` holds goals, departments+FTE, risks, GTM channels, focus tasks, MRR growth, notes, files, chat messages, and a **multi-workspace array** (the "Projects" list). It is **100% in-memory demo data**; toggling a goal/risk/task cross-updates the others by hardcoded id pairs (`g2↔t1↔r1`). Good for a showcase, not a real model, and **not persisted**.

---

## 2. (a) Exact target visual layout

Keep the five glass zones from the spec, but make the workspace **feel small and purposeful**, not a sprawling dashboard.

```
┌──────────────────────────────────────────────────────────────┐
│ TOP MODE BAR — role/lens · workspace switcher · search · 🎙   │  (new, thin)
├───────────┬──────────────────────────────────┬───────────────┤
│ LEFT RAIL │   ACTIVE CANVAS (context+action)  │  RIGHT RAIL   │
│ collapse- │  • optional compact hero (≤28vh,  │ Live Signals  │
│ to-icons  │    NOT scale-125, collapsible)     │ + Goal/Metric │
│           │  • cards · connections · 1 clear   │   strip       │
│ Universe  │    "Suggested next action"          │ + Agent       │
│ Work      │                                    │   suggestions │
│ Shortcuts │                                    │ + Approvals   │
├───────────┴──────────────────────────────────┴───────────────┤
│ BOTTOM DOCK — Add card · Project · Task · Ask Agent · Export   │  (wire these)
└──────────────────────────────────────────────────────────────┘
```

**Concrete corrections to today's layout:**
1. **Replace the continuous `scrollExpansion` morph with discrete Workspace Modes** (from the BDT doc): `Explore · Decision · Execution · Review · Agent`. The mode decides which surfaces show; keep **one** explicit "Expand canvas ⤢ / Collapse" toggle for fullscreen instead of a 0–100 slider that resizes everything as you scroll.
2. **Collapse side panels to an icon rail** (≈56px) rather than animating them to 0px width — users keep their bearings and can re-open instantly.
3. **Cap / collapse the hero** (remove `scale-125`; max ~28vh; collapsible to a thin breadcrumb bar in Execution mode).
4. **Add a thin top mode/role bar** so the active lens (Founder/Manager/Member) is always visible — the spec's #1 acceptance criterion.
5. **Always surface one "Suggested next action"** on the canvas (spec requirement) instead of only a static card grid.

---

## 3. (b) Internal components & functionalities (target, mapped to files)

| Surface | Today | Target change |
|---|---|---|
| Left rail | `WorkspaceLeftPanel` — Projects = in-memory list | Projects becomes **real PM** (Superspace / Project / Member spaces, §7). Add Mode switcher. |
| Active canvas — Canvas | 6 hardcoded cards | Cards become **real InfoCards** (imported nodes, §6) backed by Supabase; keep drag + connections. |
| Active canvas — Tasks | `WorkspaceTasksKanban` (local) | Tasks read from `tasks` table, scoped by project + assignee. |
| Active canvas — Goals | `WorkspaceGoalsDashboard` (fake AI) | Goal hierarchy (daily→long-term) + real alignment/metric impact (§7, §8). |
| Active canvas — Notes/Files | block editor + file list (local) | Persist as card evidence; files become real uploads (Supabase storage). |
| Right rail | Live Signals + Focus Today (static) | Live Signals from IDT; add **Goal/Metric strip**, **Agent suggestions**, **Approvals queue**. |
| Bottom dock | 8 dead buttons | Wire: Add card, Create Task/Project, Ask Agent, **Export/Import node**, Simulate. |
| Expansion | `scrollExpansion`/`isFullscreen` | Replace with Modes + a single fullscreen toggle. |

**Split the 3,913-line file** into: `CanvasCardGrid`, `TasksKanban`, `GoalsDashboard`, `NotesEditor`, `FilesDashboard`, `InfoCard` — each behind a left-nav tab. This alone removes most of the "doesn't make sense."

---

## 4. (c) User workflows by role (inside this workspace)

The role vocab already exists (`UserRole = super_admin … viewer` in `lib/db/rbac.ts`). Bind workspace behavior to it.

- **Founder / Startup Founder:** opens workspace → compact hero + Canvas + one suggested action → imports an IDT signal as a card → chats (voice/text) → spins up a **project**, assigns tasks, links a **goal**, sees **estimated metric impact** → reviews actual impact in **Review mode**.
- **Manager / Department Head:** opens **Superspace** filtered to their area → sees all projects/health/resource load → **creates projects and assigns multiple members** (the explicit ask) → approves decisions, rebalances.
- **Team Member:** opens **Member Space** → unified task inbox across all assigned projects + a "Today" list → opens a task card (context, deps, acceptance criteria) → uses an **agent** to draft work → marks ready; progress rolls up to project/department metrics.
- **Investor / VC:** read-only approved view (already read-only in `rbac.ts`) → goals, runway, milestones, risks; no operational edits.

---

## 5. (d) Voice AI integration & capabilities (for this workspace)

Today: `hooks/useGeminiLive.ts` + `context/VoiceContext.tsx` = a generic talker. The full protocol incl. **tool-calling** is documented in `voiceAIApi.md`. To make voice *operate this workspace*:

1. **Mint ephemeral tokens server-side** with tools locked in (never ship the Gemini key to the browser — see the doc's security section).
2. **Declare workspace tools** at mint time, e.g.:

| Tool | Effect in this workspace |
|---|---|
| `navigate_workspace(tab)` | switch Canvas/Tasks/Goals/Projects/Member Space |
| `import_node_as_card(nodeRef)` | the "Export to Workspace" action, by voice (§6) |
| `create_task(title, project, assignee, due)` | adds to the Tasks kanban (respects RBAC) |
| `create_project(name, members[])` | manager-only |
| `link_goal(entity, goalId)` / `set_metric_target(...)` | goal/metric alignment |
| `run_agent(type, targetId)` | research/coding/data/writing agent |
| `simulate_impact(action)` | estimated metric impact before acting |
| `toggle_fullscreen()` / `expand_card(id)` | drive the layout by voice |

3. **Inject live context** mid-session via `clientContent` (active company, active card/tab, role) so answers are grounded.
4. End every spoken answer with a **suggested action** (spec acceptance criterion), and always reply to each `toolCall`.

**What a user can then do (Workspace + Voice):** "Pull the OpenAI signal onto my canvas, compare pricing, and start a pricing sprint" → card imported → comparison → project created with assigned tasks; "Why is activation behind and what do we do?" → data agent analyzes → suggests + creates recovery tasks; (member) "Draft my top task and its tests" → coding agent attaches a reviewable patch.

---

## 6. Save Nodes & "Export to Workspace" (into THIS canvas)

The doc's **Node → Card** model is the bridge from IDT/BDT nodes into this workspace.

- **Save nodes:** keep the fast local bookmark (`useSavedWorkflows`, localStorage) but **mirror to Supabase** (`saved_nodes`) keyed by the same lookup `buildKey()` already computes, so saves are per-user and cross-device.
- **Export to Workspace:** wire the currently-dead **"Export To WorkOs"** button (`ActionNodeWorkspace.tsx:319`) and the bottom-dock buttons to **create an InfoCard on this workspace's active canvas**. The card carries (BDT §4/§12): identity, context summary, key metrics, relationships, evidence, a **chat thread**, action items, and **sync status** (`draft → proposed → approved → synced`). It can then be discussed, linked, converted to task/project, and **synced back to the twin**.
- This is what makes "export a node, work on it, and have it saved" actually true — today the button does nothing and the canvas state is in-memory.

---

## 7. Project Management workspace (inside this workspace)

Repurpose the existing **"Projects"** nav item (`WorkspaceLeftPanel.tsx:60`, currently the in-memory workspace list) into the three spaces from BDT §6:

- **Superspace** — all projects/products; founders/super_admin/CXOs/dept heads. Filters, health, goal alignment, resource load, decision queue.
- **Project / Product Space** — one project: context, goal links, milestones, tasks, decisions, metrics, risks, files, project chat, agents.
- **Member Space** — personal cross-project task inbox + Today plan + personal metrics.

These plug into the Tasks/Goals tabs that already exist; the kanban and goals dashboard become **project-scoped** views.

---

## 8. RBAC inside this workspace (two-tier)

Today's RBAC (`lib/db/rbac.ts`, `pages/RBAC.tsx`, `lib/db/team.ts`) is **company/module level** and already does: members, invites (`workspace_invites` + `/join?token=`), join requests + approval RPCs, role matrix, real-time. Founders adding members already works.

**Add a second, project-level tier** to satisfy "managers create projects and assign to multiple members":
- `project_members(project_id, user_id, project_role)` with `project_role ∈ {owner, manager, contributor, viewer}`.
- Effective permission = company-module permission **AND** project membership. Extend `can()` → `canOnProject(role, projectRole, action)` and gate the Superspace "Create project / Assign" UI on it.
- Reuse the existing invite/join flow for company membership; add a lightweight **assign-to-project** multi-select inside the Project Space.

---

## 9. Persistence — the prerequisite for everything above

Everything in this workspace must move from React memory → Supabase. Proposed migration `016_workspace.sql`:

```
workspaces      (id, company_id, owner_id, name, mode, created_at)
workspace_cards (id, workspace_id, node_ref jsonb, card_type, summary,
                 metrics jsonb, relationships jsonb, evidence jsonb,
                 chat_thread_id, sync_status, created_by, updated_at)
projects        (id, company_id, name, type, owner_id, department_ids[], health_score)
project_members (project_id, user_id, project_role)            -- §8
tasks           (id, project_id, title, assignee_id, status, priority_score,
                 effort, due_date, dependencies[], agent_enabled)
goals           (id, company_id, horizon, label, owner_id, target, progress)
goal_links      (goal_id, entity_type, entity_id, weight, confidence)
metrics         (id, company_id, scope, key, value, trend, updated_at)
metric_impacts  (id, source_type, source_id, metric_id, estimated, actual, confidence)
decisions       (id, company_id, title, status, expected_impact, owner_id)
audit_log       (id, entity_type, entity_id, actor_id, change jsonb, at)
```

All tables get **RLS** mirroring `rbac.ts` (company scope + project membership). Keep the `FounderWorkspaceContext` API surface; swap its internals for Supabase-reading hooks so the UI barely changes.

---

## 10. Recommended build order

| Phase | Deliverable | Key files |
|---|---|---|
| **0. Shrink & clarify** | Cap/collapse hero, replace `scrollExpansion` morph with Modes + single fullscreen toggle, collapse side panels to icon rail, split the 3,913-line canvas | `TwinWorkspaceLayout.tsx`, `ProductWorkspace.tsx`, `WorkspaceActiveCanvas.tsx`, `WorkspaceLeftPanel.tsx` |
| **1. Persistence** | `016_workspace.sql` + `lib/db/workspace.ts`; back `FounderWorkspaceContext` with Supabase | new migration + hooks |
| **2. Node → Card** | Wire "Export to Workspace" + bottom-dock; `InfoCard` w/ chat + sync status | `ActionNodeWorkspace.tsx:319`, `WorkspaceBottomDock.tsx`, new `InfoCard` |
| **3. Project spaces** | Superspace / Project / Member under Projects nav | `lib/db/projects.ts`, `WorkspaceLeftPanel.tsx` |
| **4. Project RBAC** | `project_members` + `canOnProject` + assign UI | extend `lib/db/rbac.ts`, `team.ts` |
| **5. Goals & Metrics** | goal hierarchy + estimated/actual impact | `goals`/`metrics`/`metric_impacts` |
| **6. Voice tools** | tool-calling bound to this workspace | `useGeminiLive.ts` + server token endpoint |
| **7. Agents & suggestions** | research/coding/data agents + suggestive tasks + right-rail | new agent layer, `WorkspaceRightPanel.tsx` |

---

## 11. Key file index (this workspace only)

- Shells: `components/twin/TwinWorkspaceLayout.tsx` (3D page), `components/workspace/ProductWorkspace.tsx` (BDT page)
- Open/close: `components/OpenWorkspaceCue.tsx`, `pages/Universe3D.tsx:1361`, `lib/twinWorkspaceTransition.ts`, `lib/coreWorkspaceTransition.ts`
- Panels: `panels/WorkspaceLeftPanel.tsx`, `panels/WorkspaceRightPanel.tsx`, `WorkspaceActiveCanvas.tsx` (split me), `WorkspaceBottomDock.tsx`, `WorkspaceFocusToday.tsx`
- Data: `lib/workspaceLayoutData.ts` (cards/signals/tasks/toolbar)
- State: `context/FounderWorkspaceContext.tsx` (in-memory — replace with Supabase)
- Persistence today: `lib/useSavedWorkflows.ts`, `lib/useProductWorkspaceStore.ts` (localStorage)
- RBAC/Team: `lib/db/rbac.ts`, `lib/db/team.ts`, `pages/RBAC.tsx`, `lib/auth.tsx`
- Voice: `hooks/useGeminiLive.ts`, `context/VoiceContext.tsx`, `voiceAIApi.md`
- Export source: `components/workspace/ActionNodeWorkspace.tsx` (the "Export To WorkOs" button)

---

*End of report.*
