"""
Development plans service.
Tracks career goals, skill targets, and progress milestones per employee.
"""

import json
import logging
import os

from common.db import run_query
from common.auth import require_role, ok, err

logger = logging.getLogger()
logger.setLevel(logging.INFO)

VALID_STATUSES = {"not_started", "in_progress", "completed", "on_hold"}


def _ensure_table():
    run_query("""
        CREATE TABLE IF NOT EXISTS development_plans (
            id              SERIAL PRIMARY KEY,
            employee_id     INTEGER NOT NULL,
            title           VARCHAR(255) NOT NULL,
            description     TEXT,
            target_role     VARCHAR(100),
            start_date      DATE,
            target_date     DATE,
            status          VARCHAR(50) DEFAULT 'not_started',
            progress_pct    INTEGER DEFAULT 0,
            milestones      TEXT,
            created_by      INTEGER,
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
    for i, part in enumerate(parts):
        if part == "development-plans" and i + 1 < len(parts):
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

    plan_id = _get_id(path)

    try:
        if method == "GET" and plan_id is None:
            return _list(event)
        elif method == "GET" and plan_id:
            return _get(event, plan_id)
        elif method == "POST":
            return _create(event)
        elif method == "PUT" and plan_id:
            return _update(event, plan_id)
        elif method == "DELETE" and plan_id:
            return _delete(event, plan_id)
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
    caller = require_role(event, "viewer")
    params = event.get("queryStringParameters") or {}

    conditions = []
    values = []

    if caller["role"] in ("viewer", "contributor") and caller.get("employee_id"):
        conditions.append("employee_id = %s")
        values.append(caller["employee_id"])

    if params.get("employee_id"):
        conditions.append("employee_id = %s")
        values.append(params["employee_id"])
    if params.get("status"):
        conditions.append("status = %s")
        values.append(params["status"])

    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    rows = run_query(
        f"SELECT * FROM development_plans {where} ORDER BY target_date ASC NULLS LAST",
        values, fetch=True
    )
    return ok({"plans": rows, "total": len(rows)})


def _get(event, plan_id):
    caller = require_role(event, "viewer")
    rows = run_query("SELECT * FROM development_plans WHERE id = %s", [plan_id], fetch=True)
    if not rows:
        return err("Development plan not found", 404)

    plan = rows[0]
    if caller["role"] in ("viewer", "contributor") and caller.get("employee_id"):
        if str(plan["employee_id"]) != str(caller["employee_id"]):
            return err("Access denied", 403)

    return ok(plan)


def _create(event):
    caller = require_role(event, "contributor")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return err("Invalid JSON body")

    required = ["employee_id", "title"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        return err(f"Missing required fields: {', '.join(missing)}")

    if "status" in body and body["status"] not in VALID_STATUSES:
        return err(f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")

    if "progress_pct" in body:
        pct = body["progress_pct"]
        if not isinstance(pct, int) or pct < 0 or pct > 100:
            return err("progress_pct must be an integer between 0 and 100")

    run_query(
        """INSERT INTO development_plans
           (employee_id, title, description, target_role, start_date, target_date,
            status, progress_pct, milestones, created_by)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        [
            body["employee_id"],
            body["title"].strip(),
            body.get("description"),
            body.get("target_role"),
            body.get("start_date"),
            body.get("target_date"),
            body.get("status", "not_started"),
            body.get("progress_pct", 0),
            body.get("milestones"),
            caller["sub"],
        ]
    )

    rows = run_query(
        "SELECT * FROM development_plans WHERE employee_id = %s ORDER BY id DESC LIMIT 1",
        [body["employee_id"]], fetch=True
    )
    return ok(rows[0], 201)


def _update(event, plan_id):
    require_role(event, "contributor")

    rows = run_query("SELECT id FROM development_plans WHERE id = %s", [plan_id], fetch=True)
    if not rows:
        return err("Development plan not found", 404)

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return err("Invalid JSON body")

    if "status" in body and body["status"] not in VALID_STATUSES:
        return err(f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")

    allowed = ["title", "description", "target_role", "start_date", "target_date",
               "status", "progress_pct", "milestones"]
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        return err("No valid fields to update")

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    run_query(
        f"UPDATE development_plans SET {set_clause}, updated_at = NOW() WHERE id = %s",
        list(updates.values()) + [plan_id]
    )
    rows = run_query("SELECT * FROM development_plans WHERE id = %s", [plan_id], fetch=True)
    return ok(rows[0])


def _delete(event, plan_id):
    require_role(event, "manager")

    rows = run_query("SELECT id FROM development_plans WHERE id = %s", [plan_id], fetch=True)
    if not rows:
        return err("Development plan not found", 404)

    run_query("DELETE FROM development_plans WHERE id = %s", [plan_id])
    return {"statusCode": 204, "headers": {"Access-Control-Allow-Origin": "*"}, "body": ""}


if __name__ == "__main__":
    print(handler())
