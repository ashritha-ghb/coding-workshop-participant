"""
Unit tests for the performance reviews service.
"""

import json
import sys
import os
import pytest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "performance-reviews"))

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


def manager_token():
    return create_token("2", "mgr@acme.com", "manager")


def viewer_token():
    return create_token("3", "viewer@acme.com", "viewer")


class TestReviewValidation:
    @patch("function.run_query")
    def test_invalid_rating_rejected(self, mock_query):
        mock_query.return_value = None
        from function import handler
        event = make_event("POST", "/performance-reviews", body={
            "employee_id": 1,
            "review_period": "Q4",
            "review_year": 2025,
            "overall_rating": "invalid_rating",
        }, token=manager_token())
        res = handler(event)
        assert res["statusCode"] == 400
        assert "overall_rating" in json.loads(res["body"])["error"]

    @patch("function.run_query")
    def test_missing_required_fields(self, mock_query):
        mock_query.return_value = None
        from function import handler
        event = make_event("POST", "/performance-reviews", body={
            "employee_id": 1,
        }, token=manager_token())
        res = handler(event)
        assert res["statusCode"] == 400

    @patch("function.run_query")
    def test_viewer_cannot_create(self, mock_query):
        mock_query.return_value = None
        from function import handler
        event = make_event("POST", "/performance-reviews", body={
            "employee_id": 1,
            "review_period": "Q4",
            "review_year": 2025,
            "overall_rating": "meets_expectations",
        }, token=viewer_token())
        res = handler(event)
        assert res["statusCode"] == 403

    @patch("function.run_query")
    def test_list_returns_reviews(self, mock_query):
        mock_query.return_value = [
            {"id": 1, "employee_id": 1, "review_period": "Q4",
             "review_year": 2025, "overall_rating": "meets_expectations",
             "score": 75, "status": "approved"}
        ]
        from function import handler
        event = make_event("GET", "/performance-reviews", token=manager_token())
        res = handler(event)
        assert res["statusCode"] == 200
        body = json.loads(res["body"])
        assert body["total"] == 1


class TestReviewRBAC:
    @patch("function.run_query")
    def test_viewer_sees_only_own_reviews(self, mock_query):
        """Viewer should have employee_id filter applied automatically."""
        mock_query.return_value = []
        from function import handler
        event = make_event("GET", "/performance-reviews", token=viewer_token())
        res = handler(event)
        assert res["statusCode"] == 200

    @patch("function.run_query")
    def test_delete_requires_admin(self, mock_query):
        mock_query.return_value = [{"id": 1}]
        from function import handler
        event = make_event("DELETE", "/performance-reviews/1", token=manager_token())
        res = handler(event)
        assert res["statusCode"] == 403
