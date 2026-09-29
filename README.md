# QA Learning Lab

Personal platform for learning QA / Software Testing: lessons, exercises, test-case and bug-report practice, and progress tracking.

| Folder | Description |
|---|---|
| [backend/](backend/) | NestJS API — auth, content, practice, progress. Talks to Supabase. |
| [frontend/](frontend/) | React + Vite + Ant Design app. Talks only to the backend. |
| [docs/](docs/) | Architecture and design docs |
| [plant.md](plant.md) | Full project specification and phase plan |

## Quick start

```bash
# Terminal 1 — backend
cd backend
npm install
cp .env.example .env   # fill in Supabase values
npm run start:dev      # http://localhost:3000/api/docs

# Terminal 2 — frontend
cd frontend
npm install
cp .env.example .env
npm run dev            # http://localhost:5173
```

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md).

## Status

| Phase | Status |
|---|---|
| 0 — Foundation | Done |
| 1 — Authentication & Profile | Next |
