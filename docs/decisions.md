# Design Decisions

Notes on why certain choices were made during implementation.

## Password Hashing — argon2 over bcrypt

The Lambda runtime uses Amazon Linux 2 which ships with glibc 2.26. The `bcrypt` Python package compiles a native extension that requires glibc 2.28+, causing an import error at runtime. `argon2-cffi` uses CFFI bindings that work with the Lambda environment without issues.

## Shared `common/` Module

Rather than duplicating the database connection and JWT logic across all six services, a `common/` directory holds shared utilities. Each service copies `common/` into its own folder at deploy time so the Lambda zip is self-contained. This avoids Lambda layers while keeping the code DRY.

## Module-Level DB Connection

PostgreSQL connections are stored at module level in `db.py`. Lambda containers stay warm between invocations, so the connection persists and avoids the overhead of reconnecting on every request. On error, the connection is reset to `None` so the next invocation gets a fresh one.

## JWT Without a Library

The JWT implementation uses Python's standard `hmac` and `hashlib` modules rather than a third-party library like `PyJWT`. This reduces the Lambda package size and avoids dependency conflicts. The implementation covers the subset needed: HS256 signing, expiry checking, and payload extraction.

## Table Creation on First Invocation

Each service runs `CREATE TABLE IF NOT EXISTS` at the start of every handler call. This is slightly wasteful but eliminates the need for a separate migration step. PostgreSQL's `IF NOT EXISTS` makes it a no-op after the first run, so the overhead is minimal.

## Role Enforcement at Two Layers

Roles are checked in both the backend (Lambda returns 403 if insufficient) and the frontend (buttons and menu items are hidden). The backend check is the authoritative one — the frontend check is purely for UX so users don't see actions they can't perform.

## Proxy Server for Local Development

LocalStack Lambda URLs don't support CORS headers the same way real AWS does. A small Node.js proxy on port 3001 forwards requests from the React dev server to the correct Lambda URL, stripping browser-added headers that cause CORS issues. This proxy is only used locally — in production, CloudFront handles routing.
