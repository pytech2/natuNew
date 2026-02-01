"""
Test suite for NSTU Property Tax Manager - PDF Bills Features
Tests: Bills API, GPS Route Sorting, PDF Generation, Employee Split
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://propfinder-app-1.preview.emergentagent.com')

class TestBillsFeatures:
    """Test PDF Bills management features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "nastu123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_admin_login(self):
        """Test admin login with credentials admin/nastu123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "nastu123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["name"] == "Super Admin"
        print("✓ Admin login successful")
    
    def test_get_bills_list(self):
        """Test GET /api/admin/bills - should return 1164 bills"""
        response = requests.get(f"{BASE_URL}/api/admin/bills?page=1&limit=20", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "bills" in data
        assert "total" in data
        assert data["total"] == 1164, f"Expected 1164 bills, got {data['total']}"
        assert len(data["bills"]) == 20
        print(f"✓ Bills list returned {data['total']} total bills")
    
    def test_get_bills_colonies(self):
        """Test GET /api/admin/bills/colonies - should return Akash Nagar"""
        response = requests.get(f"{BASE_URL}/api/admin/bills/colonies", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "colonies" in data
        assert "Akash Nagar" in data["colonies"]
        print(f"✓ Colonies: {data['colonies']}")
    
    def test_get_bills_map_data(self):
        """Test GET /api/admin/bills/map-data - should return bills with GPS"""
        response = requests.get(f"{BASE_URL}/api/admin/bills/map-data", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "bills" in data
        assert "total" in data
        assert data["total"] == 1164, f"Expected 1164 bills with GPS, got {data['total']}"
        # Verify bill has GPS coordinates
        if data["bills"]:
            bill = data["bills"][0]
            assert "latitude" in bill
            assert "longitude" in bill
            assert bill["latitude"] is not None
            assert bill["longitude"] is not None
        print(f"✓ Map data returned {data['total']} bills with GPS")
    
    def test_arrange_bills_by_route(self):
        """Test POST /api/admin/bills/arrange-by-route - GPS route sorting"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bills/arrange-by-route",
            headers=self.headers,
            data={"colony": "Akash Nagar"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "total_arranged" in data
        assert data["total_arranged"] == 1164
        print(f"✓ Arranged {data['total_arranged']} bills by GPS route")
    
    def test_generate_pdf(self):
        """Test POST /api/admin/bills/generate-pdf - PDF generation with serial numbers"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bills/generate-pdf",
            headers=self.headers,
            data={
                "colony": "Akash Nagar",
                "sn_position": "top-right",
                "sn_font_size": "48",
                "sn_color": "red"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "filename" in data
        assert "download_url" in data
        assert data["download_url"].startswith("/api/uploads/")
        print(f"✓ Generated PDF: {data['filename']}")
    
    def test_split_by_employee(self):
        """Test POST /api/admin/bills/split-by-employee - Split bills for employees"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bills/split-by-employee",
            headers=self.headers,
            data={
                "colony": "Akash Nagar",
                "employee_count": "5",
                "sn_font_size": "48",
                "sn_color": "red"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "files" in data
        assert "total_bills" in data
        assert "bills_per_employee" in data
        assert len(data["files"]) == 5
        assert data["total_bills"] == 1164
        # Verify each employee file
        for file in data["files"]:
            assert "employee_number" in file
            assert "download_url" in file
            assert "bill_range" in file
            assert "total_bills" in file
        print(f"✓ Split into {len(data['files'])} employee PDFs")


class TestPropertyMapFeatures:
    """Test Property Map page features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "nastu123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_properties_list(self):
        """Test GET /api/admin/properties - Property Map data source"""
        response = requests.get(f"{BASE_URL}/api/admin/properties?limit=10", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "properties" in data
        assert "total" in data
        # Properties collection is empty (data is in bills collection)
        print(f"✓ Properties list returned {data['total']} properties")
    
    def test_arrange_properties_by_route_no_data(self):
        """Test POST /api/admin/properties/arrange-by-route - should return 404 when no properties"""
        response = requests.post(
            f"{BASE_URL}/api/admin/properties/arrange-by-route",
            headers=self.headers
        )
        # Expected to fail with 404 since properties collection is empty
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        print(f"✓ Arrange by route correctly returns 404 when no properties")
    
    def test_save_arranged_data_no_data(self):
        """Test POST /api/admin/properties/save-arranged - should return 404 when no properties"""
        response = requests.post(
            f"{BASE_URL}/api/admin/properties/save-arranged",
            headers=self.headers
        )
        assert response.status_code == 404
        print(f"✓ Save arranged data correctly returns 404 when no properties")
    
    def test_download_properties_pdf_no_data(self):
        """Test POST /api/admin/properties/download-pdf - should return 404 when no properties"""
        response = requests.post(
            f"{BASE_URL}/api/admin/properties/download-pdf",
            headers=self.headers
        )
        assert response.status_code == 404
        print(f"✓ Download PDF correctly returns 404 when no properties")


class TestBillsDataIntegrity:
    """Test bills data integrity and structure"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "nastu123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_bill_has_required_fields(self):
        """Test that bills have all required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/bills?page=1&limit=1", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["bills"]) > 0
        
        bill = data["bills"][0]
        required_fields = ["id", "serial_number", "property_id", "owner_name", "colony", "latitude", "longitude"]
        for field in required_fields:
            assert field in bill, f"Missing field: {field}"
        print(f"✓ Bill has all required fields")
    
    def test_bills_have_gps_coordinates(self):
        """Test that bills have valid GPS coordinates"""
        response = requests.get(f"{BASE_URL}/api/admin/bills/map-data", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # All 1164 bills should have GPS
        assert data["total"] == 1164
        
        # Check sample bill GPS
        if data["bills"]:
            bill = data["bills"][0]
            assert isinstance(bill["latitude"], (int, float))
            assert isinstance(bill["longitude"], (int, float))
            # Verify coordinates are in India region
            assert 20 < bill["latitude"] < 35, f"Latitude out of range: {bill['latitude']}"
            assert 70 < bill["longitude"] < 90, f"Longitude out of range: {bill['longitude']}"
        print(f"✓ Bills have valid GPS coordinates")
    
    def test_bills_serial_numbers_sequential(self):
        """Test that bills have sequential serial numbers after arrangement"""
        response = requests.get(f"{BASE_URL}/api/admin/bills?page=1&limit=50", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        serial_numbers = [b["serial_number"] for b in data["bills"]]
        # Check first 50 are sequential (1-50)
        expected = list(range(1, 51))
        assert serial_numbers == expected, f"Serial numbers not sequential: {serial_numbers[:10]}..."
        print(f"✓ Bills have sequential serial numbers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
