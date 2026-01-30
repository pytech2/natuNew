import requests
import sys
import json
from datetime import datetime

class NSTUAPITester:
    def __init__(self, base_url="https://proptrack-29.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                if files:
                    # For file uploads, don't set Content-Type header
                    file_headers = {k: v for k, v in test_headers.items() if k != 'Content-Type'}
                    response = requests.post(url, data=data, files=files, headers=file_headers)
                else:
                    response = requests.post(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_init_admin(self):
        """Test admin initialization"""
        success, response = self.run_test(
            "Initialize Admin",
            "POST",
            "init-admin",
            200
        )
        return success

    def test_login(self, username="admin", password="admin123"):
        """Test login and get token"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.admin_user_id = response['user']['id']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_get_me(self):
        """Test get current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "admin/dashboard",
            200
        )
        return success

    def test_employee_progress(self):
        """Test employee progress"""
        success, response = self.run_test(
            "Employee Progress",
            "GET",
            "admin/employee-progress",
            200
        )
        return success

    def test_list_users(self):
        """Test list all users"""
        success, response = self.run_test(
            "List Users",
            "GET",
            "admin/users",
            200
        )
        return success

    def test_create_employee(self):
        """Test creating a new employee"""
        employee_data = {
            "username": f"test_emp_{datetime.now().strftime('%H%M%S')}",
            "password": "TestPass123!",
            "name": "Test Employee",
            "role": "EMPLOYEE",
            "assigned_area": "Test Zone"
        }
        success, response = self.run_test(
            "Create Employee",
            "POST",
            "admin/users",
            200,
            data=employee_data
        )
        if success:
            return True, response.get('id')
        return False, None

    def test_list_batches(self):
        """Test list batches"""
        success, response = self.run_test(
            "List Batches",
            "GET",
            "admin/batches",
            200
        )
        return success

    def test_list_properties(self):
        """Test list properties"""
        success, response = self.run_test(
            "List Properties",
            "GET",
            "admin/properties",
            200
        )
        return success

    def test_list_areas(self):
        """Test list areas"""
        success, response = self.run_test(
            "List Areas",
            "GET",
            "admin/areas",
            200
        )
        return success

    def test_list_submissions(self):
        """Test list submissions"""
        success, response = self.run_test(
            "List Submissions",
            "GET",
            "admin/submissions",
            200
        )
        return success

    def test_export_data(self):
        """Test export functionality"""
        success, response = self.run_test(
            "Export Data",
            "GET",
            "admin/export",
            200
        )
        return success

    def test_delete_employee(self, employee_id):
        """Test deleting an employee"""
        if not employee_id:
            print("⚠️  Skipping delete test - no employee ID")
            return True
            
        success, response = self.run_test(
            "Delete Employee",
            "DELETE",
            f"admin/users/{employee_id}",
            200
        )
        return success

def main():
    print("🚀 Starting NSTU Property Tax Manager API Tests")
    print("=" * 60)
    
    # Setup
    tester = NSTUAPITester()
    
    # Test sequence
    tests = [
        ("Initialize Admin", tester.test_init_admin),
        ("Admin Login", tester.test_login),
        ("Get Current User", tester.test_get_me),
        ("Dashboard Stats", tester.test_dashboard_stats),
        ("Employee Progress", tester.test_employee_progress),
        ("List Users", tester.test_list_users),
        ("List Batches", tester.test_list_batches),
        ("List Properties", tester.test_list_properties),
        ("List Areas", tester.test_list_areas),
        ("List Submissions", tester.test_list_submissions),
        ("Export Data", tester.test_export_data),
    ]
    
    # Run basic tests
    for test_name, test_func in tests:
        if not test_func():
            print(f"\n❌ Critical test failed: {test_name}")
            break
    
    # Test employee creation and deletion
    print(f"\n🔍 Testing Employee Management...")
    success, employee_id = tester.test_create_employee()
    if success and employee_id:
        tester.test_delete_employee(employee_id)
    
    # Print results
    print(f"\n" + "=" * 60)
    print(f"📊 Test Results:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())