# Evaluation Q&A — Everything You Need to Know

Read this fully before your presentation. Practice saying these answers out loud.

---

## HIGH LEVEL ARCHITECTURE

**Q: Explain the high level architecture.**

The application has three layers:

1. **Frontend** — React app built with Vite, served from AWS S3 via CloudFront CDN
2. **Backend** — 6 Python Lambda functions, each handling one domain
3. **Database** — PostgreSQL on AWS Aurora Serverless

```
User's Browser
      │
      ▼
CloudFront (https://d2uu9oauk54q2c.cloudfront.net)
      │
      ├── /* (frontend)  →  S3 Bucket  →  React HTML/CSS/JS
      │
      └── /api/* (backend)  →  Lambda Functions  →  Aurora PostgreSQL
```

When a user opens the website, CloudFront serves the React app from S3.
When React makes an API call (like login or fetch employees), CloudFront
routes it to the correct Lambda function. The Lambda queries Aurora and
returns the data.

---

## WORKFLOW

**Q: Explain the workflow of the application.**

1. User opens the website URL
2. React app loads in the browser
3. User registers or logs in
4. On login, the backend verifies credentials and returns a JWT token
5. React stores the token and uses it for all future API calls
6. User navigates to any page — React calls the relevant Lambda
7. Lambda checks the token, checks the role, queries the database
8. Data is returned and displayed in the UI
9. User can create, edit, delete records based on their role
10. On logout, the token is removed and the user is redirected to login

---

## TECH STACK

**Q: What is your tech stack?**

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React.js + Material UI + React Responsive | Industry standard, component-based, responsive |
| Backend | Python on AWS Lambda | Workshop requirement, serverless, scalable |
| Database | PostgreSQL on AWS Aurora | Relational data, managed service, auto-scaling |
| Infrastructure | Terraform | Infrastructure as Code, repeatable deployments |
| Hosting | AWS S3 + CloudFront | Static hosting, global CDN, HTTPS |
| Version Control | Git + GitHub | Code history, collaboration |

**Q: Did you use FastAPI?**

No. We did not use FastAPI or any web framework. Each Lambda function is a
plain Python file with a `handler()` function. AWS Lambda calls this function
directly when a request comes in. The handler reads the HTTP method and path
from the event object and routes to the appropriate internal function.

This is intentional — Lambda functions do not need a web framework because
AWS handles the HTTP layer. Adding FastAPI would add unnecessary overhead
and cold start time.

---

## AUTHENTICATION

**Q: How does authentication work?**

We use JWT (JSON Web Token) based authentication.

Step by step:
1. User submits email and password
2. Backend looks up the user by email in the database
3. Backend verifies the password using argon2 hash comparison
4. If correct, backend creates a JWT token containing: user ID, email, role, expiry time
5. Token is signed with a secret key using HMAC-SHA256
6. Token is returned to the frontend
7. Frontend stores it in localStorage
8. Every subsequent API request includes: `Authorization: Bearer <token>`
9. Each Lambda verifies the token signature and checks expiry before processing

**Q: What technology did you use for authentication?**

JWT (JSON Web Token) for session management.
Argon2 (via argon2-cffi library) for password hashing.
We implemented JWT ourselves using Python's built-in `hmac` and `hashlib`
libraries — no external JWT library needed.

**Q: How did you do user authentication?**

- Registration: password is hashed with argon2 before saving to database
- Login: entered password is hashed and compared to stored hash
- If hashes match, a signed JWT token is issued
- Token contains role information so every Lambda knows who is calling
- Token expires after 1 hour for security

**Q: Is the password stored in plain text?**

No. Never. Passwords are hashed using argon2 before storage.
Hashing is one-way — you cannot reverse a hash to get the original password.
Even if someone accessed the database, they could not read the passwords.

---

## DATABASE SCHEMA

**Q: How did you create the schema?**

Each Lambda function creates its own table automatically on first invocation
using `CREATE TABLE IF NOT EXISTS`. No separate migration script is needed.

The tables are:

**users table** (created by auth service):
```sql
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    role        VARCHAR(50) NOT NULL DEFAULT 'viewer',
    created_at  TIMESTAMP DEFAULT NOW()
)
```

**employees table**:
```sql
CREATE TABLE IF NOT EXISTS employees (
    id                SERIAL PRIMARY KEY,
    employee_code     VARCHAR(50) UNIQUE NOT NULL,
    full_name         VARCHAR(255) NOT NULL,
    email             VARCHAR(255) UNIQUE NOT NULL,
    department        VARCHAR(100),
    job_title         VARCHAR(100),
    manager_id        INTEGER REFERENCES employees(id),
    hire_date         DATE,
    employment_status VARCHAR(50) DEFAULT 'active',
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW()
)
```

Similar tables exist for performance_reviews, development_plans,
competencies, and training_records.

**Q: Did you hardcode the database credentials?**

No. Never hardcoded. Terraform injects the database credentials as
environment variables into each Lambda function:

```
POSTGRES_HOST = <aurora endpoint>
POSTGRES_PORT = 5432
POSTGRES_NAME = <database name>
POSTGRES_USER = <username>
POSTGRES_PASS = <password>
IS_LOCAL      = false
```

The Python code reads them with `os.environ.get("POSTGRES_HOST")`.
This is the standard secure practice — credentials are never in the code.

**Q: How did you create the employee database (emp_db)?**

We did not create a separate database for employees. All tables live in
the same PostgreSQL database. The `employees` table is created automatically
when the employees Lambda function receives its first request.

---

## ENVIRONMENT VARIABLES

**Q: How did you configure environment variables?**

**For local development:**
The `bin/generate-env.sh` script reads Terraform outputs and creates
`frontend/.env.local` with the API URL and Lambda endpoints.
Lambda functions running in LocalStack get environment variables
injected by Terraform via `infra/locals.tf`.

**For production (AWS):**
Terraform reads the Aurora cluster endpoint after creating it and
automatically passes it to each Lambda as an environment variable.
No manual configuration needed.

**Key environment variables:**
```
IS_LOCAL=true/false          — switches between local and cloud behavior
POSTGRES_HOST                — database server address
POSTGRES_PORT=5432           — database port
POSTGRES_NAME                — database name
POSTGRES_USER                — database username
POSTGRES_PASS                — database password
VITE_API_URL                 — frontend API base URL
```

---

## WHERE DATA IS STORED

**Q: Where is your data getting stored?**

**In production:** AWS Aurora PostgreSQL in the `ap-south-1` (Mumbai) region.
Aurora is a managed database service — Amazon handles storage, backups,
and availability. Data persists permanently.

**Locally:** PostgreSQL running on the VDI at `localhost:5432`.
Data persists as long as PostgreSQL is running on the VDI.

---

## BACKEND PORT

**Q: Which port is the backend running on?**

**Locally:** The Lambda functions run inside LocalStack (fake AWS) on port 4566.
A Node.js proxy server runs on port 3001 and forwards requests from the
React frontend to the correct Lambda URL.

So from the frontend's perspective, the backend is at `http://localhost:3001`.

**In production:** No port number — the backend runs on AWS Lambda with
HTTPS URLs. CloudFront routes `/api/*` requests to the Lambda functions.

---

## SEARCH AND FILTER

**Q: How did you implement search and filter?**

**Backend:** Each list endpoint accepts query parameters.
The Python code builds a dynamic SQL WHERE clause based on what parameters are provided.

Example for employees:
```python
conditions = []
values = []

if search:
    conditions.append("(full_name ILIKE %s OR email ILIKE %s OR employee_code ILIKE %s)")
    values.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

if department:
    conditions.append("department ILIKE %s")
    values.append(f"%{department}%")

where = "WHERE " + " AND ".join(conditions) if conditions else ""
rows = run_query(f"SELECT * FROM employees {where} ORDER BY full_name", values, fetch=True)
```

`ILIKE` is PostgreSQL's case-insensitive LIKE — so searching "smith" finds "Smith" and "SMITH".

**Frontend:** Search fields and filter dropdowns are on every list page.
When the user types or selects a filter, React re-fetches the data with
the new query parameters. The filtering happens on the server (database),
not in the browser — this is more efficient for large datasets.

---

## TEST CASES

**Q: What test cases did you build?**

We have 30 unit tests in `backend/tests/`.

**Auth tests (12 tests):**
- Token creation produces a valid 3-part JWT
- Token payload contains correct user ID, email, role
- Expired token raises ValueError
- Tampered token raises ValueError (signature mismatch)
- Malformed token raises ValueError
- Admin role outranks all other roles
- require_role passes for sufficient role
- require_role raises PermissionError for insufficient role
- Missing Authorization header raises ValueError
- ok() returns 200 by default
- err() returns 400 by default
- ok() accepts custom status code

**Employee tests (7 tests):**
- List returns employees correctly
- List requires authentication (no token = 401)
- Create succeeds with valid data (returns 201)
- Create fails when required fields are missing (returns 400)
- Create is blocked for viewer role (returns 403)
- Delete requires admin role (manager gets 403)
- Delete returns 404 when employee not found

**Competency tests (3 tests):**
- Invalid current_level (6) is rejected
- Invalid category is rejected
- Valid competency is created with correct gap calculation

**Performance review tests (8 tests):**
- Invalid rating is rejected
- Missing required fields returns 400
- Viewer cannot create reviews (403)
- List returns reviews correctly
- Viewer only sees own reviews
- Delete requires admin role

**Development plan tests (4 tests):**
- Invalid status is rejected
- Progress percentage > 100 is rejected
- Viewer cannot create plans (403)
- Valid plan is created with status 201

**Q: Where did you run the test cases?**

On the local machine using pytest:
```sh
cd ~/coding-workshop-participant
pytest backend/tests/ -v
```

All 30 tests pass. The tests use mocking — the database is not actually
called during tests. We mock `run_query` to return fake data, so tests
run fast and do not need a real database connection.

**Q: How will you test the API?**

Three ways:

1. **Unit tests** — pytest with mocked database (30 tests, run locally)

2. **Manual API testing with curl:**
```sh
# Get a token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"Admin1234!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Test an endpoint
curl http://localhost:3001/api/employees -H "Authorization: Bearer $TOKEN"
```

3. **Browser testing** — open the app, use all features, check the
   Network tab in DevTools to see API calls and responses.

---

## PURPOSE OF EACH FILE

**Q: Explain the purpose of each file.**

**Backend:**
```
backend/common/db.py          — PostgreSQL connection pooling, shared by all services
backend/common/auth.py        — JWT creation/verification, role checking, response helpers
backend/auth/function.py      — Login, register, token refresh, get current user
backend/employees/function.py — Employee CRUD with search and filter
backend/performance-reviews/function.py — Review CRUD with rating validation
backend/development-plans/function.py  — Plan CRUD with progress tracking
backend/competencies/function.py       — Skill CRUD with gap auto-calculation
backend/training-records/function.py   — Training CRUD with status tracking
backend/tests/test_auth.py    — 12 unit tests for JWT and role logic
backend/tests/test_employees.py — 7 unit tests for employee CRUD
backend/tests/test_competencies.py — 3 unit tests for competency validation
backend/tests/test_performance_reviews.py — 8 unit tests for review logic
backend/tests/test_development_plans.py — 4 unit tests for plan validation
```

**Frontend:**
```
frontend/src/main.jsx              — React entry point, wraps app with providers
frontend/src/App.jsx               — Router setup, protected routes
frontend/src/theme.js              — MUI color theme and component styles
frontend/src/context/AuthContext.jsx — JWT storage, login/logout, role checking
frontend/src/services/api.js       — Axios client with token injection and 401 handling
frontend/src/components/Layout.jsx — Sidebar + AppBar that wraps all pages
frontend/src/components/DataTable.jsx — Reusable table used on every list page
frontend/src/components/ConfirmDialog.jsx — Delete confirmation popup
frontend/src/pages/Login.jsx       — Login form
frontend/src/pages/Register.jsx    — Registration form with role selection
frontend/src/pages/Dashboard.jsx   — Stats overview, recent reviews, skill gaps
frontend/src/pages/Employees.jsx   — Employee list with search, CRUD
frontend/src/pages/EmployeeDetail.jsx — Single employee profile with reviews and plans
frontend/src/pages/PerformanceReviews.jsx — Review list with rating filter, CRUD
frontend/src/pages/DevelopmentPlans.jsx   — Plan list with progress bars, CRUD
frontend/src/pages/Competencies.jsx       — Skill list with gap filter, CRUD
frontend/src/pages/TrainingRecords.jsx    — Training list with status filter, CRUD
```

**Infrastructure:**
```
infra/lambda.tf     — Creates all 6 Lambda functions (auto-discovered from backend/)
infra/rds.tf        — Creates Aurora PostgreSQL cluster
infra/s3.tf         — Creates S3 bucket for frontend
infra/cloudfront.tf — Creates CloudFront distribution
infra/locals.tf     — Shared logic: discovers services, builds env vars
infra/variable.tf   — Input variables: project name, participant ID
infra/output.tf     — Prints URLs after deployment
```

**Scripts:**
```
bin/start-dev.sh        — Starts full local environment (PostgreSQL, LocalStack, React)
bin/deploy-backend.sh   — Deploys Lambda + Aurora to real AWS
bin/deploy-frontend.sh  — Builds React and deploys to S3 + CloudFront
bin/generate-env.sh     — Creates frontend/.env.local with API URLs
bin/proxy-server.js     — Local CORS proxy: routes /api/* to Lambda URLs
bin/clean-up.sh         — Destroys all AWS resources
```

---

## MOBILE RESPONSIVENESS

**Q: Did you open the website on mobile?**

Yes. The app is responsive — it works on both mobile and desktop.

On desktop: permanent sidebar always visible on the left.
On mobile: sidebar is hidden. A hamburger menu button (☰) appears in the
top bar. Clicking it opens the sidebar as an overlay.

This is implemented using:
- `react-responsive` library to detect screen size
- MUI's `useMediaQuery` hook to switch between permanent and temporary drawer
- MUI's responsive Grid system for the dashboard stat cards

---

## DASHBOARD

**Q: Explain the dashboard for HR, employee, and manager.**

The dashboard adapts based on the logged-in user's role:

**Admin / Manager sees:**
- Total Employees count
- Performance Reviews count
- Development Plans count
- Training Records count
- Recent Reviews list with ratings
- Skill Gaps widget showing employees with gaps
- Recently Completed Training

**Contributor / Viewer sees:**
- Their own Performance Reviews count
- Their own Development Plans count
- Their own Training Records count
- Their own recent reviews
- Their own skill gaps

The dashboard calls all APIs simultaneously (parallel requests) for fast loading.
Empty states show helpful messages when no data exists yet.

---

## FUNCTIONALITIES WALKTHROUGH

**Q: Explain all the functionalities.**

**1. Authentication**
- Register with name, email, password, role
- Login returns JWT token
- Token auto-refreshes before expiry
- Logout clears token and redirects to login

**2. Employees (Admin/Manager only)**
- View all employees in a searchable table
- Search by name, email, or employee code
- Filter by department or employment status
- Add new employee with all profile fields
- Edit existing employee details
- Delete employee (admin only)
- Click employee to see their full profile with reviews and plans

**3. Performance Reviews**
- View reviews (own reviews for viewer/contributor, all for manager/admin)
- Filter by rating or year
- Create review with rating, period, year, strengths, areas to improve, goals
- Edit review
- Delete review (admin only)

**4. Development Plans**
- View plans with progress bars
- Filter by status (not started, in progress, completed, on hold)
- Create plan with title, target role, dates, milestones
- Update progress percentage
- Edit and delete plans

**5. Competencies**
- View skills with current and target levels
- Filter by category (technical, leadership, communication, etc.)
- Toggle "Gaps only" to see only skills below target
- Add skill with star rating for current and target level
- Gap is automatically calculated and shown with warning icon

**6. Training Records**
- View training history
- Filter by status (enrolled, in progress, completed, dropped)
- Filter by type (course, workshop, certification, conference, etc.)
- Add training with provider, dates, score, certificate URL
- Mark as completed

---

## HOW EACH LAYER WORKS

**Q: How is each layer working?**

**Frontend layer (React):**
- Runs in the user's browser
- Manages UI state (form data, loading states, error messages)
- Makes HTTP requests to the backend via axios
- Reads the JWT token from localStorage and attaches it to every request
- Renders different UI based on the user's role

**Backend layer (Python Lambda):**
- Runs on AWS Lambda, triggered by HTTP requests
- Validates the JWT token on every request
- Checks the user's role against the minimum required
- Validates input data (required fields, valid values)
- Executes SQL queries against the database
- Returns JSON responses with appropriate HTTP status codes

**Database layer (PostgreSQL):**
- Stores all data permanently
- Handles concurrent requests safely
- Enforces data integrity (unique constraints, foreign keys)
- Executes SQL queries efficiently with indexes

---

## FUTURE ENHANCEMENTS

**Q: What are the future enhancements?**

1. **Employee dropdown in forms** — currently employee ID is typed manually.
   A dropdown populated from the employees list would be more user-friendly.

2. **Email notifications** — send email when a review is submitted or approved.

3. **Analytics dashboard** — charts showing performance trends over time,
   skill distribution across the organization, attrition risk indicators.

4. **Export to PDF/Excel** — allow managers to export reports.

5. **Bulk import** — upload a CSV to create multiple employees at once.

6. **Audit trail** — log every change with who made it and when.

7. **Performance trend analysis** — compare ratings across review cycles
   to identify high performers and at-risk employees.

8. **Integration with HR systems** — connect to existing payroll or
   directory systems via API.

---

## DEPLOYMENT

**Q: Is deployment on AWS mandatory?**

Yes. The application is deployed on AWS:
- Frontend: https://d2uu9oauk54q2c.cloudfront.net (S3 + CloudFront)
- Backend: 6 Lambda functions in ap-south-1 region
- Database: Aurora PostgreSQL in ap-south-1 region

**Q: How did you deploy?**

```sh
./bin/deploy-backend.sh   # deploys Lambda + Aurora using Terraform
./bin/deploy-frontend.sh  # builds React, uploads to S3, invalidates CloudFront cache
```

---

## SAMPLE DATA / LOGS

**Q: Load a good amount of data.**

To load sample data, run these curl commands after registering an admin:

```sh
# Get token
TOKEN=$(curl -s -X POST https://d2uu9oauk54q2c.cloudfront.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"Admin1234!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Create employees
curl -X POST https://d2uu9oauk54q2c.cloudfront.net/api/employees \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"employee_code":"EMP001","full_name":"Priya Sharma","email":"priya@acme.com","department":"Engineering","job_title":"Senior Developer","hire_date":"2022-03-15","employment_status":"active"}'

curl -X POST https://d2uu9oauk54q2c.cloudfront.net/api/employees \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"employee_code":"EMP002","full_name":"Rahul Verma","email":"rahul@acme.com","department":"HR","job_title":"HR Manager","hire_date":"2021-06-01","employment_status":"active"}'

curl -X POST https://d2uu9oauk54q2c.cloudfront.net/api/employees \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"employee_code":"EMP003","full_name":"Ananya Reddy","email":"ananya@acme.com","department":"Marketing","job_title":"Marketing Lead","hire_date":"2023-01-10","employment_status":"active"}'

# Create performance reviews
curl -X POST https://d2uu9oauk54q2c.cloudfront.net/api/performance-reviews \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"employee_id":1,"review_period":"Q4","review_year":2025,"overall_rating":"exceeds_expectations","strengths":"Excellent problem solving, strong team player","areas_to_improve":"Documentation could be more detailed","goals_next_period":"Lead the new microservices migration","score":92}'

curl -X POST https://d2uu9oauk54q2c.cloudfront.net/api/performance-reviews \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"employee_id":2,"review_period":"Q4","review_year":2025,"overall_rating":"meets_expectations","strengths":"Good communication, reliable","areas_to_improve":"Could take more initiative","goals_next_period":"Complete HR certification","score":78}'

# Create competencies
curl -X POST https://d2uu9oauk54q2c.cloudfront.net/api/competencies \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"employee_id":1,"skill_name":"Python","category":"technical","current_level":4,"target_level":5}'

curl -X POST https://d2uu9oauk54q2c.cloudfront.net/api/competencies \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"employee_id":1,"skill_name":"Leadership","category":"leadership","current_level":2,"target_level":4}'

# Create training records
curl -X POST https://d2uu9oauk54q2c.cloudfront.net/api/training-records \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"employee_id":1,"training_name":"AWS Certified Developer","training_type":"certification","provider":"Amazon","start_date":"2025-09-01","completion_date":"2025-11-15","status":"completed","score":88}'

# Create development plans
curl -X POST https://d2uu9oauk54q2c.cloudfront.net/api/development-plans \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"employee_id":1,"title":"Become a Tech Lead","target_role":"Tech Lead","start_date":"2025-01-01","target_date":"2026-06-30","status":"in_progress","progress_pct":45,"milestones":"Complete AWS cert, Lead one project, Mentor 2 juniors"}'
```

---

## QUICK SUMMARY FOR PRESENTATION

**In 2 minutes, say this:**

"We built a web application for ACME Inc. to centralize employee performance management.

The frontend is React with Material UI, deployed on AWS CloudFront.
The backend is 6 Python Lambda functions — one each for auth, employees,
performance reviews, development plans, competencies, and training records.
The database is PostgreSQL on AWS Aurora.
Infrastructure is managed with Terraform.

Authentication uses JWT tokens with argon2 password hashing.
We have role-based access control with 4 roles — admin, manager, contributor, viewer.
Each role sees different features and has different permissions enforced on the backend.

We have 30 unit tests covering authentication, CRUD operations, and role enforcement.

The live application is at https://d2uu9oauk54q2c.cloudfront.net"
