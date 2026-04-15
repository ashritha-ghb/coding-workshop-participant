# Workshop TODO — ACME Employee Performance Platform

## What You're Building

A full-stack web app for ACME Inc. to track employee performance, development plans,
competencies, and training records. Managers and HR can manage everything; employees
can view their own data.

---

## Tech Stack

| Layer       | Technology                                      |
|-------------|--------------------------------------------------|
| Frontend    | React 19 + Vite, Material UI, React Responsive  |
| Backend     | Python (AWS Lambda)                             |
| Database    | PostgreSQL (Aurora Serverless on AWS)           |
| Infra       | Terraform (auto-deploys Lambda from `backend/`) |
| Local Dev   | LocalStack (AWS emulator), PostgreSQL, MongoDB  |
| Deploy      | S3 + CloudFront (frontend), Lambda (backend)    |

---

## Step 0 — Environment Setup (Do This First)

```sh
# 1. Set your workshop credentials
echo "export AWS_REGION='ap-south-1'" >> ~/.bashrc
echo "export EVENT_ID='4f74fc2f'" >> ~/.bashrc
echo "export PARTICIPANT_ID='b924649a'" >> ~/.bashrc
echo "export PARTICIPANT_CODE='Excited-Baw\$Bjle-Piglet'" >> ~/.bashrc
source ~/.bashrc

# 2. Run participant setup
./bin/setup-participant.sh

# 3. Install all tools (VS Code, AWS CLI, Terraform, etc.)
./bin/setup-environment.sh

# 4. Start local dev environment (LocalStack + PostgreSQL + React)
./bin/start-dev.sh
```

After `start-dev.sh`:
- Frontend → http://localhost:3000
- Backend API → http://localhost:3001/api/<service-name>

---

## Step 1 — Backend Services (Python Lambda)

Each service lives in `backend/<service-name>/`. Terraform auto-discovers any folder
with a `function.py` one level under `backend/` (folders starting with `_` are ignored).

### How to create a new service

```sh
cp -R backend/_examples/python-service backend/<service-name>
# Then restart dev env:
./bin/start-dev.sh
```

### Services to build

| Service               | Folder                        | Purpose                                      |
|-----------------------|-------------------------------|----------------------------------------------|
| Auth                  | `backend/auth/`               | Login, JWT tokens, password hashing          |
| Employees             | `backend/employees/`          | Employee profiles, roles                     |
| Performance Reviews   | `backend/performance-reviews/`| Review history, ratings                      |
| Development Plans     | `backend/development-plans/`  | Goals, career plans                          |
| Competencies          | `backend/competencies/`       | Skills, gap tracking                         |
| Training Records      | `backend/training-records/`   | Completed training activities                |

### Each service must implement

```
POST   /api/<service-name>        → Create (201)
GET    /api/<service-name>        → List all (200)
GET    /api/<service-name>/{id}   → Get by ID (200 / 404)
PUT    /api/<service-name>/{id}   → Update (200 / 404)
DELETE /api/<service-name>/{id}   → Delete (204 / 404)
```

### Database env vars (auto-injected into Lambda)

| Variable        | Local value     | Cloud value          |
|-----------------|-----------------|----------------------|
| `IS_LOCAL`      | `true`          | `false`              |
| `POSTGRES_HOST` | `localhost`     | Aurora endpoint      |
| `POSTGRES_PORT` | `5432`          | `5432`               |
| `POSTGRES_NAME` | *(empty)*       | Aurora DB name       |
| `POSTGRES_USER` | *(empty)*       | Aurora username      |
| `POSTGRES_PASS` | *(empty)*       | Aurora password      |

> When `IS_LOCAL=false`, add `sslmode=require` to your PostgreSQL connection string.

### Auth requirements

- [ ] JWT-based login (`POST /api/auth/login`)
- [ ] Password hashing (bcrypt)
- [ ] Token expiration + refresh
- [ ] Middleware that validates JWT on all protected endpoints
- [ ] RBAC — four roles:

| Role        | Permissions                              |
|-------------|------------------------------------------|
| Admin       | Full access + manage users/roles         |
| Manager     | Full CRUD except users/roles             |
| Contributor | Create + Update, no Delete               |
| Viewer      | Read-only                                |

### Python service checklist (per service)

- [ ] `function.py` — Lambda handler with full CRUD logic
- [ ] `postgres_service.py` — DB connection with pooling
- [ ] `requirements.txt` — at minimum `psycopg[binary]==3.1.14`
- [ ] Input validation (required fields, types, formats)
- [ ] Consistent error responses `{ "error": "...", "message": "..." }`
- [ ] Correct HTTP status codes (201, 200, 204, 400, 404, 500)
- [ ] Logging with `logger = logging.getLogger()`

---

## Step 2 — Frontend (React + Material UI)

### Install missing dependencies first

```sh
cd frontend
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material react-responsive react-router-dom axios
```

### Pages to build

| Page                  | Route                    | Who can access          |
|-----------------------|--------------------------|-------------------------|
| Login                 | `/login`                 | Everyone (public)       |
| Dashboard             | `/`                      | All authenticated users |
| Employees             | `/employees`             | Admin, Manager          |
| Employee Detail       | `/employees/:id`         | All authenticated users |
| Performance Reviews   | `/reviews`               | All authenticated users |
| Development Plans     | `/plans`                 | All authenticated users |
| Competencies          | `/competencies`          | All authenticated users |
| Training Records      | `/training`              | All authenticated users |

### Frontend checklist

- [ ] React Router setup with protected routes
- [ ] Auth context (store JWT, user role, login/logout)
- [ ] API service layer in `src/services/` (axios calls to `localhost:3001/api/`)
- [ ] Material UI theme + responsive layout (sidebar/nav)
- [ ] Each page has: list view, create form, edit form, delete confirmation
- [ ] Search + filter on list pages
- [ ] Form validation before submit (required fields, error messages near fields)
- [ ] Loading states (disable form while submitting)
- [ ] User-friendly error messages from API
- [ ] Role-based UI (hide/disable actions the user can't perform)
- [ ] Responsive design (works on mobile + desktop via `react-responsive`)

### Folder structure to follow

```
frontend/src/
├── components/       # Reusable UI components (NavBar, DataTable, FormField, etc.)
├── pages/            # One file per page/route
├── services/         # API calls (authService.js, employeeService.js, etc.)
├── context/          # AuthContext for JWT + role state
└── App.jsx           # Router setup
```

---

## Step 3 — Testing

### Backend (per service)

```sh
# Test locally via proxy
curl -X GET http://localhost:3001/api/<service-name>
curl -X POST http://localhost:3001/api/<service-name> \
     -H "Content-Type: application/json" \
     -d '{"field": "value"}'
```

### Coverage targets

| Area              | Target |
|-------------------|--------|
| Backend functions | 80%+   |
| Frontend components | 80%+ |
| API endpoints     | 90%+   |
| Error handling    | 90%+   |
| Critical E2E paths | 100%  |

---

## Step 4 — Deploy to AWS

```sh
# Deploy backend (Lambda functions + Aurora)
./bin/deploy-backend.sh

# Deploy frontend (S3 + CloudFront)
./bin/deploy-frontend.sh
```

After deploy, you'll get a CloudFront URL for the frontend and Lambda URLs for the backend.

---

## Step 5 — Clean Up

```sh
./bin/clean-up.sh
```

> Warning: removes ALL AWS resources. Cannot be undone.

---

## Evaluation Checklist

- [ ] All 6 backend services deployed and responding
- [ ] All API endpoints return correct HTTP status codes
- [ ] JWT auth works — login, token validation, expiry
- [ ] RBAC enforced on backend endpoints
- [ ] All frontend pages render correctly
- [ ] Forms validate input and show errors
- [ ] Search/filter works on list pages
- [ ] Responsive design works on mobile
- [ ] No console errors in browser
- [ ] Frontend deployed to CloudFront URL
- [ ] Backend accessible via Lambda URLs
- [ ] Tests written and passing

---

## Quick Reference

| Task                        | Command                          |
|-----------------------------|----------------------------------|
| Start local dev             | `./bin/start-dev.sh`             |
| Deploy backend to AWS       | `./bin/deploy-backend.sh`        |
| Deploy frontend to AWS      | `./bin/deploy-frontend.sh`       |
| Tail Lambda logs (local)    | `AWS_ENDPOINT_URL=http://localhost:4566 aws logs tail /aws/lambda/<fn-name> --follow` |
| Tail Lambda logs (cloud)    | `aws logs tail /aws/lambda/<fn-name> --follow` |
| Clean up all AWS resources  | `./bin/clean-up.sh`              |
