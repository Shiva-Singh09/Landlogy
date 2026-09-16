# LANDLOGY

This repository is a small monorepo for the LANDLOGY platform. The active code in the current workspace is split across three app surfaces:

- `admin/` — internal admin dashboard for managing enquiries, properties, and account workflows
- `backend/` — shared Express API, authentication, validation, database access, and file handling
- `seller-website/` — seller-facing frontend for public submission and property intake flows

The backend is the source of truth for business rules, auth, and persistence. Clients do not connect directly to PostgreSQL.

## Live applications

- [Seller website](https://landlogy.vercel.app/)
- [Admin dashboard](https://landlogy-admin.vercel.app/)

## Repository layout

```text
LANDLOGY/
├── admin/              # Vite + React admin app
├── backend/            # Express + Sequelize API and database layer
├── seller-website/     # Seller-facing frontend
├── broker-app/         # present in repo, not the current documented app surface
├── buyer-website/      # present in repo, not the current documented app surface
├── README.md           # this file
├── .gitignore
└── .env.example       # use project-specific env files in app folders where needed
```

## Local development

Install dependencies in the app you want to run:

```bash
cd admin && npm install && npm run dev
cd ../backend && npm install && npm run dev
cd ../seller-website && npm install && npm run dev
```

Use the app README files in each folder for the exact environment variables and start commands for that app.

## Backend-first architecture

```text
Seller website / admin app
          │
          ▼
       Backend API
          │
          ▼
      PostgreSQL
```

This means:

- frontend apps call backend endpoints
- backend validates requests and authorizes users
- backend owns the database model and persistence logic
- the admin and public frontend apps are not trusted as the final authority on business rules

## Current app responsibilities

- `admin/` handles internal dashboard tasks such as enquiry review and property management
- `backend/` exposes `/api`, `/api/admin`, and `/api/client` routes and authenticates users with JWT
- `seller-website/` collects seller/property submission data through backend APIs

## Important notes

- Keep secrets in local `.env` files and never commit real credentials.
- The backend requires a valid PostgreSQL connection and JWT secret in production.
- The admin and seller frontends use environment variables such as `VITE_API_BASE_URL` for the public backend URL.

For detailed setup and runtime notes, see the app-specific READMEs:

- [admin/README.md](admin/README.md)
- [backend/README.md](backend/README.md)
- [seller-website/README.md](seller-website/README.md)
