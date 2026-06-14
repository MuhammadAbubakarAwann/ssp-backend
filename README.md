# SPPS Backend

Express.js REST API for the Student Performance Prediction System (SPPS). Teachers manage classes and student records, trigger AI-based performance predictions (via a separate Flask ML service), and review per-student analytics/recommendations. Students can view their own performance data.

## Tech stack

- Node.js (ES Modules) + Express 5
- PostgreSQL (Supabase) via Prisma ORM (`@prisma/adapter-pg`, pgbouncer-compatible)
- JWT auth (access + refresh tokens), bcryptjs for password hashing
- Joi for request validation, multer + xlsx for Excel student imports
- Flask ML service for predictions (separate process)

## Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Flask prediction service running (for prediction-related endpoints)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root with the following variables:

   | Variable | Description |
   | --- | --- |
   | `DATABASE_URL` | Pooled Postgres connection string (used at runtime) |
   | `DIRECT_URL` | Direct Postgres connection string (used for migrations/seeding) |
   | `JWT_ACCESS_SECRET` | Secret for signing access tokens |
   | `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
   | `JWT_ACCESS_EXPIRES_IN` | Access token lifetime (default `30d`) |
   | `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (default `7d`) |
   | `PORT` | HTTP port (default `5000`) |
   | `NODE_ENV` | `development` or `production` |
   | `FLASK_PREDICTION_API_BASE_URL` | Base URL of the Flask ML service (default `http://127.0.0.1:5000`) |
   | `INTERNAL_API_SECRET` | Shared secret required in `x-internal-secret` header for `/api/internal/*` routes |
   | `SEED_DEFAULT_PASSWORD` | Default password used by seed scripts (default `12345678`) |

3. Apply the Prisma schema:

   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. (Optional) Seed sample data:

   ```bash
   npm run seed:all
   ```

## Run

Development mode (auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## Project structure

```
src/
  index.js              # App entry, mounts route prefixes
  config/database.js    # Singleton Prisma client (pgbouncer adapter)
  auth/                  # Login, refresh token, forgot password, JWT/role middleware
  teacher/               # Teacher-facing endpoints + shared student-detail logic
  student/               # Student self-access endpoints (mirrors teacher student-detail APIs)
  internal/              # Machine-to-machine endpoints secured by x-internal-secret
prisma/
  schema.prisma          # Data model
  seed.js                # Seeds default teacher accounts
  seed-catalog.js        # Seeds course catalog (BSCS/BSSE programs & courses)
```

## API overview

All authenticated routes require `Authorization: Bearer <access_token>`.

### Auth (`/api/auth`)

| Method | Path | Description |
| --- | --- | --- |
| POST | `/login` | Authenticate, returns access + refresh tokens |
| POST | `/refresh-token` | Exchange a refresh token for a new access token |
| POST | `/forgot-password` | Request a password reset token |
| POST | `/logout` | Invalidate a refresh token |
| GET | `/me` | Get the authenticated user's profile |

### Teacher (`/api/teacher`) — TEACHER/ADMIN

- **Catalog**: `GET /catalog/programs`, `/catalog/class-names`, `/catalog/semesters`, `/catalog/subjects`
- **Classes**: create/list/update/delete classes, `GET /classes/overview`, `/classes/names`, `/classes/names-short`, `/classes/:classId`, `/classes/:classId/performance-overview`
- **Students**: add single/bulk students, upload Excel (`/classes/:classId/students/upload-excel`), list students per class, prediction status per class
- **Student detail** (also exposed under `/api/student` for self-access): `details`, `subject-performance`, `performance-overview`, `overall-metrics`, `latest-predictions`, `history`, `recommendations`, `predictions`
- **Predictions**: `POST /classes/:classId/predictions` (triggers Flask prediction run and saves results), `GET /predictions/history`, `/predictions/reports`, `/predictions/metrics`, `/classes/:classId/predictions/:predictionId`
- **Dashboard**: `GET /dashboard/metrics`, `/performance-trend`

### Student (`/api/student`) — STUDENT only

Self-access mirrors of the teacher student-detail endpoints: `dashboard/metrics`, `details`, `subject-performance`, `performance-overview`, `latest-predictions`, `history`, `recommendations`.

### Internal (`/api/internal` and `/api/v1/internal`)

Secured via `x-internal-secret` header (no JWT):

- `GET /students/:studentId/history`
- `POST /students/history/bulk`

## Flask prediction integration

When a teacher triggers a prediction run, the backend posts student records to `POST {FLASK_PREDICTION_API_BASE_URL}/predict`, stores the results as a `PredictionRun` with per-student `PredictionEntry` rows, and refreshes each student's semester analytics (average score, class rank, risk level, expected CGPA).
