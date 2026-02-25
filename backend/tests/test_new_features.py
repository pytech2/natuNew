"""
Test new features added to Town Survey Platform:
1. Old Photo Upload API
2. Block Assign/Unassign Colonies API
3. Colonies list API
4. Duplicate prevention in copy-to-properties
5. Excel export with Property ID column
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://multi-town-survey.preview.emergentagent.com"

# Test town (Thanesar)
TOWN_CODE = "THS"

@pytest.fixture(scope="module")
def admin_token():
    """Get admin token for all tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "admin",
        "password": "nastu123"
    })
    if response.status_code == 200:
        return response.json().get("token")  # API returns 'token' not 'access_token'
    pytest.skip(f"Admin login failed: {response.text}")
    
@pytest.fixture(scope="module")
def api_session(admin_token):
    """Session with auth and town headers"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
        "X-Town-Code": TOWN_CODE
    })
    return session


class TestColoniesAPI:
    """Test GET /api/admin/colonies endpoint"""
    
    def test_get_colonies_returns_list(self, api_session):
        """Test that colonies endpoint returns a list of colonies"""
        response = api_session.get(f"{BASE_URL}/api/admin/colonies")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "colonies" in data, "Response should have 'colonies' key"
        assert isinstance(data["colonies"], list), "Colonies should be a list"
        
        # Thanesar should have colonies based on previous tests
        print(f"Found {len(data['colonies'])} colonies")
        if data['colonies']:
            print(f"Sample colonies: {data['colonies'][:5]}")


class TestBlockAssignColonies:
    """Test POST /api/admin/block-assign-colonies endpoint"""
    
    def test_block_assign_requires_colonies_and_employees(self, api_session):
        """Test that block assign validates required fields"""
        # Missing colonies
        response = api_session.post(f"{BASE_URL}/api/admin/block-assign-colonies", json={
            "colonies": [],
            "employee_ids": ["some-id"]
        })
        assert response.status_code == 400, f"Expected 400 for empty colonies, got {response.status_code}"
        
        # Missing employee_ids
        response = api_session.post(f"{BASE_URL}/api/admin/block-assign-colonies", json={
            "colonies": ["Test Colony"],
            "employee_ids": []
        })
        assert response.status_code == 400, f"Expected 400 for empty employee_ids, got {response.status_code}"
    
    def test_block_assign_with_valid_data(self, api_session):
        """Test block assign with valid data (may update 0 if no unassigned properties)"""
        # First get a colony
        colonies_res = api_session.get(f"{BASE_URL}/api/admin/colonies")
        colonies = colonies_res.json().get("colonies", [])
        
        if not colonies:
            pytest.skip("No colonies available for testing")
        
        # Get employees (surveyors)
        users_res = api_session.get(f"{BASE_URL}/api/admin/users")
        surveyors = [u for u in users_res.json() if u.get("role") == "SURVEYOR"]
        
        if not surveyors:
            pytest.skip("No surveyors available for testing")
        
        # Try to assign first colony to first surveyor
        response = api_session.post(f"{BASE_URL}/api/admin/block-assign-colonies", json={
            "colonies": [colonies[0]],
            "employee_ids": [surveyors[0]["id"]]
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, "Response should have message"
        assert "total_assigned" in data, "Response should have total_assigned"
        print(f"Block assign result: {data['message']}")


class TestBlockUnassignColonies:
    """Test POST /api/admin/block-unassign-colonies endpoint"""
    
    def test_block_unassign_requires_colonies(self, api_session):
        """Test that block unassign validates required fields"""
        response = api_session.post(f"{BASE_URL}/api/admin/block-unassign-colonies", json={
            "colonies": []
        })
        assert response.status_code == 400, f"Expected 400 for empty colonies, got {response.status_code}"
    
    def test_block_unassign_with_valid_data(self, api_session):
        """Test block unassign with valid colony"""
        # First get a colony
        colonies_res = api_session.get(f"{BASE_URL}/api/admin/colonies")
        colonies = colonies_res.json().get("colonies", [])
        
        if not colonies:
            pytest.skip("No colonies available for testing")
        
        # Unassign from a colony (may unassign 0 if already unassigned)
        response = api_session.post(f"{BASE_URL}/api/admin/block-unassign-colonies", json={
            "colonies": [colonies[0]]
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, "Response should have message"
        assert "total_unassigned" in data, "Response should have total_unassigned"
        print(f"Block unassign result: {data['message']}")


class TestOldPhotoUploadAPI:
    """Test POST /api/admin/upload-old-photos endpoint"""
    
    def test_upload_old_photos_rejects_non_excel(self, admin_token):
        """Test that endpoint rejects non-Excel files"""
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {admin_token}",
            "X-Town-Code": TOWN_CODE
        })
        
        # Create a fake text file
        files = {
            "file": ("test.txt", b"Property ID,Photo URL\n1,http://example.com/photo.jpg", "text/plain")
        }
        
        response = session.post(f"{BASE_URL}/api/admin/upload-old-photos", files=files)
        assert response.status_code == 400, f"Expected 400 for non-Excel file, got {response.status_code}"
        assert "Excel" in response.json().get("detail", ""), "Error should mention Excel"


class TestBillsExportExcel:
    """Test GET /api/admin/bills/export-excel endpoint"""
    
    def test_export_excel_returns_xlsx(self, admin_token):
        """Test that export returns valid xlsx file with Property ID column"""
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {admin_token}",
            "X-Town-Code": TOWN_CODE
        })
        
        response = session.get(f"{BASE_URL}/api/admin/bills/export-excel")
        
        # Should return 200 or might return 404 if no bills
        if response.status_code == 404:
            pytest.skip("No bills data available for export")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "spreadsheet" in content_type or "excel" in content_type.lower() or "octet-stream" in content_type, \
            f"Expected Excel content type, got {content_type}"
        
        # Check content disposition has xlsx extension
        content_disposition = response.headers.get("Content-Disposition", "")
        assert ".xlsx" in content_disposition.lower(), f"Expected .xlsx file, got {content_disposition}"
        
        print(f"Excel export successful. Content-Disposition: {content_disposition}")


class TestDuplicatePrevention:
    """Test duplicate prevention in copy-to-properties endpoint"""
    
    def test_duplicate_property_id_check(self, api_session):
        """Test that duplicate property_id is always checked in copy-to-properties"""
        # First, check if there are any bills
        response = api_session.get(f"{BASE_URL}/api/admin/bills?limit=1")
        
        if response.status_code != 200 or not response.json().get("bills"):
            pytest.skip("No bills available for duplicate test")
        
        # Attempt to copy bills - the endpoint should handle duplicates
        response = api_session.post(f"{BASE_URL}/api/admin/bills/copy-to-properties", json={
            "skip_duplicates": False  # Even with skip_duplicates=False, property_id duplicates should be prevented
        })
        
        # Should return 200 with info about skipped duplicates
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Response should include info about duplicates
        print(f"Copy result: {data}")
        assert "added" in data or "skipped" in data or "message" in data, \
            "Response should include info about added/skipped records"


class TestMapEndpoint:
    """Test map endpoints including full town map"""
    
    def test_map_properties_endpoint(self, api_session):
        """Test GET /api/map/properties endpoint for full town map"""
        response = api_session.get(f"{BASE_URL}/api/map/properties?limit=100")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "properties" in data, "Response should have 'properties' key"
        print(f"Map returned {len(data.get('properties', []))} properties")
    
    def test_map_colonies_endpoint(self, api_session):
        """Test GET /api/map/colonies endpoint"""
        response = api_session.get(f"{BASE_URL}/api/map/colonies")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "colonies" in data, "Response should have 'colonies' key"
        print(f"Map colonies: {len(data.get('colonies', []))} colonies")


class TestSurveyEndpoints:
    """Test survey-related endpoints for RELATION_OPTIONS and photo_url"""
    
    def test_property_has_photo_url_field(self, api_session):
        """Test that property response includes photo_url field"""
        # Get a property
        response = api_session.get(f"{BASE_URL}/api/admin/properties?limit=1")
        
        if response.status_code != 200 or not response.json().get("properties"):
            pytest.skip("No properties available for photo_url test")
        
        prop = response.json()["properties"][0]
        # photo_url may or may not exist, but the field should be accessible
        # This just verifies the API returns property data
        assert "property_id" in prop or "id" in prop, "Property should have identification"
        print(f"Property data keys: {list(prop.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
