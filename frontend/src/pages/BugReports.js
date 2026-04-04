import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Bug, CheckCircle, Clock, Warning, ArrowsClockwise } from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PRIORITY_COLORS = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-500' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-500' },
  medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', dot: 'bg-amber-500' },
  low: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-500' },
};

const STATUS_ICONS = {
  open: { icon: Warning, color: 'text-amber-400' },
  in_progress: { icon: ArrowsClockwise, color: 'text-cyan-400' },
  resolved: { icon: CheckCircle, color: 'text-emerald-400' },
};

const BugReports = ({ user }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/bug-reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data);
    } catch {
      toast.error('Failed to load bug reports');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/bug-reports/${id}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Status updated');
      fetchReports();
    } catch {
      toast.error('Failed to update');
    }
  };

  const filtered = reports.filter(r => {
    if (filterPriority !== 'all' && r.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  const counts = {
    total: reports.length,
    open: reports.filter(r => r.status === 'open').length,
    in_progress: reports.filter(r => r.status === 'in_progress').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    critical: reports.filter(r => r.priority === 'critical' && r.status !== 'resolved').length,
  };

  return (
    <Layout user={user}>
      <div className="p-4 sm:p-6 lg:p-8" data-testid="bug-reports-page">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50" data-testid="bug-reports-title">
              Bug Reports
            </h1>
            <p className="mt-2 text-base text-zinc-400">All submitted bug reports from your team</p>
          </div>
          <Button onClick={fetchReports} className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700" data-testid="refresh-reports">
            <ArrowsClockwise size={18} />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <Card className="stat-card p-4">
            <p className="text-xs uppercase font-bold text-zinc-500">Total</p>
            <p className="text-2xl font-black text-zinc-100">{counts.total}</p>
          </Card>
          <Card className="stat-card p-4">
            <p className="text-xs uppercase font-bold text-amber-500">Open</p>
            <p className="text-2xl font-black text-amber-400">{counts.open}</p>
          </Card>
          <Card className="stat-card p-4">
            <p className="text-xs uppercase font-bold text-cyan-500">In Progress</p>
            <p className="text-2xl font-black text-cyan-400">{counts.in_progress}</p>
          </Card>
          <Card className="stat-card p-4">
            <p className="text-xs uppercase font-bold text-emerald-500">Resolved</p>
            <p className="text-2xl font-black text-emerald-400">{counts.resolved}</p>
          </Card>
          <Card className="stat-card p-4">
            <p className="text-xs uppercase font-bold text-red-500">Critical</p>
            <p className="text-2xl font-black text-red-400">{counts.critical}</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800 text-zinc-50" data-testid="filter-priority">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800 text-zinc-50" data-testid="filter-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading reports...</div>
        ) : filtered.length === 0 ? (
          <Card className="stat-card p-12 text-center">
            <Bug size={48} className="mx-auto text-zinc-600 mb-3" />
            <p className="text-zinc-400">No bug reports found</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(report => {
              const pc = PRIORITY_COLORS[report.priority] || PRIORITY_COLORS.medium;
              const StatusIcon = STATUS_ICONS[report.status]?.icon || Clock;
              const statusColor = STATUS_ICONS[report.status]?.color || 'text-zinc-400';

              return (
                <Card
                  key={report.id}
                  className={`stat-card p-5 border-l-4 ${pc.border}`}
                  data-testid={`bug-report-${report.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${pc.bg} ${pc.text}`}>
                          {report.priority.toUpperCase()}
                        </span>
                        <StatusIcon size={16} className={statusColor} />
                        <span className={`text-xs font-semibold ${statusColor}`}>
                          {report.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-zinc-600">
                          {new Date(report.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-200 mb-2 whitespace-pre-wrap">{report.description}</p>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span>By: <strong className="text-zinc-300">{report.reported_by_name}</strong> ({report.reported_by_email})</span>
                        <span>Page: {report.page || 'N/A'}</span>
                        {report.wa_sent && (
                          <span className="text-emerald-500">WA Sent</span>
                        )}
                      </div>
                    </div>
                    <Select value={report.status} onValueChange={(v) => updateStatus(report.id, v)}>
                      <SelectTrigger className="w-36 bg-zinc-950 border-zinc-800 text-zinc-50 text-xs" data-testid={`status-select-${report.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BugReports;
