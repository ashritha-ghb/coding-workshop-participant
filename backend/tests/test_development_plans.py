"""
Unit tests for the development plans service.
Uses importlib to load the function module directly, avoiding sys.path conflicts.
"""

import json
import sys
import os
import importlib.util
import pytest
from unittest.mock import patch, MagicMock

# Add top-level backend to path for common.auth token creation
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from common.auth import create_token

# Load the development-plans function module directly by file path
_svc_dir = os.path.join(os.path.dirname(__file__), "..", "development-plans")
_spec = importlib.util.spec_from_file_location("dp_function", os.path.join(_svc_dir, "function.py"),
    submodule_search_locations=[_svc_dir])
_dp_module = importlib.util.module_from_spec(_spec)
# Inject common from the service's own folder before exec
sys.path.insert(0, _svc_dir)
_spec.loader.exec_module(_dp_module)
sys.path.pop(0)

dp_handler = _dp_module.handler


def make_event(method, path, body=None, token=None, params=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return {
        "httpMethod": method,
        "path": path,
        "headers": headers,
        "body": json.dumps(body) if body else None,
        "queryStringParameters": params or {},
    }


def contributor_token():
    return create_token("4", "contrib@acme.com", "contributor")


def viewer_token():
    return create_token("3", "viewer@acme.com", "viewer")


class TestDevelopmentPlanValidation:
    def test_invalid_status_rejected(self):
        with patch.object(_dp_module, "run_query", return_value=None):
            event = make_event("POST", "/development-plans", body={
                "employee_id": 1,
                "title": "Become a senior engineer",
                "status": "flying",
            }, token=contributor_token())
            res = dp_handler(event)
        assert res["statusCode"] == 400
        assert "status" in json.loads(res["body"])["error"]

    def test_invalid_progress_pct(self):
        with patch.object(_dp_module, "run_query", return_value=None):
            event = make_event("POST", "/development-plans", body={
                "employee_id": 1,
                "title": "Learn Python",
                "progress_pct": 150,
            }, token=contributor_token())
            res = dp_handler(event)
        assert res["statusCode"] == 400

    def test_viewer_cannot_create(self):
        with patch.object(_dp_module, "run_query", return_value=None):
            event = make_event("POST", "/development-plans", body={
                "employee_id": 1,
                "title": "Test plan",
            }, token=viewer_token())
            res = dp_handler(event)
        assert res["statusCode"] == 403

    def test_valid_plan_created(self):
        call_count = [0]
        def side_effect(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 3:
                return [{"id": 1, "employee_id": 1, "title": "Learn Python",
                         "status": "not_started", "progress_pct": 0}]
            return None

        with patch.object(_dp_module, "run_query", side_effect=side_effect):
            event = make_event("POST", "/development-plans", body={
                "employee_id": 1,
                "title": "Learn Python",
            }, token=contributor_token())
            res = dp_handler(event)
        assert res["statusCode"] == 201
