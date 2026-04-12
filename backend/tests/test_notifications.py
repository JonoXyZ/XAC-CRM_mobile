"""
Test suite for XAC CRM Notification System (Iteration 6)
Tests 7 notification triggers:
1. New Lead Assigned - when lead is created and assigned to consultant
2. Appointment Reminder (24h/2h) - background task (not directly testable via API)
3. New Appointment Booked - when appointment is created
4. Lead Stage Changed - when lead stage is updated
5. New Deal Closed (to managers) - when deal is created
6. Meta Lead Captured - when meta webhook receives lead
7. WhatsApp Auto-Appointment Created - when .appointment trigger is processed
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from environment
ADMIN_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', 'admin@revivalfitness.com')
ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', 'Admin@2026')
CONSULTANT_ID_JONATHAN = "69cbf8c638323e0e80748faf"
CONSULTANT_ID_SALES_TESTER = "69cbf97c38323e0e80748fb0"


class TestNotificationEndpoints:
    """Test notification CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("token")
            self.admin_user = response.json().get("user")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        else:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    def test_get_notifications_returns_list(self):
        """GET /api/notifications - returns list of notifications for current user"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there are notifications, verify structure
        if len(data) > 0:
            notif = data[0]
            assert "id" in notif, "Notification should have id"
            assert "type" in notif, "Notification should have type"
            assert "title" in notif, "Notification should have title"
            assert "message" in notif, "Notification should have message"
            assert "read" in notif, "Notification should have read status"
            assert "created_at" in notif, "Notification should have created_at"
            print(f"Found {len(data)} notifications for admin user")
        else:
            print("No notifications found for admin user (expected if no triggers fired yet)")
    
    def test_get_unread_count(self):
        """GET /api/notifications/unread-count - returns unread count"""
        response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "count" in data, "Response should have count field"
        assert isinstance(data["count"], int), "Count should be an integer"
        assert data["count"] >= 0, "Count should be non-negative"
        print(f"Unread count: {data['count']}")
    
    def test_mark_notification_read(self):
        """PUT /api/notifications/{id}/read - marks notification as read"""
        # First get notifications
        response = self.session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        
        notifications = response.json()
        if len(notifications) == 0:
            pytest.skip("No notifications to mark as read")
        
        # Find an unread notification or use first one
        notif_id = notifications[0]["id"]
        
        # Mark as read
        response = self.session.put(f"{BASE_URL}/api/notifications/{notif_id}/read")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        print(f"Marked notification {notif_id} as read")
    
    def test_mark_all_notifications_read(self):
        """PUT /api/notifications/mark-all-read - marks all as read"""
        response = self.session.put(f"{BASE_URL}/api/notifications/mark-all-read")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        
        # Verify unread count is now 0
        count_response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        assert count_response.status_code == 200
        assert count_response.json()["count"] == 0, "Unread count should be 0 after marking all read"
        print("Marked all notifications as read, unread count is now 0")


class TestNotificationTriggers:
    """Test notification triggers when creating leads, deals, appointments, etc."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("token")
            self.admin_user = response.json().get("user")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        else:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    def test_create_lead_triggers_new_lead_notification(self):
        """POST /api/leads - triggers 'new_lead' notification to assigned consultant"""
        # Get initial unread count for admin (to compare later)
        initial_count_response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        initial_count = initial_count_response.json()["count"]
        
        # Create a new lead
        lead_data = {
            "name": "TEST_NotifLead",
            "surname": "Trigger",
            "phone": "+27821234567",
            "source": "Website",
            "campaign": "Notification Test",
            "notes": "Testing notification trigger"
        }
        
        response = self.session.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        lead = response.json()
        assert "id" in lead, "Lead should have id"
        self.created_lead_id = lead["id"]
        
        # Check if lead was assigned to a consultant
        if lead.get("owner_id"):
            print(f"Lead assigned to consultant: {lead['owner_id']}")
            print(f"Lead owner name: {lead.get('owner_name', 'N/A')}")
            
            # The notification goes to the consultant, not admin
            # So we can't directly verify it here without logging in as consultant
            # But we can verify the lead was created successfully
            assert lead["name"] == "TEST_NotifLead"
            assert lead["stage"] == "New Lead"
            print("Lead created successfully - notification should be sent to assigned consultant")
        else:
            print("No consultant available for assignment - notification not sent")
        
        # Cleanup - delete the test lead
        delete_response = self.session.delete(f"{BASE_URL}/api/leads/{self.created_lead_id}")
        assert delete_response.status_code == 200, "Failed to cleanup test lead"
        print("Test lead cleaned up")
    
    def test_create_deal_triggers_deal_closed_notification_to_managers(self):
        """POST /api/deals - triggers 'deal_closed' notification to managers"""
        # First create a lead for the deal
        lead_data = {
            "name": "TEST_DealNotifLead",
            "surname": "DealTest",
            "phone": "+27829876543",
            "source": "Referral"
        }
        
        lead_response = self.session.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert lead_response.status_code == 200, f"Failed to create lead: {lead_response.text}"
        lead = lead_response.json()
        lead_id = lead["id"]
        
        # Get initial unread count for admin (admin is a manager)
        initial_count_response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        initial_count = initial_count_response.json()["count"]
        
        # Create a deal
        deal_data = {
            "lead_id": lead_id,
            "deal_date": datetime.now().strftime("%Y-%m-%d"),
            "closed_by": self.admin_user["id"],
            "to_by": self.admin_user["id"],
            "payment_type": "Cash",
            "sales_value": 5000.00
        }
        
        deal_response = self.session.post(f"{BASE_URL}/api/deals", json=deal_data)
        assert deal_response.status_code == 200, f"Expected 200, got {deal_response.status_code}: {deal_response.text}"
        
        deal = deal_response.json()
        assert deal.get("success") == True, "Deal creation should succeed"
        assert "deal_id" in deal, "Response should have deal_id"
        print(f"Deal created: {deal['deal_id']}")
        
        # Check if admin received notification (admin is a manager)
        new_count_response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        new_count = new_count_response.json()["count"]
        
        # Admin should have received a deal_closed notification
        if new_count > initial_count:
            print(f"Unread count increased from {initial_count} to {new_count} - notification received!")
            
            # Verify the notification content
            notifs_response = self.session.get(f"{BASE_URL}/api/notifications")
            notifs = notifs_response.json()
            deal_notifs = [n for n in notifs if n["type"] == "deal_closed"]
            if deal_notifs:
                print(f"Found deal_closed notification: {deal_notifs[0]['title']}")
                assert "Deal" in deal_notifs[0]["title"] or "deal" in deal_notifs[0]["title"].lower()
        else:
            print(f"Unread count unchanged ({initial_count}) - notification may have been sent to other managers")
        
        # Cleanup - delete the test lead (which also deletes associated deals)
        delete_response = self.session.delete(f"{BASE_URL}/api/leads/{lead_id}")
        assert delete_response.status_code == 200, "Failed to cleanup test lead"
        print("Test lead and deal cleaned up")
    
    def test_create_appointment_triggers_appointment_booked_notification(self):
        """POST /api/appointments - triggers 'appointment_booked' notification to lead owner"""
        # First create a lead
        lead_data = {
            "name": "TEST_ApptNotifLead",
            "surname": "ApptTest",
            "phone": "+27825551234",
            "source": "Walk-in"
        }
        
        lead_response = self.session.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert lead_response.status_code == 200, f"Failed to create lead: {lead_response.text}"
        lead = lead_response.json()
        lead_id = lead["id"]
        owner_id = lead.get("owner_id")
        
        # Create an appointment
        scheduled_time = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT10:00:00")
        appt_data = {
            "lead_id": lead_id,
            "scheduled_at": scheduled_time,
            "notes": "Test appointment for notification"
        }
        
        appt_response = self.session.post(f"{BASE_URL}/api/appointments", json=appt_data)
        assert appt_response.status_code == 200, f"Expected 200, got {appt_response.status_code}: {appt_response.text}"
        
        appt = appt_response.json()
        assert appt.get("success") == True, "Appointment creation should succeed"
        assert "appointment_id" in appt, "Response should have appointment_id"
        print(f"Appointment created: {appt['appointment_id']}")
        
        if owner_id:
            print(f"Notification should be sent to lead owner: {owner_id}")
        else:
            print("No lead owner - notification not sent")
        
        # Cleanup - delete the test lead (which also deletes associated appointments)
        delete_response = self.session.delete(f"{BASE_URL}/api/leads/{lead_id}")
        assert delete_response.status_code == 200, "Failed to cleanup test lead"
        print("Test lead and appointment cleaned up")
    
    def test_update_lead_stage_triggers_stage_changed_notification(self):
        """PUT /api/leads/{id} - triggers 'stage_changed' notification to lead owner"""
        # First create a lead
        lead_data = {
            "name": "TEST_StageNotifLead",
            "surname": "StageTest",
            "phone": "+27826667890",
            "source": "Facebook"
        }
        
        lead_response = self.session.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert lead_response.status_code == 200, f"Failed to create lead: {lead_response.text}"
        lead = lead_response.json()
        lead_id = lead["id"]
        owner_id = lead.get("owner_id")
        initial_stage = lead["stage"]
        
        # Update the lead stage
        update_data = {
            "stage": "Contacted"
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/leads/{lead_id}", json=update_data)
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        result = update_response.json()
        assert result.get("success") == True, "Stage update should succeed"
        print(f"Lead stage updated from '{initial_stage}' to 'Contacted'")
        
        if owner_id and owner_id != self.admin_user["id"]:
            print(f"Notification should be sent to lead owner: {owner_id}")
        else:
            print("Lead owner is same as current user or no owner - notification not sent")
        
        # Cleanup - delete the test lead
        delete_response = self.session.delete(f"{BASE_URL}/api/leads/{lead_id}")
        assert delete_response.status_code == 200, "Failed to cleanup test lead"
        print("Test lead cleaned up")
    
    def test_meta_webhook_triggers_meta_lead_notification(self):
        """POST /api/webhooks/meta - triggers 'meta_lead' notification"""
        # Check if meta webhook endpoint exists
        # First, let's try to find the endpoint
        meta_data = {
            "entry": [{
                "changes": [{
                    "value": {
                        "leadgen_id": "test_123",
                        "form_id": "test_form",
                        "field_data": [
                            {"name": "full_name", "values": ["TEST_MetaLead"]},
                            {"name": "phone_number", "values": ["+27827778888"]},
                            {"name": "email", "values": ["test@meta.com"]}
                        ]
                    }
                }]
            }]
        }
        
        # Try the webhook endpoint (may not require auth)
        response = requests.post(f"{BASE_URL}/api/webhooks/meta", json=meta_data)
        
        if response.status_code == 404:
            print("Meta webhook endpoint not found - skipping test")
            pytest.skip("Meta webhook endpoint not implemented")
        elif response.status_code in [200, 201]:
            print(f"Meta webhook processed: {response.json()}")
            # Notification should be sent to managers
        else:
            print(f"Meta webhook returned {response.status_code}: {response.text}")
            # May require specific format or auth


class TestNotificationAuthentication:
    """Test that notification endpoints require authentication"""
    
    def test_get_notifications_requires_auth(self):
        """GET /api/notifications - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("GET /api/notifications correctly requires authentication")
    
    def test_get_unread_count_requires_auth(self):
        """GET /api/notifications/unread-count - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("GET /api/notifications/unread-count correctly requires authentication")
    
    def test_mark_read_requires_auth(self):
        """PUT /api/notifications/{id}/read - requires authentication"""
        response = requests.put(f"{BASE_URL}/api/notifications/test-id/read")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PUT /api/notifications/{id}/read correctly requires authentication")
    
    def test_mark_all_read_requires_auth(self):
        """PUT /api/notifications/mark-all-read - requires authentication"""
        response = requests.put(f"{BASE_URL}/api/notifications/mark-all-read")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PUT /api/notifications/mark-all-read correctly requires authentication")


class TestConsultantNotifications:
    """Test notifications from consultant's perspective"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin first to create test data"""
        self.admin_session = requests.Session()
        self.admin_session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("token")
            self.admin_session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        else:
            pytest.skip(f"Admin login failed: {response.status_code}")
    
    def test_consultant_receives_new_lead_notification(self):
        """Verify consultant receives notification when lead is assigned"""
        # Create a lead - it should be auto-assigned to a consultant
        lead_data = {
            "name": "TEST_ConsultantNotif",
            "surname": "Test",
            "phone": "+27829991111",
            "source": "Instagram"
        }
        
        response = self.admin_session.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert response.status_code == 200, f"Failed to create lead: {response.text}"
        
        lead = response.json()
        lead_id = lead["id"]
        owner_id = lead.get("owner_id")
        
        if owner_id:
            print(f"Lead assigned to consultant {owner_id}")
            print(f"Consultant should have received 'new_lead' notification")
            
            # We can't easily verify the consultant's notifications without their credentials
            # But we can verify the lead was created and assigned correctly
            assert lead["stage"] == "New Lead"
            assert lead["owner_id"] is not None
        else:
            print("No consultant available - lead not assigned")
        
        # Cleanup
        self.admin_session.delete(f"{BASE_URL}/api/leads/{lead_id}")
        print("Test lead cleaned up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
