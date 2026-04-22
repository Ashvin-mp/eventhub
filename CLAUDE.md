# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
EventHub is a full-stack event ticket booking platform built for QA training. Users can browse events, book tickets, manage bookings, and create events. Each user operates in an isolated sandbox.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, React Query v5
- **Backend**: Express.js, Prisma ORM, MySQL 8+
- **Auth**: JWT (7-day expiry), bcryptjs
- **Testing**: Playwright E2E (Chromium only, runs against production URL)

## Commands to Run
```bash
npm run setup        # Install all dependencies (root + frontend + backend)
npm run dev          # Start frontend (3000) + backend (3001) concurrently
npm run seed         # Seed 10 static events into the database
npm run migrate      # Run Prisma migrations (interactive)
npm run db:push      # Push schema changes to DB without migration history
npm run test         # Run all Playwright tests
npm run test:ui      # Playwright with UI mode
npm run test:report  # Open HTML test report
npx playwright test tests/<file>.spec.js --reporter=line  # Run single test file
```

## Environment Setup
- Backend: copy `backend/.env.example` → `backend/.env` (requires `DATABASE_URL`, `JWT_SECRET`, `PORT=3001`, `CORS_ORIGIN=http://localhost:3000`)
- Frontend: copy `frontend/.env.local.example` → `frontend/.env.local` (requires `NEXT_PUBLIC_API_URL=http://localhost:3001/api`)
- Playwright tests target **production**: `https://eventhub.rahulshettyacademy.com` (set in `playwright.config.ts`)

## Project Structure
```
eventhub/
├── frontend/          # Next.js 14 app (port 3000)
│   ├── app/           # Pages (App Router)
│   ├── components/    # Domain-organized React components (auth/, bookings/, events/, layout/, ui/)
│   ├── lib/           # API clients (axios), hooks (React Query), providers
│   └── types/         # TypeScript interfaces
├── backend/           # Express API (port 3001)
│   ├── app.js         # Express setup: CORS, middleware, routes, error handler
│   ├── server.js      # Entry point
│   ├── src/
│   │   ├── routes/        # HTTP endpoint definitions
│   │   ├── controllers/   # Request handlers (thin, delegates to services)
│   │   ├── services/      # Business logic (FIFO pruning, seat calculation)
│   │   ├── repositories/  # Data access (Prisma queries)
│   │   ├── validators/    # express-validator input validation
│   │   ├── middleware/    # authMiddleware (JWT), errorHandler, requestLogger
│   │   ├── config/        # database.js (Prisma client), env.js, swagger.js
│   │   └── utils/         # errors.js (custom error classes)
│   └── prisma/            # schema.prisma + migrations + seed.js
├── tests/             # Playwright E2E tests
└── .claude/
    └── skills/        # Skill documents (domain knowledge, testing guides, agent prompts)
```

## Architecture Pattern
Backend follows strict layered architecture: Routes → Controllers → Services → Repositories → Database

Key service behaviors:
- **eventService**: `withPersonalSeats()` adjusts available seats per user (totalSeats minus that user's booked quantities) — static events use real `availableSeats`, dynamic events recalculate per-request
- **bookingService / eventService**: FIFO pruning enforces limits — oldest record deleted when max is exceeded

## API Reference
- Swagger docs available at `http://localhost:3001/api/docs` when running locally
- All routes except `/api/auth/*` require `Authorization: Bearer <token>` header
- Auth endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Events: `GET/POST /api/events`, `GET/PUT/DELETE /api/events/:id`
- Bookings: `GET/POST /api/bookings`, `GET/DELETE /api/bookings/:id`, `DELETE /api/bookings` (clear all)

## Testing Conventions
- Test files go in `tests/` as `<feature-name>.spec.js`
- Follow `.claude/skills/playwright-best-practices/SKILL.md`
- Locator priority: `data-testid` > role > label/placeholder > ID > CSS class
- No `page.waitForTimeout()` — use `expect().toBeVisible()`
- Tests must be self-contained (login → action → assert)
- Primary test account: `rahulshetty1@gmail.com` / `Magiclife1!`
- Secondary test account: `rahulshetty1@yahoo.com` / `Magiclife1!` (for cross-user scenarios)

## Key Business Rules
- Max 6 user-created events per user (FIFO pruning on overflow)
- Max 9 bookings per user (FIFO pruning on overflow)
- Booking ref format: `[EVENT_TITLE_FIRST_CHAR]-[6_RANDOM_ALPHANUMERIC]` (e.g., "Tech Summit" → `T-A3B2C1`)
- Seat count reduces on booking, restores on cancellation
- Per-user seat availability: dynamic events recalculate seats by subtracting the requesting user's bookings
- Refund eligibility: quantity=1 → eligible, quantity>1 → not eligible (client-side check only)
- Cross-user booking access returns "Access Denied"
- Static (seeded) events are immutable — cannot be edited or deleted
- Cascade deletes: deleting a user removes their events and bookings

## Custom Slash Commands (Skills in `.claude/skills/`)
- `/generate-tests <feature>` — generates Playwright tests
- `/review-tests <file>` — reviews test code quality
- `/create-scenarios <area>` — creates test scenario documents
- `/test-strategy <scenarios>` — assigns tests to optimal pyramid layers
- `/eventhub-domain` — domain knowledge reference (API endpoints, UI selectors, user flows)
- `/playwright-best-practices` — testing standards reference

## Code Style
- Backend: JavaScript with JSDoc, Express patterns
- Frontend: TypeScript, React hooks, Tailwind utility classes
- Tests: JavaScript with Playwright test runner
- Add step comments in tests (`// Step 1: Login`, `// Step 2: Book event`)
