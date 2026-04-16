# Local Testing — How to Run and Test Everything on Your Laptop

## Prerequisites

Make sure these are installed on the VDI:
- Node.js (for React)
- Python 3.11+ (for backend)
- PostgreSQL (database)
- Docker (for LocalStack)
- LocalStack CLI

All of these are pre-installed on the workshop VDI.

---

## Step 1 — Start Everything

Open a terminal and run:

```sh
cd ~/coding-workshop-participant
./bin/start-dev.sh
```

This script does 5 things automatically:
1. Checks PostgreSQL is running
2. Checks MongoDB is running
3. Starts LocalStack (fake AWS) in Docker
4. Deploys all 6 Lambda functions to LocalStack using Terraform
5. Starts the React dev server

When it finishes you will see:
```
Frontend: http://localhost:3000
Backend:  http://localhost:3001
```

---

## Step 2 — Open the App in Browser

Open http://localhost:3000

You should see the Login page.

---

## Step 3 — Create Your First Account

Open a new terminal tab and run:

```sh
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"Admin1234!","full_name":"Admin User","role":"admin"}'
```

You should see a response with a token:
```json
{"token": "eyJ...", "user": {"id": 1, "email": "admin@acme.com", "role": "admin"}}
```

---

## Step 4 — Log In via the Browser

Go to http://localhost:3000
Enter `admin@acme.com` and `Admin1234!`
Click Sign In

You should see the Dashboard.

---

## Testing Each Feature

### Test Employees
1. Click **Employees** in the sidebar
2. Click **Add Employee**
3. Fill in: Code=EMP001, Name=Jane Smith, Email=jane@acme.com
4. Click Save
5. Jane Smith should appear in the table
6. Click the edit (pencil) icon → change department → Save
7. The change should reflect in the table

### Test Performance Reviews
1. Click **Performance Reviews**
2. Click **New Review**
3. Enter Employee ID=1, Period=Q4, Year=2025, Rating=meets_expectations
4. Click Save
5. The review should appear in the table

### Test Development Plans
1. Click **Development Plans**
2. Click **New Plan**
3. Enter Employee ID=1, Title=Become Senior Engineer, Progress=25
4. Click Save
5. The plan should appear with a progress bar showing 25%

### Test Competencies
1. Click **Competencies**
2. Click **Add Competency**
3. Enter Employee ID=1, Skill=Python, Current Level=3 stars, Target Level=5 stars
4. Click Save
5. The record should show Gap=2 levels with a warning icon

### Test Training Records
1. Click **Training Records**
2. Click **Add Record**
3. Enter Employee ID=1, Training=AWS Certified Developer, Status=completed
4. Click Save

### Test Role-Based Access
1. Click your avatar → Sign out
2. Go to http://localhost:3000/register
3. Create a new account with role=viewer
4. Log in as viewer
5. Notice: no Employees menu, no Add buttons, no Edit/Delete icons
6. Sign out, log in as admin again — all buttons are back

---

## Testing the API Directly with curl

You can test any endpoint directly without using the browser.

### Get a token first:
```sh
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"Admin1234!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "Token: $TOKEN"
```

### Test each service:
```sh
# List employees
curl http://localhost:3001/api/employees \
  -H "Authorization: Bearer $TOKEN"

# List reviews
curl http://localhost:3001/api/performance-reviews \
  -H "Authorization: Bearer $TOKEN"

# List plans
curl http://localhost:3001/api/development-plans \
  -H "Authorization: Bearer $TOKEN"

# List competencies
curl http://localhost:3001/api/competencies \
  -H "Authorization: Bearer $TOKEN"

# List training records
curl http://localhost:3001/api/training-records \
  -H "Authorization: Bearer $TOKEN"
```

### Test role enforcement:
```sh
# Register a viewer
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@acme.com","password":"Viewer1234!","full_name":"Viewer","role":"viewer"}'

# Get viewer token
VIEWER_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@acme.com","password":"Viewer1234!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Try to create an employee as viewer — should return 403
curl -X POST http://localhost:3001/api/employees \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"employee_code":"EMP999","full_name":"Test","email":"test@acme.com"}'
```
Expected response: `{"error": "Role 'viewer' cannot perform this action"}`

---

## Running Unit Tests

```sh
cd ~/coding-workshop-participant
pip install pytest psycopg[binary] argon2-cffi
pytest backend/tests/ -v
```

Expected output:
```
backend/tests/test_auth.py::TestTokenCreation::test_creates_three_part_token PASSED
backend/tests/test_auth.py::TestTokenCreation::test_expired_token_raises PASSED
... (30 tests total)
30 passed in 1.2s
```

---

## Checking Logs

If something is not working, check the Lambda logs:

```sh
# View auth Lambda logs
AWS_ENDPOINT_URL="http://localhost:4566" AWS_REGION=us-east-1 \
  aws logs tail /aws/lambda/coding-workshop-auth-abcd1234 --format short

# View employees Lambda logs
AWS_ENDPOINT_URL="http://localhost:4566" AWS_REGION=us-east-1 \
  aws logs tail /aws/lambda/coding-workshop-employees-abcd1234 --format short
```

---

## Common Issues and Fixes

**"Database unavailable" error:**
PostgreSQL is not running. Run `./bin/start-dev.sh` again.

**"Function not found" error:**
Lambda functions are not deployed. Run `./bin/deploy-backend.sh local`.

**Login not working in browser:**
Clear localStorage: F12 → Application → Local Storage → delete `acme_token`.
Then try again.

**React page not loading:**
Check if Vite is running: `ps aux | grep vite`
If not, run: `cd frontend && npm run dev`

**Port 3000 already in use:**
Vite will use port 3001, 3002, etc. automatically.
Check which port it started on in the terminal output.
