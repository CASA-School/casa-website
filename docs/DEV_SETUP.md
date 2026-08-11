# CASA Public Site Dev Setup

## Prerequisites
- Node.js 25+
- npm 11+

## Install Dependencies
```bash
npm install
```

## Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### Public fallback mode
Leave `DATABASE_URL` unset.

In fallback mode:
- public content uses in-repo fixtures
- careers pages use a small in-memory fallback dataset
- career application submissions are disabled because CV uploads require database storage
- no external database is required

### Neon-backed mode
Set:
- `DATABASE_URL` to enable career application submissions with CV storage
- optional submission webhooks:
  - `CONTACT_WEBHOOK_URL`
  - `CAREERS_APPLICATION_WEBHOOK_URL`
  - `COURSE_REGISTRATION_WEBHOOK_URL`
  - `EXAM_REGISTRATION_WEBHOOK_URL`

Apply the schema and baseline seed:
```bash
npm run db:migrate
npm run db:seed
```

## Run App
```bash
npm run dev
```

## Quality Gates
```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```
