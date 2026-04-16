# API Reference

All endpoints require `Authorization: Bearer <token>` unless noted.

Base URL (local): `http://localhost:3001/api`  
Base URL (production): `https://d2uu9oauk54q2c.cloudfront.net/api`

---

## Auth

### POST /auth/register
Create a new user account. No token required.

**Body:**
```json
{
  "email": "user@acme.com",
  "password": "minimum8chars",
  "full_name": "Jane Smith",
  "role": "viewer"
}
```
Roles: `admin`, `manager`, `contributor`, `viewer`

**Response 201:**
```json
{
  "token": "eyJ...",
  "user": { "id": 1, "email": "...", "full_name": "...", "role": "viewer" }
}
```

---

### POST /auth/login
```json
{ "email": "user@acme.com", "password": "yourpassword" }
```
Returns same shape as register. Status 401 if credentials are wrong.

---

### GET /auth/me
Returns the current user's profile. Useful for validating a stored token.

---

### POST /auth/refresh
Returns a new token using the current one. Call this before expiry to keep the session alive.

---

## Employees

Minimum role to read: `viewer`  
Minimum role to create/update: `manager`  
Minimum role to delete: `admin`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/employees` | List all employees |
| GET | `/employees/:id` | Get one employee |
| POST | `/employees` | Create employee |
| PUT | `/employees/:id` | Update employee |
| DELETE | `/employees/:id` | Delete employee |

**Query params for GET /employees:**
- `search` — matches name, email, or employee code
- `department` — filter by department
- `status` — filter by employment status

---

## Performance Reviews

Minimum role to read: `viewer` (own records only for viewer/contributor)  
Minimum role to create/update: `manager`  
Minimum role to delete: `admin`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/performance-reviews` | List reviews |
| GET | `/performance-reviews/:id` | Get one review |
| POST | `/performance-reviews` | Create review |
| PUT | `/performance-reviews/:id` | Update review |
| DELETE | `/performance-reviews/:id` | Delete review |

**Valid ratings:** `exceeds_expectations`, `meets_expectations`, `needs_improvement`, `unsatisfactory`

---

## Development Plans

Minimum role to read: `viewer`  
Minimum role to create/update: `contributor`  
Minimum role to delete: `manager`

Same CRUD pattern as above at `/development-plans`.

**Valid statuses:** `not_started`, `in_progress`, `completed`, `on_hold`

---

## Competencies

Minimum role to read: `viewer`  
Minimum role to create/update: `contributor`  
Minimum role to delete: `manager`

Same CRUD pattern at `/competencies`.

Skill levels are 1–5: beginner → developing → proficient → advanced → expert.

The `gap` field is auto-calculated: `max(target_level - current_level, 0)`

---

## Training Records

Minimum role to read: `viewer`  
Minimum role to create/update: `contributor`  
Minimum role to delete: `manager`

Same CRUD pattern at `/training-records`.

**Valid statuses:** `enrolled`, `in_progress`, `completed`, `dropped`

---

## Error Responses

All errors follow this shape:
```json
{ "error": "Human readable message" }
```

| Status | Meaning |
|--------|---------|
| 400 | Validation error or bad input |
| 401 | Missing or expired token |
| 403 | Insufficient role |
| 404 | Resource not found |
| 409 | Duplicate (email, employee code, etc.) |
| 500 | Server or database error |
