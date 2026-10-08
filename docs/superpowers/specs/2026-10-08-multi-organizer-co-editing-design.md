# Multi-Organizer Co-Editing Design Specification

**Date:** 2026-10-08  
**Status:** Approved  
**Topic:** Multi-organizer Co-editing for Birthday Celebration Canvases  

---

## 1. Overview & Problem Statement

Birthday milestones are often planned by groups of friends, family members, or colleagues. Previously, a celebration canvas was tied to a single user account (`birthday_pages.user_id`). This forced organizers to either share raw login credentials or rely on one person to configure themes, upload songs, adjust reveal dates, and monitor wishes.

Multi-organizer Co-editing enables the canvas creator (primary owner) to invite trusted co-organizers via a shareable invite link. Co-organizers can edit celebration details, customize music and themes, manage guest submissions, and review real-time analytics, while destructive actions (canvas deletion, altering payout bank accounts) remain strictly reserved for the primary owner.

---

## 2. Goals & Non-Goals

### Goals
- Enable Pro creators to generate shareable, revocable co-organizer invite links.
- Provide a clean acceptance route (`/organize/:token`) with clear celebration context for incoming co-organizers.
- Allow authenticated co-organizers to access and edit the celebration canvas in their Atelier Dashboard and Edit Studio.
- Enforce strict permission boundaries: co-organizers can update details, themes, soundtracks, and moderation, but cannot delete the canvas, remove the owner, or alter gift pool bank payout resolution.
- Enable the owner to view active co-organizers and revoke access at any time.

### Non-Goals
- Real-time concurrent Google Docs-style keystroke synchronisation (canvases use optimistic locking and page re-fetch).
- Granular permission hierarchies (e.g. read-only vs theme-only). A single `co_organizer` role provides full editing without destructive ownership rights.

---

## 3. Data Model & Database Schema

Two relational tables in `server/db.ts` support co-editing:

### 3.1 `page_collaborators`
```sql
CREATE TABLE IF NOT EXISTS page_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES birthday_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'co_organizer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT page_collaborators_page_user_unique UNIQUE (page_id, user_id),
  CONSTRAINT page_collaborators_role_check CHECK (role IN ('co_organizer'))
);

CREATE INDEX IF NOT EXISTS idx_page_collaborators_user_id ON page_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_page_collaborators_page_id ON page_collaborators(page_id);
```

### 3.2 `page_collaborator_invites`
```sql
CREATE TABLE IF NOT EXISTS page_collaborator_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES birthday_pages(id) ON DELETE CASCADE,
  invite_token_hash TEXT NOT NULL UNIQUE,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_collaborator_invites_lookup 
  ON page_collaborator_invites(page_id, revoked_at, expires_at);
```

---

## 4. Backend Access Control & API Endpoints

### 4.1 Query Projection Updates
- **`privatePageQuery(idOrCode, userId)`**:
  - Matches if `bp.user_id = userId OR EXISTS (SELECT 1 FROM page_collaborators pc WHERE pc.page_id = bp.id AND pc.user_id = userId)`.
  - Selects:
    - `(bp.user_id = userId) AS is_owner`
    - `CASE WHEN bp.user_id = userId THEN 'owner' ELSE 'co_organizer' END AS user_role`
- **Dashboard Canvases Listing (`GET /api/pages`)**:
  - Returns both owned canvases and canvases where user is in `page_collaborators`.

### 4.2 Endpoint Security Matrix

| Endpoint | Primary Owner | Co-Organizer | Non-Collaborator |
|---|---|---|---|
| `GET /api/pages/:id` | Allowed | Allowed | 404 Not Found |
| `PUT /api/pages/:id` | Allowed (all fields) | Allowed (except payout bank fields) | 404 / 403 |
| `DELETE /api/pages/:id` | Allowed | 403 Forbidden | 404 / 403 |
| `GET /api/pages/:id/analytics` | Allowed (Pro) | Allowed (if owner is Pro) | 404 / 403 |
| `GET /api/pages/:id/collaborators` | Allowed | Allowed | 403 Forbidden |
| `POST /api/pages/:id/collaborators/invite` | Allowed (Pro) | 403 Forbidden | 403 Forbidden |
| `DELETE /api/pages/:id/collaborators/invite` | Allowed | 403 Forbidden | 403 Forbidden |
| `DELETE /api/pages/:id/collaborators/:userId`| Allowed (any) | Allowed (self-only) | 403 Forbidden |

### 4.3 Invite Acceptance Endpoints
- **`GET /api/collaborator-invites/:token`**:
  - Public endpoint to preview invitation context before accepting.
  - Returns: `{ recipient_name, birthday_date, theme, cover_photo_url, owner_name, is_expired, is_revoked }`.
- **`POST /api/collaborator-invites/:token/accept`**:
  - Requires authenticated session (`requireAuth`).
  - Verifies token validity: not expired (`expires_at > NOW()`) and not revoked (`revoked_at IS NULL`).
  - If user is already the primary owner, returns `{ status: 'already_owner', public_code }`.
  - If user is already a collaborator, returns `{ status: 'already_collaborator', public_code }`.
  - Inserts new record into `page_collaborators` and returns `{ status: 'accepted', public_code }`.

---

## 5. Frontend Architecture & User Experience

### 5.1 Route: `/organize/:token` (`src/pages/AcceptInvitePage.tsx`)
- Editorial stationery card highlighting celebrant name, birthday date, and inviter's display name.
- Three primary states:
  1. **Unauthenticated**: Prompts user to Sign In or Sign Up, preserving redirect URL back to `/organize/:token`.
  2. **Authenticated**: Single action button: "Accept Co-organizer Invite". On click, submits acceptance and navigates to celebration.
  3. **Invalid / Expired**: Displays friendly alert with a link to the main site.

### 5.2 Modal: `CollaboratorsModal.tsx`
- Accessible from `DashboardCelebrationDrawer` and `EditPage`.
- Displays:
  - List of active co-organizers with avatars, names, and joined dates.
  - "Remove" action for each collaborator (owners can remove any; co-organizers can remove themselves).
  - Shareable Invite Link card with 1-click clipboard copy and expiration indicator.
  - "Revoke Link" button to immediately invalidate shared URLs.

### 5.3 Dashboard Atelier Integration
- Canvases in `OwnedPageCard.tsx` and `DashboardKanbanPipeline.tsx` display a `"Co-organizer"` badge when `page.user_role === 'co_organizer'`.
- Replaces the destructive `"Delete canvas"` menu item with `"Leave celebration"` for co-organizers.

---

## 6. Testing Strategy

1. **Unit Tests** (`src/lib/collaborators.test.ts` or `src/pages/page-wizard/collaborators.test.ts`):
   - Token hashing (SHA-256) and validation.
   - Expiration and revocation checks.
   - Permission boundary matrix (can edit vs cannot delete vs cannot edit bank details).
2. **Typecheck & Linter**:
   - Zero TypeScript compilation errors across `tsconfig.app.json`, `tsconfig.node.json`, and `tsconfig.server.json`.
   - Zero ESLint warnings/errors.
3. **End-to-End Build**:
   - Full `vite build` verification.
