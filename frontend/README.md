# Frontend (standalone prototype)

The interface of the Mobility Aid Compliance system, built from the Figma Make design (`../design/make-snapshot/`). It runs **on its own with mock data**, with no dependency on `../web/`. Once the design is final it is joined to the backend (see "Joining the backend").

Stack: Vite, React 19, Tailwind 4, React Router. Tokens (light and dark) come from the Foundations page of the design.

## Run
```
npm install
npm run dev          # http://127.0.0.1:5173
npm run typecheck
npm run build
```
Sign in with the shortcuts under the form (Nurse, Family, Admin), or with the demo accounts: `nurse@example.test`, `nurse2@example.test`, `family@example.test`, `family2@example.test`, `admin@example.test`, password `demo-password-1` (all fake). Five wrong passwords lock an account for the session.

## Tests
```
npx playwright install chromium      # once
npm run test:e2e
```
The browser tests check, at 375, 768 and 1280 px: nothing overflows sideways, the navigation is right for each breakpoint and role (bottom bar on a phone, icon sidebar on a tablet, full sidebar on a desktop), access by role, the sign-in lock-out, the theme switch, the skip link, every control in the shell is at least 44 x 44 px, and no WCAG 2.1 AA violation reported by axe, in light and dark. Set `PLAYWRIGHT_CHROMIUM_PATH` to use a Chromium you already have.

## Layout of the code
- `src/components/ui/`: the base components of the Foundations page (alert and status badges, button, form controls, card, notice, empty state, skeleton, segmented control, live indicator, confirm dialog, icons). Presentation only, no data.
- `src/components/shell/`: the responsive shell (top bar; sidebar on desktop, icon sidebar on tablet, bottom bar and a More menu on a phone), different navigation per role.
- `src/data/types.ts`: the shapes of the data, **the same as the backend API returns** (`../docs/api.md`).
- `src/auth/`: mock sign-in. Replaced by the real one at integration.
- `src/screens/`: one file per screen. Screens that are not built yet show a placeholder.

## Status
Phase 1 (foundation) is done: tokens, base components, shell, sign-in, role access. Next: the nurse flow, then the family flow, then the admin flow (13 screens in total; the scope is in `../docs/frontend-backlog.md`).

## Joining the backend
Only the data layer changes: the mock data is replaced by calls to the API (or server data in the Next.js app), and the mock sign-in by the real one. The components and screens are moved into `../web/` unchanged. Parked items that need backend work are listed in `../docs/frontend-backlog.md`.
