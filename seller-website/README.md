# LANDLOGY seller website

This is the seller-facing frontend used to present LANDLOGY to property owners and collect property submission information.

Live website: [landlogy.vercel.app](https://landlogy.vercel.app/)

## Purpose

The app is responsible for the public seller journey, including:

- marketing and trust-building content
- property submission form flows
- lead capture and enquiry creation
- interaction with the shared backend API

It is not the source of truth for validation or persistence. All data submission goes through the backend.

## Setup

```bash
cd seller-website
npm install
cp .env.example .env.local
```

Then set the backend URL in the environment file.

## Required environment variable

```bash
VITE_API_BASE_URL=https://your-backend-domain
```

This value is defined in [seller-website/.env.example](.env.example).

## Run locally

```bash
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```

## Important architecture note

The seller frontend calls the backend API instead of connecting directly to PostgreSQL or other server-side services.

The API base is configured through `VITE_API_BASE_URL`, and the project expects the backend to be available before frontend production builds or deployments are used.
