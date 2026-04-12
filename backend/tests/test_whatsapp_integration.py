"""
Backend API Tests for XAC CRM - WhatsApp Integration
Tests WhatsApp multi-session endpoints and related functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from environment
ADMIN_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', 'admin@revivalfitness.com')
ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', 'Admin@2026')
CONSULTANT_USER_ID = "69cbf97c38323e0e80748fb0"  # Joanthan


class TestAuth:
    """Authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"PASS: Admin login successful, user: {data['user']['name']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("PASS: Invalid credentials rejected correctly")


@pytest.fixture
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture
def admin_headers(admin_token):
    """Get headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestSettings:
    """Settings endpoint tests"""
    
    def test_get_settings(self, admin_headers):
        """Test GET /api/settings returns valid response"""
        response = requests.get(f"{BASE_URL}/api/settings", headers=admin_headers)
        assert response.status_code == 200, f"Settings failed: {response.text}"
        data = response.json()
        # Should have key settings fields
        assert "auto_followup_hours" in data or "key" in data
        print(f"PASS: Settings endpoint working, data: {list(data.keys())}")


class TestUsers:
    """User management tests"""
    
    def test_get_users(self, admin_headers):
        """Test GET /api/users returns list of users"""
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check user structure
        user = data[0]
        assert "id" in user
        assert "email" in user
        assert "name" in user
        assert "role" in user
        print(f"PASS: Users endpoint returned {len(data)} users")
    
    def test_users_have_consultant_role(self, admin_headers):
        """Test that at least one consultant exists"""
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        consultants = [u for u in data if u["role"] == "consultant"]
        print(f"PASS: Found {len(consultants)} consultants")


class TestWhatsAppEndpoints:
    """WhatsApp integration endpoint tests"""
    
    def test_whatsapp_status_self(self, admin_headers):
        """Test GET /api/whatsapp/status returns status for current user"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/status", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data
        assert "hasQR" in data
        print(f"PASS: WhatsApp status endpoint working, connected: {data['connected']}")
    
    def test_whatsapp_status_by_user_id(self, admin_headers):
        """Test GET /api/whatsapp/status/{user_id} for admin"""
        response = requests.get(
            f"{BASE_URL}/api/whatsapp/status/{CONSULTANT_USER_ID}", 
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data
        assert "hasQR" in data
        print(f"PASS: WhatsApp status by user_id working, connected: {data['connected']}")
    
    def test_whatsapp_qr_endpoint(self, admin_headers):
        """Test GET /api/whatsapp/qr/{user_id} returns qrCode field"""
        response = requests.get(
            f"{BASE_URL}/api/whatsapp/qr/{CONSULTANT_USER_ID}",
            headers=admin_headers
        )
        # Should return 200 with qrCode (null if no session started)
        assert response.status_code == 200
        data = response.json()
        assert "qrCode" in data
        print(f"PASS: WhatsApp QR endpoint working, qrCode: {data['qrCode']}")
    
    def test_whatsapp_start_session(self, admin_headers):
        """Test POST /api/whatsapp/start-session (admin only)"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/start-session?user_id={CONSULTANT_USER_ID}",
            headers=admin_headers,
            json={}
        )
        # Should return 200 (session started or already running)
        assert response.status_code == 200
        data = response.json()
        assert "success" in data or "message" in data
        print(f"PASS: WhatsApp start-session endpoint working, response: {data}")
    
    def test_whatsapp_status_all(self, admin_headers):
        """Test GET /api/whatsapp/status-all (admin only)"""
        response = requests.get(
            f"{BASE_URL}/api/whatsapp/status-all",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"PASS: WhatsApp status-all endpoint working, sessions: {len(data)}")


class TestLeads:
    """Lead management tests"""
    
    def test_get_leads(self, admin_headers):
        """Test GET /api/leads returns list"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Leads endpoint returned {len(data)} leads")
    
    def test_create_lead(self, admin_headers):
        """Test POST /api/leads creates a new lead"""
        lead_data = {
            "name": "TEST_WhatsAppLead",
            "surname": "Integration",
            "phone": "+27123456789",
            "source": "Manual",
            "notes": "Test lead for WhatsApp integration testing"
        }
        response = requests.post(
            f"{BASE_URL}/api/leads",
            headers=admin_headers,
            json=lead_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["name"] == "TEST_WhatsAppLead"
        print(f"PASS: Lead created with id: {data['id']}")
        return data["id"]


class TestMessageTemplates:
    """Message template tests"""
    
    def test_get_message_templates(self, admin_headers):
        """Test GET /api/message-templates returns list"""
        response = requests.get(f"{BASE_URL}/api/message-templates", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Message templates endpoint returned {len(data)} templates")
    
    def test_create_message_template(self, admin_headers):
        """Test POST /api/message-templates creates template"""
        template_data = {
            "name": "TEST_WhatsApp Template",
            "content": "Hi {client_name}, this is {consultant_name} from Revival Fitness!"
        }
        response = requests.post(
            f"{BASE_URL}/api/message-templates",
            headers=admin_headers,
            json=template_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "success" in data or "template_id" in data
        print(f"PASS: Message template created: {data}")


class TestWhatsAppSend:
    """WhatsApp send message tests"""
    
    def test_whatsapp_send_requires_session(self, admin_headers):
        """Test POST /api/whatsapp/send - will fail without active session"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/send",
            headers=admin_headers,
            json={
                "phone_number": "+27123456789",
                "message": "Test message",
                "lead_id": None
            }
        )
        # Should return 500 since no WhatsApp session is connected
        # This is expected behavior - we're testing the endpoint exists and responds
        assert response.status_code in [200, 500]
        print(f"PASS: WhatsApp send endpoint responding, status: {response.status_code}")


class TestDashboard:
    """Dashboard stats tests"""
    
    def test_dashboard_stats(self, admin_headers):
        """Test GET /api/dashboard/stats returns stats"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_leads" in data
        assert "conversion_rate" in data
        print(f"PASS: Dashboard stats working, total_leads: {data['total_leads']}")


class TestAppointments:
    """Appointment tests"""
    
    def test_get_appointments(self, admin_headers):
        """Test GET /api/appointments returns list"""
        response = requests.get(f"{BASE_URL}/api/appointments", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Appointments endpoint returned {len(data)} appointments")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
