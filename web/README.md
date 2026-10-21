# Web application (not scaffolded yet)

Planned stack (see `docs/decisions.md`): Next.js with TypeScript, Prisma, PostgreSQL, Tailwind with shadcn/ui, Auth.js for login, Zod for validation (derived from the event schema), Docker Compose for a local database. Notification channels go through an adapter interface (Pushover first).

## To scaffold
Run from PowerShell in this folder (not from WSL, so `node_modules` stays one platform):

```
npx create-next-app@latest . --typescript --tailwind --eslint --app
```

Then add Prisma and the database schema from the ERD (`docs/`), authentication with roles, the intake endpoint, and the compliance engine with unit tests.

## Rules
- Fake example data only. No real patient names.
- Secrets in `.env` (git-ignored); keep a `.env.example` with names only.
- Check roles on the server, not only in the UI.
- Store each event before attempting any notification.
