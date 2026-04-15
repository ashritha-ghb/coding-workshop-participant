"""
Employees service — CRUD for employee profiles.
Managers and admins can create/update/delete. Everyone else is read-only.
"""

import json
import logging
import os

from common.db import run_query
from common.auth import require_role, ok, err

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def _ensure_table():
    run_query("""
        CREATE TABLE IF NOT EXISTS employees (
            id              SERIAL PRIMARY KEY,
            employee_code   VARCHAR(50) UNIQUE NOT NULL,
            full_name       VARCHAR(255) NOT NULL,
            email           VARCHAR(255) UNIQUE NOT NULL,
            department      VARCHAR(100),
            job_title       VARCHAR(100),
            manager_id      INTEGER REFERENCES employees(id) ON DELETE SET NULL,
            hire_date       DATE,
            employment_status VARCHAR(50) DEFAULT 'active',
            created_at      TIMESTAMP DEFAULT NOW(),
            updated_at      TIMESTAMP DEFAULT NOW()
        )
    """)


def _route(event):
    method = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod", "GET")
    path = event.get("rawPath") or event.get("path", "/")
    return method.upper(), path


def _get_id(path):
    parts = [p for p in path.split("/") if p]
    # path looks like /employees/42 or /api/employees/42
    for i, part in enumerate(parts):
        if part == "employees" and i + 1 < len(parts):
            try:
                return int(parts[i + 1])
            except ValueError:
                return None
    return None


def handler(event=None, context=None):
    if event is None:
        event = {}

    method, path = _route(event)
    if method == "OPTIONS":
        return {"statusCode": 204, "headers": {"Access-Control-Allow-Origin": "*"}, "body": ""}

    try:
        _ensure_table()
    except Exception as e:
        logger.error("Table init failed: %s", e)
        return err("Database unavailable", 500)

    employee_id = _get_id(path)

    try:
        if method == "GET" and employee_id is None:
            return _list(event)
        elif method == "GET" and employee_id:
            return _get(employee_id)
        elif method == "POST":
            return _create(event)
        elif method == "PUT" and employee_id:
            return _update(event, employee_id)
        elif method == "DELETE" and employee_id:
            return _delete(event, employee_id)
        else:
            return err("Not found", 404)
    except PermissionError as e:
        return err(str(e), 403)
    except ValueError as e:
        return err(str(e), 401)
    except Exception as e:
        logger.error("Unhandled error: %s", e)
        return err("Internal server error", 500)


def _list(event):
    require_role(event, "viewer")

    params = event.get("queryStringParameters") or {}
    department = params.get("department")
    status = params.get("status")
    search = params.get("search")

    conditions = []
    values = []

    if department:
        conditions.append("department ILIKE %s")
        values.append(f"%{department}%")
    if status:
        conditions.append("employment_status = %s")
        values.append(status)
    if search:
        conditions.append("(full_name ILIKE %s OR email ILIKE %s OR employee_code ILIKE %s)")
        values.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    rows = run_query(
        f"SELECT * FROM employees {where} ORDER BY full_name",
        values, fetch=True
    )
    return ok({"employees": rows, "total": len(rows)})


def _get(employee_id):
    rows = run_query(
        "SELECT * FROM employees WHERE id = %s",
        [employee_id], fetch=True
    )
    if not rows:
        return err("Employee not found", 404)
    return ok(rows[0])


def _create(event):
    require_role(event, "manager")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return err("Invalid JSON body")

    required = ["employee_code", "full_name", "email"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        return err(f"Missing required fields: {', '.join(missing)}")

    try:
        run_query(
            """INSERT INTO employees
               (employee_code, full_name, email, department, job_title, manager_id, hire_date, employment_status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            [
                body["employee_code"].strip(),
                body["full_name"].strip(),
                body["email"].strip().lower(),
                body.get("department"),
                body.get("job_title"),
                body.get("manager_id"),
                body.get("hire_date"),
                body.get("employment_status", "active"),
            ]
        )
    except Exception as e:
        if "unique" in str(e).lower():
            return err("Employee code or email already exists", 409)
        raise

    rows = run_query(
        "SELECT * FROM employees WHERE employee_code = %s",
        [body["employee_code"].strip()], fetch=True
    )
    return ok(rows[0], 201)


def _update(event, employee_id):
    require_role(event, "manager")

    rows = run_query("SELECT id FROM employees WHERE id = %s", [employee_id], fetch=True)
    if not rows:
        return err("Employee not found", 404)

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return err("Invalid JSON body")

    allowed = ["full_name", "email", "department", "job_title", "manager_id", "hire_date", "employment_status"]
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        return err("No valid fields to update")

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [employee_id]

    run_query(
        f"UPDATE employees SET {set_clause}, updated_at = NOW() WHERE id = %s",
        values
    )
    rows = run_query("SELECT * FROM employees WHERE id = %s", [employee_id], fetch=True)
    return ok(rows[0])


def _delete(event, employee_id):
    require_role(event, "admin")

    rows = run_query("SELECT id FROM employees WHERE id = %s", [employee_id], fetch=True)
    if not rows:
        return err("Employee not found", 404)

    run_query("DELETE FROM employees WHERE id = %s", [employee_id])
    return {"statusCode": 204, "headers": {"Access-Control-Allow-Origin": "*"}, "body": ""}


if __name__ == "__main__":
    print(handler())
