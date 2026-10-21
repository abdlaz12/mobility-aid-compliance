# Web application

Next.js (App Router, TypeScript, Tailwind) with Prisma and SQLite for development. See `docs/decisions.md` for the reasons behind each choice.

## Current state
- Next.js scaffolded (`create-next-app`, `src/` layout, import alias `@/*`).
- Database schema in `prisma/schema.prisma` (from `docs/erd.dbml`), first migration applied, seed script with **fake** data (3 users, 2 patients, 5 aids, 3 rooms).
- Not built yet: login and roles, intake endpoint, compliance engine, dashboard.

## Run it (PowerShell, in this folder, not WSL)
```
npm install
copy .env.example .env
npx prisma migrate dev      # creates the SQLite database and the Prisma client
npx prisma db seed          # loads the fake example data
npm run dev                 # http://localhost:3000
```
Useful: `npx prisma studio` opens a browser view of the database.

## Notes
- **Prisma is pinned to 6.x** (`prisma` and `@prisma/client`), which is stable and simple with SQLite. Moving to PostgreSQL later means changing the provider in `schema.prisma` and `DATABASE_URL`.
- The generated Prisma client (`src/generated/`) and the local database (`*.db`) are git-ignored, so run `npx prisma migrate dev` after cloning.
- Fixed vocabularies (role, level, status) are plain strings in the schema and are validated in code, to keep SQLite and PostgreSQL both working.
- `npm audit` reports high-severity warnings in the lint tooling chain (`eslint-config-next`). They are in development tools only. Do not run `npm audit fix --force`: it would downgrade the toolchain.
- Run `npm` and `node` from Windows only, not from WSL, so `node_modules` stays one platform.

## Rules
- Fake example data only. No real patient names.
- Secrets in `.env` (git-ignored); `.env.example` has names only.
- Check roles on the server, not only in the UI.
- Store each event before attempting any notification.
