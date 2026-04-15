"""
Performance reviews service.
Managers create/update reviews. Employees can read their own. Admins can delete.
"""

import json
import logging
import os

from common.db import run_query
from common.auth import require_role, ok, err

logger = logging.getLogger()
logger.setLevel(logging.INFO)

VALID_RATINGS = {"exceeds_expectations", "meets_expectations", "needs_improvement", "unsatisfactory"}
VALID_PERIODS = {"Q1", "Q2", "Q3", "Q4", "annual", "mid-year"}


def _ensure_table():
    run_query("""
        CREATE TABLE IF NOT EXISTS performance_reviews (
            id              SERIAL PRIMARY KEY,
            employee_id     INTEGER NOT NULL,
            reviewer_id     INTEGER NOT NULL,
            review_period   VARCHAR(20) NOT NULL,
            review_year     INTEGER NOT NULL,
            overall_rating  VARCHAR(50) NOT NULL,
            strengths       TEXT,
            areas_to_improve TEXT,
            goals_next_period TEXT,
            score           NUMERIC(4,2),
            status          VARCHAR(20) DEFAULT 'draft',
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
        if part == "performance-reviews" and i + 1 < len(parts):
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

    review_id = _get_id(path)

    try:
        if method == "GET" and review_id is None:
            return _list(event)
        elif method == "GET" and review_id:
            return _get(event, review_id)
        elif method == "POST":
            return _create(event)
        elif method == "PUT" and review_id:
            return _update(event, review_id)
        elif method == "DELETE" and review_id:
            return _delete(event, review_id)
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

    # Non-managers only see their own reviews
    if caller["role"] in ("viewer", "contributor"):
        conditions.append("employee_id = %s")
        values.append(caller["sub"])

    if params.get("employee_id"):
        conditions.append("employee_id = %s")
        values.append(params["employee_id"])
    if params.get("year"):
        conditions.append("review_year = %s")
        values.append(params["year"])
    if params.get("rating"):
        conditions.append("overall_rating = %s")
        values.append(params["rating"])

    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    rows = run_query(
        f"SELECT * FROM performance_reviews {where} ORDER BY review_year DESC, created_at DESC",
        values, fetch=True
    )
    return ok({"reviews": rows, "total": len(rows)})


def _get(event, review_id):
    caller = require_role(event, "viewer")
    rows = run_query(
        "SELECT * FROM performance_reviews WHERE id = %s",
        [review_id], fetch=True
    )
    if not rows:
        return err("Review not found", 404)

    review = rows[0]
    if caller["role"] in ("viewer", "contributor") and str(review["employee_id"]) != caller["sub"]:
        return err("Access denied", 403)

    return ok(review)


def _create(event):
    require_role(event, "manager")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return err("Invalid JSON body")

    required = ["employee_id", "review_period", "review_year", "overall_rating"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        return err(f"Missing required fields: {', '.join(missing)}")

    if body["overall_rating"] not in VALID_RATINGS:
        return err(f"overall_rating must be one of: {', '.join(sorted(VALID_RATINGS))}")

    caller = require_role(event, "manager")

    run_query(
        """INSERT INTO performance_reviews
           (employee_id, reviewer_id, review_period, review_year, overall_rating,
            strengths, areas_to_improve, goals_next_period, score, status)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        [
            body["employee_id"],
            caller["sub"],
            body["review_period"],
            body["review_year"],
            body["overall_rating"],
            body.get("strengths"),
            body.get("areas_to_improve"),
            body.get("goals_next_period"),
            body.get("score"),
            body.get("status", "draft"),
        ]
    )

    rows = run_query(
        "SELECT * FROM performance_reviews WHERE employee_id = %s ORDER BY id DESC LIMIT 1",
        [body["employee_id"]], fetch=True
    )
    return ok(rows[0], 201)


def _update(event, review_id):
    require_role(event, "manager")

    rows = run_query("SELECT id FROM performance_reviews WHERE id = %s", [review_id], fetch=True)
    if not rows:
        return err("Review not found", 404)

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return err("Invalid JSON body")

    if "overall_rating" in body and body["overall_rating"] not in VALID_RATINGS:
        return err(f"overall_rating must be one of: {', '.join(sorted(VALID_RATINGS))}")

    allowed = ["review_period", "review_year", "overall_rating", "strengths",
               "areas_to_improve", "goals_next_period", "score", "status"]
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        return err("No valid fields to update")

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    run_query(
        f"UPDATE performance_reviews SET {set_clause}, updated_at = NOW() WHERE id = %s",
        list(updates.values()) + [review_id]
    )
    rows = run_query("SELECT * FROM performance_reviews WHERE id = %s", [review_id], fetch=True)
    return ok(rows[0])


def _delete(event, review_id):
    require_role(event, "admin")

    rows = run_query("SELECT id FROM performance_reviews WHERE id = %s", [review_id], fetch=True)
    if not rows:
        return err("Review not found", 404)

    run_query("DELETE FROM performance_reviews WHERE id = %s", [review_id])
    return {"statusCode": 204, "headers": {"Access-Control-Allow-Origin": "*"}, "body": ""}


if __name__ == "__main__":
    print(handler())
