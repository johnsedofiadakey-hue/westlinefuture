# Westline Future Platform

A production-oriented ERP, CRM, client portal, and public website for Westline Future's glass, aluminum, interior finishing, procurement, and installation operations.

## Overview

Westline Future brings public marketing, project intake, client communication, payments, procurement tracking, staff operations, and admin reporting into one Firebase-backed React application.

## Architecture

- `src/pages/`: Public site, login, client portal, worker view, and admin modules.
- `src/components/`: Shared UI, payment, document, upload, and proposal components.
- `src/context/`: Auth and application data pipelines.
- `src/lib/`: Firebase, messaging, sanitization, error mapping, and utility services.
- `functions/`: Firebase Cloud Functions for privileged account, payment, SMS, WhatsApp, and automation workflows.
- `firebase/`: Firestore and Storage security rules.
- `public/`: Static public assets, manifest, sitemap, and robots file.

## Getting Started

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
```

## Deployment

The app is configured for Firebase Hosting with SPA rewrites to `index.html`.

```bash
npm run build
firebase deploy
```

Cloud Function secrets should be configured with `firebase functions:secrets:set`, not exposed through `VITE_*` browser environment variables.

## License

Commercial use only. Westline Future.
