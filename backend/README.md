# LANDLOGY backend

This is the shared backend for the LANDLOGY platform. It provides the REST API, auth, validation, database access, and file upload handling used by the admin dashboard and seller-facing frontend.

## What it does

- exposes shared and role-scoped APIs under `/api`, `/api/admin`, and `/api/client`
- authenticates users with JWT and role checks
- manages property and enquiry workflows
- persists records in PostgreSQL with Sequelize
- accepts upload files and stores them under the configured upload directory
- sends transactional email through Brevo when configured

## Tech stack

- Node.js
- Express
- PostgreSQL + Sequelize
- JWT
- Multer for file uploads
- dotenv for environment configuration

## Setup

```bash
cd backend
npm install
cp .env.example .env
```

Then update `.env` with your local database, JWT secret, and API values.

## Required environment variables

The project’s backend template contains the main values used by the server, including:

- `PORT`
- `CLIENT_ORIGIN`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `DB_SSL`
- `JWT_SECRET`
- `UPLOAD_DIR`
- `MAX_UPLOAD_SIZE`
- `BREVO_API_KEY`
- `MAIL_TO`
- `MAIL_FROM`

See [backend/.env.example](.env.example) for the current template.

## Common commands

```bash
npm run dev
npm start
npm test
npm run db:migrate
npm run db:rollback
npm run db:seed
npm run db:create-admin
```

## API shape

The server mounts routes as:

- `/api` — shared public endpoints, health checks, auth, and public enquiry creation
- `/api/admin` — admin-only routes for listings, enquiry updates, and property operations
- `/api/client` — seller-only routes for property owner workflows

## Important operational rules

- `JWT_SECRET` must be set to a strong value in production.
- the app should not be started with the weak dev fallback secret in production
- protect the server-side `.env` file; do not expose secrets to frontend bundles
- do not write direct database logic into frontend code

## Database note

The backend uses Sequelize models and migrations under the `migrations/` and `models/` folders. The database connection is configured in `config/database.js`.
