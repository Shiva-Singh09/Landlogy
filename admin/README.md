# LANDLOGY admin

This is the internal admin dashboard for LANDLOGY operations.

Live dashboard: [landlogy-admin.vercel.app](https://landlogy-admin.vercel.app/)

## Purpose

The admin app is used for operational tasks such as:

- viewing and managing enquiries
- reviewing property records
- updating property states
- managing admin workflows through the backend API

## Stack

- React
- Vite
- TypeScript
- React Router

## Setup

```bash
cd admin
npm install
cp .env.example .env.local
```

## Required environment variable

```bash
VITE_API_BASE_URL=https://your-backend-domain
```

This value is defined in [admin/.env.example](.env.example).

## Run locally

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Authentication model

The admin dashboard requires a valid backend-issued JWT. It does not maintain its own database or auth source.

If a session expires or the token is invalid, the app redirects to the login screen and requests a fresh authentication flow from the backend.
