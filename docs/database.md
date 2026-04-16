# Database — PostgreSQL and How We Use It

## What is a Database?

A database is a system for storing data permanently and retrieving it quickly.
Think of it as a very organized filing cabinet where every piece of information
has its own labeled drawer.

**Without a database:** Every time you restart the app, all data is lost.
**With a database:** Data persists forever, even when the app is not running.

---

## What is PostgreSQL?

PostgreSQL is one of the most popular relational databases in the world.
"Relational" means data is stored in tables with rows and columns,
similar to Excel spreadsheets — but much more powerful.

**Example table — employees:**
```
id | employee_code | full_name    | email              | department   | status
1  | EMP001        | Jane Smith   | jane@acme.com      | Engineering  | active
2  | EMP002        | John Doe     | john@acme.com      | HR           | active
```

---

## Our Database Tables

We have 6 tables, one per service:

### users (managed by auth service)
```
id, email, password (hashed), full_name, role, created_at
```

### employees
```
id, employee_code, full_name, email, department, job_title,
manager_id, hire_date, employment_status, created_at, updated_at
```

### performance_reviews
```
id, employee_id, reviewer_id, review_period, review_year,
overall_rating, strengths, areas_to_improve, goals_next_period,
score, status, created_at, updated_at
```

### development_plans
```
id, employee_id, title, description, target_role,
start_date, target_date, status, progress_pct, milestones,
created_by, created_at, updated_at
```

### competencies
```
id, employee_id, skill_name, category, current_level,
target_level, gap (auto-calculated), notes, assessed_by, assessed_at
```

### training_records
```
id, employee_id, training_name, training_type, provider,
start_date, completion_date, status, score, certificate_url,
skills_gained, notes, created_at, updated_at
```

---

## How Tables Are Created

We do not run any migration scripts. Each Lambda function creates its
own table automatically on the first request using:

```sql
CREATE TABLE IF NOT EXISTS employees (...)
```

`IF NOT EXISTS` means: create the table only if it does not already exist.
On the second request, this line does nothing — the table already exists.

---

## How the Python Code Talks to PostgreSQL

In `backend/common/db.py`:

```python
from psycopg import connect

def get_conn():
    conn = connect("host=... port=5432 dbname=... user=... password=...")
    return conn
```

`psycopg` is a Python library for connecting to PostgreSQL.

The `run_query()` function handles all database operations:
```python
# Read data
rows = run_query("SELECT * FROM employees WHERE id = %s", [42], fetch=True)

# Write data
run_query("INSERT INTO employees (name, email) VALUES (%s, %s)", ["Jane", "jane@acme.com"])
```

The `%s` placeholders prevent SQL injection attacks — user input is never
directly inserted into the SQL string.

---

## Local vs Production Database

**Local development:**
- PostgreSQL runs on your laptop
- Host: `localhost`, Port: `5432`
- Username: `postgres`, Password: `postgres123`
- The Lambda functions running in LocalStack connect to your local PostgreSQL

**Production (AWS):**
- PostgreSQL runs on AWS Aurora Serverless
- Host: the Aurora endpoint URL (set automatically by Terraform)
- Credentials are injected as environment variables
- SSL is required (`sslmode=require`)

The Python code handles both automatically:
```python
is_local = os.environ.get("IS_LOCAL", "true") == "true"
if not is_local:
    dsn += " sslmode=require"
```

---

## How to Check the Database Locally

Connect to the local PostgreSQL:
```sh
psql -U postgres -h localhost
```
Password: `postgres123`

Useful commands inside psql:
```sql
\l                          -- list all databases
\c postgres                 -- connect to the postgres database
\dt                         -- list all tables
SELECT * FROM users;        -- see all users
SELECT * FROM employees;    -- see all employees
\q                          -- quit
```

---

## The Gap Calculation in Competencies

The `gap` column in the competencies table is special — it is calculated
automatically by the database:

```sql
gap INTEGER GENERATED ALWAYS AS (
    CASE WHEN target_level IS NOT NULL
         THEN GREATEST(target_level - current_level, 0)
         ELSE 0 END
) STORED
```

This means:
- If `current_level = 3` and `target_level = 5`, then `gap = 2`
- If `current_level = 4` and `target_level = 3`, then `gap = 0` (no gap, already above target)
- If no target is set, `gap = 0`

The database calculates this automatically — we never set it manually.
