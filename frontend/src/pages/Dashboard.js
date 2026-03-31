import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendUp, Users, Target, Clock, Calendar, FileText } from '@phosphor-icons/react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [monthPeriod, setMonthPeriod] = useState({ month_start_date: '', month_end_date: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchTodayAppointments();
    fetchSettings();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(`${API_URL}/api/appointments?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(response.data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
      if (response.data.month_start_date && response.data.month_end_date) {
        setMonthPeriod({
          month_start_date: response.data.month_start_date,
          month_end_date: response.data.month_end_date
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleUpdatePeriod = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/settings`, monthPeriod, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Month period updated');
      setShowPeriodModal(false);
      fetchSettings();
    } catch (error) {
      toast.error('Failed to update period');
    }
  };

  const handleGenerateReport = async () => {
    if (!window.confirm('This will generate a month report and clear all Closed Won deals. Continue?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/reports/generate-month-report`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate report');
    }
  };

  const chartData = [
    { month: 'Jan', sales: 4000 },
    { month: 'Feb', sales: 3000 },
    { month: 'Mar', sales: 5000 },
    { month: 'Apr', sales: 7000 },
    { month: 'May', sales: 6000 },
    { month: 'Jun', sales: 8000 },
  ];

  return (
    <Layout user={user}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid="dashboard-page">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50" data-testid="dashboard-title">
              Dashboard
            </h1>
            <p className="mt-2 text-base text-zinc-400">Welcome back, {user?.name}</p>
          </div>

          <div className="text-right">
            {settings?.month_start_date && settings?.month_end_date ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 justify-end">
                  <Calendar size={16} className="text-lime-400" />
                  <span className="text-xs tracking-wider uppercase font-bold text-zinc-500">Active Month</span>
                </div>
                <p className="text-sm font-semibold text-zinc-100">
                  {new Date(settings.month_start_date).toLocaleDateString()} - {new Date(settings.month_end_date).toLocaleDateString()}
                </p>
                <p className="text-xs text-zinc-500">Cutoff: {new Date(settings.month_end_date).toLocaleDateString()}</p>
                {user?.role === 'admin' && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      onClick={() => setShowPeriodModal(true)}
                      data-testid="edit-period-button"
                      className="text-xs bg-zinc-800 text-zinc-50 hover:bg-zinc-700 px-3 py-1"
                    >
                      Edit Period
                    </Button>
                    <Button
                      onClick={handleGenerateReport}
                      data-testid="generate-report-button"
                      className="text-xs bg-amber-500 text-zinc-950 hover:bg-amber-600 px-3 py-1 font-semibold"
                    >
                      <FileText size={14} className="mr-1" />
                      Generate Report
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              user?.role === 'admin' && (
                <Button
                  onClick={() => setShowPeriodModal(true)}
                  data-testid="set-period-button"
                  className="bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
                >
                  <Calendar size={18} className="mr-2" />
                  Set Month Period
                </Button>
              )
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading stats...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="stat-card" data-testid="total-leads-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs tracking-wider uppercase font-bold text-zinc-500">Total Leads</p>
                    <p className="mt-2 text-3xl font-black text-zinc-50">{stats?.total_leads || 0}</p>
                  </div>
                  <Users size={32} weight="duotone" className="text-lime-400" />
                </div>
              </Card>

              <Card className="stat-card" data-testid="conversion-rate-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs tracking-wider uppercase font-bold text-zinc-500">Conversion Rate</p>
                    <p className="mt-2 text-3xl font-black text-zinc-50">{stats?.conversion_rate || 0}%</p>
                  </div>
                  <Target size={32} weight="duotone" className="text-cyan-500" />
                </div>
              </Card>

              <Card className="stat-card" data-testid="cash-sales-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs tracking-wider uppercase font-bold text-zinc-500">Cash Sales</p>
                    <p className="mt-2 text-3xl font-black text-zinc-50">R{stats?.cash_sales || 0}</p>
                  </div>
                  <TrendUp size={32} weight="duotone" className="text-emerald-500" />
                </div>
              </Card>

              <Card className="stat-card" data-testid="debit-sales-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs tracking-wider uppercase font-bold text-zinc-500">Debit Sales</p>
                    <p className="mt-2 text-3xl font-black text-zinc-50">R{stats?.debit_sales || 0}</p>
                  </div>
                  <Clock size={32} weight="duotone" className="text-amber-500" />
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="stat-card p-6" data-testid="units-sold-card">
                <h3 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-4">Performance Summary</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">Total Units Sold</span>
                      <span className="font-bold text-zinc-50">{stats?.total_units || 0}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">Closed Deals</span>
                      <span className="font-bold text-zinc-50">{stats?.closed_won || 0}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="stat-card p-6" data-testid="todays-appointments-card">
                <h3 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-4">Today's Appointments</h3>
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {appointments.length > 0 ? (
                    appointments.map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between text-sm p-2 bg-zinc-950 rounded">
                        <div>
                          <p className="font-semibold text-zinc-100">
                            {apt.scheduled_at.split('T')[1]?.substring(0, 5)} - {apt.lead_name} {apt.lead_surname || ''}
                          </p>
                          <p className="text-xs text-zinc-400">{apt.consultant_name}</p>
                          {apt.booked_by_name && apt.booked_by_name !== apt.consultant_name && (
                            <p className="text-xs text-cyan-500">Booked by: {apt.booked_by_name}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">No appointments today</p>
                  )}
                </div>
              </Card>
            </div>

            <Card className="stat-card p-6" data-testid="sales-chart-card">
              <h3 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-4">Sales Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#bef264" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#bef264" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" stroke="#71717a" />
                  <YAxis stroke="#71717a" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '0.375rem',
                      color: '#fafafa'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#bef264"
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card className="stat-card p-6" data-testid="recent-activity-card">
              <h3 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="w-2 h-2 rounded-full bg-lime-400"></div>
                    <span>New lead assigned from Meta campaign</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                    <span>Appointment scheduled for tomorrow</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span>Deal closed - R1,500 debit order</span>
                  </div>
                </div>
              </Card>
          </>
        )}
      </div>

      <Dialog open={showPeriodModal} onOpenChange={setShowPeriodModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50" data-testid="month-period-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-zinc-50">Set Month Period</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePeriod} className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-zinc-300">
                Set the billing period for your gym. Deals will be tracked from start to end date. After cutoff, you can generate a report and clear the Kanban board.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Month Start Date</Label>
              <Input
                type="date"
                value={monthPeriod.month_start_date}
                onChange={(e) => setMonthPeriod({ ...monthPeriod, month_start_date: e.target.value })}
                required
                data-testid="month-start-input"
                className="bg-zinc-950 border-zinc-800 text-zinc-50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Month End Date (Cutoff)</Label>
              <Input
                type="date"
                value={monthPeriod.month_end_date}
                onChange={(e) => setMonthPeriod({ ...monthPeriod, month_end_date: e.target.value })}
                required
                data-testid="month-end-input"
                className="bg-zinc-950 border-zinc-800 text-zinc-50"
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setShowPeriodModal(false)}
                data-testid="cancel-period-button"
                className="flex-1 bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-testid="submit-period-button"
                className="flex-1 bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
              >
                Set Period
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Dashboard;
