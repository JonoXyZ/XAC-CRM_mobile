"""
Test suite for Linked Consultants feature (Iteration 5)
Tests:
- Creating assistant users with linked_consultants
- Editing assistant users to update linked_consultants
- Assistant access to linked consultant's leads
- Assistant access to linked consultant's appointments
- Assistant ability to update leads
- Assistant ability to create appointments
- Commission endpoint with deals
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fitness-sales-hub.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@revivalfitness.com"
ADMIN_PASSWORD = "Admin@2026"
CONSULTANT_ID = "69cbf97c38323e0e80748fb0"  # Sales Tester
CONSULTANT_EMAIL = "Test@revivalfitness.co.za"

class TestLinkedConsultantsFeature:
    """Test suite for linked_consultants assistant feature"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def test_assistant_data(self):
        """Generate unique test assistant data"""
        unique_id = str(uuid.uuid4())[:8]
        return {
            "email": f"test_assistant_{unique_id}@test.com",
            "password": "TestAssistant@2026",
            "name": f"TEST_Assistant_{unique_id}",
            "role": "assistant",
            "phone": "0761234567",
            "active": True,
            "linked_consultants": [CONSULTANT_ID]
        }
    
    @pytest.fixture(scope="class")
    def created_assistant(self, admin_token, test_assistant_data):
        """Create test assistant and return user data"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=test_assistant_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to create assistant: {response.text}"
        user_data = response.json()
        yield user_data
        # Cleanup: deactivate the test user
        requests.put(
            f"{BASE_URL}/api/users/{user_data['id']}",
            json={"active": False},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    @pytest.fixture(scope="class")
    def assistant_token(self, created_assistant, test_assistant_data):
        """Get assistant authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_assistant_data["email"],
            "password": test_assistant_data["password"]
        })
        assert response.status_code == 200, f"Assistant login failed: {response.text}"
        return response.json()["token"]
    
    # ==================== BACKEND API TESTS ====================
    
    def test_01_create_assistant_with_linked_consultants(self, admin_token, created_assistant, test_assistant_data):
        """Test creating assistant user with linked_consultants array"""
        assert created_assistant["role"] == "assistant"
        assert created_assistant["linked_consultants"] == [CONSULTANT_ID]
        assert created_assistant["name"] == test_assistant_data["name"]
        print(f"✓ Created assistant {created_assistant['name']} linked to consultant {CONSULTANT_ID}")
    
    def test_02_get_users_shows_linked_consultants(self, admin_token, created_assistant):
        """Test that GET /api/users returns linked_consultants for assistant"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        users = response.json()
        
        # Find our test assistant
        test_assistant = next((u for u in users if u["id"] == created_assistant["id"]), None)
        assert test_assistant is not None, "Test assistant not found in users list"
        assert test_assistant["linked_consultants"] == [CONSULTANT_ID]
        print(f"✓ GET /api/users returns linked_consultants for assistant")
    
    def test_03_update_assistant_linked_consultants(self, admin_token, created_assistant):
        """Test updating assistant's linked_consultants via PUT /api/users/{id}"""
        # First, get all users to find another consultant/manager
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = response.json()
        
        # Find a sales_manager to add
        sales_manager = next((u for u in users if u["role"] == "sales_manager" and u["active"]), None)
        
        if sales_manager:
            new_linked = [CONSULTANT_ID, sales_manager["id"]]
            update_response = requests.put(
                f"{BASE_URL}/api/users/{created_assistant['id']}",
                json={"linked_consultants": new_linked},
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert update_response.status_code == 200
            
            # Verify the update persisted
            verify_response = requests.get(
                f"{BASE_URL}/api/users",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            updated_users = verify_response.json()
            updated_assistant = next((u for u in updated_users if u["id"] == created_assistant["id"]), None)
            assert set(updated_assistant["linked_consultants"]) == set(new_linked)
            print(f"✓ Updated linked_consultants to include sales_manager")
            
            # Revert back to original
            requests.put(
                f"{BASE_URL}/api/users/{created_assistant['id']}",
                json={"linked_consultants": [CONSULTANT_ID]},
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        else:
            print("⚠ No sales_manager found to test multi-link, skipping multi-link test")
    
    def test_04_assistant_sees_linked_consultant_leads(self, assistant_token, admin_token):
        """Test that assistant can see leads owned by linked consultant"""
        # First, create a lead owned by the linked consultant
        lead_data = {
            "name": "TEST_LinkedLead",
            "surname": "ForAssistant",
            "phone": "0761111111",
            "source": "Test",
            "email": ""
        }
        
        # Create lead as admin
        create_response = requests.post(
            f"{BASE_URL}/api/leads",
            json=lead_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        lead = create_response.json()
        lead_id = lead["id"]
        
        # Assign lead to the linked consultant
        assign_response = requests.put(
            f"{BASE_URL}/api/leads/{lead_id}",
            json={"owner_id": CONSULTANT_ID},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert assign_response.status_code == 200
        
        # Now check if assistant can see this lead
        assistant_leads_response = requests.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {assistant_token}"}
        )
        assert assistant_leads_response.status_code == 200
        assistant_leads = assistant_leads_response.json()
        
        # Find our test lead
        test_lead = next((l for l in assistant_leads if l["id"] == lead_id), None)
        assert test_lead is not None, "Assistant should see lead owned by linked consultant"
        print(f"✓ Assistant can see lead owned by linked consultant")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/leads/{lead_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_05_assistant_can_update_linked_consultant_leads(self, assistant_token, admin_token):
        """Test that assistant can update leads owned by linked consultant"""
        # Create a lead owned by linked consultant
        lead_data = {
            "name": "TEST_UpdateableLead",
            "surname": "ByAssistant",
            "phone": "0762222222",
            "source": "Test",
            "email": ""
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/leads",
            json=lead_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        lead = create_response.json()
        lead_id = lead["id"]
        
        # Assign to linked consultant
        requests.put(
            f"{BASE_URL}/api/leads/{lead_id}",
            json={"owner_id": CONSULTANT_ID},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Assistant updates the lead
        update_response = requests.put(
            f"{BASE_URL}/api/leads/{lead_id}",
            json={"notes": "Updated by assistant", "stage": "Contacted"},
            headers={"Authorization": f"Bearer {assistant_token}"}
        )
        assert update_response.status_code == 200
        print(f"✓ Assistant can update lead owned by linked consultant")
        
        # Verify update
        verify_response = requests.get(
            f"{BASE_URL}/api/leads/{lead_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        updated_lead = verify_response.json()
        assert updated_lead["notes"] == "Updated by assistant"
        assert updated_lead["stage"] == "Contacted"
        print(f"✓ Lead update persisted correctly")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/leads/{lead_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_06_assistant_sees_linked_consultant_appointments(self, assistant_token, admin_token):
        """Test that assistant can see appointments for linked consultant's leads"""
        # Create a lead owned by linked consultant
        lead_data = {
            "name": "TEST_AppointmentLead",
            "surname": "ForAssistant",
            "phone": "0763333333",
            "source": "Test",
            "email": ""
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/leads",
            json=lead_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        lead = create_response.json()
        lead_id = lead["id"]
        
        # Assign to linked consultant
        requests.put(
            f"{BASE_URL}/api/leads/{lead_id}",
            json={"owner_id": CONSULTANT_ID},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Create appointment for this lead
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT10:00:00")
        apt_response = requests.post(
            f"{BASE_URL}/api/appointments",
            json={
                "lead_id": lead_id,
                "scheduled_at": tomorrow,
                "notes": "Test appointment for assistant"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert apt_response.status_code == 200
        apt_id = apt_response.json()["appointment_id"]
        
        # Check if assistant can see this appointment
        assistant_apts_response = requests.get(
            f"{BASE_URL}/api/appointments",
            headers={"Authorization": f"Bearer {assistant_token}"}
        )
        assert assistant_apts_response.status_code == 200
        assistant_apts = assistant_apts_response.json()
        
        test_apt = next((a for a in assistant_apts if a["id"] == apt_id), None)
        assert test_apt is not None, "Assistant should see appointment for linked consultant's lead"
        print(f"✓ Assistant can see appointments for linked consultant's leads")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/leads/{lead_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_07_assistant_can_create_appointments(self, assistant_token, admin_token):
        """Test that assistant can create appointments for linked consultant's leads"""
        # Create a lead owned by linked consultant
        lead_data = {
            "name": "TEST_NewAppointmentLead",
            "surname": "ByAssistant",
            "phone": "0764444444",
            "source": "Test",
            "email": ""
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/leads",
            json=lead_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        lead = create_response.json()
        lead_id = lead["id"]
        
        # Assign to linked consultant
        requests.put(
            f"{BASE_URL}/api/leads/{lead_id}",
            json={"owner_id": CONSULTANT_ID},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Assistant creates appointment
        tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%dT14:00:00")
        apt_response = requests.post(
            f"{BASE_URL}/api/appointments",
            json={
                "lead_id": lead_id,
                "scheduled_at": tomorrow,
                "notes": "Appointment created by assistant"
            },
            headers={"Authorization": f"Bearer {assistant_token}"}
        )
        assert apt_response.status_code == 200
        print(f"✓ Assistant can create appointments for linked consultant's leads")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/leads/{lead_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )


class TestCommissionWithDeals:
    """Test commission endpoint with deals"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_08_commission_endpoint_returns_deals(self, admin_token):
        """Test GET /api/commission?user_id={consultant_id} returns deals"""
        response = requests.get(
            f"{BASE_URL}/api/commission?user_id={CONSULTANT_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        commission_data = response.json()
        
        # Verify structure
        assert "consultant_name" in commission_data
        assert "debit_deals" in commission_data
        assert "cash_deals" in commission_data
        assert "earnings_mtd" in commission_data
        assert "basic_salary" in commission_data
        print(f"✓ Commission endpoint returns correct structure")
        print(f"  - Consultant: {commission_data['consultant_name']}")
        print(f"  - Debit deals: {len(commission_data['debit_deals'])}")
        print(f"  - Cash deals: {len(commission_data['cash_deals'])}")
        print(f"  - Earnings MTD: R{commission_data['earnings_mtd']}")
    
    def test_09_create_deal_and_verify_commission(self, admin_token):
        """Test creating a deal and verifying it appears in commission"""
        # Create a test lead
        lead_data = {
            "name": "TEST_CommissionLead",
            "surname": "DealTest",
            "phone": "0765555555",
            "source": "Test",
            "email": ""
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/leads",
            json=lead_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        lead = create_response.json()
        lead_id = lead["id"]
        
        # Assign to consultant
        requests.put(
            f"{BASE_URL}/api/leads/{lead_id}",
            json={"owner_id": CONSULTANT_ID},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Create a cash deal
        deal_date = datetime.now().strftime("%Y-%m-%d")
        deal_response = requests.post(
            f"{BASE_URL}/api/deals",
            json={
                "lead_id": lead_id,
                "deal_date": deal_date,
                "closed_by": CONSULTANT_ID,
                "to_by": CONSULTANT_ID,
                "payment_type": "Cash",
                "sales_value": 5000.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert deal_response.status_code == 200
        deal_id = deal_response.json()["deal_id"]
        print(f"✓ Created cash deal with ID: {deal_id}")
        
        # Verify deal appears in commission
        commission_response = requests.get(
            f"{BASE_URL}/api/commission?user_id={CONSULTANT_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        commission_data = commission_response.json()
        
        # Find our test deal in cash_deals
        test_deal = next((d for d in commission_data["cash_deals"] if d["id"] == deal_id), None)
        assert test_deal is not None, "Deal should appear in commission cash_deals"
        assert test_deal["sales_value"] == 5000.00
        print(f"✓ Deal appears in commission sheet with correct value")
        
        # Cleanup - delete the lead (which also deletes associated deals)
        requests.delete(
            f"{BASE_URL}/api/leads/{lead_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_10_create_debit_deal_and_verify_commission(self, admin_token):
        """Test creating a debit order deal and verifying it appears in commission"""
        # Create a test lead
        lead_data = {
            "name": "TEST_DebitCommissionLead",
            "surname": "DebitTest",
            "phone": "0766666666",
            "source": "Test",
            "email": ""
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/leads",
            json=lead_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        lead = create_response.json()
        lead_id = lead["id"]
        
        # Assign to consultant
        requests.put(
            f"{BASE_URL}/api/leads/{lead_id}",
            json={"owner_id": CONSULTANT_ID},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Create a debit order deal
        deal_date = datetime.now().strftime("%Y-%m-%d")
        deal_response = requests.post(
            f"{BASE_URL}/api/deals",
            json={
                "lead_id": lead_id,
                "deal_date": deal_date,
                "closed_by": CONSULTANT_ID,
                "to_by": CONSULTANT_ID,
                "payment_type": "Debit Order",
                "debit_order_value": 599.00,
                "units": 2,
                "term": 12,
                "joining_fee": 250.00
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert deal_response.status_code == 200
        deal_id = deal_response.json()["deal_id"]
        print(f"✓ Created debit order deal with ID: {deal_id}")
        
        # Verify deal appears in commission
        commission_response = requests.get(
            f"{BASE_URL}/api/commission?user_id={CONSULTANT_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        commission_data = commission_response.json()
        
        # Find our test deal in debit_deals
        test_deal = next((d for d in commission_data["debit_deals"] if d["id"] == deal_id), None)
        assert test_deal is not None, "Deal should appear in commission debit_deals"
        assert test_deal["debit_order_value"] == 599.00
        assert test_deal["units"] == 2
        print(f"✓ Debit deal appears in commission sheet with correct values")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/leads/{lead_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
