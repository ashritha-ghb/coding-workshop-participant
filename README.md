# ACME Employee Performance Platform

A centralized web application for tracking employee performance, development plans,
competencies, and training records across ACME Inc.

## What's in here

```
├── backend/
│   ├── common/              # Shared DB connection and JWT helpers
│   ├── auth/                # Login, register, token refresh
│   ├── employees/           # Employee profiles
│   ├── performance-reviews/ # Review history and ratings
│   ├── development-plans/   # Career goals and progress
│   ├── competencies/        # Skills and gap tracking
│   ├── training-records/    # Training activities
│   └── tests/               # pytest unit tests
├── frontend/
│   └── src/
│       ├── context/         # Auth state (JWT + role)
│       ├── services/        # Axios API client
│       ├── components/      # Layout, DataTable, ConfirmDialog
│       └── pages/           # One file per route
├── infra/                   # Terraform — Lambda, Aurora, S3, CloudFront
└── bin/                     # Shell scripts for local dev and deploy
```

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL
- Docker (for LocalStack)
- LocalStack CLI (`pip install localstack`)
- AWS CLI + Terraform

### Setup

```sh
# Set your workshop credentials
echo "export AWS_REGION='ap-south-1'" >> ~/.bashrc
echo "export EVENT_ID='4f74fc2f'" >> ~/.bashrc
echo "export PARTICIPANT_ID='b924649a'" >> ~/.bashrc
echo "export PARTICIPANT_CODE='Excited-Baw\$Bjle-Piglet'" >> ~/.bashrc
source ~/.bashrc

./bin/setup-participant.sh
./bin/setup-environment.sh
```

### Start everything locally

```sh
./bin/start-dev.sh
```

This starts PostgreSQL, LocalStack, deploys Lambda functions, and starts the React dev server.

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

### First login

Register an admin account first:

```sh
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"Admin1234!","full_name":"Admin User","role":"admin"}'
```

Then log in at http://localhost:3000.

## API Endpoints

All endpoints require `Authorization: Bearer <token>` except `/auth/login` and `/auth/register`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login, returns JWT |
| POST | `/auth/register` | Register new user |
| POST | `/auth/refresh` | Refresh token |
| GET | `/auth/me` | Current user info |
| GET/POST | `/employees` | List / create employees |
| GET/PUT/DELETE | `/employees/:id` | Get / update / delete employee |
| GET/POST | `/performance-reviews` | List / create reviews |
| GET/PUT/DELETE | `/performance-reviews/:id` | Get / update / delete review |
| GET/POST | `/development-plans` | List / create plans |
| GET/PUT/DELETE | `/development-plans/:id` | Get / update / delete plan |
| GET/POST | `/competencies` | List / create competency records |
| GET/PUT/DELETE | `/competencies/:id` | Get / update / delete record |
| GET/POST | `/training-records` | List / create training records |
| GET/PUT/DELETE | `/training-records/:id` | Get / update / delete record |

### Role permissions

| Role | Can do |
|------|--------|
| Admin | Everything including delete employees and manage users |
| Manager | Full CRUD on all records, create/update employees |
| Contributor | Create and update records, read employees |
| Viewer | Read-only access to own records |

## Running Tests

```sh
pip install pytest pytest-cov psycopg[binary] bcrypt
pytest backend/tests/ -v --cov=backend
```

## Deploy to AWS

```sh
# Backend (Lambda + Aurora PostgreSQL)
./bin/deploy-backend.sh

# Frontend (S3 + CloudFront)
./bin/deploy-frontend.sh
```

After deploy, the CloudFront URL is printed to the terminal.

## Clean Up

```sh
./bin/clean-up.sh
```

Removes all AWS resources. Cannot be undone.

## Self-Assessment

**Implemented:**
- JWT authentication with bcrypt password hashing
- Role-based access control (Admin / Manager / Contributor / Viewer)
- Full CRUD for all 5 domains: employees, performance reviews, development plans, competencies, training records
- Search and filter on all list endpoints and pages
- Responsive layout using MUI + react-responsive breakpoints
- Form validation with inline error messages
- Loading states and user-friendly error handling
- Shared backend utilities to avoid code duplication across services

**Known limitations:**
- Employee ID is entered manually in forms — a real app would use a dropdown populated from the employees list
- No email notifications on review submission
- Token refresh is manual — a background refresh interval would improve UX
