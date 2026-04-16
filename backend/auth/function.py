"""
Auth service — login, registration, token refresh.
Uses argon2 for password hashing, custom JWT for tokens.
"""

import json
import logging
import os

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from common.db import run_query
from common.auth import create_token, verify_token, extract_token, ok, err

logger = logging.getLogger()
logger.setLevel(logging.INFO)

_ph = PasswordHasher()

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
}


def _ensure_table():
    run_query("""
        CREATE TABLE IF NOT EXISTS users (
            id          SERIAL PRIMARY KEY,
            email       VARCHAR(255) UNIQUE NOT NULL,
            password    VARCHAR(255) NOT NULL,
            full_name   VARCHAR(255) NOT NULL,
            role        VARCHAR(50)  NOT NULL DEFAULT 'viewer',
            employee_id INTEGER,
            created_at  TIMESTAMP DEFAULT NOW()
        )
    """)
    # Add employee_id column if it doesn't exist (for existing tables)
    run_query("""
        ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id INTEGER
    """)


def _route(event):
    method = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod", "GET")
    path = event.get("rawPath") or event.get("path", "/")
    return method.upper(), path


def handler(event=None, context=None):
    if event is None:
        event = {}

    # Handle CORS preflight
    method, path = _route(event)
    if method == "OPTIONS":
        return {"statusCode": 204, "headers": CORS_HEADERS, "body": ""}

    try:
        _ensure_table()
    except Exception as e:
        logger.error("Table init failed: %s", e)
        return err("Database unavailable", 500)

    try:
        if path.endswith("/login") and method == "POST":
            return _login(event)
        elif path.endswith("/register") and method == "POST":
            return _register(event)
        elif path.endswith("/refresh") and method == "POST":
            return _refresh(event)
        elif path.endswith("/me") and method == "GET":
            return _me(event)
        else:
            return err("Not found", 404)
    except Exception as e:
        logger.error("Unhandled error: %s", e)
        return err("Internal server error", 500)


def _login(event):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return err("Invalid JSON body")

    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or not password:
        return err("Email and password are required")

    rows = run_query(
        "SELECT id, email, password, full_name, role, employee_id FROM users WHERE email = %s",
        [email], fetch=True
    )
    if not rows:
        return err("Invalid credentials", 401)

    user = rows[0]
    try:
        _ph.verify(user["password"], password)
    except VerifyMismatchError:
        return err("Invalid credentials", 401)

    token = create_token(str(user["id"]), user["email"], user["role"], str(user["employee_id"]) if user["employee_id"] else None)
    return ok({
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "employee_id": user["employee_id"],
        }
    })


def _register(event):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return err("Invalid JSON body")

    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    full_name = (body.get("full_name") or "").strip()
    role = (body.get("role") or "viewer").strip().lower()
    employee_id = body.get("employee_id")  # optional — links user to an employee record

    if not email or not password or not full_name:
        return err("email, password, and full_name are required")

    valid_roles = {"admin", "manager", "contributor", "viewer"}
    if role not in valid_roles:
        return err(f"role must be one of: {', '.join(sorted(valid_roles))}")

    if len(password) < 8:
        return err("Password must be at least 8 characters")

    hashed = _ph.hash(password)

    try:
        run_query(
            "INSERT INTO users (email, password, full_name, role, employee_id) VALUES (%s, %s, %s, %s, %s)",
            [email, hashed, full_name, role, employee_id]
        )
    except Exception as e:
        if "unique" in str(e).lower():
            return err("An account with that email already exists", 409)
        raise

    rows = run_query(
        "SELECT id, email, full_name, role, employee_id FROM users WHERE email = %s",
        [email], fetch=True
    )
    user = rows[0]
    token = create_token(str(user["id"]), user["email"], user["role"], str(user["employee_id"]) if user["employee_id"] else None)
    return ok({"token": token, "user": user}, 201)


def _refresh(event):
    try:
        token = extract_token(event)
        payload = verify_token(token)
    except ValueError as e:
        return err(str(e), 401)

    rows = run_query(
        "SELECT id, email, full_name, role, employee_id FROM users WHERE id = %s",
        [payload["sub"]], fetch=True
    )
    if not rows:
        return err("User not found", 404)

    user = rows[0]
    new_token = create_token(str(user["id"]), user["email"], user["role"], str(user["employee_id"]) if user["employee_id"] else None)
    return ok({"token": new_token, "user": user})


def _me(event):
    try:
        token = extract_token(event)
        payload = verify_token(token)
    except ValueError as e:
        return err(str(e), 401)

    rows = run_query(
        "SELECT id, email, full_name, role, employee_id, created_at FROM users WHERE id = %s",
        [payload["sub"]], fetch=True
    )
    if not rows:
        return err("User not found", 404)

    return ok(rows[0])


if __name__ == "__main__":
    print(handler({"path": "/login", "httpMethod": "POST", "body": "{}"}))
