"""
Test Commission Page and Earnings Scale Features
- Commission endpoint with earnings calculations
- Income goal save/retrieve
- Earnings scale in user management
- Assistant dashboard stats
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCommissionEndpoints:
    """Commission API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@revivalfitness.com",
            "password": "Admin@2026"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.consultant_id = "69cbf97c38323e0e80748fb0"  # Joanthan
    
    def test_get_commission_for_consultant(self):
        """GET /api/commission?user_id=xxx returns commission data"""
        response = requests.get(
            f"{BASE_URL}/api/commission?user_id={self.consultant_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "consultant_name" in data
        assert "earnings_mtd" in data
        assert "basic_salary" in data
        assert "debit_commission" in data
        assert "cash_commission" in data
        assert "total_bonuses" in data
        assert "income_goal" in data
        assert "debit_deals" in data
        assert "cash_deals" in data
        assert "earnings_scale" in data
        
        # Verify consultant name
        assert data["consultant_name"] == "Joanthan"
        
        # Verify earnings calculation: basic + debit + cash + bonuses = earnings_mtd
        expected_earnings = (
            data["basic_salary"] + 
            data["debit_commission"] + 
            data["cash_commission"] + 
            data["total_bonuses"]
        )
        assert data["earnings_mtd"] == expected_earnings, \
            f"Earnings MTD mismatch: {data['earnings_mtd']} != {expected_earnings}"
        
        print(f"Commission data verified: Earnings MTD = R{data['earnings_mtd']}")
    
    def test_commission_earnings_scale_structure(self):
        """Verify earnings_scale has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/commission?user_id={self.consultant_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        es = data.get("earnings_scale", {})
        
        # Verify basic salary
        assert "basic_salary" in es
        assert es["basic_salary"] == 5000, f"Basic salary should be 5000, got {es['basic_salary']}"
        
        # Verify debit order tiers
        assert "debit_order_tiers" in es
        debit_tiers = es["debit_order_tiers"]
        assert len(debit_tiers) >= 4, "Should have at least 4 debit tiers"
        
        # Verify tier rates: 100, 150, 200, 250
        rates = [t["rate"] for t in debit_tiers]
        assert 100 in rates, "Should have R100 rate tier"
        assert 150 in rates, "Should have R150 rate tier"
        assert 200 in rates, "Should have R200 rate tier"
        assert 250 in rates, "Should have R250 rate tier"
        
        # Verify cash sales tiers
        assert "cash_sales_tiers" in es
        cash_tiers = es["cash_sales_tiers"]
        assert len(cash_tiers) >= 5, "Should have at least 5 cash tiers"
        
        # Verify tier percentages: 5, 10, 12, 15, 20
        percentages = [t["percentage"] for t in cash_tiers]
        assert 5 in percentages, "Should have 5% tier"
        assert 10 in percentages, "Should have 10% tier"
        assert 12 in percentages, "Should have 12% tier"
        assert 15 in percentages, "Should have 15% tier"
        assert 20 in percentages, "Should have 20% tier"
        
        # Verify bonuses
        assert "bonuses" in es
        bonuses = es["bonuses"]
        assert "club_incentive" in bonuses
        assert bonuses["club_incentive"] == 500, f"Club incentive should be 500, got {bonuses['club_incentive']}"
        
        print("Earnings scale structure verified")
    
    def test_save_income_goal(self):
        """PUT /api/commission/goal saves goal correctly"""
        test_goal = 20000
        
        # Save goal
        response = requests.put(
            f"{BASE_URL}/api/commission/goal",
            headers=self.headers,
            json={"user_id": self.consultant_id, "goal": test_goal}
        )
        assert response.status_code == 200
        assert response.json().get("success") == True
        
        # Verify goal was saved
        response = requests.get(
            f"{BASE_URL}/api/commission?user_id={self.consultant_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["income_goal"] == test_goal, \
            f"Goal should be {test_goal}, got {data['income_goal']}"
        
        print(f"Income goal saved and verified: R{test_goal}")
    
    def test_commission_totals(self):
        """Verify commission totals are calculated correctly"""
        response = requests.get(
            f"{BASE_URL}/api/commission?user_id={self.consultant_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify totals exist
        assert "total_debit_units" in data
        assert "total_cash_value" in data
        assert "total_joining_fees" in data
        assert "total_debit_value" in data
        assert "debit_rate" in data
        assert "cash_pct" in data
        
        # Verify deals arrays
        assert isinstance(data["debit_deals"], list)
        assert isinstance(data["cash_deals"], list)
        
        print(f"Commission totals verified: {data['total_debit_units']} units, R{data['total_cash_value']} cash")


class TestUserEarningsScale:
    """User Management - Earnings Scale tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@revivalfitness.com",
            "password": "Admin@2026"
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.consultant_id = "69cbf97c38323e0e80748fb0"
    
    def test_get_user_with_earnings_scale(self):
        """GET /api/users returns earnings_scale for consultants"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        users = response.json()
        
        # Find Joanthan
        consultant = next((u for u in users if u["id"] == self.consultant_id), None)
        assert consultant is not None, "Consultant Joanthan not found"
        
        # Verify earnings_scale exists
        assert "earnings_scale" in consultant
        assert consultant["earnings_scale"] is not None
        
        es = consultant["earnings_scale"]
        assert es["basic_salary"] == 5000
        
        print(f"User earnings_scale verified for {consultant['name']}")
    
    def test_update_user_earnings_scale(self):
        """PUT /api/users/{id} can update earnings_scale"""
        # Get current user data
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        users = response.json()
        consultant = next((u for u in users if u["id"] == self.consultant_id), None)
        
        # Update with modified earnings scale
        updated_es = consultant["earnings_scale"].copy()
        updated_es["basic_salary"] = 5500  # Temporarily change
        
        response = requests.put(
            f"{BASE_URL}/api/users/{self.consultant_id}",
            headers=self.headers,
            json={"earnings_scale": updated_es}
        )
        assert response.status_code == 200
        
        # Verify update
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        users = response.json()
        consultant = next((u for u in users if u["id"] == self.consultant_id), None)
        assert consultant["earnings_scale"]["basic_salary"] == 5500
        
        # Restore original value
        updated_es["basic_salary"] = 5000
        requests.put(
            f"{BASE_URL}/api/users/{self.consultant_id}",
            headers=self.headers,
            json={"earnings_scale": updated_es}
        )
        
        print("Earnings scale update verified")


class TestAssistantDashboard:
    """Assistant Dashboard Stats tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@revivalfitness.com",
            "password": "Admin@2026"
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_assistant_stats_endpoint_structure(self):
        """GET /api/dashboard/assistant-stats returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/assistant-stats",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure - deal counts not values
        assert "total_leads" in data
        assert "total_appointments" in data
        assert "conversion_rate" in data  # Lead to appointment ratio
        assert "cash_deals_count" in data  # Count, not value
        assert "debit_deals_count" in data  # Count, not value
        assert "appointment_trend" in data  # For Appointment Trend graph
        assert "today_appointments" in data  # Appointments Today
        
        # Verify appointment_trend is array with month/appointments
        assert isinstance(data["appointment_trend"], list)
        if data["appointment_trend"]:
            trend_item = data["appointment_trend"][0]
            assert "month" in trend_item
            assert "appointments" in trend_item
        
        # Verify today_appointments structure
        assert isinstance(data["today_appointments"], list)
        
        print(f"Assistant stats structure verified: {data['cash_deals_count']} cash deals, {data['debit_deals_count']} debit deals")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
