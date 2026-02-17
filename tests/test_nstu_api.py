"""
NSTU Property Tax Manager API Tests
Tests for: Admin login, Employee management (SURVEYOR, SUPERVISOR, MC_OFFICER roles),
Dashboard stats, Submissions approve/reject, and Surveyor login
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://survey-management-3.preview.emergentagent.com').rstrip('/')

class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_init_admin(self):
        """Test admin initialization endpoint"""
        response = requests.post(f"{BASE_URL}/api/init-admin")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data or "admin" in str(data).lower()
    
    def test_admin_login_success(self):
        """Test admin login with admin/admin123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "ADMIN"
        assert data["user"]["username"] == "admin"
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestAdminDashboard:
    """Admin dashboard tests - Today stats and Employee Progress"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        requests.post(f"{BASE_URL}/api/init-admin")
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dashboard_stats_structure(self):
        """Test dashboard returns today_completed and today_wards"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields exist
        assert "total_properties" in data
        assert "completed" in data
        assert "pending" in data
        assert "in_progress" in data
        assert "rejected" in data
        assert "employees" in data
        assert "batches" in data
        # NEW: Today stats
        assert "today_completed" in data, "Missing today_completed field"
        assert "today_wards" in data, "Missing today_wards field"
        
        # Verify types
        assert isinstance(data["today_completed"], int)
        assert isinstance(data["today_wards"], int)
    
    def test_employee_progress_report(self):
        """Test employee progress report with Today Done and Overall Done columns"""
        response = requests.get(f"{BASE_URL}/api/admin/employee-progress", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list)
        
        # If there are employees, verify structure
        if len(data) > 0:
            emp = data[0]
            assert "employee_id" in emp
            assert "employee_name" in emp
            assert "role" in emp
            assert "total_assigned" in emp
            assert "completed" in emp
            assert "pending" in emp
            # NEW: Today Done and Overall Done
            assert "today_completed" in emp, "Missing today_completed in employee progress"
            assert "overall_completed" in emp, "Missing overall_completed in employee progress"


class TestEmployeeManagement:
    """Employee management tests - New roles: SURVEYOR, SUPERVISOR, MC_OFFICER"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        requests.post(f"{BASE_URL}/api/init-admin")
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.created_users = []
    
    def teardown_method(self):
        """Cleanup created test users"""
        for user_id in self.created_users:
            try:
                requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=self.headers)
            except:
                pass
    
    def test_create_surveyor(self):
        """Test creating employee with SURVEYOR role"""
        timestamp = datetime.now().strftime('%H%M%S%f')
        user_data = {
            "username": f"TEST_surveyor_{timestamp}",
            "password": "test123",
            "name": "Test Surveyor",
            "role": "SURVEYOR",
            "assigned_area": "Ward 1"
        }
        response = requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["role"] == "SURVEYOR"
        assert data["name"] == "Test Surveyor"
        assert "id" in data
        self.created_users.append(data["id"])
        
        # Verify by GET
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        users = users_response.json()
        created_user = next((u for u in users if u["id"] == data["id"]), None)
        assert created_user is not None
        assert created_user["role"] == "SURVEYOR"
    
    def test_create_supervisor(self):
        """Test creating employee with SUPERVISOR role"""
        timestamp = datetime.now().strftime('%H%M%S%f')
        user_data = {
            "username": f"TEST_supervisor_{timestamp}",
            "password": "test123",
            "name": "Test Supervisor",
            "role": "SUPERVISOR",
            "assigned_area": "Ward 2"
        }
        response = requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["role"] == "SUPERVISOR"
        self.created_users.append(data["id"])
    
    def test_create_mc_officer(self):
        """Test creating employee with MC_OFFICER role"""
        timestamp = datetime.now().strftime('%H%M%S%f')
        user_data = {
            "username": f"TEST_mc_officer_{timestamp}",
            "password": "test123",
            "name": "Test MC Officer",
            "role": "MC_OFFICER",
            "assigned_area": "Ward 3"
        }
        response = requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["role"] == "MC_OFFICER"
        self.created_users.append(data["id"])
    
    def test_list_users(self):
        """Test listing all users"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestSurveyorLogin:
    """Test surveyor login and access to employee dashboard"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a surveyor user for testing"""
        requests.post(f"{BASE_URL}/api/init-admin")
        # Login as admin first
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        self.admin_token = admin_response.json()["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Check if surveyor1 exists, if not create it
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.admin_headers)
        users = users_response.json()
        surveyor1 = next((u for u in users if u["username"] == "surveyor1"), None)
        
        if not surveyor1:
            # Create surveyor1
            user_data = {
                "username": "surveyor1",
                "password": "test123",
                "name": "Surveyor One",
                "role": "SURVEYOR",
                "assigned_area": "Ward 1"
            }
            requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=self.admin_headers)
    
    def test_surveyor_login(self):
        """Test surveyor1 can login with test123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "surveyor1",
            "password": "test123"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "SURVEYOR"
        assert data["user"]["username"] == "surveyor1"
    
    def test_surveyor_access_employee_progress(self):
        """Test surveyor can access employee progress endpoint"""
        # Login as surveyor
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "surveyor1",
            "password": "test123"
        })
        token = login_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Access employee progress
        response = requests.get(f"{BASE_URL}/api/employee/progress", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure for surveyor dashboard
        # Note: completed = Approved, in_progress = In Review
        assert "total_assigned" in data
        assert "completed" in data  # This is "Approved" in UI
        assert "pending" in data
        assert "in_progress" in data  # This is "In Review" in UI
        assert "rejected" in data
        # NEW: Today's progress and Total Complete Data
        assert "today_completed" in data, "Missing today_completed for surveyor"
        assert "total_completed" in data, "Missing total_completed for surveyor"


class TestSubmissionsApproveReject:
    """Test submissions approve/reject functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        requests.post(f"{BASE_URL}/api/init-admin")
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_submissions(self):
        """Test listing submissions"""
        response = requests.get(f"{BASE_URL}/api/admin/submissions", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "submissions" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
    
    def test_approve_submission_endpoint_exists(self):
        """Test approve/reject endpoint exists"""
        # Test with invalid submission ID to verify endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/admin/submissions/approve",
            json={
                "submission_id": "non-existent-id",
                "action": "APPROVE"
            },
            headers=self.headers
        )
        # Should return 404 (not found) not 405 (method not allowed)
        assert response.status_code in [404, 400], f"Expected 404 or 400, got {response.status_code}"
    
    def test_reject_requires_remarks(self):
        """Test that rejection requires remarks"""
        # First get a submission if any exists
        submissions_response = requests.get(f"{BASE_URL}/api/admin/submissions", headers=self.headers)
        submissions = submissions_response.json().get("submissions", [])
        
        if len(submissions) > 0:
            submission_id = submissions[0]["id"]
            # Try to reject without remarks
            response = requests.post(
                f"{BASE_URL}/api/admin/submissions/approve",
                json={
                    "submission_id": submission_id,
                    "action": "REJECT"
                    # No remarks
                },
                headers=self.headers
            )
            # Should fail because remarks are required for rejection
            assert response.status_code == 400
            data = response.json()
            assert "remarks" in str(data).lower() or "required" in str(data).lower()


class TestCSVUploadFormat:
    """Test CSV upload with new format: property_id, owner_name, mobile, address, amount, ward"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        requests.post(f"{BASE_URL}/api/init-admin")
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_batches(self):
        """Test listing batches"""
        response = requests.get(f"{BASE_URL}/api/admin/batches", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_list_wards(self):
        """Test listing wards"""
        response = requests.get(f"{BASE_URL}/api/admin/wards", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "wards" in data


class TestSurveyFormFields:
    """Test survey form new fields via API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get surveyor token"""
        requests.post(f"{BASE_URL}/api/init-admin")
        
        # Ensure surveyor1 exists
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        admin_token = admin_response.json()["token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        users = users_response.json()
        surveyor1 = next((u for u in users if u["username"] == "surveyor1"), None)
        
        if not surveyor1:
            user_data = {
                "username": "surveyor1",
                "password": "test123",
                "name": "Surveyor One",
                "role": "SURVEYOR"
            }
            requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=admin_headers)
        
        # Login as surveyor
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "surveyor1",
            "password": "test123"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_employee_properties_endpoint(self):
        """Test employee can access properties endpoint"""
        response = requests.get(f"{BASE_URL}/api/employee/properties", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "properties" in data
        assert "total" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
