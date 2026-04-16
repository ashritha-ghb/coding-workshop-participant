"""
Training records service.
Tracks completed and in-progress training activities per employee.
"""

import json
import logging
import os

from common.db import run_query
from common.auth import require_role, ok, err

logger = logging.getLogger()
logger.setLevel(logging.INFO)

VALID_STATUSES = {"enrolled", "in_progress", "completed", "dropped"}
VALID_TYPES = {"course", "workshop", "certification", "conference", "mentoring", "on_the_job"}


def _ensure_table():
    run_query("""
        CREATE TABLE IF NOT EXISTS training_records (
            id              SERIAL PRIMARY KEY,
            employee_id     INTEGER NOT NULL,
            training_name   VARCHAR(255) NOT NULL,
            training_type   VARCHAR(50),
            provider        VARCHAR(150),
            start_date      DATE,
            completion_date DATE,
            status          VARCHAR(50) DEFAULT 'enrolled',
            score           NUMERIC(5,2),
            certificate_url VARCHAR(500),
            skills_gained   TEXT,
            notes           TEXT,
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
        if part == "training-records" and i + 1 < len(parts):
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

    record_id = _get_id(path)

    try:
        if method == "GET" and record_id is None:
            return _list(event)
        elif method == "GET" and record_id:
            return _get(event, record_id)
        elif method == "POST":
            return _create(event)
        elif method == "PUT" and record_id:
            return _update(event, record_id)
        elif method == "DELETE" and record_id:
            return _delete(event, record_id)
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

    conditions = []
    values = []

    if params.get("employee_id"):
        conditions.append("employee_id = %s")
        values.append(params["employee_id"])
    if params.get("status"):
        conditions.append("status = %s")
        values.append(params["status"])
    if params.get("training_type"):
        conditions.append("training_type = %s")
        values.append(params["training_type"])

    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    rows = run_query(
        f"SELECT * FROM training_records {where} ORDER BY completion_date DESC NULLS LAST",
        values, fetch=True
    )
    return ok({"records": rows, "total": len(rows)})


def _get(event, record_id):
    require_role(event, "viewer")
    rows = run_query("SELECT * FROM training_records WHERE id = %s", [record_id], fetch=True)
    if not rows:
        return err("Training record not found", 404)

    return ok(rows[0])


def _create(event):
    caller = require_role(event, "contributor")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return err("Invalid JSON body")

    required = ["employee_id", "training_name"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        return err(f"Missing required fields: {', '.join(missing)}")

    if body.get("status") and body["status"] not in VALID_STATUSES:
        return err(f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")

    if body.get("training_type") and body["training_type"] not in VALID_TYPES:
        return err(f"training_type must be one of: {', '.join(sorted(VALID_TYPES))}")

    run_query(
        """INSERT INTO training_records
           (employee_id, training_name, training_type, provider, start_date,
            completion_date, status, score, certificate_url, skills_gained, notes)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        [
            body["employee_id"],
            body["training_name"].strip(),
            body.get("training_type"),
            body.get("provider"),
            body.get("start_date"),
            body.get("completion_date"),
            body.get("status", "enrolled"),
            body.get("score"),
            body.get("certificate_url"),
            body.get("skills_gained"),
            body.get("notes"),
        ]
    )

    rows = run_query(
        "SELECT * FROM training_records WHERE employee_id = %s ORDER BY id DESC LIMIT 1",
        [body["employee_id"]], fetch=True
    )
    return ok(rows[0], 201)


def _update(event, record_id):
    require_role(event, "contributor")

    rows = run_query("SELECT id FROM training_records WHERE id = %s", [record_id], fetch=True)
    if not rows:
        return err("Training record not found", 404)

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return err("Invalid JSON body")

    if "status" in body and body["status"] not in VALID_STATUSES:
        return err(f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")

    allowed = ["training_name", "training_type", "provider", "start_date",
               "completion_date", "status", "score", "certificate_url", "skills_gained", "notes"]
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        return err("No valid fields to update")

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    run_query(
        f"UPDATE training_records SET {set_clause}, updated_at = NOW() WHERE id = %s",
        list(updates.values()) + [record_id]
    )
    rows = run_query("SELECT * FROM training_records WHERE id = %s", [record_id], fetch=True)
    return ok(rows[0])


def _delete(event, record_id):
    require_role(event, "manager")

    rows = run_query("SELECT id FROM training_records WHERE id = %s", [record_id], fetch=True)
    if not rows:
        return err("Training record not found", 404)

    run_query("DELETE FROM training_records WHERE id = %s", [record_id])
    return {"statusCode": 204, "headers": {"Access-Control-Allow-Origin": "*"}, "body": ""}


if __name__ == "__main__":
    print(handler())
