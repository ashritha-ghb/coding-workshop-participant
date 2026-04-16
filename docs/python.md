# Python Backend — What It Is and What We Did With It

## What is Python?

Python is a programming language known for being readable and beginner-friendly.
We used Python to write the server-side logic — the code that runs on AWS
and handles all the business rules.

**Simple analogy:** If React is the front desk of a hotel (what guests see),
Python is the staff working behind the scenes — checking reservations,
processing payments, managing rooms.

---

## What is a Lambda Function?

A Lambda function is a Python program that runs in the cloud (on AWS).
It runs only when someone makes a request to it, then stops.
You do not need to manage any server — AWS handles everything.

**Simple analogy:** A Lambda function is like a vending machine.
It sits idle until someone presses a button (makes a request),
does its job (returns a snack/data), then goes back to waiting.

---

## Our 6 Lambda Functions

We have one Python file per feature. Each file is called `function.py`.

### 1. Auth (`backend/auth/function.py`)
Handles user accounts.
- `POST /register` — creates a new user, hashes the password, returns a token
- `POST /login` — checks password, returns a token
- `POST /refresh` — returns a new token using the old one
- `GET /me` — returns the current user's profile

### 2. Employees (`backend/employees/function.py`)
Manages employee profiles.
- `GET /employees` — list all employees (with search and filter)
- `GET /employees/42` — get one employee by ID
- `POST /employees` — create a new employee
- `PUT /employees/42` — update an employee
- `DELETE /employees/42` — delete an employee (admin only)

### 3. Performance Reviews (`backend/performance-reviews/function.py`)
Tracks review history and ratings.
- Same CRUD pattern as employees
- Ratings: `exceeds_expectations`, `meets_expectations`, `needs_improvement`, `unsatisfactory`

### 4. Development Plans (`backend/development-plans/function.py`)
Tracks career goals and progress.
- Same CRUD pattern
- Has `progress_pct` (0-100) and `status` fields

### 5. Competencies (`backend/competencies/function.py`)
Tracks skill levels and gaps.
- Same CRUD pattern
- `current_level` and `target_level` are 1-5
- `gap` is auto-calculated: `target_level - current_level`

### 6. Training Records (`backend/training-records/function.py`)
Tracks courses, certifications, workshops.
- Same CRUD pattern
- Has `status`: enrolled, in_progress, completed, dropped

---

## Shared Code (`backend/common/`)

Instead of copying the same code into all 6 services, we put shared code in `common/`.

### `common/db.py` — Database Connection
Connects to PostgreSQL. Reuses the connection across requests (connection pooling).
If the connection fails, it resets and tries again next time.

### `common/auth.py` — JWT and Role Checking
- `create_token()` — creates a JWT token after login
- `verify_token()` — checks if a token is valid and not expired
- `require_role()` — checks if the caller has the minimum required role
- `ok()` — returns a successful HTTP response
- `err()` — returns an error HTTP response

---

## How a Lambda Function Works — Step by Step

When someone calls `POST /employees`:

1. AWS receives the HTTP request and triggers `employees/function.py`
2. The `handler()` function runs
3. It calls `_ensure_table()` — creates the employees table if it doesn't exist yet
4. It reads the HTTP method (POST) and path (/employees)
5. It calls `_create(event)` because method is POST
6. `_create` calls `require_role(event, "manager")` — checks the JWT token
7. If role is insufficient, returns 403 immediately
8. Otherwise, reads the request body (employee data)
9. Validates required fields (employee_code, full_name, email)
10. Runs `INSERT INTO employees ...` to save to PostgreSQL
11. Returns the new employee record with status 201

---

## Password Security

Passwords are never stored in plain text. We use **argon2** hashing.

Hashing is a one-way process — you can turn a password into a hash,
but you cannot turn a hash back into a password.

When you register: `password → hash → stored in database`
When you login: `password → hash → compared to stored hash`

If the hashes match, the password is correct. The original password
is never stored anywhere.

---

## How to Test Python Locally

Make sure the dev environment is running (`./bin/start-dev.sh`).

Test any endpoint with curl:

```sh
# Register a user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@acme.com","password":"Test1234!","full_name":"Test User","role":"manager"}'

# Login and save the token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@acme.com","password":"Test1234!"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# List employees using the token
curl http://localhost:3001/api/employees \
  -H "Authorization: Bearer $TOKEN"

# Create an employee
curl -X POST http://localhost:3001/api/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"employee_code":"EMP001","full_name":"Jane Smith","email":"jane@acme.com","department":"Engineering"}'
```

---

## Running Unit Tests

```sh
pip install pytest psycopg[binary] argon2-cffi
pytest backend/tests/ -v
```

This runs 30 tests covering:
- Token creation and expiry
- Role checking
- Input validation
- CRUD operations with mocked database
