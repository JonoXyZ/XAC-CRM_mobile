"""
Bug Report System Tests - Iteration 8
Tests for:
- POST /api/bug-reports - Create bug report
- GET /api/bug-reports - Get all bug reports (admin only)
- PUT /api/bug-reports/{id} - Update bug report status
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from environment
ADMIN_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', 'admin@revivalfitness.com')
ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', 'Admin@2026')
MASTER_EMAIL = os.environ.get('TEST_MASTER_EMAIL', 'mastergrey666@xac.com')
MASTER_PASSWORD = os.environ.get('TEST_MASTER_PASSWORD', 'MASTERGREY666')


class TestBugReportSystem:
    """Bug Report CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["token"]
        self.admin_user = response.json()["user"]
        
    def test_01_create_bug_report(self):
        """Test creating a bug report"""
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
        payload = {
            "description": "TEST_BUG: Test bug report from automated testing",
            "priority": "high",
            "page": "/dashboard",
            "browser": "Test Browser"
        }
        
        response = self.session.post(f"{BASE_URL}/api/bug-reports", json=payload)
        print(f"Create bug report response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200, f"Failed to create bug report: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "id" in data
        self.created_bug_id = data["id"]
        print(f"Created bug report with ID: {self.created_bug_id}")
        
    def test_02_create_bug_report_critical_priority(self):
        """Test creating a critical priority bug report"""
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
        payload = {
            "description": "TEST_BUG: Critical bug - app is broken",
            "priority": "critical",
            "page": "/leads"
        }
        
        response = self.session.post(f"{BASE_URL}/api/bug-reports", json=payload)
        print(f"Create critical bug response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
    def test_03_create_bug_report_low_priority(self):
        """Test creating a low priority bug report"""
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
        payload = {
            "description": "TEST_BUG: Minor UI issue",
            "priority": "low",
            "page": "/settings"
        }
        
        response = self.session.post(f"{BASE_URL}/api/bug-reports", json=payload)
        print(f"Create low priority bug response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
    def test_04_get_bug_reports_admin(self):
        """Test getting all bug reports as admin"""
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
        response = self.session.get(f"{BASE_URL}/api/bug-reports")
        print(f"Get bug reports response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} bug reports")
        
        # Verify structure of bug reports
        if len(data) > 0:
            report = data[0]
            assert "id" in report
            assert "description" in report
            assert "priority" in report
            assert "status" in report
            assert "reported_by_name" in report
            assert "reported_by_email" in report
            assert "created_at" in report
            print(f"Bug report structure verified: {list(report.keys())}")
            
    def test_05_update_bug_report_status_to_in_progress(self):
        """Test updating bug report status to in_progress"""
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
        # First get a bug report ID
        response = self.session.get(f"{BASE_URL}/api/bug-reports")
        assert response.status_code == 200
        reports = response.json()
        
        if len(reports) == 0:
            pytest.skip("No bug reports to update")
            
        report_id = reports[0]["id"]
        
        # Update status
        response = self.session.put(f"{BASE_URL}/api/bug-reports/{report_id}", json={
            "status": "in_progress"
        })
        print(f"Update bug report status response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify the update
        response = self.session.get(f"{BASE_URL}/api/bug-reports")
        reports = response.json()
        updated_report = next((r for r in reports if r["id"] == report_id), None)
        assert updated_report is not None
        assert updated_report["status"] == "in_progress"
        print(f"Bug report status updated to: {updated_report['status']}")
        
    def test_06_update_bug_report_status_to_resolved(self):
        """Test updating bug report status to resolved"""
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        
        # Get a bug report ID
        response = self.session.get(f"{BASE_URL}/api/bug-reports")
        assert response.status_code == 200
        reports = response.json()
        
        if len(reports) == 0:
            pytest.skip("No bug reports to update")
            
        report_id = reports[0]["id"]
        
        # Update status to resolved
        response = self.session.put(f"{BASE_URL}/api/bug-reports/{report_id}", json={
            "status": "resolved"
        })
        print(f"Update to resolved response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
    def test_07_master_user_can_view_bug_reports(self):
        """Test that mastergrey666 can view bug reports"""
        # Login as master user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MASTER_EMAIL,
            "password": MASTER_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Master user login failed: {response.text}")
            
        master_token = response.json()["token"]
        self.session.headers.update({"Authorization": f"Bearer {master_token}"})
        
        response = self.session.get(f"{BASE_URL}/api/bug-reports")
        print(f"Master user get bug reports: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Master user can view {len(data)} bug reports")


class TestContactUsSection:
    """Test Contact Us section on Login page - API health check"""
    
    def test_01_api_health(self):
        """Test that API is accessible"""
        response = requests.get(f"{BASE_URL}/api/branding")
        print(f"Branding API response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "company_name" in data
        assert "app_name" in data
        print(f"Branding: {data}")


class TestBugReportValidation:
    """Test bug report validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.admin_token = response.json()["token"]
        
    def test_01_create_bug_report_without_auth(self):
        """Test that creating bug report without auth fails"""
        response = requests.post(f"{BASE_URL}/api/bug-reports", json={
            "description": "Test bug",
            "priority": "low"
        })
        print(f"Create without auth: {response.status_code}")
        
        # Should fail with 401 or 403
        assert response.status_code in [401, 403]
        
    def test_02_get_bug_reports_without_auth(self):
        """Test that getting bug reports without auth fails"""
        response = requests.get(f"{BASE_URL}/api/bug-reports")
        print(f"Get without auth: {response.status_code}")
        
        # Should fail with 401 or 403
        assert response.status_code in [401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
