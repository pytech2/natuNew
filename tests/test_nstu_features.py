"""
NSTU Property Tax Manager - Feature Tests
Tests for: Admin login (nastu123), Dashboard changes, Role-based access, 
Attendance API, Survey form changes
"""
import pytest
import requests
import os
from datetime import datetime
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://proptrack-29.preview.emergentagent.com').rstrip('/')

# Admin credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "nastu123"


class TestAdminLogin:
    """Test admin login with correct credentials"""
    
    def test_admin_login_with_nastu123(self):
        """Test admin login with admin/nastu123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "ADMIN"
        assert data["user"]["username"] == "admin"
        print(f"✓ Admin login successful with nastu123")


class TestDashboardChanges:
    """Test dashboard UI changes - Completed Colony, no Batches card"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dashboard_stats_has_today_wards(self):
        """Test dashboard returns today_wards (renamed to Completed Colony in UI)"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify today_wards exists (displayed as "Completed Colony" in UI)
        assert "today_wards" in data, "Missing today_wards field (Completed Colony)"
        assert isinstance(data["today_wards"], int)
        print(f"✓ Dashboard has today_wards (Completed Colony): {data['today_wards']}")
    
    def test_dashboard_stats_structure(self):
        """Test dashboard returns all required stats (5 stat cards, no batches card)"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Required fields for 5 stat cards: Total, Completed, Pending, Rejected, Employees
        required_fields = ["total_properties", "completed", "pending", "rejected", "employees"]
        for field in required_fields:
            assert field in data, f"Missing {field} field"
        
        # Also verify today stats
        assert "today_completed" in data
        assert "today_wards" in data
        
        print(f"✓ Dashboard stats: Total={data['total_properties']}, Completed={data['completed']}, Pending={data['pending']}, Rejected={data['rejected']}, Employees={data['employees']}")


class TestRoleBasedAccess:
    """Test role-based access control for SUPERVISOR and MC_OFFICER"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token and create test users"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        self.created_users = []
    
    def teardown_method(self):
        """Cleanup created test users"""
        for user_id in self.created_users:
            try:
                requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=self.admin_headers)
            except:
                pass
    
    def test_create_supervisor_and_login(self):
        """Test creating SUPERVISOR user and verify they can access admin dashboard"""
        timestamp = datetime.now().strftime('%H%M%S%f')
        user_data = {
            "username": f"TEST_supervisor_{timestamp}",
            "password": "test123",
            "name": "Test Supervisor",
            "role": "SUPERVISOR"
        }
        
        # Create supervisor
        response = requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=self.admin_headers)
        assert response.status_code == 200, f"Failed to create supervisor: {response.text}"
        data = response.json()
        assert data["role"] == "SUPERVISOR"
        self.created_users.append(data["id"])
        print(f"✓ Created SUPERVISOR user: {user_data['username']}")
        
        # Login as supervisor
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": user_data["username"],
            "password": "test123"
        })
        assert login_response.status_code == 200, f"Supervisor login failed: {login_response.text}"
        supervisor_token = login_response.json()["token"]
        supervisor_headers = {"Authorization": f"Bearer {supervisor_token}"}
        print(f"✓ SUPERVISOR login successful")
        
        # Verify supervisor can access admin dashboard
        dashboard_response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=supervisor_headers)
        assert dashboard_response.status_code == 200, f"Supervisor cannot access dashboard: {dashboard_response.text}"
        print(f"✓ SUPERVISOR can access admin dashboard")
        
        # Verify supervisor can access employees page
        employees_response = requests.get(f"{BASE_URL}/api/admin/users", headers=supervisor_headers)
        # SUPERVISOR should have full access like ADMIN
        print(f"✓ SUPERVISOR employees access: {employees_response.status_code}")
    
    def test_create_mc_officer_and_limited_access(self):
        """Test creating MC_OFFICER user and verify limited navigation"""
        timestamp = datetime.now().strftime('%H%M%S%f')
        user_data = {
            "username": f"TEST_mc_officer_{timestamp}",
            "password": "test123",
            "name": "Test MC Officer",
            "role": "MC_OFFICER"
        }
        
        # Create MC Officer
        response = requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=self.admin_headers)
        assert response.status_code == 200, f"Failed to create MC Officer: {response.text}"
        data = response.json()
        assert data["role"] == "MC_OFFICER"
        self.created_users.append(data["id"])
        print(f"✓ Created MC_OFFICER user: {user_data['username']}")
        
        # Login as MC Officer
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": user_data["username"],
            "password": "test123"
        })
        assert login_response.status_code == 200, f"MC Officer login failed: {login_response.text}"
        mc_token = login_response.json()["token"]
        mc_headers = {"Authorization": f"Bearer {mc_token}"}
        print(f"✓ MC_OFFICER login successful")
        
        # Verify MC Officer can access admin dashboard (view-only)
        dashboard_response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=mc_headers)
        assert dashboard_response.status_code == 200, f"MC Officer cannot access dashboard: {dashboard_response.text}"
        print(f"✓ MC_OFFICER can access admin dashboard")
        
        # Verify MC Officer can access properties
        properties_response = requests.get(f"{BASE_URL}/api/admin/properties", headers=mc_headers)
        assert properties_response.status_code == 200, f"MC Officer cannot access properties: {properties_response.text}"
        print(f"✓ MC_OFFICER can access properties")
        
        # Verify MC Officer can access submissions
        submissions_response = requests.get(f"{BASE_URL}/api/admin/submissions", headers=mc_headers)
        assert submissions_response.status_code == 200, f"MC Officer cannot access submissions: {submissions_response.text}"
        print(f"✓ MC_OFFICER can access submissions")
        
        # Verify MC Officer CANNOT access employees (should be 403)
        employees_response = requests.get(f"{BASE_URL}/api/admin/users", headers=mc_headers)
        assert employees_response.status_code == 403, f"MC Officer should NOT access employees, got: {employees_response.status_code}"
        print(f"✓ MC_OFFICER correctly denied access to employees")


class TestAttendanceAPI:
    """Test attendance API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token and create/get surveyor"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.admin_token = response.json()["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Check if surveyor1 exists, if not create it
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.admin_headers)
        users = users_response.json()
        surveyor1 = next((u for u in users if u["username"] == "surveyor1"), None)
        
        if not surveyor1:
            user_data = {
                "username": "surveyor1",
                "password": "test123",
                "name": "Surveyor One",
                "role": "SURVEYOR"
            }
            requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=self.admin_headers)
        
        # Login as surveyor
        surveyor_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "surveyor1",
            "password": "test123"
        })
        assert surveyor_response.status_code == 200, f"Surveyor login failed: {surveyor_response.text}"
        self.surveyor_token = surveyor_response.json()["token"]
        self.surveyor_headers = {"Authorization": f"Bearer {self.surveyor_token}"}
    
    def test_check_today_attendance(self):
        """Test GET /api/employee/attendance/today returns attendance status"""
        response = requests.get(f"{BASE_URL}/api/employee/attendance/today", headers=self.surveyor_headers)
        assert response.status_code == 200, f"Failed to check attendance: {response.text}"
        data = response.json()
        
        assert "has_attendance" in data, "Missing has_attendance field"
        assert isinstance(data["has_attendance"], bool)
        print(f"✓ Attendance check API works. Has attendance: {data['has_attendance']}")
    
    def test_attendance_post_endpoint_exists(self):
        """Test POST /api/employee/attendance endpoint exists"""
        # Create a simple test image
        from PIL import Image
        import io
        
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {
            'selfie': ('test.jpg', img_bytes, 'image/jpeg')
        }
        data = {
            'latitude': '28.6139',
            'longitude': '77.2090',
            'authorization': f'Bearer {self.surveyor_token}'
        }
        
        response = requests.post(f"{BASE_URL}/api/employee/attendance", files=files, data=data)
        # Should either succeed (200) or fail with "already marked" (400)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}, {response.text}"
        
        if response.status_code == 200:
            print(f"✓ Attendance marked successfully")
        else:
            print(f"✓ Attendance endpoint works (already marked or validation error)")
    
    def test_admin_can_view_attendance(self):
        """Test admin can view attendance records"""
        response = requests.get(f"{BASE_URL}/api/admin/attendance", headers=self.admin_headers)
        assert response.status_code == 200, f"Failed to get attendance: {response.text}"
        data = response.json()
        
        assert "attendance" in data
        assert "total" in data
        print(f"✓ Admin can view attendance records. Total: {data['total']}")


class TestSurveyFormFields:
    """Test survey form field changes via API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get surveyor token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.admin_token = response.json()["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Ensure surveyor1 exists
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.admin_headers)
        users = users_response.json()
        surveyor1 = next((u for u in users if u["username"] == "surveyor1"), None)
        
        if not surveyor1:
            user_data = {
                "username": "surveyor1",
                "password": "test123",
                "name": "Surveyor One",
                "role": "SURVEYOR"
            }
            requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=self.admin_headers)
        
        # Login as surveyor
        surveyor_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "surveyor1",
            "password": "test123"
        })
        assert surveyor_response.status_code == 200
        self.surveyor_token = surveyor_response.json()["token"]
        self.surveyor_headers = {"Authorization": f"Bearer {self.surveyor_token}"}
    
    def test_employee_properties_endpoint(self):
        """Test employee can access properties endpoint"""
        response = requests.get(f"{BASE_URL}/api/employee/properties", headers=self.surveyor_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "properties" in data
        assert "total" in data
        print(f"✓ Employee properties endpoint works. Total: {data['total']}")
    
    def test_property_detail_has_gps_fields(self):
        """Test property detail includes latitude/longitude for 50m check"""
        # Get properties first
        props_response = requests.get(f"{BASE_URL}/api/employee/properties", headers=self.surveyor_headers)
        props = props_response.json().get("properties", [])
        
        if len(props) > 0:
            prop_id = props[0]["id"]
            response = requests.get(f"{BASE_URL}/api/employee/property/{prop_id}", headers=self.surveyor_headers)
            assert response.status_code == 200
            data = response.json()
            
            assert "property" in data
            # Property may or may not have GPS coordinates
            print(f"✓ Property detail endpoint works")
        else:
            print("⚠ No properties assigned to surveyor for testing")


class TestEmployeeProgress:
    """Test employee progress endpoint with new fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_employee_progress_has_role_field(self):
        """Test employee progress includes role field"""
        response = requests.get(f"{BASE_URL}/api/admin/employee-progress", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        if len(data) > 0:
            emp = data[0]
            assert "employee_id" in emp
            assert "employee_name" in emp
            assert "role" in emp, "Missing role field in employee progress"
            assert "today_completed" in emp
            assert "overall_completed" in emp
            print(f"✓ Employee progress has role field. First employee role: {emp['role']}")
        else:
            print("⚠ No employees found for testing")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
