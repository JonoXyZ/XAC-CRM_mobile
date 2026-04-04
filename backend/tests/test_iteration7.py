"""
Iteration 7 Backend Tests - XAC CRM
Testing: Workflows, Webhook Logs, AI Landing Pages, Appointments
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fitness-sales-hub.preview.emergentagent.com')

class TestAuth:
    """Authentication tests"""
    
    def test_admin_login(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@revivalfitness.com",
            "password": "Admin@2026"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@revivalfitness.com"
        assert data["user"]["role"] == "admin"

    def test_master_login(self):
        """Test MASTER account login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "mastergrey666@xac.com",
            "password": "MASTERGREY666"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data


@pytest.fixture
def auth_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@revivalfitness.com",
        "password": "Admin@2026"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed")


class TestWorkflows:
    """Workflow CRUD endpoint tests"""
    
    def test_get_workflows(self, auth_token):
        """GET /api/workflows returns array"""
        response = requests.get(
            f"{BASE_URL}/api/workflows",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_workflow(self, auth_token):
        """POST /api/workflows creates workflow"""
        payload = {
            "name": "TEST_Pytest_Workflow",
            "trigger_type": "new_lead",
            "steps": [
                {"id": "1", "type": "send_whatsapp", "config": {"message": "Welcome!"}},
                {"id": "2", "type": "wait", "config": {"duration": 30, "unit": "minutes"}}
            ],
            "active": True
        }
        response = requests.post(
            f"{BASE_URL}/api/workflows",
            json=payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["success"] == True
        
        # Verify workflow was created
        get_response = requests.get(
            f"{BASE_URL}/api/workflows",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        workflows = get_response.json()
        created = [w for w in workflows if w["name"] == "TEST_Pytest_Workflow"]
        assert len(created) > 0
        
        # Cleanup - delete the test workflow
        workflow_id = created[0]["id"]
        requests.delete(
            f"{BASE_URL}/api/workflows/{workflow_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_update_workflow(self, auth_token):
        """PUT /api/workflows/{id} updates workflow"""
        # First create a workflow
        create_response = requests.post(
            f"{BASE_URL}/api/workflows",
            json={
                "name": "TEST_Update_Workflow",
                "trigger_type": "appointment",
                "steps": [{"id": "1", "type": "wait", "config": {"duration": 10, "unit": "minutes"}}],
                "active": True
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        workflow_id = create_response.json()["id"]
        
        # Update the workflow
        update_response = requests.put(
            f"{BASE_URL}/api/workflows/{workflow_id}",
            json={"name": "TEST_Updated_Workflow", "active": False},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert update_response.status_code == 200
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/workflows",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        workflows = get_response.json()
        updated = [w for w in workflows if w["id"] == workflow_id]
        assert len(updated) > 0
        assert updated[0]["name"] == "TEST_Updated_Workflow"
        assert updated[0]["active"] == False
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/workflows/{workflow_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_delete_workflow(self, auth_token):
        """DELETE /api/workflows/{id} deletes workflow"""
        # Create a workflow to delete
        create_response = requests.post(
            f"{BASE_URL}/api/workflows",
            json={
                "name": "TEST_Delete_Workflow",
                "trigger_type": "deal_closed",
                "steps": [],
                "active": False
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        workflow_id = create_response.json()["id"]
        
        # Delete the workflow
        delete_response = requests.delete(
            f"{BASE_URL}/api/workflows/{workflow_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/workflows",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        workflows = get_response.json()
        deleted = [w for w in workflows if w["id"] == workflow_id]
        assert len(deleted) == 0


class TestWebhookLogs:
    """Webhook logs endpoint tests"""
    
    def test_get_webhook_logs(self, auth_token):
        """GET /api/webhook-logs returns array"""
        response = requests.get(
            f"{BASE_URL}/api/webhook-logs",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # If there are logs, verify structure
        if len(data) > 0:
            log = data[0]
            assert "id" in log
            assert "source" in log
            assert "received_at" in log


class TestAILandingPages:
    """AI Landing Pages endpoint tests"""
    
    def test_generate_landing_pages(self, auth_token):
        """POST /api/ai/landing-pages generates 6 pages"""
        response = requests.post(
            f"{BASE_URL}/api/ai/landing-pages",
            json={
                "business_type": "gym",
                "business_name": "Test Fitness"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "pages" in data
        assert len(data["pages"]) == 6
        
        # Verify page structure
        for page in data["pages"]:
            assert "title" in page
            assert "slug" in page
            assert "hook" in page
            assert "cta" in page


class TestAppointments:
    """Appointments endpoint tests"""
    
    def test_get_appointments(self, auth_token):
        """GET /api/appointments returns array"""
        response = requests.get(
            f"{BASE_URL}/api/appointments?date=2026-04-04",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_standalone_appointment(self, auth_token):
        """POST /api/appointments/standalone creates appointment"""
        response = requests.post(
            f"{BASE_URL}/api/appointments/standalone",
            json={
                "name": "TEST_Appointment",
                "phone": "+27123456789",
                "scheduled_at": "2026-04-05T10:00:00",
                "appointment_type": "consultation"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "appointment_id" in data
        assert "lead_id" in data


class TestLeads:
    """Leads endpoint tests"""
    
    def test_get_leads(self, auth_token):
        """GET /api/leads returns array"""
        response = requests.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify lead structure if leads exist
        if len(data) > 0:
            lead = data[0]
            assert "id" in lead
            assert "name" in lead
            assert "stage" in lead


class TestUsers:
    """Users endpoint tests"""
    
    def test_get_users(self, auth_token):
        """GET /api/users returns array"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify user structure
        user = data[0]
        assert "id" in user
        assert "name" in user
        assert "email" in user
        assert "role" in user


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
