"""
Shared PostgreSQL connection for all Lambda services.
Uses module-level connection so it persists across warm invocations.
"""

import os
import logging
from psycopg import connect

logger = logging.getLogger(__name__)

_conn = None


def _build_dsn() -> str:
    host = os.environ.get("POSTGRES_HOST", "localhost")
    port = os.environ.get("POSTGRES_PORT", "5432")
    name = os.environ.get("POSTGRES_NAME", "postgres")
    user = os.environ.get("POSTGRES_USER", "postgres")
    password = os.environ.get("POSTGRES_PASS", "postgres123")
    is_local = os.environ.get("IS_LOCAL", "true") == "true"

    dsn = (
        f"host={host} port={port} dbname={name} "
        f"user={user} password={password} connect_timeout=10"
    )
    if not is_local:
        dsn += " sslmode=require"
    return dsn


def get_conn():
    """Return a live PostgreSQL connection, creating one if needed."""
    global _conn
    try:
        if _conn is None or _conn.closed:
            _conn = connect(_build_dsn())
        return _conn
    except Exception as e:
        logger.error("DB connection failed: %s", e)
        _conn = None
        raise


def run_query(sql: str, params=None, fetch=False):
    """
    Execute a query and optionally return rows.
    Resets the connection on failure so the next call gets a fresh one.
    """
    global _conn
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or [])
            if fetch:
                cols = [desc[0] for desc in cur.description]
                rows = cur.fetchall()
                return [dict(zip(cols, row)) for row in rows]
            conn.commit()
            return cur.rowcount
    except Exception as e:
        logger.error("Query error: %s", e)
        try:
            conn.rollback()
        except Exception:
            pass
        _conn = None
        raise
