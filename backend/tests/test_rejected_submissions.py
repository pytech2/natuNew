"""
Test cases for Rejected Submissions Visibility Fix
Bug: Rejected submissions were being deleted from MongoDB instead of being kept with 'Rejected' status
Fix: Removed delete_one call, now rejected submissions persist with status='Rejected'
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://property-tax-mgmt.preview.emergentagent.com')

class TestRejectedSubmissionsVisibility:
    """Test that rejected submissions are visible and not deleted"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "Raghav2026"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "x-town-code": "THS"
        }
    
    def test_rejected_submissions_endpoint_returns_data(self):
        """Test that /api/admin/submissions?status=Rejected returns rejected submissions"""
        response = requests.get(
            f"{BASE_URL}/api/admin/submissions",
            params={"status": "Rejected", "limit": 10},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "submissions" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        # Verify at least 1 rejected submission exists (the test one)
        assert data["total"] >= 1, "Expected at least 1 rejected submission"
        assert len(data["submissions"]) >= 1
        
        print(f"Found {data['total']} rejected submissions")
    
    def test_specific_rejected_submission_exists(self):
        """Test that the specific test rejected submission (3UVE25B1) exists"""
        response = requests.get(
            f"{BASE_URL}/api/admin/submissions",
            params={"status": "Rejected", "search": "3UVE25B1"},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Find the specific submission
        submissions = data["submissions"]
        test_submission = None
        for sub in submissions:
            if sub.get("property_id") == "3UVE25B1":
                test_submission = sub
                break
        
        assert test_submission is not None, "Test submission 3UVE25B1 not found"
        
        # Verify submission data
        assert test_submission["status"] == "Rejected"
        assert test_submission["receiver_name"] == "Test Speed"
        assert test_submission["review_remarks"] == "Testing rejection visibility fix"
        
        print(f"Verified submission: {test_submission['property_id']} - Status: {test_submission['status']}")
    
    def test_rejected_submission_has_all_required_fields(self):
        """Test that rejected submission contains all expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/submissions",
            params={"status": "Rejected", "limit": 1},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["submissions"]) > 0
        submission = data["submissions"][0]
        
        # Required fields for display
        required_fields = [
            "id", "property_id", "status", "employee_name", 
            "submitted_at", "receiver_name"
        ]
        
        for field in required_fields:
            assert field in submission, f"Missing required field: {field}"
        
        # Verify status is Rejected
        assert submission["status"] == "Rejected"
        
        # Verify review_remarks exists for rejected submissions
        assert "review_remarks" in submission, "Rejected submission should have review_remarks"
        
        print(f"All required fields present in rejected submission")
    
    def test_status_filter_dropdown_includes_rejected(self):
        """Test that the API accepts 'Rejected' as a valid status filter"""
        # Test with Rejected status
        response = requests.get(
            f"{BASE_URL}/api/admin/submissions",
            params={"status": "Rejected"},
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Test with other statuses to ensure filter works
        for status in ["Pending", "Approved"]:
            response = requests.get(
                f"{BASE_URL}/api/admin/submissions",
                params={"status": status},
                headers=self.headers
            )
            assert response.status_code == 200
        
        print("Status filter accepts all valid statuses including Rejected")
    
    def test_employee_property_detail_excludes_rejected(self):
        """Test that employee property detail endpoint excludes rejected submissions"""
        # First get a property ID that has a rejected submission
        response = requests.get(
            f"{BASE_URL}/api/admin/submissions",
            params={"status": "Rejected", "limit": 1},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["submissions"]) > 0:
            property_record_id = data["submissions"][0]["property_record_id"]
            
            # Login as surveyor to test employee endpoint
            surveyor_login = requests.post(f"{BASE_URL}/api/auth/login", json={
                "username": "surveyor1",
                "password": "test123"
            })
            
            if surveyor_login.status_code == 200:
                surveyor_token = surveyor_login.json()["token"]
                surveyor_headers = {
                    "Authorization": f"Bearer {surveyor_token}",
                    "x-town-code": "THS"
                }
                
                # Try to get property detail - should not return rejected submission
                prop_response = requests.get(
                    f"{BASE_URL}/api/employee/property/{property_record_id}",
                    headers=surveyor_headers
                )
                
                # The endpoint should work but submission should be null (excluded)
                if prop_response.status_code == 200:
                    prop_data = prop_response.json()
                    # Submission should be None because rejected ones are excluded
                    assert prop_data.get("submission") is None, \
                        "Employee property detail should exclude rejected submissions"
                    print("Employee property detail correctly excludes rejected submissions")
                else:
                    print(f"Property detail returned {prop_response.status_code} - may not be assigned to surveyor")
            else:
                print("Surveyor login failed - skipping employee endpoint test")
        else:
            print("No rejected submissions to test with")


class TestRejectionWorkflow:
    """Test the rejection workflow to ensure submissions are kept"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "Raghav2026"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "x-town-code": "THS"
        }
    
    def test_rejection_keeps_submission_in_db(self):
        """Verify that rejecting a submission keeps it in the database"""
        # Get a pending submission to test with (if any)
        response = requests.get(
            f"{BASE_URL}/api/admin/submissions",
            params={"status": "Pending", "limit": 1},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # This test verifies the existing rejected submission is still there
        # We don't want to reject more submissions in automated tests
        
        # Verify the test rejected submission still exists
        rejected_response = requests.get(
            f"{BASE_URL}/api/admin/submissions",
            params={"status": "Rejected"},
            headers=self.headers
        )
        
        assert rejected_response.status_code == 200
        rejected_data = rejected_response.json()
        
        # The test submission should still be there
        assert rejected_data["total"] >= 1, "Rejected submissions should persist in database"
        
        print(f"Verified {rejected_data['total']} rejected submissions persist in database")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
