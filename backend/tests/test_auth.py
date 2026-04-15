"""
Unit tests for the auth service.
Run with: pytest backend/tests/test_auth.py -v
"""

import json
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "auth"))

from common.auth import create_token, verify_token, require_role, ROLE_RANK


class TestTokenCreation:
    def test_creates_three_part_token(self):
        token = create_token("1", "test@acme.com", "viewer")
        parts = token.split(".")
        assert len(parts) == 3

    def test_payload_contains_expected_fields(self):
        token = create_token("42", "hr@acme.com", "manager")
        payload = verify_token(token)
        assert payload["sub"] == "42"
        assert payload["email"] == "hr@acme.com"
        assert payload["role"] == "manager"

    def test_expired_token_raises(self):
        import time
        from common import auth as auth_module
        original_ttl = auth_module.TTL
        auth_module.TTL = -1  # already expired
        token = create_token("1", "x@x.com", "viewer")
        auth_module.TTL = original_ttl
        with pytest.raises(ValueError, match="expired"):
            verify_token(token)

    def test_tampered_token_raises(self):
        token = create_token("1", "x@x.com", "viewer")
        parts = token.split(".")
        tampered = parts[0] + "." + parts[1] + ".badsignature"
        with pytest.raises(ValueError, match="Invalid"):
            verify_token(tampered)

    def test_malformed_token_raises(self):
        with pytest.raises(ValueError, match="Malformed"):
            verify_token("not.a.valid.jwt.token.here")


class TestRoleRanks:
    def test_admin_outranks_all(self):
        assert ROLE_RANK["admin"] > ROLE_RANK["manager"]
        assert ROLE_RANK["manager"] > ROLE_RANK["contributor"]
        assert ROLE_RANK["contributor"] > ROLE_RANK["viewer"]

    def test_require_role_passes_for_sufficient_role(self):
        token = create_token("1", "admin@acme.com", "admin")
        event = {"headers": {"Authorization": f"Bearer {token}"}}
        payload = require_role(event, "viewer")
        assert payload["role"] == "admin"

    def test_require_role_raises_for_insufficient_role(self):
        token = create_token("1", "viewer@acme.com", "viewer")
        event = {"headers": {"Authorization": f"Bearer {token}"}}
        with pytest.raises(PermissionError):
            require_role(event, "manager")

    def test_missing_auth_header_raises(self):
        from common.auth import extract_token
        with pytest.raises(ValueError, match="Missing"):
            extract_token({})


class TestResponseHelpers:
    def test_ok_returns_200_by_default(self):
        from common.auth import ok
        res = ok({"key": "value"})
        assert res["statusCode"] == 200
        body = json.loads(res["body"])
        assert body["key"] == "value"

    def test_err_returns_400_by_default(self):
        from common.auth import err
        res = err("something went wrong")
        assert res["statusCode"] == 400
        body = json.loads(res["body"])
        assert "error" in body

    def test_ok_accepts_custom_status(self):
        from common.auth import ok
        res = ok({}, 201)
        assert res["statusCode"] == 201
