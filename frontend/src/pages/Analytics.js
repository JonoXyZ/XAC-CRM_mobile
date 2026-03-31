import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { TrendUp, Clock, Target, ChartBar } from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Analytics = ({ user }) => {
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/analytics/consultant-performance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPerformance(response.data);
    } catch (error) {
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'sales_manager') {
    return (
      <Layout user={user}>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="text-center py-12">
            <ChartBar size={64} className="mx-auto text-zinc-700 mb-4" />
            <h2 className="text-2xl font-bold text-zinc-400">Access Denied</h2>
            <p className="text-zinc-500 mt-2">Only administrators and sales managers can access analytics</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="p-4 sm:p-6 lg:p-8" data-testid="analytics-page">
        <div className="mb-6">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50" data-testid="analytics-title">
            Performance Analytics
          </h1>
          <p className="mt-2 text-base text-zinc-400">Track consultant performance and metrics</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading analytics...</div>
        ) : (
          <div className="space-y-6">
            {performance.map((consultant) => (
              <Card key={consultant.consultant_id} className="stat-card p-6" data-testid={`consultant-card-${consultant.consultant_id}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-zinc-100">{consultant.consultant_name}</h3>
                  <span className="text-xs bg-lime-400/20 text-lime-400 px-3 py-1 rounded-full font-semibold">
                    {consultant.conversion_rate}% Conversion
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs">
                      <Target size={14} />
                      <span>Total Leads</span>
                    </div>
                    <p className="text-2xl font-bold text-zinc-50">{consultant.total_leads}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs">
                      <TrendUp size={14} />
                      <span>Closed Deals</span>
                    </div>
                    <p className="text-2xl font-bold text-zinc-50">{consultant.closed_won}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs">
                      <Clock size={14} />
                      <span>Avg Response</span>
                    </div>
                    <p className="text-2xl font-bold text-zinc-50">{consultant.avg_response_time_hours}h</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs">
                      <TrendUp size={14} />
                      <span>Total Sales</span>
                    </div>
                    <p className="text-2xl font-bold text-lime-400">
                      R{(consultant.total_cash_sales + consultant.total_debit_sales).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-500">Cash Sales:</span>
                      <span className="ml-2 font-semibold text-zinc-100">R{consultant.total_cash_sales}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Debit Sales:</span>
                      <span className="ml-2 font-semibold text-zinc-100">R{consultant.total_debit_sales}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {performance.length === 0 && (
              <Card className="stat-card p-12">
                <p className="text-center text-zinc-500">No consultant performance data available yet</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Analytics;
