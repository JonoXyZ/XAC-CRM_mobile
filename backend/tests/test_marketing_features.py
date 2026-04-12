"""
Test Marketing Features: Forms, Gallery, Marketing Dashboard, Webhooks
Tests for XAC CRM Marketing Agent role and related functionality
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from environment
ADMIN_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', 'admin@revivalfitness.com')
ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', 'Admin@2026')
MARKETING_EMAIL = os.environ.get('TEST_MARKETING_EMAIL', 'marketing@revivalfitness.com')
MARKETING_PASSWORD = os.environ.get('TEST_MARKETING_PASSWORD', 'Marketing@2026')

# Existing form ID for testing
EXISTING_FORM_ID = "69cd20b2537044dff6b9bf76"


class TestLoginWithoutRoleDropdown:
    """Test that login works without role field - auto-detects role from database"""
    
    def test_admin_login_without_role(self):
        """Login as admin without specifying role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"PASS: Admin login without role field - role auto-detected as 'admin'")
    
    def test_marketing_agent_login_without_role(self):
        """Login as marketing agent without specifying role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKETING_EMAIL,
            "password": MARKETING_PASSWORD
        })
        assert response.status_code == 200, f"Marketing login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "marketing_agent"
        assert data["user"]["email"] == MARKETING_EMAIL
        print(f"PASS: Marketing agent login without role field - role auto-detected as 'marketing_agent'")
    
    def test_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print(f"PASS: Invalid credentials correctly rejected with 401")


class TestMarketingStats:
    """Test /api/marketing/stats endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def marketing_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKETING_EMAIL,
            "password": MARKETING_PASSWORD
        })
        return response.json()["token"]
    
    def test_marketing_stats_as_admin(self, admin_token):
        """Admin can access marketing stats"""
        response = requests.get(f"{BASE_URL}/api/marketing/stats", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Marketing stats failed: {response.text}"
        data = response.json()
        assert "total_forms" in data
        assert "active_forms" in data
        assert "total_leads" in data
        assert "total_media" in data
        assert "platform_stats" in data
        assert "top_forms" in data
        print(f"PASS: Marketing stats returned - total_forms={data['total_forms']}, total_leads={data['total_leads']}, total_media={data['total_media']}")
    
    def test_marketing_stats_as_marketing_agent(self, marketing_token):
        """Marketing agent can access marketing stats"""
        response = requests.get(f"{BASE_URL}/api/marketing/stats", headers={
            "Authorization": f"Bearer {marketing_token}"
        })
        assert response.status_code == 200, f"Marketing stats failed: {response.text}"
        data = response.json()
        assert "total_forms" in data
        assert "platform_stats" in data
        print(f"PASS: Marketing agent can access marketing stats")


class TestFormsAPI:
    """Test /api/forms CRUD operations"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def marketing_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKETING_EMAIL,
            "password": MARKETING_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_forms(self, admin_token):
        """GET /api/forms returns forms with performance data"""
        response = requests.get(f"{BASE_URL}/api/forms", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Get forms failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            form = data[0]
            assert "id" in form
            assert "name" in form
            assert "platform" in form
            assert "webhook_url" in form
            assert "performance" in form
            assert "total_leads" in form["performance"]
            print(f"PASS: GET /api/forms returned {len(data)} forms with performance data")
        else:
            print(f"PASS: GET /api/forms returned empty list (no forms yet)")
    
    def test_create_form(self, marketing_token):
        """POST /api/forms creates a form and returns webhook URL"""
        unique_name = f"TEST_Form_{uuid.uuid4().hex[:8]}"
        form_data = {
            "name": unique_name,
            "headline": "Test Headline",
            "description": "Test Description",
            "platform": "facebook",
            "questions": [
                {"question": "What is your name?", "answer_type": "text", "options": []},
                {"question": "Select your goal", "answer_type": "dropdown", "options": ["Weight Loss", "Muscle Gain", "General Fitness"]}
            ],
            "media_ids": [],
            "active": True
        }
        response = requests.post(f"{BASE_URL}/api/forms", json=form_data, headers={
            "Authorization": f"Bearer {marketing_token}"
        })
        assert response.status_code == 200, f"Create form failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "webhook_url" in data
        assert data["webhook_url"].startswith("/api/webhooks/form/")
        assert data["name"] == unique_name
        assert data["platform"] == "facebook"
        assert len(data["questions"]) == 2
        print(f"PASS: POST /api/forms created form with id={data['id']}, webhook_url={data['webhook_url']}")
        
        # Cleanup - delete the test form
        requests.delete(f"{BASE_URL}/api/forms/{data['id']}", headers={
            "Authorization": f"Bearer {marketing_token}"
        })
    
    def test_update_form(self, marketing_token):
        """PUT /api/forms/{form_id} updates a form"""
        # First create a form
        unique_name = f"TEST_UpdateForm_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/forms", json={
            "name": unique_name,
            "platform": "instagram",
            "questions": [{"question": "Test?", "answer_type": "text", "options": []}]
        }, headers={"Authorization": f"Bearer {marketing_token}"})
        form_id = create_response.json()["id"]
        
        # Update the form
        update_data = {
            "name": f"{unique_name}_Updated",
            "headline": "Updated Headline",
            "active": False
        }
        response = requests.put(f"{BASE_URL}/api/forms/{form_id}", json=update_data, headers={
            "Authorization": f"Bearer {marketing_token}"
        })
        assert response.status_code == 200, f"Update form failed: {response.text}"
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/forms/{form_id}", headers={
            "Authorization": f"Bearer {marketing_token}"
        })
        updated_form = get_response.json()
        assert updated_form["headline"] == "Updated Headline"
        assert updated_form["active"] == False
        print(f"PASS: PUT /api/forms/{form_id} updated form successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/forms/{form_id}", headers={
            "Authorization": f"Bearer {marketing_token}"
        })
    
    def test_delete_form(self, marketing_token):
        """DELETE /api/forms/{form_id} deletes a form"""
        # Create a form to delete
        create_response = requests.post(f"{BASE_URL}/api/forms", json={
            "name": f"TEST_DeleteForm_{uuid.uuid4().hex[:8]}",
            "platform": "website",
            "questions": []
        }, headers={"Authorization": f"Bearer {marketing_token}"})
        form_id = create_response.json()["id"]
        
        # Delete the form
        response = requests.delete(f"{BASE_URL}/api/forms/{form_id}", headers={
            "Authorization": f"Bearer {marketing_token}"
        })
        assert response.status_code == 200, f"Delete form failed: {response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/forms/{form_id}", headers={
            "Authorization": f"Bearer {marketing_token}"
        })
        assert get_response.status_code == 404
        print(f"PASS: DELETE /api/forms/{form_id} deleted form successfully")


class TestWebhookEndpoint:
    """Test webhook endpoint for lead capture - NO AUTH REQUIRED"""
    
    @pytest.fixture
    def marketing_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKETING_EMAIL,
            "password": MARKETING_PASSWORD
        })
        return response.json()["token"]
    
    def test_webhook_creates_lead(self, marketing_token):
        """POST /api/webhooks/form/{form_id} creates a lead without auth"""
        # First create a form
        create_response = requests.post(f"{BASE_URL}/api/forms", json={
            "name": f"TEST_WebhookForm_{uuid.uuid4().hex[:8]}",
            "platform": "facebook",
            "questions": [{"question": "Goal?", "answer_type": "text", "options": []}],
            "active": True
        }, headers={"Authorization": f"Bearer {marketing_token}"})
        form_id = create_response.json()["id"]
        
        # Send webhook payload WITHOUT auth (public endpoint)
        webhook_payload = {
            "name": "TEST_WebhookLead",
            "surname": "TestSurname",
            "email": "webhooktest@example.com",
            "phone": "+27123456789",
            "answers": {"Goal?": "Weight Loss"}
        }
        response = requests.post(f"{BASE_URL}/api/webhooks/form/{form_id}", json=webhook_payload)
        assert response.status_code == 200, f"Webhook failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "lead_id" in data
        print(f"PASS: Webhook created lead with id={data['lead_id']} (no auth required)")
        
        # Cleanup - delete the test form
        requests.delete(f"{BASE_URL}/api/forms/{form_id}", headers={
            "Authorization": f"Bearer {marketing_token}"
        })
    
    def test_webhook_inactive_form_fails(self, marketing_token):
        """Webhook to inactive form returns 404"""
        # Create an inactive form
        create_response = requests.post(f"{BASE_URL}/api/forms", json={
            "name": f"TEST_InactiveForm_{uuid.uuid4().hex[:8]}",
            "platform": "website",
            "questions": [],
            "active": True
        }, headers={"Authorization": f"Bearer {marketing_token}"})
        form_id = create_response.json()["id"]
        
        # Deactivate the form
        requests.put(f"{BASE_URL}/api/forms/{form_id}", json={"active": False}, headers={
            "Authorization": f"Bearer {marketing_token}"
        })
        
        # Try webhook
        response = requests.post(f"{BASE_URL}/api/webhooks/form/{form_id}", json={
            "name": "Test",
            "phone": "123"
        })
        assert response.status_code == 404
        print(f"PASS: Webhook to inactive form correctly returns 404")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/forms/{form_id}", headers={
            "Authorization": f"Bearer {marketing_token}"
        })


class TestGalleryAPI:
    """Test /api/gallery endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def marketing_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKETING_EMAIL,
            "password": MARKETING_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_gallery(self, admin_token):
        """GET /api/gallery returns gallery items"""
        response = requests.get(f"{BASE_URL}/api/gallery", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Get gallery failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            item = data[0]
            assert "id" in item
            assert "filename" in item
            assert "url" in item
            assert "content_type" in item
            print(f"PASS: GET /api/gallery returned {len(data)} media items")
        else:
            print(f"PASS: GET /api/gallery returned empty list (no media yet)")
    
    def test_upload_media(self, marketing_token):
        """POST /api/gallery/upload accepts file upload"""
        # Create a simple test image (1x1 pixel PNG)
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {
            'file': ('test_image.png', png_data, 'image/png')
        }
        response = requests.post(f"{BASE_URL}/api/gallery/upload", files=files, headers={
            "Authorization": f"Bearer {marketing_token}"
        })
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "url" in data
        assert data["original_name"] == "test_image.png"
        print(f"PASS: POST /api/gallery/upload uploaded file with id={data['id']}")
        
        # Cleanup - delete the uploaded file
        requests.delete(f"{BASE_URL}/api/gallery/{data['id']}", headers={
            "Authorization": f"Bearer {marketing_token}"
        })
    
    def test_delete_media(self, marketing_token):
        """DELETE /api/gallery/{media_id} deletes media"""
        # Upload a file first
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        files = {'file': ('delete_test.png', png_data, 'image/png')}
        upload_response = requests.post(f"{BASE_URL}/api/gallery/upload", files=files, headers={
            "Authorization": f"Bearer {marketing_token}"
        })
        media_id = upload_response.json()["id"]
        
        # Delete the file
        response = requests.delete(f"{BASE_URL}/api/gallery/{media_id}", headers={
            "Authorization": f"Bearer {marketing_token}"
        })
        assert response.status_code == 200, f"Delete media failed: {response.text}"
        print(f"PASS: DELETE /api/gallery/{media_id} deleted media successfully")


class TestExistingFormPerformance:
    """Test existing form (Facebook Summer Promo) has performance data"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_existing_form_has_performance(self, admin_token):
        """Existing form should have performance metrics"""
        response = requests.get(f"{BASE_URL}/api/forms/{EXISTING_FORM_ID}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        if response.status_code == 200:
            data = response.json()
            assert "performance" in data
            assert "total_leads" in data["performance"]
            assert "deals" in data["performance"]
            assert "conversion_rate" in data["performance"]
            print(f"PASS: Existing form {EXISTING_FORM_ID} has performance data: leads={data['performance']['total_leads']}, deals={data['performance']['deals']}")
        else:
            print(f"SKIP: Existing form {EXISTING_FORM_ID} not found (may have been deleted)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
