"""
Unit tests for the development plans service.
"""

import json
import sys
import os
import pytest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "development-plans"))

from common.auth import create_token


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
    @patch("function.run_query")
    def test_invalid_status_rejected(self, mock_query):
        mock_query.return_value = None
        from function import handler
        event = make_event("POST", "/development-plans", body={
            "employee_id": 1,
            "title": "Become a senior engineer",
            "status": "flying",
        }, token=contributor_token())
        res = handler(event)
        assert res["statusCode"] == 400
        assert "status" in json.loads(res["body"])["error"]

    @patch("function.run_query")
    def test_invalid_progress_pct(self, mock_query):
        mock_query.return_value = None
        from function import handler
        event = make_event("POST", "/development-plans", body={
            "employee_id": 1,
            "title": "Learn Python",
            "progress_pct": 150,
        }, token=contributor_token())
        res = handler(event)
        assert res["statusCode"] == 400

    @patch("function.run_query")
    def test_viewer_cannot_create(self, mock_query):
        mock_query.return_value = None
        from function import handler
        event = make_event("POST", "/development-plans", body={
            "employee_id": 1,
            "title": "Test plan",
        }, token=viewer_token())
        res = handler(event)
        assert res["statusCode"] == 403

    @patch("function.run_query")
    def test_valid_plan_created(self, mock_query):
        mock_query.side_effect = [
            None,  # ensure_table
            None,  # INSERT
            [{"id": 1, "employee_id": 1, "title": "Learn Python",
              "status": "not_started", "progress_pct": 0}],
        ]
        from function import handler
        event = make_event("POST", "/development-plans", body={
            "employee_id": 1,
            "title": "Learn Python",
        }, token=contributor_token())
        res = handler(event)
        assert res["statusCode"] == 201
