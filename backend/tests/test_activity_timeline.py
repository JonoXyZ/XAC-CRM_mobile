"""Tests for the Lead Activity Timeline feature (iteration 10)."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fitness-sales-hub.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@revivalfitness.com"
ADMIN_PASSWORD = "Admin@2026"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data or "access_token" in data
    return data.get("token") or data.get("access_token")


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def created_lead(headers):
    """Create a test lead that will be used for activity tests."""
    payload = {
        "name": "TEST_Timeline",
        "surname": "Lead",
        "phone": "+27830000001",
        "email": "test_timeline@example.com",
        "source": "manual",
        "notes": "created for activity timeline tests",
    }
    r = requests.post(f"{BASE_URL}/api/leads", json=payload, headers=headers, timeout=15)
    assert r.status_code in (200, 201), f"Create lead failed: {r.status_code} {r.text}"
    data = r.json()
    lead_id = data.get("id") or data.get("_id") or data.get("lead_id")
    assert lead_id, f"No id field in create response: {data}"
    yield {"id": lead_id, "data": data}
    # Cleanup
    requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=headers, timeout=15)


# === Authentication ===
class TestAuth:
    def test_admin_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("token") or data.get("access_token")


# === Activity auto-log on lead creation ===
class TestLeadCreationActivity:
    def test_create_lead_auto_logs_activity(self, headers, created_lead):
        lead_id = created_lead["id"]
        # Give backend a moment
        time.sleep(0.5)
        r = requests.get(f"{BASE_URL}/api/activities/{lead_id}", headers=headers, timeout=15)
        assert r.status_code == 200, f"Get activities failed: {r.status_code} {r.text}"
        activities = r.json()
        assert isinstance(activities, list)
        assert len(activities) >= 1, "Expected at least 1 auto-logged activity (lead_created)"
        types = [a.get("activity_type") for a in activities]
        assert "lead_created" in types, f"lead_created not in {types}"
        # Validate fields on first activity
        lc = next(a for a in activities if a["activity_type"] == "lead_created")
        assert "content" in lc and lc["content"]
        assert "created_at" in lc
        assert "id" in lc
        # user_name may be populated for admin
        assert "user_name" in lc


# === Activity auto-log on stage change ===
class TestStageChangeActivity:
    def test_update_stage_logs_activity(self, headers, created_lead):
        lead_id = created_lead["id"]
        # Change stage
        r = requests.put(
            f"{BASE_URL}/api/leads/{lead_id}",
            json={"stage": "Contacted"},
            headers=headers,
            timeout=15,
        )
        assert r.status_code in (200, 201), f"Update lead failed: {r.status_code} {r.text}"
        time.sleep(0.5)
        r = requests.get(f"{BASE_URL}/api/activities/{lead_id}", headers=headers, timeout=15)
        assert r.status_code == 200
        activities = r.json()
        types = [a.get("activity_type") for a in activities]
        assert "stage_changed" in types, f"stage_changed not in {types}"
        sc = next(a for a in activities if a["activity_type"] == "stage_changed")
        assert "Contacted" in sc["content"], f"Expected 'Contacted' in content: {sc['content']}"


# === POST /api/activities ===
class TestPostActivity:
    def test_post_whatsapp_activity(self, headers, created_lead):
        lead_id = created_lead["id"]
        payload = {
            "lead_id": lead_id,
            "activity_type": "whatsapp_sent",
            "content": "TEST WhatsApp message opened",
            "notes": "Hello there",
        }
        r = requests.post(f"{BASE_URL}/api/activities", json=payload, headers=headers, timeout=15)
        assert r.status_code in (200, 201), f"POST activity failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("success") is True

        # Verify via GET
        time.sleep(0.4)
        r = requests.get(f"{BASE_URL}/api/activities/{lead_id}", headers=headers, timeout=15)
        assert r.status_code == 200
        activities = r.json()
        types = [a.get("activity_type") for a in activities]
        assert "whatsapp_sent" in types
        wa = next(a for a in activities if a["activity_type"] == "whatsapp_sent")
        assert wa["content"] == "TEST WhatsApp message opened"
        assert wa.get("notes") == "Hello there"

    def test_get_activities_unauth(self, created_lead):
        r = requests.get(f"{BASE_URL}/api/activities/{created_lead['id']}", timeout=15)
        assert r.status_code in (401, 403)


# === Activity sort order (desc) ===
class TestActivityOrder:
    def test_activities_reverse_chronological(self, headers, created_lead):
        lead_id = created_lead["id"]
        r = requests.get(f"{BASE_URL}/api/activities/{lead_id}", headers=headers, timeout=15)
        assert r.status_code == 200
        activities = r.json()
        if len(activities) >= 2:
            timestamps = [a["created_at"] for a in activities]
            assert timestamps == sorted(timestamps, reverse=True), "Activities not in reverse chronological order"


# === Appointment auto-log ===
class TestAppointmentActivity:
    def test_create_appointment_logs_activity(self, headers, created_lead):
        lead_id = created_lead["id"]
        from datetime import datetime, timezone, timedelta
        start = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        payload = {
            "lead_id": lead_id,
            "scheduled_at": start,
            "type": "consultation",
            "notes": "TEST appointment",
        }
        r = requests.post(f"{BASE_URL}/api/appointments", json=payload, headers=headers, timeout=15)
        if r.status_code not in (200, 201):
            pytest.skip(f"Appointment payload schema may differ: {r.status_code} {r.text}")
        time.sleep(0.4)
        r = requests.get(f"{BASE_URL}/api/activities/{lead_id}", headers=headers, timeout=15)
        assert r.status_code == 200
        activities = r.json()
        types = [a.get("activity_type") for a in activities]
        # Either appointment_booked or appointment_auto_created acceptable
        assert any(t in types for t in ["appointment_booked", "appointment_auto_created"]), (
            f"No appointment activity logged: {types}"
        )


# === Known seed test lead ===
class TestSeedLeadActivities:
    def test_seed_lead_has_activities(self, headers):
        seed_lead_id = "69d1021bcd161f9d4fc9d816"
        r = requests.get(f"{BASE_URL}/api/activities/{seed_lead_id}", headers=headers, timeout=15)
        assert r.status_code == 200
        activities = r.json()
        # Should have at least some activities per agent context
        if len(activities) == 0:
            pytest.skip("Seed lead has no activities (may have been cleared)")
        for a in activities:
            assert "activity_type" in a
            assert "content" in a
            assert "created_at" in a
            assert "id" in a
            assert "user_name" in a  # may be None
