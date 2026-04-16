# Architecture

## Overview

This is a serverless web application built on AWS. The frontend is a React single-page app served from S3 via CloudFront. The backend is a set of Python Lambda functions, each handling one domain. PostgreSQL (Aurora Serverless) is the database.

```
Browser
  └── CloudFront (CDN + HTTPS)
        ├── S3 (React frontend)
        └── Lambda Function URLs (API)
              └── Aurora PostgreSQL (database)
```

## Backend Services

Each service is an independent Lambda function with its own handler. They share a `common/` module for database connection pooling and JWT utilities.

| Service | Path | Responsibility |
|---------|------|----------------|
| auth | `/backend/auth/` | Login, registration, token management |
| employees | `/backend/employees/` | Employee profiles and directory |
| performance-reviews | `/backend/performance-reviews/` | Review cycles and ratings |
| development-plans | `/backend/development-plans/` | Career goals and progress |
| competencies | `/backend/competencies/` | Skills and gap tracking |
| training-records | `/backend/training-records/` | Training activities |

## Shared Utilities

`backend/common/db.py` — PostgreSQL connection with module-level pooling. Lambda containers stay warm between invocations, so the connection persists and avoids reconnecting on every request.

`backend/common/auth.py` — JWT creation and verification, role rank comparison, standard response helpers (`ok()`, `err()`).

## Authentication Flow

1. User registers or logs in via `/auth/register` or `/auth/login`
2. Server returns a signed JWT containing `user_id`, `email`, `role`, and expiry
3. Frontend stores the token in `localStorage`
4. Every subsequent API request includes `Authorization: Bearer <token>`
5. Each Lambda verifies the token and checks the caller's role before proceeding

## Role Hierarchy

```
admin > manager > contributor > viewer
```

Each endpoint declares a minimum role. If the caller's role rank is below the minimum, the request is rejected with 403.

## Database

Tables are created automatically on first Lambda invocation using `CREATE TABLE IF NOT EXISTS`. No migration tool is needed for this scale.

Each service owns its own table:
- `users` — managed by auth service
- `employees` — managed by employees service
- `performance_reviews` — managed by performance-reviews service
- `development_plans` — managed by development-plans service
- `competencies` — managed by competencies service
- `training_records` — managed by training-records service

## Frontend

Built with React 19 + Vite. Material UI handles components and theming. React Router manages client-side routing with protected routes that redirect unauthenticated users to `/login`.

The `AuthContext` holds the current user and token. It validates the stored token on page load by calling `/auth/me`. If the token is expired or invalid, the user is logged out automatically.
