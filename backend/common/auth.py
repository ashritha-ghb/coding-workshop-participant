"""
JWT helpers — token creation, verification, and role checking.
Roles go viewer < contributor < manager < admin.
"""

import os
import time
import json
import hmac
import hashlib
import base64
import logging

logger = logging.getLogger(__name__)

SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-in-prod")
TTL = int(os.environ.get("JWT_TTL_SECONDS", "3600"))  # 1 hour default

# Roles ranked lowest to highest — used for permission checks
ROLE_RANK = {"viewer": 0, "contributor": 1, "manager": 2, "admin": 3}


def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    return base64.urlsafe_b64decode(s + "=" * padding)


def create_token(user_id: str, email: str, role: str) -> str:
    header = _b64_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64_encode(json.dumps({
        "sub": user_id,
        "email": email,
        "role": role,
        "iat": int(time.time()),
        "exp": int(time.time()) + TTL,
    }).encode())
    sig = _b64_encode(
        hmac.new(SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    )
    return f"{header}.{payload}.{sig}"


def verify_token(token: str) -> dict:
    """
    Verify signature and expiry. Returns the payload dict on success.
    Raises ValueError with a human-readable reason on failure.
    """
    try:
        header, payload, sig = token.split(".")
    except ValueError:
        raise ValueError("Malformed token")

    expected = _b64_encode(
        hmac.new(SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    )
    if not hmac.compare_digest(expected, sig):
        raise ValueError("Invalid token signature")

    data = json.loads(_b64_decode(payload))
    if data.get("exp", 0) < int(time.time()):
        raise ValueError("Token has expired")

    return data


def extract_token(event: dict) -> str:
    """Pull the Bearer token out of the Authorization header."""
    headers = event.get("headers") or {}
    auth = headers.get("Authorization") or headers.get("authorization") or ""
    if not auth.startswith("Bearer "):
        raise ValueError("Missing or malformed Authorization header")
    return auth[7:]


def require_role(event: dict, minimum_role: str) -> dict:
    """
    Validate the JWT and check the caller has at least minimum_role.
    Returns the token payload so handlers can use sub/email/role.
    Raises ValueError if auth fails or role is insufficient.
    """
    token = extract_token(event)
    payload = verify_token(token)
    caller_rank = ROLE_RANK.get(payload.get("role", ""), -1)
    required_rank = ROLE_RANK.get(minimum_role, 999)
    if caller_rank < required_rank:
        raise PermissionError(
            f"Role '{payload.get('role')}' cannot perform this action"
        )
    return payload


def ok(body: dict, status: int = 200) -> dict:
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body, default=str),
    }


def err(message: str, status: int = 400) -> dict:
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps({"error": message}),
    }
