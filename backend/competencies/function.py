"""
Competencies service.
Tracks skills and proficiency levels per employee. Identifies gaps against targets.
"""

import json
import logging
import os

from common.db import run_query
from common.auth import require_role, ok, err

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 1=beginner, 2=developing, 3=proficient, 4=advanced, 5=expert
VALID_LEVELS = {1, 2, 3, 4, 5}
VALID_CATEGORIES = {"technical", "leadership", "communication", "analytical", "interpersonal", "domain"}


def _ensure_table():
    run_query("""
        CREATE TABLE IF NOT EXISTS competencies (
            id              SERIAL PRIMARY KEY,
            employee_id     INTEGER NOT NULL,
            skill_name      VARCHAR(150) NOT NULL,
            category        VARCHAR(50),
            current_level   INTEGER NOT NULL,
            target_level    INTEGER,
            gap             INTEGER GENERATED ALWAYS AS (
                                CASE WHEN target_level IS NOT NULL
                                     THEN GREATEST(target_level - current_level, 0)
                                     ELSE 0 END
                            ) STORED,
            notes           TEXT,
            assessed_by     INTEGER,
            assessed_at     TIMESTAMP DEFAULT NOW(),
            updated_at      TIMESTAMP DEFAULT NOW(),
            UNIQUE(employee_id, skill_name)
        )
    """)


def _route(event):
    method = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod", "GET")
    path = event.get("rawPath") or event.get("path", "/")
    return method.upper(), path


def _get_id(path):
    parts = [p for p in path.split("/") if p]
    for i, part in enumerate(parts):
        if part == "competencies" and i + 1 < len(parts):
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

    comp_id = _get_id(path)

    try:
        if method == "GET" and comp_id is None:
            return _list(event)
        elif method == "GET" and comp_id:
            return _get(event, comp_id)
        elif method == "POST":
            return _create(event)
        elif method == "PUT" and comp_id:
            return _update(event, comp_id)
        elif method == "DELETE" and comp_id:
            return _delete(event, comp_id)
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

    if caller["role"] in ("viewer", "contributor"):
        conditions.append("employee_id = %s")
        values.append(caller["sub"])

    if params.get("employee_id"):
        conditions.append("employee_id = %s")
        values.append(params["employee_id"])
    if params.get("category"):
        conditions.append("category = %s")
        values.append(params["category"])
    if params.get("has_gap") == "true":
        conditions.append("gap > 0")

    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    rows = run_query(
        f"SELECT * FROM competencies {where} ORDER BY gap DESC, skill_name",
        values, fetch=True
    )
    return ok({"competencies": rows, "total": len(rows)})


def _get(event, comp_id):
    caller = require_role(event, "viewer")
    rows = run_query("SELECT * FROM competencies WHERE id = %s", [comp_id], fetch=True)
    if not rows:
        return err("Competency record not found", 404)

    comp = rows[0]
    if caller["role"] in ("viewer", "contributor") and str(comp["employee_id"]) != caller["sub"]:
        return err("Access denied", 403)

    return ok(comp)


def _create(event):
    caller = require_role(event, "contributor")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return err("Invalid JSON body")

    required = ["employee_id", "skill_name", "current_level"]
    missing = [f for f in required if body.get(f) is None]
    if missing:
        return err(f"Missing required fields: {', '.join(missing)}")

    if body["current_level"] not in VALID_LEVELS:
        return err("current_level must be between 1 and 5")

    if body.get("target_level") and body["target_level"] not in VALID_LEVELS:
        return err("target_level must be between 1 and 5")

    if body.get("category") and body["category"] not in VALID_CATEGORIES:
        return err(f"category must be one of: {', '.join(sorted(VALID_CATEGORIES))}")

    try:
        run_query(
            """INSERT INTO competencies
               (employee_id, skill_name, category, current_level, target_level, notes, assessed_by)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            [
                body["employee_id"],
                body["skill_name"].strip(),
                body.get("category"),
                body["current_level"],
                body.get("target_level"),
                body.get("notes"),
                caller["sub"],
            ]
        )
    except Exception as e:
        if "unique" in str(e).lower():
            return err("A competency record for this skill already exists for this employee", 409)
        raise

    rows = run_query(
        "SELECT * FROM competencies WHERE employee_id = %s AND skill_name = %s",
        [body["employee_id"], body["skill_name"].strip()], fetch=True
    )
    return ok(rows[0], 201)


def _update(event, comp_id):
    require_role(event, "contributor")

    rows = run_query("SELECT id FROM competencies WHERE id = %s", [comp_id], fetch=True)
    if not rows:
        return err("Competency record not found", 404)

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return err("Invalid JSON body")

    if "current_level" in body and body["current_level"] not in VALID_LEVELS:
        return err("current_level must be between 1 and 5")
    if "target_level" in body and body["target_level"] not in VALID_LEVELS:
        return err("target_level must be between 1 and 5")

    allowed = ["skill_name", "category", "current_level", "target_level", "notes"]
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        return err("No valid fields to update")

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    run_query(
        f"UPDATE competencies SET {set_clause}, updated_at = NOW() WHERE id = %s",
        list(updates.values()) + [comp_id]
    )
    rows = run_query("SELECT * FROM competencies WHERE id = %s", [comp_id], fetch=True)
    return ok(rows[0])


def _delete(event, comp_id):
    require_role(event, "manager")

    rows = run_query("SELECT id FROM competencies WHERE id = %s", [comp_id], fetch=True)
    if not rows:
        return err("Competency record not found", 404)

    run_query("DELETE FROM competencies WHERE id = %s", [comp_id])
    return {"statusCode": 204, "headers": {"Access-Control-Allow-Origin": "*"}, "body": ""}


if __name__ == "__main__":
    print(handler())
