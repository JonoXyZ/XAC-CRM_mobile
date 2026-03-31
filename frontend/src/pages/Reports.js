import React, { useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { DownloadSimple, FileText } from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Reports = ({ user }) => {
  const [reportType, setReportType] = useState('leads');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const handleExport = async () => {
    if (!fromDate || !toDate) {
      toast.error('Please select date range');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reports/export`, {
        params: { report_type: reportType, from_date: fromDate, to_date: toDate },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setReportData(response.data);
      
      const csv = convertToCSV(response.data.data);
      downloadCSV(csv, `${reportType}_report_${fromDate}_to_${toDate}.csv`);
      
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (user?.role !== 'admin' && user?.role !== 'sales_manager') {
    return (
      <Layout user={user}>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="text-center py-12">
            <FileText size={64} className="mx-auto text-zinc-700 mb-4" />
            <h2 className="text-2xl font-bold text-zinc-400">Access Denied</h2>
            <p className="text-zinc-500 mt-2">Only administrators and sales managers can access reports</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="p-4 sm:p-6 lg:p-8" data-testid="reports-page">
        <div className="mb-6">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50" data-testid="reports-title">
            Reports & Export
          </h1>
          <p className="mt-2 text-base text-zinc-400">Generate and export detailed reports</p>
        </div>

        <Card className="stat-card p-6 max-w-2xl" data-testid="export-card">
          <h3 className="text-2xl font-semibold text-zinc-100 mb-6">Export Data</h3>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType} data-testid="report-type-select">
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="leads">Leads Report</SelectItem>
                  <SelectItem value="deals">Deals Report</SelectItem>
                  <SelectItem value="appointments">Appointments Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">From Date</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  data-testid="from-date-input"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">To Date</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  data-testid="to-date-input"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                />
              </div>
            </div>

            <Button
              onClick={handleExport}
              disabled={loading}
              data-testid="export-button"
              className="w-full bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500 flex items-center justify-center gap-2"
            >
              <DownloadSimple size={20} weight="bold" />
              {loading ? 'Generating...' : 'Export to CSV'}
            </Button>

            {reportData && (
              <div className="mt-6 p-4 bg-zinc-950 rounded-md border border-zinc-800">
                <p className="text-sm text-zinc-400">
                  Exported <span className="font-bold text-lime-400">{reportData.count}</span> records
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Reports;
