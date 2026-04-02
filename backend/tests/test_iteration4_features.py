"""
XAC CRM Iteration 4 Tests
Tests for: Login, Lead CRUD (empty email), Delete Lead, Standalone Appointments,
Report Generation, Admin Tools, AI Chat, MASTER Account
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@revivalfitness.com"
ADMIN_PASSWORD = "Admin@2026"
MASTER_EMAIL = "mastergrey666@xac.com"
MASTER_PASSWORD = "MASTERGREY666"


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"PASS: Admin login successful, role={data['user']['role']}")
    
    def test_master_login_success(self):
        """Test MASTER account login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MASTER_EMAIL,
            "password": MASTER_PASSWORD
        })
        assert response.status_code == 200, f"MASTER login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == MASTER_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"PASS: MASTER login successful")
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Invalid login correctly rejected")


@pytest.fixture
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Admin authentication failed")


@pytest.fixture
def auth_headers(admin_token):
    """Get auth headers with admin token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestLeadCRUD:
    """Lead CRUD operations including empty email fix"""
    
    def test_create_lead_with_empty_email(self, auth_headers):
        """Test creating lead with empty email (should NOT return 422)"""
        lead_data = {
            "name": "TEST_EmptyEmail",
            "surname": "Lead",
            "email": "",  # Empty email - this was causing 422 before fix
            "phone": "+27123456789",
            "source": "Manual",
            "notes": "Test lead with empty email"
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=auth_headers)
        assert response.status_code in [200, 201], f"Lead creation failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data["name"] == "TEST_EmptyEmail"
        assert data["email"] is None or data["email"] == ""
        print(f"PASS: Lead created with empty email, id={data['id']}")
        return data["id"]
    
    def test_create_lead_with_valid_email(self, auth_headers):
        """Test creating lead with valid email"""
        lead_data = {
            "name": "TEST_ValidEmail",
            "surname": "Lead",
            "email": "test@example.com",
            "phone": "+27987654321",
            "source": "Website",
            "notes": "Test lead with valid email"
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=auth_headers)
        assert response.status_code in [200, 201], f"Lead creation failed: {response.text}"
        data = response.json()
        assert data["email"] == "test@example.com"
        print(f"PASS: Lead created with valid email, id={data['id']}")
        return data["id"]
    
    def test_delete_lead(self, auth_headers):
        """Test deleting a lead"""
        # First create a lead to delete
        lead_data = {
            "name": "TEST_ToDelete",
            "phone": "+27111222333",
            "source": "Manual"
        }
        create_response = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=auth_headers)
        assert create_response.status_code in [200, 201]
        lead_id = create_response.json()["id"]
        
        # Delete the lead
        delete_response = requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=auth_headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        data = delete_response.json()
        assert data.get("success") == True
        print(f"PASS: Lead {lead_id} deleted successfully")
        
        # Verify lead is gone
        get_response = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers=auth_headers)
        assert get_response.status_code == 404, "Lead should not exist after deletion"
        print("PASS: Lead verified as deleted (404)")


class TestStandaloneAppointments:
    """Test standalone appointment creation (without existing lead)"""
    
    def test_create_standalone_appointment(self, auth_headers):
        """Test creating appointment without existing lead"""
        appointment_data = {
            "name": "TEST_StandaloneAppt",
            "surname": "Person",
            "phone": "+27555666777",
            "email": "standalone@test.com",
            "scheduled_at": "2026-01-20T10:00:00",
            "notes": "Test standalone appointment",
            "appointment_type": "consultation"
        }
        response = requests.post(f"{BASE_URL}/api/appointments/standalone", json=appointment_data, headers=auth_headers)
        assert response.status_code == 200, f"Standalone appointment failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "appointment_id" in data
        assert "lead_id" in data  # Should auto-create a lead
        print(f"PASS: Standalone appointment created, apt_id={data['appointment_id']}, lead_id={data['lead_id']}")
    
    def test_create_standalone_appointment_minimal(self, auth_headers):
        """Test creating standalone appointment with minimal data"""
        appointment_data = {
            "name": "TEST_MinimalAppt",
            "scheduled_at": "2026-01-21T14:30:00"
        }
        response = requests.post(f"{BASE_URL}/api/appointments/standalone", json=appointment_data, headers=auth_headers)
        assert response.status_code == 200, f"Minimal appointment failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"PASS: Minimal standalone appointment created")


class TestReportGeneration:
    """Test report generation endpoints"""
    
    def test_generate_mtd_report(self, auth_headers):
        """Test generating MTD only report"""
        response = requests.post(
            f"{BASE_URL}/api/reports/generate-month-report",
            json={"mode": "mtd_only"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"MTD report failed: {response.text}"
        data = response.json()
        # Should return success even if no deals
        assert "message" in data or "success" in data
        print(f"PASS: MTD report generated - {data}")
    
    def test_get_month_reports(self, auth_headers):
        """Test fetching month reports list"""
        response = requests.get(f"{BASE_URL}/api/reports/month-reports", headers=auth_headers)
        assert response.status_code == 200, f"Get month reports failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Month reports fetched, count={len(data)}")


class TestAdminTools:
    """Test admin tools endpoints"""
    
    def test_create_master_account(self, auth_headers):
        """Test creating/verifying MASTER account"""
        response = requests.post(f"{BASE_URL}/api/admin/create-master-account", json={}, headers=auth_headers)
        assert response.status_code == 200, f"Create master account failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "message" in data
        print(f"PASS: MASTER account - {data['message']}")
    
    # Note: Global password reset test is commented out to avoid breaking other tests
    # def test_reset_all_passwords(self, auth_headers):
    #     """Test global password reset - CAUTION: Changes all passwords!"""
    #     response = requests.post(f"{BASE_URL}/api/admin/reset-all-passwords", json={}, headers=auth_headers)
    #     assert response.status_code == 200
    #     data = response.json()
    #     assert data.get("success") == True
    #     assert data.get("new_password") == "123xyz/"
    #     print(f"PASS: Passwords reset for {data['users_reset']} users")


class TestAIChat:
    """Test AI Chat Assistant endpoint"""
    
    def test_ai_chat_endpoint(self, auth_headers):
        """Test AI chat endpoint (connected to GPT-4o via Emergent LLM Key)"""
        chat_data = {
            "message": "Hello, what can you help me with?",
            "session_id": None
        }
        response = requests.post(f"{BASE_URL}/api/ai/chat", json=chat_data, headers=auth_headers)
        
        # AI endpoint may take time or fail if LLM key issues
        if response.status_code == 200:
            data = response.json()
            assert "response" in data
            assert "session_id" in data
            print(f"PASS: AI chat responded - session_id={data['session_id']}")
            print(f"AI Response preview: {data['response'][:100]}...")
        elif response.status_code == 500:
            # LLM service error - report but don't fail test
            print(f"WARNING: AI chat returned 500 - {response.text}")
            pytest.skip("AI service error - may be LLM key issue")
        else:
            assert False, f"Unexpected status {response.status_code}: {response.text}"


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_leads(self, auth_headers):
        """Clean up TEST_ prefixed leads"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
        if response.status_code == 200:
            leads = response.json()
            deleted = 0
            for lead in leads:
                if lead["name"].startswith("TEST_"):
                    del_resp = requests.delete(f"{BASE_URL}/api/leads/{lead['id']}", headers=auth_headers)
                    if del_resp.status_code == 200:
                        deleted += 1
            print(f"Cleanup: Deleted {deleted} test leads")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
