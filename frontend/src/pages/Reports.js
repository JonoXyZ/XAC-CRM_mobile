import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { DownloadSimple, FileText, Lightning, Warning, PencilSimple, Trash } from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Reports = ({ user }) => {
  const [reportType, setReportType] = useState('leads');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [monthReports, setMonthReports] = useState([]);
  const [loadingMonthReports, setLoadingMonthReports] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [editingReportId, setEditingReportId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const fetchMonthReports = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reports/month-reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMonthReports(response.data);
    } catch (error) {
      console.error('Failed to fetch month reports:', error);
    } finally {
      setLoadingMonthReports(false);
    }
  }, []);

  useEffect(() => {
    fetchMonthReports();
  }, [fetchMonthReports]);

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

  const handleGenerateReport = async (mode) => {
    setGeneratingReport(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/reports/generate-month-report`, 
        { mode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.deals_count === 0) {
        toast.info(response.data.message || 'No deals to process');
      } else {
        toast.success(response.data.message);
      }
      
      setShowReportModal(false);
      fetchMonthReports();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleRenameReport = async (reportId) => {
    if (!editingName.trim()) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/reports/month-reports/${reportId}`, 
        { name: editingName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Report renamed');
      setEditingReportId(null);
      setEditingName('');
      fetchMonthReports();
    } catch (error) {
      toast.error('Failed to rename report');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Delete this report permanently? This cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/reports/month-reports/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Report deleted');
      fetchMonthReports();
    } catch (error) {
      toast.error('Failed to delete report');
    }
  };

  const handleDownloadPDF = async (report) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reports/month-reports/${report.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'text'
      });
      
      // Open in new window for print-to-PDF
      const printWindow = window.open('', '_blank');
      printWindow.document.write(response.data);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    } catch (error) {
      toast.error('Failed to download report');
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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid="reports-page">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50" data-testid="reports-title">
              Reports & Export
            </h1>
            <p className="mt-2 text-base text-zinc-400">Generate and export detailed reports</p>
          </div>
          {user?.role === 'admin' && (
            <Button
              onClick={() => setShowReportModal(true)}
              data-testid="generate-report-button"
              className="bg-lime-400 text-zinc-950 font-bold rounded-md px-4 py-2 hover:bg-lime-500 active:scale-95 flex items-center gap-2"
            >
              <Lightning size={20} weight="bold" />
              Generate Report
            </Button>
          )}
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

        <Card className="stat-card p-6" data-testid="month-reports-card">
          <h3 className="text-2xl font-semibold text-zinc-100 mb-4">Monthly Reports Archive</h3>
          
          {loadingMonthReports ? (
            <p className="text-center text-zinc-400 py-8">Loading reports...</p>
          ) : monthReports.length > 0 ? (
            <div className="space-y-3">
              {monthReports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 bg-zinc-950 rounded-md border border-zinc-800 hover:border-zinc-700"
                  data-testid={`month-report-${report.id}`}
                >
                  {/* Report Name */}
                  <div className="flex items-center gap-2 mb-2">
                    {editingReportId === report.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameReport(report.id); if (e.key === 'Escape') setEditingReportId(null); }}
                          className="bg-zinc-900 border-zinc-700 text-zinc-50 h-8 text-sm"
                          autoFocus
                          data-testid={`rename-input-${report.id}`}
                        />
                        <Button onClick={() => handleRenameReport(report.id)} className="bg-lime-400 text-zinc-950 hover:bg-lime-500 h-8 px-3 text-xs font-bold" data-testid={`save-name-${report.id}`}>
                          Save
                        </Button>
                        <Button onClick={() => setEditingReportId(null)} className="bg-zinc-800 text-zinc-400 hover:bg-zinc-700 h-8 px-3 text-xs">
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h4 className="text-lg font-bold text-zinc-100 flex-1" data-testid={`report-name-${report.id}`}>
                          {report.name || `Report ${report.period_start} to ${report.period_end}`}
                        </h4>
                        <Button
                          onClick={() => { setEditingReportId(report.id); setEditingName(report.name || `Report ${report.period_start} to ${report.period_end}`); }}
                          className="p-1.5 h-auto bg-zinc-800 hover:bg-zinc-700"
                          title="Rename Report"
                          data-testid={`edit-name-${report.id}`}
                        >
                          <PencilSimple size={14} />
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm text-zinc-400">
                        {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
                      </p>
                      <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-zinc-500">Deals:</span>
                          <span className="ml-2 font-semibold text-zinc-100">{report.total_deals}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Cash:</span>
                          <span className="ml-2 font-semibold text-emerald-400">R{report.total_cash_sales}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Debit:</span>
                          <span className="ml-2 font-semibold text-cyan-400">R{report.total_debit_sales}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Units:</span>
                          <span className="ml-2 font-semibold text-amber-400">{report.total_units}</span>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-600 mt-2">
                        Generated: {new Date(report.generated_at).toLocaleString()}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        onClick={() => handleDownloadPDF(report)}
                        className="bg-lime-400 text-zinc-950 hover:bg-lime-500 h-8 px-3 text-xs font-bold flex items-center gap-1"
                        title="Download PDF"
                        data-testid={`download-pdf-${report.id}`}
                      >
                        <DownloadSimple size={14} weight="bold" />
                        PDF
                      </Button>
                      {user?.role === 'admin' && (
                        <Button
                          onClick={() => handleDeleteReport(report.id)}
                          className="bg-red-900/50 hover:bg-red-900 text-red-200 h-8 px-3 text-xs flex items-center gap-1"
                          title="Delete Report"
                          data-testid={`delete-report-${report.id}`}
                        >
                          <Trash size={14} />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-zinc-500 py-8">No monthly reports generated yet</p>
          )}
        </Card>
      </div>

      {/* Generate Report Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 max-w-lg" data-testid="generate-report-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-zinc-50">Generate Month Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Choose how you want to generate the month-end report for all "Closed Won" deals.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleGenerateReport('mtd_only')}
                disabled={generatingReport}
                data-testid="mtd-only-button"
                className="w-full p-4 bg-zinc-950 rounded-lg border border-zinc-800 hover:border-lime-400/50 text-left transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <FileText size={24} weight="duotone" className="text-lime-400 mt-0.5" />
                  <div>
                    <p className="font-bold text-zinc-100 group-hover:text-lime-400">MTD Report Only</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Generates a snapshot report of current month deals without clearing any data. 
                      Deals and leads remain in their current state.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  if (window.confirm('WARNING: This will archive all Closed Won leads, delete their deals from active tracking, and reset commission goals. This action cannot be undone. Continue?')) {
                    handleGenerateReport('start_new_month');
                  }
                }}
                disabled={generatingReport}
                data-testid="start-new-month-button"
                className="w-full p-4 bg-zinc-950 rounded-lg border border-red-900/50 hover:border-red-500/50 text-left transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <Warning size={24} weight="duotone" className="text-red-400 mt-0.5" />
                  <div>
                    <p className="font-bold text-zinc-100 group-hover:text-red-400">Start New Month</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Generates the report, then archives all Closed Won leads, clears deals from active tracking, 
                      and resets commission goals. Use this at the end of the billing cycle.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {generatingReport && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-lime-400 border-t-transparent mx-auto mb-2"></div>
                <p className="text-sm text-zinc-400">Generating report...</p>
              </div>
            )}

            <Button
              type="button"
              onClick={() => setShowReportModal(false)}
              data-testid="cancel-report-button"
              className="w-full bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Reports;
