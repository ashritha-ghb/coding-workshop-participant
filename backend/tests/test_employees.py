"""
Unit tests for the employees service handler.
DB calls are mocked so no real database is needed.
"""

import json
import sys
import os
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "employees"))

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


def admin_token():
    return create_token("1", "admin@acme.com", "admin")


def manager_token():
    return create_token("2", "mgr@acme.com", "manager")


def viewer_token():
    return create_token("3", "viewer@acme.com", "viewer")


class TestEmployeesList:
    @patch("employees.function.run_query")
    def test_list_returns_employees(self, mock_query):
        mock_query.return_value = [
            {"id": 1, "full_name": "Alice Smith", "email": "alice@acme.com",
             "employee_code": "EMP001", "department": "Engineering",
             "job_title": "Engineer", "employment_status": "active"}
        ]
        from employees.function import handler
        event = make_event("GET", "/employees", token=viewer_token())
        res = handler(event)
        assert res["statusCode"] == 200
        body = json.loads(res["body"])
        assert body["total"] == 1
        assert body["employees"][0]["full_name"] == "Alice Smith"

    @patch("employees.function.run_query")
    def test_list_requires_auth(self, mock_query):
        from employees.function import handler
        event = make_event("GET", "/employees")
        res = handler(event)
        assert res["statusCode"] in (401, 403)


class TestEmployeesCreate:
    @patch("employees.function.run_query")
    def test_create_succeeds_with_valid_data(self, mock_query):
        mock_query.side_effect = [
            None,  # _ensure_table
            None,  # INSERT
            [{"id": 1, "employee_code": "EMP002", "full_name": "Bob Jones",
              "email": "bob@acme.com", "department": "HR", "job_title": "Recruiter",
              "employment_status": "active"}],  # SELECT after insert
        ]
        from employees.function import handler
        event = make_event("POST", "/employees", body={
            "employee_code": "EMP002",
            "full_name": "Bob Jones",
            "email": "bob@acme.com",
            "department": "HR",
        }, token=manager_token())
        res = handler(event)
        assert res["statusCode"] == 201

    @patch("employees.function.run_query")
    def test_create_fails_missing_required_fields(self, mock_query):
        mock_query.return_value = None
        from employees.function import handler
        event = make_event("POST", "/employees", body={
            "full_name": "No Code",
        }, token=manager_token())
        res = handler(event)
        assert res["statusCode"] == 400
        body = json.loads(res["body"])
        assert "employee_code" in body["error"]

    @patch("employees.function.run_query")
    def test_create_blocked_for_viewer(self, mock_query):
        mock_query.return_value = None
        from employees.function import handler
        event = make_event("POST", "/employees", body={
            "employee_code": "EMP003",
            "full_name": "Carol White",
            "email": "carol@acme.com",
        }, token=viewer_token())
        res = handler(event)
        assert res["statusCode"] == 403


class TestEmployeesDelete:
    @patch("employees.function.run_query")
    def test_delete_requires_admin(self, mock_query):
        mock_query.return_value = [{"id": 1}]
        from employees.function import handler
        event = make_event("DELETE", "/employees/1", token=manager_token())
        res = handler(event)
        assert res["statusCode"] == 403

    @patch("employees.function.run_query")
    def test_delete_returns_404_when_not_found(self, mock_query):
        mock_query.side_effect = [None, []]  # ensure_table, SELECT
        from employees.function import handler
        event = make_event("DELETE", "/employees/999", token=admin_token())
        res = handler(event)
        assert res["statusCode"] == 404
