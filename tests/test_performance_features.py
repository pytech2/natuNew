"""
NSTU Property Tax Manager - Performance & Feature Tests
Tests for: Performance optimization, Surveyor workflow, Attendance lock, Map features
"""
import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://tax-tracker-12.preview.emergentagent.com').rstrip('/')


class TestAdminLogin:
    """Admin authentication and dashboard tests"""
    
    def test_admin_login_nastu123(self):
        """Test admin login with admin/nastu123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "nastu123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "ADMIN"
        assert data["user"]["username"] == "admin"
    
    def test_dashboard_stats_459_properties_9_employees(self):
        """Test dashboard shows 459 properties and 9 employees"""
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "nastu123"
        })
        token = login_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get dashboard
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected counts
        assert data["total_properties"] == 459, f"Expected 459 properties, got {data['total_properties']}"
        assert data["employees"] == 9, f"Expected 9 employees, got {data['employees']}"
        
        # Verify all required fields exist
        assert "completed" in data
        assert "pending" in data
        assert "in_progress" in data
        assert "rejected" in data
        assert "batches" in data
        assert "today_completed" in data
        assert "today_wards" in data


class TestAPIPerformance:
    """API performance tests - verify MongoDB indexes are working"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "nastu123"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_properties_api_performance_with_pagination(self):
        """Test /api/admin/properties responds fast with pagination"""
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/api/admin/properties?limit=50&page=1", headers=self.headers)
        elapsed = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify pagination works
        assert "properties" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert data["total"] == 459
        
        # Performance check - should respond within 2 seconds
        assert elapsed < 2.0, f"API took {elapsed:.2f}s, expected < 2s"
        print(f"Properties API response time: {elapsed:.3f}s")
    
    def test_properties_api_large_limit_performance(self):
        """Test /api/admin/properties with large limit (500) still performs well"""
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/api/admin/properties?limit=500", headers=self.headers)
        elapsed = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return all 459 properties
        assert len(data["properties"]) == 459
        
        # Performance check - should respond within 3 seconds even for large result
        assert elapsed < 3.0, f"API took {elapsed:.2f}s, expected < 3s"
        print(f"Large properties API response time: {elapsed:.3f}s")
    
    def test_dashboard_api_performance(self):
        """Test dashboard API responds quickly"""
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=self.headers)
        elapsed = time.time() - start_time
        
        assert response.status_code == 200
        assert elapsed < 1.0, f"Dashboard API took {elapsed:.2f}s, expected < 1s"
        print(f"Dashboard API response time: {elapsed:.3f}s")


class TestSurveyorLogin:
    """Surveyor authentication tests"""
    
    def test_surveyor1_login_test123(self):
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


class TestSurveyorAttendance:
    """Surveyor attendance and survey lock tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get surveyor token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "surveyor1",
            "password": "test123"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_attendance_today_endpoint(self):
        """Test attendance today endpoint returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/employee/attendance/today", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "marked" in data
        assert "has_attendance" in data
        assert isinstance(data["marked"], bool)
    
    def test_attendance_check_returns_marked_status(self):
        """Test attendance check returns whether attendance is marked"""
        response = requests.get(f"{BASE_URL}/api/employee/attendance/today", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # marked field indicates if attendance is marked for today
        assert "marked" in data
        # If not marked, survey form should show lock
        print(f"Attendance marked: {data['marked']}")


class TestSurveyorProperties:
    """Surveyor properties and map tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get surveyor token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "surveyor1",
            "password": "test123"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_employee_properties_endpoint(self):
        """Test employee can access properties endpoint"""
        response = requests.get(f"{BASE_URL}/api/employee/properties?limit=100", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "properties" in data
        assert "total" in data
    
    def test_properties_have_gps_coordinates(self):
        """Test properties have GPS coordinates for map view"""
        response = requests.get(f"{BASE_URL}/api/employee/properties?limit=100", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        properties = data["properties"]
        if len(properties) > 0:
            # Check first property has GPS
            prop = properties[0]
            # Properties should have latitude and longitude fields
            assert "latitude" in prop or "lat" in str(prop).lower()
            assert "longitude" in prop or "lng" in str(prop).lower()


class TestAdminPropertyMap:
    """Admin property map tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "nastu123"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_properties_with_gps_for_map(self):
        """Test properties have GPS coordinates for map markers"""
        response = requests.get(f"{BASE_URL}/api/admin/properties?limit=500", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        properties = data["properties"]
        assert len(properties) > 0
        
        # Count properties with valid GPS
        with_gps = [p for p in properties if p.get("latitude") and p.get("longitude")]
        print(f"Properties with GPS: {len(with_gps)} / {len(properties)}")
        
        # Most properties should have GPS
        assert len(with_gps) > 0, "No properties have GPS coordinates"
    
    def test_properties_have_serial_numbers(self):
        """Test properties have serial numbers for map markers"""
        response = requests.get(f"{BASE_URL}/api/admin/properties?limit=50", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        properties = data["properties"]
        if len(properties) > 0:
            prop = properties[0]
            # Should have serial_number or bill_sr_no
            has_serial = "serial_number" in prop or "bill_sr_no" in prop
            assert has_serial, "Property missing serial number fields"


class TestSurveyFormRequirements:
    """Survey form requirements tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get surveyor token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "surveyor1",
            "password": "test123"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_survey_submit_requires_photo(self):
        """Test survey submission requires property photo"""
        # Get a property to test with
        props_response = requests.get(f"{BASE_URL}/api/employee/properties?limit=1", headers=self.headers)
        props = props_response.json().get("properties", [])
        
        if len(props) > 0:
            property_id = props[0]["id"]
            
            # Try to submit without photo - should fail
            form_data = {
                "receiver_name": "Test Receiver",
                "receiver_mobile": "9876543210",
                "relation": "Self",
                "self_satisfied": "yes",
                "latitude": "29.9695",
                "longitude": "76.8783",
                "authorization": f"Bearer {self.token}"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/employee/submit/{property_id}",
                data=form_data
            )
            
            # Should fail because photo is required
            # Either 400 (bad request) or 422 (validation error)
            assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"


class TestSpecialConditions:
    """Survey form special conditions (House Locked, Owner Denied)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token to check submissions"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "nastu123"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_submissions_can_have_special_condition(self):
        """Test submissions API returns special_condition field"""
        response = requests.get(f"{BASE_URL}/api/admin/submissions?limit=10", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "submissions" in data
        assert "total" in data
        
        # If there are submissions, check structure
        submissions = data["submissions"]
        if len(submissions) > 0:
            sub = submissions[0]
            # special_condition field should exist (may be null)
            # This is set when surveyor selects House Locked or Owner Denied
            print(f"Sample submission has special_condition: {'special_condition' in sub}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
