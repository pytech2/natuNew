"""
Test Multi-Tenant Town Functionality
- Tests town listing, selection, and data isolation
- Tests that Thanesar (THS) has 674 properties
- Tests that xyz (XYV) has 0 properties
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://town-survey-platform.preview.emergentagent.com')

class TestMultiTenantTowns:
    """Multi-tenant town functionality tests"""
    
    # Class level fixtures
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "nastu123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    # ==================== Town List Tests ====================
    
    def test_towns_list_public(self):
        """Test that towns list is accessible without auth"""
        response = self.session.get(f"{BASE_URL}/api/towns")
        assert response.status_code == 200, f"Towns list failed: {response.text}"
        
        data = response.json()
        assert "towns" in data, "Response should contain 'towns' key"
        assert len(data["towns"]) >= 2, "Should have at least 2 towns (Thanesar and xyz)"
        
        # Verify town codes
        town_codes = [t["code"] for t in data["towns"]]
        assert "THS" in town_codes, "Thanesar (THS) should exist"
        assert "XYV" in town_codes, "xyz (XYV) should exist"
        print(f"SUCCESS: Found {len(data['towns'])} towns: {town_codes}")
    
    def test_towns_admin_manage(self):
        """Test admin towns management endpoint with stats"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/towns/manage",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Admin towns manage failed: {response.text}"
        
        data = response.json()
        assert "towns" in data, "Response should contain 'towns' key"
        
        # Find Thanesar and verify property count
        thanesar = next((t for t in data["towns"] if t["code"] == "THS"), None)
        assert thanesar is not None, "Thanesar should exist in towns list"
        assert thanesar["property_count"] == 674, f"Thanesar should have 674 properties, got {thanesar.get('property_count')}"
        print(f"SUCCESS: Thanesar has {thanesar['property_count']} properties")
        
        # Find xyz and verify property count is 0
        xyz = next((t for t in data["towns"] if t["code"] == "XYV"), None)
        assert xyz is not None, "xyz should exist in towns list"
        assert xyz["property_count"] == 0, f"xyz should have 0 properties, got {xyz.get('property_count')}"
        print(f"SUCCESS: xyz has {xyz['property_count']} properties (empty)")
    
    # ==================== Dashboard Tests with Town Context ====================
    
    def test_dashboard_thanesar(self):
        """Test dashboard with Thanesar town context - should show 674 properties"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Town-Code": "THS"
            }
        )
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        assert data["total"] == 674, f"Thanesar should have 674 total properties, got {data.get('total')}"
        assert data["employees"] == 12, f"Thanesar should have 12 employees, got {data.get('employees')}"
        print(f"SUCCESS: Thanesar dashboard shows {data['total']} properties, {data['employees']} employees")
        print(f"  - Approved: {data.get('approved')}")
        print(f"  - Pending: {data.get('pending')}")
    
    def test_dashboard_xyz(self):
        """Test dashboard with xyz town context - should show 0 properties"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Town-Code": "XYV"
            }
        )
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        assert data["total"] == 0, f"xyz should have 0 total properties, got {data.get('total')}"
        assert data.get("employees", 0) == 0, f"xyz should have 0 employees, got {data.get('employees')}"
        print(f"SUCCESS: xyz dashboard shows {data['total']} properties, {data.get('employees', 0)} employees (empty)")
    
    # ==================== Properties Tests with Town Context ====================
    
    def test_properties_thanesar(self):
        """Test properties endpoint with Thanesar context"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/properties?limit=10",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Town-Code": "THS"
            }
        )
        assert response.status_code == 200, f"Properties failed: {response.text}"
        
        data = response.json()
        assert data["total"] == 674, f"Thanesar should have 674 total properties, got {data.get('total')}"
        assert len(data["properties"]) <= 10, "Should return max 10 properties"
        print(f"SUCCESS: Thanesar has {data['total']} properties")
    
    def test_properties_xyz(self):
        """Test properties endpoint with xyz context - should be empty"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/properties?limit=10",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Town-Code": "XYV"
            }
        )
        assert response.status_code == 200, f"Properties failed: {response.text}"
        
        data = response.json()
        assert data["total"] == 0, f"xyz should have 0 properties, got {data.get('total')}"
        assert len(data["properties"]) == 0, "xyz should have no properties"
        print(f"SUCCESS: xyz has {data['total']} properties (empty)")
    
    # ==================== Submissions Tests with Town Context ====================
    
    def test_submissions_thanesar(self):
        """Test submissions endpoint with Thanesar context"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/submissions?limit=10",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Town-Code": "THS"
            }
        )
        assert response.status_code == 200, f"Submissions failed: {response.text}"
        
        data = response.json()
        # Thanesar should have some submissions
        print(f"SUCCESS: Thanesar has {data.get('total', 0)} submissions")
    
    def test_submissions_xyz(self):
        """Test submissions endpoint with xyz context - should be empty"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/submissions?limit=10",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Town-Code": "XYV"
            }
        )
        assert response.status_code == 200, f"Submissions failed: {response.text}"
        
        data = response.json()
        assert data.get("total", 0) == 0, f"xyz should have 0 submissions, got {data.get('total')}"
        print(f"SUCCESS: xyz has {data.get('total', 0)} submissions (empty)")
    
    # ==================== Users/Employees Tests ====================
    
    def test_users_global(self):
        """Test that users are global (not town-scoped) - visible from both towns"""
        token = self.get_admin_token()
        
        # Get users with Thanesar context
        response_ths = self.session.get(
            f"{BASE_URL}/api/admin/users",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Town-Code": "THS"
            }
        )
        assert response_ths.status_code == 200, f"Users for THS failed: {response_ths.text}"
        users_ths = response_ths.json()
        
        # Get users with xyz context
        response_xyz = self.session.get(
            f"{BASE_URL}/api/admin/users",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Town-Code": "XYV"
            }
        )
        assert response_xyz.status_code == 200, f"Users for XYV failed: {response_xyz.text}"
        users_xyz = response_xyz.json()
        
        # Users should be the same from both contexts (global)
        assert len(users_ths) == len(users_xyz), "Users list should be same for both towns (users are global)"
        print(f"SUCCESS: Users are global - {len(users_ths)} users visible from both towns")


class TestLoginFlow:
    """Test login and town selection flow"""
    
    def test_login_returns_accessible_towns(self):
        """Test that login response includes accessible towns"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "nastu123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "accessible_towns" in data, "Login response should include accessible_towns"
        assert len(data["accessible_towns"]) >= 2, "Admin should have access to at least 2 towns"
        
        town_codes = [t["code"] for t in data["accessible_towns"]]
        assert "THS" in town_codes, "Thanesar should be accessible"
        assert "XYV" in town_codes, "xyz should be accessible"
        print(f"SUCCESS: Login returns {len(data['accessible_towns'])} accessible towns for admin")
    
    def test_login_admin_credentials(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "nastu123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Login response should include token"
        assert data["user"]["role"] == "ADMIN", "User should be admin"
        print(f"SUCCESS: Admin login works - user: {data['user']['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
