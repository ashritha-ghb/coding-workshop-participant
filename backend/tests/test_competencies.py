"""
Unit tests for the competencies service.
Focuses on validation logic and gap calculation.
"""

import json
import sys
import os
import pytest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "competencies"))

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
    return create_token("5", "contrib@acme.com", "contributor")


class TestCompetencyValidation:
    @patch("competencies.function.run_query")
    def test_invalid_current_level_rejected(self, mock_query):
        mock_query.return_value = None
        from competencies.function import handler
        event = make_event("POST", "/competencies", body={
            "employee_id": 1,
            "skill_name": "Python",
            "current_level": 6,  # out of range
        }, token=contributor_token())
        res = handler(event)
        assert res["statusCode"] == 400
        assert "current_level" in json.loads(res["body"])["error"]

    @patch("competencies.function.run_query")
    def test_invalid_category_rejected(self, mock_query):
        mock_query.return_value = None
        from competencies.function import handler
        event = make_event("POST", "/competencies", body={
            "employee_id": 1,
            "skill_name": "Python",
            "current_level": 3,
            "category": "made_up_category",
        }, token=contributor_token())
        res = handler(event)
        assert res["statusCode"] == 400

    @patch("competencies.function.run_query")
    def test_valid_competency_created(self, mock_query):
        mock_query.side_effect = [
            None,  # ensure_table
            None,  # INSERT
            [{"id": 1, "employee_id": 1, "skill_name": "Python",
              "category": "technical", "current_level": 3, "target_level": 5,
              "gap": 2, "notes": None}],
        ]
        from competencies.function import handler
        event = make_event("POST", "/competencies", body={
            "employee_id": 1,
            "skill_name": "Python",
            "current_level": 3,
            "target_level": 5,
            "category": "technical",
        }, token=contributor_token())
        res = handler(event)
        assert res["statusCode"] == 201
        body = json.loads(res["body"])
        assert body["gap"] == 2
