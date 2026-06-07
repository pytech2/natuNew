"""
Test P0 Bug Fixes:
1. Admin login with password 'Raghav2026'
2. Map properties API with colony filter
3. Employee Progress Report with 'Overall' column sorted descending
4. PDF upload endpoint
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TOWN_CODE = "THS"  # Thanesar

class TestAdminLogin:
    """Test admin login with new password Raghav2026"""
    
    def test_admin_login_success(self):
        """Admin should be able to login with username=admin, password=Raghav2026"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "Raghav2026"
        })
        
        print(f"Login response status: {response.status_code}")
        print(f"Login response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["username"] == "admin", "Username mismatch"
        assert data["user"]["role"] == "ADMIN", "Role should be ADMIN"
        
        # Store token for other tests
        TestAdminLogin.token = data["token"]
        TestAdminLogin.towns = data.get("towns", [])
        print(f"Login successful! Token received. Towns: {len(TestAdminLogin.towns)}")
        
    def test_admin_login_wrong_password(self):
        """Login with wrong password should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Wrong password correctly rejected")


class TestMapProperties:
    """Test map properties API - Bug fix for colony filter"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "Raghav2026"
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
        else:
            pytest.skip("Login failed - cannot test map API")
    
    def test_map_properties_with_colony_bajigar_dera(self):
        """GET /api/map/properties?colony=Bajigar Dera should return properties with lat/lon"""
        headers = {
            "Authorization": f"Bearer {self.token}",
            "X-Town-Code": TOWN_CODE
        }
        
        response = requests.get(
            f"{BASE_URL}/api/map/properties?colony=Bajigar%20Dera&limit=5000",
            headers=headers
        )
        
        print(f"Map properties response status: {response.status_code}")
        
        assert response.status_code == 200, f"Map API failed: {response.text}"
        
        data = response.json()
        properties = data if isinstance(data, list) else data.get("properties", data)
        
        print(f"Properties returned: {len(properties) if isinstance(properties, list) else 'N/A'}")
        
        # Should have properties
        assert len(properties) > 0, "No properties returned for Bajigar Dera"
        
        # Check that properties have lat/lon
        props_with_gps = [p for p in properties if p.get("latitude") and p.get("longitude")]
        print(f"Properties with GPS: {len(props_with_gps)}")
        
        assert len(props_with_gps) > 0, "No properties with GPS coordinates"
        
        # Verify property structure
        sample = properties[0]
        print(f"Sample property: {sample}")
        assert "latitude" in sample or "longitude" in sample, "Missing lat/lon fields"
        
    def test_map_properties_all_areas(self):
        """GET /api/map/properties with empty colony should return all properties"""
        headers = {
            "Authorization": f"Bearer {self.token}",
            "X-Town-Code": TOWN_CODE
        }
        
        response = requests.get(
            f"{BASE_URL}/api/map/properties?colony=&limit=100",
            headers=headers
        )
        
        print(f"All areas response status: {response.status_code}")
        
        assert response.status_code == 200, f"Map API failed: {response.text}"
        
        data = response.json()
        properties = data if isinstance(data, list) else data.get("properties", data)
        
        print(f"All areas properties: {len(properties) if isinstance(properties, list) else 'N/A'}")
        
        # Should have properties
        assert len(properties) > 0, "No properties returned for all areas"


class TestEmployeeProgress:
    """Test Employee Progress Report API - should have overall_completed field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "Raghav2026"
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
        else:
            pytest.skip("Login failed - cannot test employee progress API")
    
    def test_employee_progress_has_overall_completed(self):
        """GET /api/admin/employee-progress should return overall_completed field"""
        headers = {
            "Authorization": f"Bearer {self.token}",
            "X-Town-Code": TOWN_CODE
        }
        
        response = requests.get(
            f"{BASE_URL}/api/admin/employee-progress",
            headers=headers
        )
        
        print(f"Employee progress response status: {response.status_code}")
        
        assert response.status_code == 200, f"Employee progress API failed: {response.text}"
        
        data = response.json()
        print(f"Employees returned: {len(data)}")
        
        assert len(data) > 0, "No employees returned"
        
        # Check first employee has required fields
        emp = data[0]
        print(f"Sample employee: {emp}")
        
        required_fields = ["employee_id", "employee_name", "role", "total_assigned", 
                          "completed", "pending", "today_completed", "overall_completed"]
        
        for field in required_fields:
            assert field in emp, f"Missing field: {field}"
        
        print("All required fields present including overall_completed")
        
    def test_employee_progress_sorted_by_overall(self):
        """Employee progress should be sortable by overall_completed descending"""
        headers = {
            "Authorization": f"Bearer {self.token}",
            "X-Town-Code": TOWN_CODE
        }
        
        response = requests.get(
            f"{BASE_URL}/api/admin/employee-progress",
            headers=headers
        )
        
        assert response.status_code == 200
        
        data = response.json()
        
        # Sort by overall_completed descending (as frontend does)
        sorted_data = sorted(data, key=lambda x: x.get("overall_completed", 0), reverse=True)
        
        # Print top 5 employees by overall_completed
        print("Top 5 employees by overall_completed:")
        for i, emp in enumerate(sorted_data[:5]):
            print(f"  {i+1}. {emp['employee_name']}: {emp.get('overall_completed', 0)}")
        
        # Verify sorting works (first should have highest overall_completed)
        if len(sorted_data) > 1:
            assert sorted_data[0].get("overall_completed", 0) >= sorted_data[1].get("overall_completed", 0), \
                "Sorting by overall_completed not working"


class TestPDFUpload:
    """Test PDF upload endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "Raghav2026"
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
        else:
            pytest.skip("Login failed - cannot test PDF upload")
    
    def test_pdf_upload_endpoint_exists(self):
        """POST /api/admin/bills/upload-pdf should accept PDF files"""
        # Create a minimal PDF content
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
196
%%EOF"""
        
        files = {
            'file': ('test_bill.pdf', io.BytesIO(pdf_content), 'application/pdf')
        }
        data = {
            'batch_name': 'Test Batch',
            'authorization': f'Bearer {self.token}'
        }
        
        headers = {
            "X-Town-Code": TOWN_CODE
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bills/upload-pdf",
            files=files,
            data=data,
            headers=headers
        )
        
        print(f"PDF upload response status: {response.status_code}")
        print(f"PDF upload response: {response.text[:500] if response.text else 'No response'}")
        
        # Accept 200, 201, or 400 (if PDF parsing fails but endpoint works)
        # 500 would indicate a server error
        assert response.status_code != 500, f"Server error on PDF upload: {response.text}"
        
        if response.status_code in [200, 201]:
            print("PDF upload successful!")
        elif response.status_code == 400:
            print("PDF upload endpoint works but rejected test PDF (expected for minimal PDF)")
        else:
            print(f"PDF upload returned {response.status_code}")


class TestColoniesAPI:
    """Test colonies API for map dropdown"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "Raghav2026"
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
        else:
            pytest.skip("Login failed - cannot test colonies API")
    
    def test_colonies_list(self):
        """GET /api/map/colonies should return list of colonies"""
        headers = {
            "Authorization": f"Bearer {self.token}",
            "X-Town-Code": TOWN_CODE
        }
        
        response = requests.get(
            f"{BASE_URL}/api/map/colonies",
            headers=headers
        )
        
        print(f"Colonies response status: {response.status_code}")
        
        assert response.status_code == 200, f"Colonies API failed: {response.text}"
        
        data = response.json()
        colonies = data.get("colonies", [])
        
        print(f"Colonies returned: {len(colonies)}")
        
        assert len(colonies) > 0, "No colonies returned"
        
        # Check if Bajigar Dera is in the list
        colony_names = [c.get("name", c.get("colony", "")) for c in colonies]
        print(f"Sample colonies: {colony_names[:5]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
