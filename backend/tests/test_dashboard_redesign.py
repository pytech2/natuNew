"""
Test Dashboard Redesign - Iteration 13
Tests the new dashboard layout with:
1. Category breakdown (residential, commercial, vacant_plot, agriculture, etc.)
2. Owner NA and Mobile NA counts
3. Bill Distribution Status from submissions
4. Employee + Attendance data
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "nastu123"
TOWN_CODE = "THS"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token and town code"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "X-Town-Code": TOWN_CODE,
        "Content-Type": "application/json"
    }


class TestAdminLogin:
    """Test admin login and town selection"""
    
    def test_admin_login_success(self):
        """Test login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "ADMIN"
        print(f"✓ Admin login successful - User: {data['user']['name']}")
    
    def test_towns_list(self):
        """Test that Thanesar town is available"""
        response = requests.get(f"{BASE_URL}/api/towns")
        assert response.status_code == 200
        data = response.json()
        assert "towns" in data
        
        # Find Thanesar town
        ths_town = next((t for t in data["towns"] if t["code"] == "THS"), None)
        assert ths_town is not None, "Thanesar (THS) town not found"
        print(f"✓ Found Thanesar town: {ths_town['name']}")


class TestDashboardAPI:
    """Test the dashboard API endpoint returns all required fields"""
    
    def test_dashboard_returns_category_breakdown(self, headers):
        """Test dashboard returns category breakdown (residential, commercial, etc.)"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check category object exists
        assert "category" in data, "Dashboard missing 'category' field"
        category = data["category"]
        
        # Check all category types
        expected_categories = ["residential", "commercial", "vacant_plot", "agriculture", "mix_use", "industrial"]
        for cat in expected_categories:
            assert cat in category, f"Category missing: {cat}"
        
        print(f"✓ Category breakdown: {category}")
    
    def test_dashboard_returns_owner_na_count(self, headers):
        """Test dashboard returns owner_na count"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "owner_na" in data, "Dashboard missing 'owner_na' field"
        assert isinstance(data["owner_na"], int), "owner_na should be integer"
        print(f"✓ Owner NA count: {data['owner_na']}")
    
    def test_dashboard_returns_mobile_na_count(self, headers):
        """Test dashboard returns mobile_na count"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "mobile_na" in data, "Dashboard missing 'mobile_na' field"
        assert isinstance(data["mobile_na"], int), "mobile_na should be integer"
        print(f"✓ Mobile NA count: {data['mobile_na']}")
    
    def test_dashboard_returns_total_properties(self, headers):
        """Test dashboard returns total properties count"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert data["total"] > 0, "Total properties should be greater than 0"
        print(f"✓ Total properties: {data['total']}")
    
    def test_dashboard_returns_pending_properties(self, headers):
        """Test dashboard returns pending count"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "pending" in data
        print(f"✓ Pending properties: {data['pending']}")
    
    def test_dashboard_returns_colonies_count(self, headers):
        """Test dashboard returns colonies count"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "colonies" in data
        print(f"✓ Total colonies: {data['colonies']}")
    
    def test_dashboard_returns_employee_count(self, headers):
        """Test dashboard returns employees count"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "employees" in data
        print(f"✓ Total employees: {data['employees']}")
    
    def test_dashboard_full_response_structure(self, headers):
        """Test complete dashboard response matches expected structure"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Print full response for debugging
        print("\n=== Full Dashboard Response ===")
        print(f"Total: {data.get('total')}")
        print(f"Approved: {data.get('approved')}")
        print(f"Pending: {data.get('pending')}")
        print(f"Rejected: {data.get('rejected')}")
        print(f"Employees: {data.get('employees')}")
        print(f"Colonies: {data.get('colonies')}")
        print(f"Category: {data.get('category')}")
        print(f"Owner NA: {data.get('owner_na')}")
        print(f"Mobile NA: {data.get('mobile_na')}")
        print("==============================\n")
        
        # Verify all expected fields
        required_fields = ["total", "approved", "pending", "rejected", "employees", "colonies", "category", "owner_na", "mobile_na"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print("✓ All required fields present in dashboard response")


class TestSubmissionStats:
    """Test submission stats for Bill Distribution Status"""
    
    def test_submission_stats_endpoint(self, headers):
        """Test submission-stats endpoint for bill distribution status"""
        response = requests.get(f"{BASE_URL}/api/admin/submission-stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields for Bill Distribution Status
        assert "total" in data, "Missing total"
        assert "pending" in data, "Missing pending"
        assert "approved" in data, "Missing approved"
        assert "rejected" in data, "Missing rejected"
        
        print("✓ Bill Distribution Status:")
        print(f"  - Total: {data.get('total')}")
        print(f"  - Pending: {data.get('pending')}")
        print(f"  - Approved: {data.get('approved')}")
        print(f"  - Rejected: {data.get('rejected')}")


class TestEmployeeAndAttendance:
    """Test employee progress and attendance endpoints"""
    
    def test_employee_progress_endpoint(self, headers):
        """Test employee-progress endpoint returns employee list"""
        response = requests.get(f"{BASE_URL}/api/admin/employee-progress", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Response should be a list of employees
        assert isinstance(data, list), "Employee progress should return a list"
        print(f"✓ Employee progress: {len(data)} employees")
        
        if data:
            emp = data[0]
            print(f"  Sample employee: {emp.get('employee_name')}")
            print(f"  - Total assigned: {emp.get('total_assigned')}")
            print(f"  - Completed: {emp.get('completed')}")
            print(f"  - Today completed: {emp.get('today_completed')}")
    
    def test_attendance_endpoint(self, headers):
        """Test attendance endpoint returns today's attendance"""
        from datetime import datetime
        today = datetime.now().strftime('%Y-%m-%d')
        response = requests.get(f"{BASE_URL}/api/admin/attendance?date={today}&limit=100", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "attendance" in data or "total" in data
        attendance_count = len(data.get("attendance", []))
        print(f"✓ Today's attendance: {attendance_count} records")


class TestDashboardNotContainsApprovedRejectedTop:
    """Verify Approved and Rejected are NOT in top row (frontend verification)"""
    
    def test_dashboard_has_approved_rejected_in_response(self, headers):
        """
        Backend still returns approved/rejected (for charts/tables).
        The frontend decides NOT to show them in top row - verified separately.
        """
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Backend DOES return these values (needed for pie chart & tables)
        assert "approved" in data
        assert "rejected" in data
        
        print(f"✓ Approved ({data['approved']}) and Rejected ({data['rejected']}) are in API response")
        print("  Note: Frontend should NOT display these in top row - to be verified in UI test")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
