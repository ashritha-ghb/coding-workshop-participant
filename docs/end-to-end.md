# End to End — How Everything Works Together

This document traces a complete user journey from opening the browser
to seeing data on screen. Read this to understand how all the pieces connect.

---

## The Full Picture

```
Your Browser
    │
    ▼
CloudFront (https://d2uu9oauk54q2c.cloudfront.net)
    │
    ├── /  →  S3 Bucket  →  React App (HTML/CSS/JS)
    │
    └── /api/*  →  Lambda Functions  →  Aurora PostgreSQL
```

---

## Journey 1 — Opening the App

1. You type `https://d2uu9oauk54q2c.cloudfront.net` in your browser
2. Your browser asks CloudFront for the page
3. CloudFront fetches `index.html` from the S3 bucket
4. Your browser downloads the React JavaScript bundle
5. React starts running in your browser
6. React checks `localStorage` for a saved token
7. No token found → React shows the Login page

**Files involved:**
- `frontend/src/main.jsx` — React entry point
- `frontend/src/App.jsx` — sets up routing, checks auth
- `frontend/src/context/AuthContext.jsx` — checks for saved token
- `frontend/src/pages/Login.jsx` — renders the login form

---

## Journey 2 — Registering an Account

1. You click "Don't have an account? Create one"
2. React shows the Register page
3. You fill in name, email, password, role and click Create Account
4. React validates the form (checks required fields, email format, password length)
5. React calls `POST /api/auth/register` with the form data
6. CloudFront routes `/api/auth` to the auth Lambda
7. Lambda runs `backend/auth/function.py`
8. Lambda calls `_ensure_table()` — creates the `users` table if needed
9. Lambda hashes the password using argon2
10. Lambda runs `INSERT INTO users ...` to save to Aurora
11. Lambda creates a JWT token containing your user ID, email, and role
12. Lambda returns `{ token: "eyJ...", user: { id: 1, email: "...", role: "admin" } }`
13. React saves the token to `localStorage`
14. React redirects you to the Login page

**Files involved:**
- `frontend/src/pages/Register.jsx`
- `frontend/src/services/api.js`
- `backend/auth/function.py` → `_register()`
- `backend/common/db.py` → `run_query()`
- `backend/common/auth.py` → `create_token()`

---

## Journey 3 — Logging In

1. You enter email and password and click Sign In
2. React validates the form
3. React calls `POST /api/auth/login`
4. Lambda checks the email exists in the database
5. Lambda verifies the password hash matches
6. Lambda creates a new JWT token
7. Lambda returns the token and user data
8. React saves the token to `localStorage`
9. React sets the user in `AuthContext`
10. React redirects to the Dashboard

**Files involved:**
- `frontend/src/pages/Login.jsx`
- `frontend/src/context/AuthContext.jsx` → `login()`
- `backend/auth/function.py` → `_login()`

---

## Journey 4 — Viewing the Dashboard

1. React renders the Dashboard page
2. Dashboard calls 4 APIs simultaneously:
   - `GET /api/performance-reviews`
   - `GET /api/development-plans`
   - `GET /api/competencies?has_gap=true`
   - `GET /api/training-records`
   - `GET /api/employees` (if manager or admin)
3. Each request includes `Authorization: Bearer <token>` in the header
4. Each Lambda verifies the token and checks the role
5. Each Lambda queries Aurora and returns the data
6. Dashboard shows stat cards with the counts
7. Dashboard shows recent reviews and skill gaps

**Files involved:**
- `frontend/src/pages/Dashboard.jsx`
- All 5 Lambda functions
- `backend/common/auth.py` → `require_role()`

---

## Journey 5 — Creating an Employee

1. You click "Add Employee" button (only visible to managers and admins)
2. A dialog (popup form) appears
3. You fill in employee code, name, email, department, etc.
4. You click Save
5. React validates the form
6. React calls `POST /api/employees` with the form data
7. The employees Lambda runs
8. Lambda calls `require_role(event, "manager")` — checks your role
9. Lambda validates required fields
10. Lambda runs `INSERT INTO employees ...`
11. Lambda returns the new employee with status 201
12. React closes the dialog and adds the employee to the list

**Files involved:**
- `frontend/src/pages/Employees.jsx`
- `backend/employees/function.py` → `_create()`
- `backend/common/auth.py` → `require_role()`
- `backend/common/db.py` → `run_query()`

---

## Journey 6 — Logging Out

1. You click your avatar (top right)
2. A dropdown menu appears with "Sign out"
3. You click Sign out
4. React calls `logout()` from `AuthContext`
5. `logout()` removes the token from `localStorage`
6. `logout()` calls `window.location.replace('/login')`
7. The page fully reloads and shows the Login page
8. The token is gone — you are logged out

**Files involved:**
- `frontend/src/components/Layout.jsx`
- `frontend/src/context/AuthContext.jsx` → `logout()`

---

## How Role Checking Works

Every Lambda function that requires authentication calls `require_role()`.

```python
# In employees/function.py
def _create(event):
    require_role(event, "manager")  # minimum role required
    ...
```

`require_role()` in `common/auth.py`:
1. Reads the `Authorization` header from the request
2. Extracts the token (`Bearer eyJ...`)
3. Verifies the token signature
4. Checks the token has not expired
5. Reads the role from the token payload
6. Compares role rank: `admin(3) > manager(2) > contributor(1) > viewer(0)`
7. If caller's rank < required rank → raises `PermissionError` → returns 403
8. If caller's rank >= required rank → returns the token payload

---

## Local Development vs Production

Everything works the same way locally and in production.
The only difference is where things run:

| Component | Local | Production |
|-----------|-------|------------|
| React | Vite dev server on port 3000 | S3 + CloudFront |
| API routing | Node.js proxy on port 3001 | CloudFront |
| Lambda | LocalStack (fake AWS) | Real AWS Lambda |
| Database | Local PostgreSQL | AWS Aurora |

The proxy (`bin/proxy-server.js`) on port 3001 maps:
- `/api/auth/*` → auth Lambda URL
- `/api/employees/*` → employees Lambda URL
- etc.

In production, CloudFront does this routing automatically.

---

## What Happens When Something Goes Wrong

**Wrong password:**
Lambda returns `{ "error": "Invalid credentials" }` with status 401.
React shows a red alert: "Login failed. Check your credentials."

**Missing required field:**
Lambda returns `{ "error": "Missing required fields: employee_code" }` with status 400.
React shows the error message next to the relevant field.

**Insufficient role:**
Lambda returns `{ "error": "Role 'viewer' cannot perform this action" }` with status 403.
React shows a red alert.

**Database unavailable:**
Lambda returns `{ "error": "Database unavailable" }` with status 500.
This happens when Aurora is cold-starting (first request after idle period).
Wait 30 seconds and try again.

**Token expired:**
Lambda returns 401. React's axios interceptor catches this,
removes the token from localStorage, and redirects to the login page.
