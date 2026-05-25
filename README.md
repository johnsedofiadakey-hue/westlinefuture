# Westline Future Platform

A production-ready project operating system for Westline Future: public site, client portal, admin console, worker portal, finance, approvals, rendering packages, sourcing, logistics, installation, and handover.

## Overview
Westline Future manages the full project journey from initial intake to paid CAD/3D rendering access, final quote approval, project deposit, procurement, shipping, installation, inspection, and final settlement.

## Architecture
The platform is built with React and Vite, backed by Firebase services:

- **src/components/**: Shared UI elements, payment components, rendering managers, documents, and reusable controls.
- **src/pages/**: High-level page modules (Public Site, Admin Portal, Client Portal, Account Manager Portal).
- **src/data.jsx**: Centralized source of truth for default data, project stages, services, and fallback content.
- **src/index.css**: Design system and print-safe global styles.
- **functions/**: Firebase Cloud Functions for server-side payment and operational workflows.
- **firebase/**: Firestore and Storage rules.

## Key Features
- **Public Site**: Service positioning, portfolio, catalog, and structured project intake.
- **Admin Portal**: CRM, project board, client hub, invoices, quotes, staff, analytics, showcase, and system controls.
- **Client Portal**: Project timeline, rendering access, approvals, payments, documents, add-ons, and messages.
- **Worker Portal**: Assigned project execution, checklists, installation notes, and photo uploads.
- **Finance**: Invoices, receipts, quotes, payment tracking, and payment verification hooks.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone <westline-future-repository-url>
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment
The project is configured for Firebase Hosting.

```bash
npm run build
npx firebase-tools deploy --only hosting --project westlinefuture
```

## License
Commercial Use Only — Westline Future.
