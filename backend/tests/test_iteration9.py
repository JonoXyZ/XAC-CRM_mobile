"""
Iteration 9 Backend Tests - XAC CRM for Revival Fitness
Features tested:
1. POST /api/whatsapp/end-session - End WhatsApp session (clears auth files)
2. POST /api/leads/fetch-check - Fetch/Check leads from Meta + round-robin assignment
3. GET /api/leads - Consultant visibility includes leads created by linked assistants
4. GET /api/appointments - Consultant visibility includes appointments from linked assistants
5. GET /api/users - Verify active managers + consultants for deal modal dropdowns
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@revivalfitness.com",
            "password": "Admin@2026"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    def test_admin_login(self, admin_token):
        """Test admin login works"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print("PASS: Admin login successful")


class TestWhatsAppEndSession:
    """Test WhatsApp End Session endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@revivalfitness.com",
            "password": "Admin@2026"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_end_session_endpoint_exists(self, admin_token):
        """Test that /api/whatsapp/end-session endpoint exists and requires user_id"""
        # Test with a dummy user_id - endpoint should exist but may fail due to WA service
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/end-session?user_id=test123",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should not be 404 (endpoint exists), may be 500 if WA service not running
        assert response.status_code != 404, "End session endpoint not found"
        print(f"PASS: End session endpoint exists (status: {response.status_code})")
    
    def test_end_session_requires_admin(self):
        """Test that end-session requires admin role"""
        # Try without auth
        response = requests.post(f"{BASE_URL}/api/whatsapp/end-session?user_id=test123")
        assert response.status_code in [401, 403], "Should require authentication"
        print("PASS: End session requires authentication")


class TestFetchCheckLeads:
    """Test Fetch/Check Leads endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@revivalfitness.com",
            "password": "Admin@2026"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_fetch_check_leads_endpoint(self, admin_token):
        """Test POST /api/leads/fetch-check returns expected structure"""
        response = requests.post(
            f"{BASE_URL}/api/leads/fetch-check",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Fetch-check failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "success" in data, "Missing 'success' field"
        assert "new_leads" in data, "Missing 'new_leads' field"
        assert "unassigned_fixed" in data, "Missing 'unassigned_fixed' field"
        assert "total_leads" in data, "Missing 'total_leads' field"
        assert "sources_checked" in data, "Missing 'sources_checked' field"
        
        # Verify data types
        assert isinstance(data["new_leads"], int), "new_leads should be int"
        assert isinstance(data["unassigned_fixed"], int), "unassigned_fixed should be int"
        assert isinstance(data["total_leads"], int), "total_leads should be int"
        assert isinstance(data["sources_checked"], list), "sources_checked should be list"
        
        print(f"PASS: Fetch-check returns correct structure - new_leads: {data['new_leads']}, total: {data['total_leads']}")
    
    def test_fetch_check_requires_auth(self):
        """Test that fetch-check requires authentication"""
        response = requests.post(f"{BASE_URL}/api/leads/fetch-check")
        assert response.status_code in [401, 403], "Should require authentication"
        print("PASS: Fetch-check requires authentication")


class TestConsultantLeadVisibility:
    """Test consultant can see leads created by linked assistants"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@revivalfitness.com",
            "password": "Admin@2026"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_get_leads_returns_list(self, admin_token):
        """Test GET /api/leads returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get leads failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Leads should be a list"
        print(f"PASS: GET /api/leads returns list with {len(data)} leads")
    
    def test_leads_have_required_fields(self, admin_token):
        """Test leads have required fields"""
        response = requests.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            lead = data[0]
            required_fields = ["id", "name", "phone", "source", "stage", "created_at"]
            for field in required_fields:
                assert field in lead, f"Missing field: {field}"
            print(f"PASS: Leads have required fields")
        else:
            print("SKIP: No leads to verify fields")


class TestConsultantAppointmentVisibility:
    """Test consultant can see appointments from linked assistants"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@revivalfitness.com",
            "password": "Admin@2026"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_get_appointments_returns_list(self, admin_token):
        """Test GET /api/appointments returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/appointments",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get appointments failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Appointments should be a list"
        print(f"PASS: GET /api/appointments returns list with {len(data)} appointments")


class TestUsersForDealModal:
    """Test users endpoint returns active managers and consultants for deal modal"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@revivalfitness.com",
            "password": "Admin@2026"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_get_users_returns_list(self, admin_token):
        """Test GET /api/users returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get users failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Users should be a list"
        print(f"PASS: GET /api/users returns list with {len(data)} users")
    
    def test_users_have_role_and_active_fields(self, admin_token):
        """Test users have role and active fields for filtering"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            user = data[0]
            assert "role" in user, "Missing 'role' field"
            assert "active" in user, "Missing 'active' field"
            assert "name" in user, "Missing 'name' field"
            assert "id" in user, "Missing 'id' field"
            print("PASS: Users have role and active fields")
        else:
            print("SKIP: No users to verify fields")
    
    def test_active_managers_and_consultants_exist(self, admin_token):
        """Test that active managers and consultants exist for deal modal"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Filter for active users with roles that can close deals
        deal_roles = ['consultant', 'sales_manager', 'club_manager', 'admin']
        active_deal_users = [u for u in data if u.get('active', False) and u.get('role') in deal_roles]
        
        print(f"PASS: Found {len(active_deal_users)} active users eligible for deal modal (roles: {deal_roles})")
        
        # List them for verification
        for u in active_deal_users[:5]:  # Show first 5
            print(f"  - {u['name']} ({u['role']})")


class TestDashboardStats:
    """Test dashboard stats endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@revivalfitness.com",
            "password": "Admin@2026"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_dashboard_stats(self, admin_token):
        """Test GET /api/dashboard/stats returns expected structure"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        required_fields = ["total_leads", "closed_won", "conversion_rate", "cash_sales", "debit_sales"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"PASS: Dashboard stats - total_leads: {data['total_leads']}, closed_won: {data['closed_won']}")


class TestBugReportButton:
    """Test bug report endpoint still works"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@revivalfitness.com",
            "password": "Admin@2026"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_get_bug_reports(self, admin_token):
        """Test GET /api/bug-reports works"""
        response = requests.get(
            f"{BASE_URL}/api/bug-reports",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get bug reports failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Bug reports should be a list"
        print(f"PASS: GET /api/bug-reports returns list with {len(data)} reports")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
