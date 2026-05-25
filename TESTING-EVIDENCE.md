# Testing evidence upload & claim status

Use this checklist to fully test **upload evidence** and **claim status** on local dev or production.

## Where it lives in the app

1. Sign in as **admin** (or **approved worker**).
2. **Projects** → open a project → `/project/{id}`.
3. On that page:
   - **Claim status** — six-step workflow (tap to change).
   - **Evidence** — drag/drop, camera, or file picker upload.

Clients on a shared project see the same page **view-only** (no upload, no status changes).

---

## Prerequisites (one-time)

### 1. Supabase SQL (run in SQL Editor, in order)

From `PLATFORM.md`, plus:

```text
supabase/claim-status-workflow.sql   ← required for status values
```

Minimum for upload + status:

1. `roles-and-orgs.sql`
2. `platform-security.sql` (includes storage RLS for `project-files`)
3. `plan-usage.sql`
4. `claim-status-workflow.sql`

### 2. Storage bucket

Supabase → **Storage** → **New bucket**

- Name: **`project-files`**
- Private (recommended)

Policies come from `platform-security.sql`.

### 3. Environment (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
GROQ_API_KEY=                    # optional; enables OCR + AI categories
```

### 4. Active subscription (required for upload & status)

Upload and status changes return **403** without an active org subscription (`trialing` or `active`).

**Option A — Real flow:** `/login?signup=admin` → complete Stripe trial/checkout.

**Option B — Dev seed** (after admin signup, replace UUID):

```sql
-- Find your org
SELECT o.id AS organization_id, u.email
FROM public.organizations o
JOIN auth.users u ON u.id = o.admin_user_id;

INSERT INTO public.subscriptions (organization_id, plan, status, trial_ends_at)
VALUES (
  '<organization_id>',
  'professional',
  'trialing',
  now() + interval '7 days'
)
ON CONFLICT (organization_id) DO UPDATE SET
  plan = EXCLUDED.plan,
  status = EXCLUDED.status,
  trial_ends_at = EXCLUDED.trial_ends_at,
  updated_at = now();
```

**Trial plan limits:** 10 MB per file, images + PDF only (no video).

**Professional trial:** 50 MB, all file types.

### 5. Run the app

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## Claim status — test cases

Stages (in order): **Inspection** → **Documentation** → **Estimate Sent** → **Approved** → **In Progress** → **Completed**.

| # | Action | Expected |
|---|--------|----------|
| 1 | Create a new project | Claim starts at **Inspection** |
| 2 | Open project page | Status strip shows 6 steps; current highlighted |
| 3 | Tap **Documentation** | UI updates; no error |
| 4 | Supabase → `claims` | `status` = `Documentation` |
| 5 | Supabase → `claim_timeline_events` | New row, source `manual`, describes change |
| 6 | Tap through to **Completed** | Each step saves |
| 7 | Tap current step again | Button disabled (no duplicate save) |

**API (optional):** `PATCH /api/claims/status` with body:

```json
{
  "claim_id": "<uuid>",
  "project_id": "<uuid>",
  "status": "Approved"
}
```

Must be logged in as admin or approved worker with active subscription.

---

## Evidence upload — test cases

| # | Action | Expected |
|---|--------|----------|
| 1 | Upload a small **JPEG** | Success; card appears with category (e.g. Damage Photo) |
| 2 | Open evidence file | File opens (signed URL) |
| 3 | Search box | Finds file by name or summary text |
| 4 | Upload **PDF** | Works on trial+ |
| 5 | Upload **MP4** on **trial** plan | **403** or type error (trial = images/PDF only) |
| 6 | Upload **MP4** on **professional** | Works if under 50 MB |
| 7 | File over plan size limit | Clear error (10 MB trial / 25 starter / 50 pro) |
| 8 | Admin: edit summary / category on card | Saves via `PATCH /api/evidence` |
| 9 | Admin: delete evidence | Removed from list and storage |
| 10 | **Worker** (approved) | Can upload and change status; cannot delete/edit meta |
| 11 | **Client** (granted access) | No upload area; status buttons disabled |

**Verify in Supabase Storage:**

```text
project-files / {projectId} / {claimId} / {timestamp}-{filename}
project-files / {projectId} / {claimId} / {timestamp}-{filename}.meta.json
```

---

## Quick troubleshooting

| Symptom | Fix |
|---------|-----|
| **Active subscription required** | Seed `subscriptions` (see above) or finish billing |
| Storage / RLS error on upload | Run `platform-security.sql`; bucket `project-files` exists |
| Status update fails | Run `claim-status-workflow.sql` |
| No AI category / empty summary | Set `GROQ_API_KEY`; without it, filename heuristics still work |
| PDF says “no text could be extracted” | Often a **scanned/image PDF**; set `GROQ_API_KEY`, deploy, then **Re-scan text** on the card (or re-upload). OCR reads up to 6 pages. |
| `DOMMatrix is not defined` on upload | Redeploy after fix; needs `pdf-parse/worker` + `@napi-rs/canvas` (Node 20.16+ / 22.3+ on Vercel). |
| 401 on API | Sign in again |
| Project empty / no claim | Create project from `/projects` (auto-creates one claim) |

---

## Production (`ledgerstack.org`)

Same flow after:

- SQL scripts applied to production Supabase
- `project-files` bucket exists
- Admin account with active subscription
- `GROQ_API_KEY` on Vercel (optional)

Use a real photo/PDF under plan size limits when testing on trial.

---

## Related files

| Area | Path |
|------|------|
| Project UI | `app/project/[id]/page.tsx` |
| Upload UI | `components/evidence-upload.tsx` |
| Status UI | `components/claim-status-workflow.tsx` |
| Upload API | `app/api/upload/route.ts` |
| Evidence API | `app/api/evidence/route.ts` |
| Status API | `app/api/claims/status/route.ts` |
| Status enum | `lib/claim-status.ts` |
| Plan limits | `lib/plan-enforcement.ts` |
