import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import AIWritingAssistant from '../components/AIWritingAssistant';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { 
  GearSix, 
  Users as UsersIcon, 
  WhatsappLogo, 
  Image, 
  FileText,
  UserPlus,
  Trash,
  PencilSimple,
  ArrowsClockwise,
  CurrencyCircleDollar,
  Copy,
  CheckCircle,
  XCircle,
  Lightning
} from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;


// Extracted outside Settings to prevent re-mount on parent state change
const EarningsScaleEditor = ({ selectedUser: su, setSelectedUser: setSU }) => {
  const es = su.earnings_scale || {};
  const updateES = (patch) => setSU({ ...su, earnings_scale: { ...es, ...patch } });

  const debitTiers = es.debit_order_tiers || [
    { min_units: 1, max_units: 10, rate: 0 },
    { min_units: 11, max_units: 19, rate: 0 },
    { min_units: 20, max_units: 29, rate: 0 },
    { min_units: 31, max_units: 999, rate: 0 }
  ];
  const cashTiers = es.cash_sales_tiers || [
    { min_value: 1, percentage: 0 },
    { min_value: 30000, percentage: 0 },
    { min_value: 50000, percentage: 0 },
    { min_value: 75000, percentage: 0 },
    { min_value: 100000, percentage: 0 }
  ];
  const bonuses = es.bonuses || { club_incentive: 0, incentives: [], special_bonus: 0 };

  const setDebitTiers = (tiers) => updateES({ debit_order_tiers: tiers });
  const setCashTiers = (tiers) => updateES({ cash_sales_tiers: tiers });
  const setBonuses = (b) => updateES({ bonuses: b });

  return (
    <div className="border-t border-zinc-800 pt-5 space-y-4" data-testid="earnings-scale-section">
      <h4 className="text-base font-bold text-zinc-100 flex items-center gap-2">
        <CurrencyCircleDollar size={24} weight="duotone" className="text-amber-500" />
        Earnings Scale
      </h4>

      <div className="space-y-1">
        <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Basic Salary (R)</Label>
        <Input
          type="number"
          value={es.basic_salary || ''}
          onChange={(e) => updateES({ basic_salary: parseFloat(e.target.value) || 0 })}
          placeholder="0"
          data-testid="basic-salary-input"
          className="bg-zinc-950 border-zinc-800 text-zinc-50"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Debit Orders Commission (R per unit)</Label>
        {debitTiers.map((tier, idx) => (
          <div key={`debit-${tier.min_units}-${tier.max_units}`} className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 w-24 shrink-0">{tier.min_units}{tier.max_units < 999 ? `-${tier.max_units}` : '+'} units</span>
            <Input
              type="number"
              value={tier.rate || ''}
              onChange={(e) => {
                const updated = [...debitTiers];
                updated[idx] = { ...tier, rate: parseFloat(e.target.value) || 0 };
                setDebitTiers(updated);
              }}
              placeholder="0"
              data-testid={`debit-tier-${idx}-rate`}
              className="bg-zinc-950 border-zinc-800 text-zinc-50 flex-1"
            />
            {idx >= 4 && (
              <Button type="button" onClick={() => setDebitTiers(debitTiers.filter((_, i) => i !== idx))} className="p-1 bg-red-900 hover:bg-red-800 text-red-100">
                <Trash size={14} />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          onClick={() => {
            const lastMax = debitTiers[debitTiers.length - 1]?.min_units || 30;
            setDebitTiers([...debitTiers, { min_units: lastMax + 1, max_units: 999, rate: 0 }]);
          }}
          data-testid="add-debit-tier-button"
          className="text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        >
          + Add Tier
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Cash Sales Commission (%)</Label>
        {cashTiers.map((tier, idx) => (
          <div key={`cash-${tier.min_value}`} className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 w-24 shrink-0">R{tier.min_value.toLocaleString()}+</span>
            <Input
              type="number"
              value={tier.percentage || ''}
              onChange={(e) => {
                const updated = [...cashTiers];
                updated[idx] = { ...tier, percentage: parseFloat(e.target.value) || 0 };
                setCashTiers(updated);
              }}
              placeholder="0"
              data-testid={`cash-tier-${idx}-pct`}
              className="bg-zinc-950 border-zinc-800 text-zinc-50 flex-1"
            />
            {idx >= 5 && (
              <Button type="button" onClick={() => setCashTiers(cashTiers.filter((_, i) => i !== idx))} className="p-1 bg-red-900 hover:bg-red-800 text-red-100">
                <Trash size={14} />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          onClick={() => {
            const lastMin = cashTiers[cashTiers.length - 1]?.min_value || 100000;
            setCashTiers([...cashTiers, { min_value: lastMin + 25000, percentage: 0 }]);
          }}
          data-testid="add-cash-tier-button"
          className="text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        >
          + Add Tier
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Bonuses & Incentives</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 w-24 shrink-0">Club Incentive</span>
          <Input
            type="number"
            value={bonuses.club_incentive || ''}
            onChange={(e) => setBonuses({ ...bonuses, club_incentive: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            data-testid="club-incentive-input"
            className="bg-zinc-950 border-zinc-800 text-zinc-50 flex-1"
          />
        </div>
        {(bonuses.incentives || []).map((inc, idx) => (
          <div key={`incentive-${idx}-${inc.name || ''}`} className="flex items-center gap-2">
            <Input
              value={inc.name || ''}
              onChange={(e) => {
                const updated = [...bonuses.incentives];
                updated[idx] = { ...inc, name: e.target.value };
                setBonuses({ ...bonuses, incentives: updated });
              }}
              placeholder="Name"
              className="bg-zinc-950 border-zinc-800 text-zinc-50 w-24"
            />
            <Input
              type="number"
              value={inc.value || ''}
              onChange={(e) => {
                const updated = [...bonuses.incentives];
                updated[idx] = { ...inc, value: parseFloat(e.target.value) || 0 };
                setBonuses({ ...bonuses, incentives: updated });
              }}
              placeholder="0"
              data-testid={`incentive-${idx}-value`}
              className="bg-zinc-950 border-zinc-800 text-zinc-50 flex-1"
            />
            <Button type="button" onClick={() => setBonuses({ ...bonuses, incentives: bonuses.incentives.filter((_, i) => i !== idx) })} className="p-1 bg-red-900 hover:bg-red-800 text-red-100">
              <Trash size={14} />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          onClick={() => setBonuses({ ...bonuses, incentives: [...(bonuses.incentives || []), { name: 'Incentive', value: 0 }] })}
          data-testid="add-incentive-button"
          className="text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        >
          + Add Incentive
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 w-24 shrink-0">Special Bonus</span>
          <Input
            type="number"
            value={bonuses.special_bonus || ''}
            onChange={(e) => setBonuses({ ...bonuses, special_bonus: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            data-testid="special-bonus-input"
            className="bg-zinc-950 border-zinc-800 text-zinc-50 flex-1"
          />
        </div>
      </div>
    </div>
  );
};


const MetaIntegrationPanel = () => {
  const [config, setConfig] = useState(null);
  const [pageToken, setPageToken] = useState('');
  const [pageId, setPageId] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);
  const [showToken, setShowToken] = useState(false);
  const [importFromDate, setImportFromDate] = useState('');
  const [importToDate, setImportToDate] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [availablePages, setAvailablePages] = useState([]);

  const fetchConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/meta/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(res.data);
      setPageId(res.data.page_id || '');
    } catch (error) { console.error('Meta config fetch failed:', error); }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/meta/recent-leads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentLogs(res.data);
    } catch (error) { console.error('Meta logs fetch failed:', error); }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, [fetchConfig, fetchLogs]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const updates = {};
      if (pageToken.trim()) updates.page_token = pageToken.trim();
      if (pageId.trim()) updates.page_id = pageId.trim();
      await axios.put(`${API_URL}/api/meta/config`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Meta configuration saved');
      setPageToken('');
      setShowToken(false);
      fetchConfig();
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/meta/test-connection`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success(`Connected to: ${res.data.page_name} (ID: ${res.data.page_id})`);
        if (res.data.pages_found && res.data.pages_found.length > 1) {
          setAvailablePages(res.data.pages_found);
        } else {
          setAvailablePages([]);
        }
        fetchConfig();
      } else {
        toast.error(res.data.error || 'Connection failed');
      }
    } catch (error) {
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSelectPage = async (selectedPageId) => {
    try {
      const token = localStorage.getItem('token');
      // Save the selected page ID, then re-run test to store the correct page token
      await axios.put(`${API_URL}/api/meta/config`, { page_id: selectedPageId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const res = await axios.post(`${API_URL}/api/meta/test-connection`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success(`Switched to: ${res.data.page_name}`);
        setAvailablePages([]);
        fetchConfig();
      } else {
        toast.error(res.data.error || 'Failed to switch page');
      }
    } catch (error) {
      toast.error('Failed to switch page');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleImportLeads = async () => {
    if (!importFromDate || !importToDate) {
      toast.error('Please select both From and To dates');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/meta/import-leads`, {
        from_date: importFromDate,
        to_date: importToDate
      }, { headers: { Authorization: `Bearer ${token}` } });
      setImportResult(res.data);
      if (res.data.leads_imported > 0) {
        toast.success(`Imported ${res.data.leads_imported} leads from Meta!`);
      } else if (res.data.leads_skipped > 0) {
        toast.info(`No new leads — ${res.data.leads_skipped} already existed`);
      } else {
        toast.info('No leads found for this date range');
      }
      fetchLogs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to import leads');
    } finally {
      setImporting(false);
    }
  };

  const setQuickDateRange = (days) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setImportFromDate(from.toISOString().split('T')[0]);
    setImportToDate(to.toISOString().split('T')[0]);
  };

  const webhookUrl = `${API_URL}/api/webhooks/meta`;
  const verifyToken = config?.verify_token || 'xac_crm_meta_verify';

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
          <Lightning size={28} weight="duotone" className="text-blue-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-zinc-100">Meta Lead Ads</h3>
            {config?.connected ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full" data-testid="meta-connected-badge">
                <CheckCircle size={12} weight="fill" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full" data-testid="meta-disconnected-badge">
                <XCircle size={12} /> Not Connected
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-400 mt-1">Auto-capture leads from Facebook & Instagram ads</p>
        </div>
      </div>

      {/* Webhook URL & Verify Token - always visible */}
      <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 space-y-3">
        <h4 className="text-xs tracking-wider uppercase font-bold text-zinc-500">Step 1: Add Webhook to Facebook</h4>
        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Webhook URL</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-cyan-400 overflow-x-auto" data-testid="meta-webhook-url">
              {webhookUrl}
            </code>
            <Button onClick={() => copyToClipboard(webhookUrl)} className="shrink-0 bg-zinc-800 hover:bg-zinc-700 p-2" data-testid="copy-webhook-url">
              <Copy size={16} />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Verify Token</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-cyan-400" data-testid="meta-verify-token">
              {verifyToken}
            </code>
            <Button onClick={() => copyToClipboard(verifyToken)} className="shrink-0 bg-zinc-800 hover:bg-zinc-700 p-2" data-testid="copy-verify-token">
              <Copy size={16} />
            </Button>
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          Go to <strong className="text-zinc-300">Facebook Business Settings</strong> &rarr; <strong className="text-zinc-300">Webhooks</strong> &rarr; Subscribe to <strong className="text-zinc-300">leadgen</strong> events using the URL and token above.
        </p>
      </div>

      {/* Page Access Token & Page ID */}
      <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 space-y-3">
        <h4 className="text-xs tracking-wider uppercase font-bold text-zinc-500">Step 2: Connect Your Page</h4>
        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Page Access Token</Label>
          {config?.page_token_set && !showToken ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-400">
                {config.page_token_masked}
              </code>
              <Button onClick={() => setShowToken(true)} className="shrink-0 bg-zinc-800 hover:bg-zinc-700 text-xs px-3" data-testid="change-token-button">
                Change
              </Button>
            </div>
          ) : (
            <Input
              type="password"
              value={pageToken}
              onChange={(e) => setPageToken(e.target.value)}
              placeholder="EAAxxxxxx..."
              data-testid="meta-page-token-input"
              className="bg-zinc-900 border-zinc-800 text-zinc-50"
            />
          )}
          <p className="text-xs text-zinc-600">
            Get this from <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:text-cyan-400 underline">Graph API Explorer</a> with <code>leads_retrieval</code> + <code>pages_read_engagement</code> permissions
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Page ID (optional)</Label>
          <Input
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            placeholder="123456789..."
            data-testid="meta-page-id-input"
            className="bg-zinc-900 border-zinc-800 text-zinc-50"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving || (!pageToken.trim() && !pageId.trim())}
            data-testid="meta-save-config"
            className="flex-1 bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
          <Button
            onClick={handleTest}
            disabled={testing || !config?.page_token_set}
            data-testid="meta-test-connection"
            className="flex-1 bg-cyan-600 text-white font-bold hover:bg-cyan-700"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>
      </div>

      {/* Page Selector - shown when multiple pages found */}
      {availablePages.length > 1 && (
        <div className="p-4 bg-zinc-950 rounded-lg border border-cyan-500/30 space-y-3" data-testid="meta-page-selector">
          <h4 className="text-xs tracking-wider uppercase font-bold text-cyan-400">Select Your Page</h4>
          <p className="text-xs text-zinc-400">Multiple pages found. Choose the one running your lead ads:</p>
          <div className="space-y-2">
            {availablePages.map((pg) => (
              <button
                key={pg.id}
                onClick={() => handleSelectPage(pg.id)}
                data-testid={`select-page-${pg.id}`}
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                  config?.page_id === pg.id 
                    ? 'bg-lime-400/10 border-lime-400/30 text-lime-400' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold">{pg.name}</p>
                  <p className="text-xs text-zinc-500">ID: {pg.id}</p>
                </div>
                {config?.page_id === pg.id && (
                  <span className="text-xs font-bold bg-lime-400 text-zinc-950 px-2 py-0.5 rounded-full">Active</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Import Historical Leads */}
      {config?.page_token_set && (
        <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 space-y-3" data-testid="meta-import-section">
          <h4 className="text-xs tracking-wider uppercase font-bold text-zinc-500">Import Leads from Meta</h4>
          <p className="text-xs text-zinc-500">Pull historical leads from your Facebook Lead Ad forms by date range.</p>
          
          <div className="flex gap-2 mb-2">
            <Button onClick={() => setQuickDateRange(7)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1" data-testid="quick-7d">
              Last 7 days
            </Button>
            <Button onClick={() => setQuickDateRange(14)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1" data-testid="quick-14d">
              Last 14 days
            </Button>
            <Button onClick={() => setQuickDateRange(30)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1" data-testid="quick-30d">
              Last 30 days
            </Button>
            <Button onClick={() => setQuickDateRange(90)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1" data-testid="quick-90d">
              Last 90 days
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">From Date</Label>
              <Input
                type="date"
                value={importFromDate}
                onChange={(e) => setImportFromDate(e.target.value)}
                data-testid="import-from-date"
                className="bg-zinc-900 border-zinc-800 text-zinc-50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400">To Date</Label>
              <Input
                type="date"
                value={importToDate}
                onChange={(e) => setImportToDate(e.target.value)}
                data-testid="import-to-date"
                className="bg-zinc-900 border-zinc-800 text-zinc-50"
              />
            </div>
          </div>

          <Button
            onClick={handleImportLeads}
            disabled={importing || !importFromDate || !importToDate}
            data-testid="import-leads-button"
            className="w-full bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Importing from Meta...
              </>
            ) : (
              <>
                <Lightning size={18} weight="bold" />
                Fetch Leads from Meta
              </>
            )}
          </Button>

          {importResult && (
            <div className={`p-3 rounded-lg border ${importResult.leads_imported > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-zinc-900 border-zinc-800'}`} data-testid="import-result">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-black text-emerald-400">{importResult.leads_imported}</p>
                  <p className="text-xs text-zinc-500">Imported</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-amber-400">{importResult.leads_skipped}</p>
                  <p className="text-xs text-zinc-500">Skipped (duplicates)</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-zinc-400">{importResult.forms_checked}</p>
                  <p className="text-xs text-zinc-500">Forms Checked</p>
                </div>
              </div>
              {importResult.errors?.length > 0 && (
                <div className="mt-2 text-xs text-red-400">
                  {importResult.errors.map((err, i) => <p key={i}>{err}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent Webhook Activity */}
      {recentLogs.length > 0 && (
        <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 space-y-3">
          <h4 className="text-xs tracking-wider uppercase font-bold text-zinc-500 flex items-center gap-2">
            Recent Webhook Activity
            <Button onClick={fetchLogs} className="p-1 bg-zinc-800 hover:bg-zinc-700" data-testid="refresh-meta-logs">
              <ArrowsClockwise size={12} />
            </Button>
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-xs p-2 bg-zinc-900 rounded border border-zinc-800">
                <span className="text-zinc-400">{new Date(log.received_at).toLocaleString()}</span>
                <span className={`font-bold ${log.status === 'processed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


const TallyIntegrationPanel = () => {
  const [recentSubmissions, setRecentSubmissions] = useState([]);

  const fetchTallyInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/webhooks/tally/forms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentSubmissions(res.data.recent_submissions || []);
    } catch (error) { console.error('Tally info fetch failed:', error); }
  }, []);

  useEffect(() => {
    fetchTallyInfo();
  }, [fetchTallyInfo]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const webhookUrl = `${API_URL}/api/webhooks/tally`;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-violet-600/20 flex items-center justify-center shrink-0">
          <FileText size={28} weight="duotone" className="text-violet-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-zinc-100">Tally Forms</h3>
          <p className="text-sm text-zinc-400 mt-1">Auto-capture leads from your Tally form submissions</p>
        </div>
      </div>

      <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 space-y-3">
        <h4 className="text-xs tracking-wider uppercase font-bold text-zinc-500">Setup — Add Webhook to Tally</h4>
        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Webhook URL</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-violet-400 overflow-x-auto" data-testid="tally-webhook-url">
              {webhookUrl}
            </code>
            <Button onClick={() => copyToClipboard(webhookUrl)} className="shrink-0 bg-zinc-800 hover:bg-zinc-700 p-2" data-testid="copy-tally-url">
              <Copy size={16} />
            </Button>
          </div>
        </div>
        <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
          <p className="text-xs text-violet-300 font-semibold mb-2">How to connect:</p>
          <ol className="text-xs text-zinc-400 space-y-1">
            <li>1. Open your Tally form editor</li>
            <li>2. Go to <strong className="text-zinc-200">Integrations</strong> tab</li>
            <li>3. Click <strong className="text-zinc-200">Connect</strong> next to Webhooks</li>
            <li>4. Paste the URL above as the <strong className="text-zinc-200">Endpoint URL</strong></li>
            <li>5. Save — new submissions will appear as leads automatically</li>
          </ol>
        </div>
        <p className="text-xs text-zinc-500">
          Fields are auto-mapped: First Name, Phone Number, Email Address. Extra fields (Gender, Location, etc.) are saved in the lead notes.
        </p>
      </div>

      {recentSubmissions.length > 0 && (
        <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 space-y-3">
          <h4 className="text-xs tracking-wider uppercase font-bold text-zinc-500 flex items-center gap-2">
            Recent Tally Submissions
            <Button onClick={fetchTallyInfo} className="p-1 bg-zinc-800 hover:bg-zinc-700" data-testid="refresh-tally-logs">
              <ArrowsClockwise size={12} />
            </Button>
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {recentSubmissions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between text-xs p-2 bg-zinc-900 rounded border border-zinc-800">
                <div>
                  <span className="text-zinc-300">{sub.form_name}</span>
                  <span className="text-zinc-600 ml-2">{new Date(sub.received_at).toLocaleString()}</span>
                </div>
                <span className={`font-bold ${sub.status === 'processed' ? 'text-emerald-400' : sub.status === 'duplicate' ? 'text-amber-400' : 'text-zinc-400'}`}>
                  {sub.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


const RoundRobinPanel = () => {
  const [config, setConfig] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/round-robin/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(res.data.config || []);
      setCurrentIndex(res.data.current_index || 0);
    } catch (error) {
      console.error('Failed to load round robin config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const moveConsultant = (index, direction) => {
    const newConfig = [...config];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newConfig.length) return;
    [newConfig[index], newConfig[targetIndex]] = [newConfig[targetIndex], newConfig[index]];
    setConfig(newConfig);
  };

  const updateLeadsPerTurn = (index, value) => {
    const newConfig = [...config];
    newConfig[index] = { ...newConfig[index], leads_per_turn: Math.max(1, parseInt(value) || 1) };
    setConfig(newConfig);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/round-robin/config`, {
        config: config.map(c => ({ user_id: c.user_id, leads_per_turn: c.leads_per_turn }))
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Round robin configuration saved');
      fetchConfig();
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset round robin to start from the first consultant?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/round-robin/reset`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Round robin reset — starting from first consultant');
      fetchConfig();
    } catch (error) {
      toast.error('Failed to reset');
    }
  };

  if (loading) return <div className="text-center py-6 text-zinc-500">Loading...</div>;

  const totalLeadsPerRound = config.reduce((sum, c) => sum + c.leads_per_turn, 0);

  return (
    <div className="space-y-4" data-testid="round-robin-panel">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-zinc-100">Lead Round Robin</h3>
          <p className="text-sm text-zinc-400 mt-1">
            Control the order and number of leads each consultant receives
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleReset}
            data-testid="reset-round-robin"
            className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs px-3"
          >
            Reset Queue
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            data-testid="save-round-robin"
            className="bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500 text-xs px-4"
          >
            {saving ? 'Saving...' : 'Save Order'}
          </Button>
        </div>
      </div>

      {config.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          No active consultants found. Add consultants in User Management first.
        </div>
      ) : (
        <>
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Total leads per full round:</span>
            <span className="text-sm font-bold text-lime-400">{totalLeadsPerRound}</span>
          </div>

          <div className="space-y-2">
            {config.map((consultant, index) => (
              <div
                key={consultant.user_id}
                data-testid={`rr-consultant-${consultant.user_id}`}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  index === currentIndex
                    ? 'bg-lime-400/10 border-lime-400/30'
                    : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                {/* Position number */}
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-zinc-300">{index + 1}</span>
                </div>

                {/* Name + active indicator */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100 truncate">{consultant.name}</span>
                    {index === currentIndex && (
                      <span className="text-xs font-bold bg-lime-400 text-zinc-950 px-2 py-0.5 rounded-full shrink-0">
                        Next Up
                      </span>
                    )}
                  </div>
                </div>

                {/* Leads per turn */}
                <div className="flex items-center gap-2 shrink-0">
                  <Label className="text-xs text-zinc-500 whitespace-nowrap">Leads/turn:</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={consultant.leads_per_turn}
                    onChange={(e) => updateLeadsPerTurn(index, e.target.value)}
                    data-testid={`rr-leads-${consultant.user_id}`}
                    className="w-16 h-8 bg-zinc-900 border-zinc-700 text-zinc-50 text-center text-sm"
                  />
                </div>

                {/* Up/Down buttons */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveConsultant(index, -1)}
                    disabled={index === 0}
                    data-testid={`rr-up-${consultant.user_id}`}
                    className={`p-1 rounded transition-colors ${
                      index === 0 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-lime-400 hover:bg-zinc-800'
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                  </button>
                  <button
                    onClick={() => moveConsultant(index, 1)}
                    disabled={index === config.length - 1}
                    data-testid={`rr-down-${consultant.user_id}`}
                    className={`p-1 rounded transition-colors ${
                      index === config.length - 1 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-lime-400 hover:bg-zinc-800'
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
            <p className="text-xs text-zinc-500">
              <strong className="text-zinc-400">How it works:</strong> Leads are assigned in order from top to bottom. 
              Each consultant receives their "Leads/turn" number before passing to the next. 
              After the last consultant, it loops back to the top.
            </p>
          </div>
        </>
      )}
    </div>
  );
};


const Settings = ({ user }) => {
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [messageTemplates, setMessageTemplates] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    content: ''
  });
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'consultant',
    phone: '',
    active: true,
    linked_consultants: []
  });

  const fetchSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  const fetchMessageTemplates = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/message-templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessageTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch message templates:', error);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchSettings();
      fetchUsers();
    }
    fetchMessageTemplates();
  }, [user, fetchSettings, fetchUsers, fetchMessageTemplates]);

  const handleUpdateSettings = async (updates) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/settings`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Settings updated');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/auth/register`, newUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User created successfully');
      setShowAddUserModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'consultant', phone: '', active: true, linked_consultants: [] });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/users/${userId}`,
        { active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('User status updated');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const updates = {
        name: selectedUser.name,
        email: selectedUser.email,
        phone: selectedUser.phone,
        role: selectedUser.role,
        linked_consultants: selectedUser.linked_consultants || []
      };
      if (selectedUser.password) {
        updates.password = selectedUser.password;
      }
      if (selectedUser.earnings_scale) {
        updates.earnings_scale = selectedUser.earnings_scale;
      }
      await axios.put(
        `${API_URL}/api/users/${selectedUser.id}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('User updated successfully');
      setShowEditUserModal(false);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleAddTemplate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/message-templates`, newTemplate, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Message template created');
      setShowAddTemplateModal(false);
      setNewTemplate({ name: '', content: '' });
      fetchMessageTemplates();
    } catch (error) {
      toast.error('Failed to create template');
    }
  };

  const handleUpdateTemplate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/message-templates/${selectedTemplate.id}`,
        {
          name: selectedTemplate.name,
          content: selectedTemplate.content
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Template updated');
      setShowEditTemplateModal(false);
      fetchMessageTemplates();
    } catch (error) {
      toast.error('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/message-templates/${templateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Template deleted');
      fetchMessageTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };



  if (user?.role !== 'admin' && user?.role !== 'consultant' && user?.role !== 'assistant' && user?.role !== 'sales_manager' && user?.role !== 'club_manager' && user?.role !== 'marketing_agent') {
    return (
      <Layout user={user}>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="text-center py-12">
            <GearSix size={64} className="mx-auto text-zinc-700 mb-4" />
            <h2 className="text-2xl font-bold text-zinc-400">Access Denied</h2>
            <p className="text-zinc-500 mt-2">Unable to load settings</p>
          </div>
        </div>
      </Layout>
    );
  }

  const isAdmin = user?.role === 'admin';
  const canAccessMessages = true; // All roles can access message templates

  return (
    <Layout user={user}>
      <div className="p-4 sm:p-6 lg:p-8" data-testid="settings-page">
        <div className="mb-6">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50" data-testid="settings-title">
            {isAdmin ? 'Admin Settings' : 'Settings'}
          </h1>
          <p className="mt-2 text-base text-zinc-400">
            {isAdmin ? 'Manage system configuration and integrations' : 'Manage your preferences and message templates'}
          </p>
        </div>

        <Tabs defaultValue={isAdmin ? "integrations" : "messages"} className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            {isAdmin && (
              <>
                <TabsTrigger value="integrations" data-testid="integrations-tab">
                  <WhatsappLogo size={20} className="mr-2" />
                  Integrations
                </TabsTrigger>
                <TabsTrigger value="users" data-testid="users-tab">
                  <UsersIcon size={20} className="mr-2" />
                  User Management
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="messages" data-testid="messages-tab">
              <FileText size={20} className="mr-2" />
              Message Templates
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="automation" data-testid="automation-tab">
                  <GearSix size={20} className="mr-2" />
                  Automation
                </TabsTrigger>
                <TabsTrigger value="branding" data-testid="branding-tab">
                  <Image size={20} className="mr-2" />
                  Branding
                </TabsTrigger>
                <TabsTrigger value="admin-tools" data-testid="admin-tools-tab">
                  <ArrowsClockwise size={20} className="mr-2" />
                  Admin Tools
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {isAdmin && (
            <>
              <TabsContent value="integrations" className="space-y-6">
            <Card className="stat-card p-6" data-testid="whatsapp-integration-card">
              <div className="flex items-start gap-4">
                <WhatsappLogo size={48} weight="duotone" className="text-lime-400" />
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-zinc-100">WhatsApp Integration</h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Send messages to leads via WhatsApp Web links
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-zinc-950 rounded-md border border-zinc-800">
                <h4 className="text-sm font-bold text-zinc-300 mb-3">How It Works:</h4>
                <ol className="space-y-2 text-sm text-zinc-400">
                  <li>1. Click <strong className="text-lime-400">WhatsApp</strong> on any lead or appointment</li>
                  <li>2. Select a message template or type a custom message</li>
                  <li>3. Click <strong className="text-lime-400">Open WhatsApp</strong> — it opens wa.me with the message pre-filled</li>
                  <li>4. Send from your own WhatsApp (personal or business)</li>
                </ol>
                <div className="mt-4 p-3 bg-lime-400/10 border border-lime-400/20 rounded">
                  <p className="text-xs text-lime-400 font-semibold">Templates:</p>
                  <p className="text-xs text-zinc-400 mt-1">Create your own message templates in the "Message Templates" tab. Use variables like {'{client_name}'} and {'{consultant_name}'} for personalization.</p>
                </div>
              </div>
            </Card>

            <Card className="stat-card p-6" data-testid="meta-integration-card">
              <MetaIntegrationPanel />
            </Card>

            <Card className="stat-card p-6" data-testid="tally-integration-card">
              <TallyIntegrationPanel />
            </Card>

            <Card className="stat-card p-6" data-testid="google-calendar-card">
              <div className="flex items-start gap-4">
                <FileText size={48} weight="duotone" className="text-amber-500" />
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-zinc-100">Appointment Calendar System</h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Built-in calendar for managing gym appointments and schedules
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-zinc-950 rounded-md border border-zinc-800">
                <h4 className="text-sm font-bold text-zinc-300 mb-3">How to Use the Built-In Calendar:</h4>
                <ol className="space-y-2 text-sm text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-lime-400 min-w-[20px]">1.</span>
                    <span><strong>Book Appointments:</strong> Click "Book Appointment" on any lead card in the Leads page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-lime-400 min-w-[20px]">2.</span>
                    <span><strong>View Calendar:</strong> Navigate to "Appointments" in the sidebar to see your daily schedule</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-lime-400 min-w-[20px]">3.</span>
                    <span><strong>Time Slots:</strong> Mon-Thu: 09:00-18:30 | Fri: 09:00-16:30 | Sat: 09:00-13:30</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-lime-400 min-w-[20px]">4.</span>
                    <span><strong>Edit/Reschedule:</strong> Click "Edit" on any appointment to change date/time or add notes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-lime-400 min-w-[20px]">5.</span>
                    <span><strong>Dashboard View:</strong> All users see today's appointments on their dashboard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-lime-400 min-w-[20px]">6.</span>
                    <span><strong>WhatsApp Reminders:</strong> System sends 24h and 2h reminders before appointments (when WhatsApp is connected)</span>
                  </li>
                </ol>
                <div className="mt-4 p-3 bg-lime-400/10 border border-lime-400/20 rounded">
                  <p className="text-xs text-lime-400 font-semibold">✓ Built-In Features:</p>
                  <ul className="text-xs text-zinc-400 mt-2 space-y-1 ml-4">
                    <li>• 20-minute appointment slots with 10-min breaks</li>
                    <li>• Automatic lead stage update to "Appointment Set"</li>
                    <li>• Track who booked (consultant or assistant)</li>
                    <li>• Filter by date to view any day's schedule</li>
                    <li>• Consultant and lead information on each slot</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 p-4 bg-zinc-900 rounded-md border border-zinc-800">
                <h4 className="text-sm font-bold text-zinc-300 mb-2">External Google Calendar Sync (Optional)</h4>
                <p className="text-xs text-zinc-500">
                  For personal Google Calendar synchronization, consultants can manually add appointments to their Google Calendar using the appointment details. 
                  Future updates may include automatic Google Calendar integration via API.
                </p>
                <p className="text-xs text-cyan-400 mt-2">
                  Visit{' '}
                  <a href="https://revivalfitness.co.za" target="_blank" rel="noopener noreferrer" className="underline hover:text-cyan-300">
                    revivalfitness.co.za
                  </a>{' '}
                  for training materials and setup guides.
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-zinc-100">Team Members</h3>
              <Button
                onClick={() => setShowAddUserModal(true)}
                data-testid="add-user-button"
                className="bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500 flex items-center gap-2"
              >
                <UserPlus size={20} weight="bold" />
                Add User
              </Button>
            </div>

            <Card className="stat-card p-6" data-testid="users-list-card">
              <div className="space-y-4">
                {users.map(u => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-4 bg-zinc-950 rounded-md border border-zinc-800"
                    data-testid={`user-item-${u.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-semibold text-zinc-100">{u.name}</p>
                        <p className="text-sm text-zinc-400">{u.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-300">
                            {u.role.replace('_', ' ')}
                          </span>
                          {u.active ? (
                            <span className="text-xs text-emerald-500">Active</span>
                          ) : (
                            <span className="text-xs text-red-500">Inactive</span>
                          )}
                        </div>
                        {u.role === 'assistant' && u.linked_consultants && u.linked_consultants.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5" data-testid={`linked-badges-${u.id}`}>
                            <span className="text-xs text-zinc-500">Linked to:</span>
                            {u.linked_consultants.map(lcId => {
                              const linkedUser = users.find(usr => usr.id === lcId);
                              return linkedUser ? (
                                <span key={lcId} className="text-xs bg-lime-400/15 text-lime-400 px-2 py-0.5 rounded-full">
                                  {linkedUser.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => {
                          setSelectedUser(u);
                          setShowEditUserModal(true);
                        }}
                        data-testid={`edit-user-${u.id}`}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700"
                      >
                        <PencilSimple size={18} />
                      </Button>
                      <Switch
                        checked={u.active}
                        onCheckedChange={() => handleToggleUserStatus(u.id, u.active)}
                        data-testid={`user-toggle-${u.id}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
            </>
          )}

          <TabsContent value="messages" className="space-y-6">
            <Card className="stat-card p-6 mb-6" data-testid="whatsapp-status-card">
              <div className="flex items-center gap-4">
                <WhatsappLogo size={32} weight="duotone" className="text-emerald-500" />
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100">WhatsApp Templates</h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Create templates below. Use {'{client_name}'} and {'{consultant_name}'} as variables. When you click "WhatsApp" on a lead, the template will be auto-filled and opened via wa.me link.
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-zinc-100">Message Templates</h3>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowAIAssistant(true)}
                  data-testid="ai-assistant-button"
                  className="bg-gradient-to-r from-lime-400 to-cyan-500 text-zinc-950 font-bold hover:opacity-90 flex items-center gap-2"
                >
                  <FileText size={20} weight="bold" />
                  AI Writing Assistant
                </Button>
                <Button
                  onClick={() => setShowAddTemplateModal(true)}
                  data-testid="add-template-button"
                  className="bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500 flex items-center gap-2"
                >
                  <UserPlus size={20} weight="bold" />
                  Add Template
                </Button>
              </div>
            </div>

            <Card className="stat-card p-6" data-testid="templates-list-card">
              <p className="text-sm text-zinc-400 mb-4">
                Create message templates with variables: {'{client_name}'}, {'{consultant_name}'}, {'{assistant_name}'}, {'{phone}'}, {'{appointment_date}'}, {'{appointment_time}'}, {'{address}'}
              </p>
              <div className="space-y-4">
                {messageTemplates.map(template => (
                  <div
                    key={template.id}
                    className="flex items-start justify-between p-4 bg-zinc-950 rounded-md border border-zinc-800"
                    data-testid={`template-item-${template.id}`}
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-zinc-100">{template.name}</p>
                      <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{template.content}</p>
                      {template.user_name && (
                        <p className="text-xs text-zinc-500 mt-2">Created by: {template.user_name}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowEditTemplateModal(true);
                        }}
                        data-testid={`edit-template-${template.id}`}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700"
                      >
                        <PencilSimple size={18} />
                      </Button>
                      <Button
                        onClick={() => handleDeleteTemplate(template.id)}
                        data-testid={`delete-template-${template.id}`}
                        className="p-2 bg-red-900 hover:bg-red-800 text-red-100"
                      >
                        <Trash size={18} />
                      </Button>
                    </div>
                  </div>
                ))}
                {messageTemplates.length === 0 && (
                  <p className="text-center text-zinc-500 py-8">No message templates yet. Create your first one!</p>
                )}
              </div>
            </Card>
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="automation" className="space-y-6">
            <Card className="stat-card p-6" data-testid="round-robin-card">
              <RoundRobinPanel />
            </Card>

            <Card className="stat-card p-6" data-testid="automation-settings-card">
              <h3 className="text-2xl font-bold text-zinc-100 mb-4">Automation Rules</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">
                    Auto Follow-up After (hours)
                  </Label>
                  <Input
                    type="number"
                    value={settings?.auto_followup_hours || 12}
                    onChange={(e) => handleUpdateSettings({ auto_followup_hours: parseInt(e.target.value) })}
                    data-testid="auto-followup-input"
                    className="bg-zinc-950 border-zinc-800 text-zinc-50"
                  />
                  <p className="text-xs text-zinc-500">
                    Automatically send follow-up message if no response
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">
                    Auto Reassign After (hours)
                  </Label>
                  <Input
                    type="number"
                    value={settings?.auto_reassign_hours || 72}
                    onChange={(e) => handleUpdateSettings({ auto_reassign_hours: parseInt(e.target.value) })}
                    data-testid="auto-reassign-input"
                    className="bg-zinc-950 border-zinc-800 text-zinc-50"
                  />
                  <p className="text-xs text-zinc-500">
                    Reassign lead if no contact made within this period
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">
                    WhatsApp Message Template
                  </Label>
                  <textarea
                    value={settings?.whatsapp_template || ''}
                    onChange={(e) => handleUpdateSettings({ whatsapp_template: e.target.value })}
                    data-testid="whatsapp-template-input"
                    className="w-full min-h-[120px] bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-50 focus:ring-2 focus:ring-lime-400"
                    placeholder="Hi {name}, thank you for your interest..."
                  />
                  <p className="text-xs text-zinc-500">
                    Use {'{name}'} for lead name and {'{consultant}'} for consultant name
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <Card className="stat-card p-6" data-testid="branding-settings-card">
              <h3 className="text-2xl font-bold text-zinc-100 mb-4">Brand Settings</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">
                    Company Name
                  </Label>
                  <Input
                    value={settings?.company_name || ''}
                    onChange={(e) => handleUpdateSettings({ company_name: e.target.value })}
                    data-testid="company-name-input"
                    className="bg-zinc-950 border-zinc-800 text-zinc-50"
                    placeholder="Revival Fitness"
                  />
                  <p className="text-xs text-zinc-500">
                    This name appears on the login screen, sidebar, and PDF exports
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">
                    Logo URL
                  </Label>
                  <Input
                    type="url"
                    value={settings?.logo_url || ''}
                    onChange={(e) => handleUpdateSettings({ logo_url: e.target.value })}
                    data-testid="logo-url-input"
                    className="bg-zinc-950 border-zinc-800 text-zinc-50"
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-zinc-500">
                    Enter a URL to update the logo displayed in the sidebar
                  </p>
                </div>

                {settings?.logo_url && (
                  <div className="space-y-2">
                    <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">
                      Logo Preview
                    </Label>
                    <div className="p-4 bg-zinc-950 rounded-md border border-zinc-800">
                      <img
                        src={settings.logo_url}
                        alt="Logo"
                        className="h-16 w-auto"
                        onError={(e) => {
                          e.target.src = 'https://images.pexels.com/photos/7151700/pexels-photo-7151700.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="admin-tools" className="space-y-6">
            <Card className="stat-card p-6" data-testid="admin-tools-card">
              <h3 className="text-2xl font-semibold text-zinc-100 mb-6">Admin Tools</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <h4 className="font-bold text-zinc-100 mb-2">Global Password Reset</h4>
                  <p className="text-sm text-zinc-400 mb-4">
                    Reset ALL user passwords to <code className="bg-zinc-800 px-2 py-0.5 rounded text-lime-400">123xyz/</code>. 
                    This affects every user in the system.
                  </p>
                  <Button
                    onClick={async () => {
                      if (!window.confirm('WARNING: This will reset ALL user passwords to "123xyz/". Are you sure?')) return;
                      try {
                        const token = localStorage.getItem('token');
                        const res = await axios.post(`${API_URL}/api/admin/reset-all-passwords`, {}, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        toast.success(`Passwords reset for ${res.data.users_reset} users`);
                      } catch (error) {
                        toast.error('Failed to reset passwords');
                      }
                    }}
                    data-testid="global-reset-button"
                    className="bg-red-600 text-white font-bold hover:bg-red-700"
                  >
                    Reset All Passwords
                  </Button>
                </div>

                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <h4 className="font-bold text-zinc-100 mb-2">MASTER Account</h4>
                  <p className="text-sm text-zinc-400 mb-4">
                    Create or verify the MASTERGREY666 super admin account.
                  </p>
                  <Button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        const res = await axios.post(`${API_URL}/api/admin/create-master-account`, {}, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        toast.success(res.data.message);
                      } catch (error) {
                        toast.error('Failed to create master account');
                      }
                    }}
                    data-testid="create-master-button"
                    className="bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
                  >
                    Create / Verify MASTER Account
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50" data-testid="add-user-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-zinc-50">Add New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Full Name</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                required
                data-testid="new-user-name-input"
                className="bg-zinc-950 border-zinc-800 text-zinc-50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Email</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
                data-testid="new-user-email-input"
                className="bg-zinc-950 border-zinc-800 text-zinc-50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Password</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
                data-testid="new-user-password-input"
                className="bg-zinc-950 border-zinc-800 text-zinc-50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Phone</Label>
              <Input
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                data-testid="new-user-phone-input"
                className="bg-zinc-950 border-zinc-800 text-zinc-50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                data-testid="new-user-role-select"
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="sales_manager">Sales Manager</SelectItem>
                  <SelectItem value="club_manager">Club Manager</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                  <SelectItem value="assistant">Assistant</SelectItem>
                  <SelectItem value="marketing_agent">Marketing Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newUser.role === 'assistant' && (
              <div className="space-y-2" data-testid="linked-consultants-section">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">
                  Link to Consultants / Managers
                </Label>
                <p className="text-xs text-zinc-500 mb-2">
                  Select which consultants or managers this assistant can access leads and appointments for.
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1 p-3 bg-zinc-950 rounded-md border border-zinc-800">
                  {users
                    .filter(u => ['consultant', 'sales_manager', 'club_manager'].includes(u.role) && u.active)
                    .map(u => (
                      <label
                        key={u.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-zinc-900 cursor-pointer"
                        data-testid={`link-user-${u.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={(newUser.linked_consultants || []).includes(u.id)}
                          onChange={(e) => {
                            const linked = newUser.linked_consultants || [];
                            if (e.target.checked) {
                              setNewUser({ ...newUser, linked_consultants: [...linked, u.id] });
                            } else {
                              setNewUser({ ...newUser, linked_consultants: linked.filter(id => id !== u.id) });
                            }
                          }}
                          className="rounded border-zinc-700 bg-zinc-950 text-lime-400 focus:ring-lime-400"
                        />
                        <div>
                          <span className="text-sm font-medium text-zinc-200">{u.name}</span>
                          <span className="ml-2 text-xs text-zinc-500 capitalize">({u.role.replace('_', ' ')})</span>
                        </div>
                      </label>
                    ))}
                  {users.filter(u => ['consultant', 'sales_manager', 'club_manager'].includes(u.role) && u.active).length === 0 && (
                    <p className="text-xs text-zinc-500 text-center py-2">No consultants or managers found</p>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                data-testid="cancel-add-user-button"
                className="flex-1 bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-testid="submit-add-user-button"
                className="flex-1 bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
              >
                Create User
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditUserModal} onOpenChange={setShowEditUserModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 max-w-lg max-h-[90vh] overflow-y-auto" data-testid="edit-user-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-zinc-50">Edit User</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Full Name</Label>
                  <Input
                    value={selectedUser.name}
                    onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                    required
                    data-testid="edit-user-name-input"
                    className="bg-zinc-950 border-zinc-800 text-zinc-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Email</Label>
                  <Input
                    type="email"
                    value={selectedUser.email}
                    onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                    required
                    data-testid="edit-user-email-input"
                    className="bg-zinc-950 border-zinc-800 text-zinc-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">New Password (leave blank to keep current)</Label>
                  {selectedUser.plain_password && (
                    <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-md mb-2">
                      <span className="text-xs text-zinc-500">Current password: </span>
                      <span className="text-sm font-mono text-amber-400" data-testid="current-password-display">{selectedUser.plain_password}</span>
                    </div>
                  )}
                  <Input
                    type="password"
                    value={selectedUser.password || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, password: e.target.value })}
                    data-testid="edit-user-password-input"
                    className="bg-zinc-950 border-zinc-800 text-zinc-50"
                    placeholder="Enter new password..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Phone</Label>
                  <Input
                    value={selectedUser.phone || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                    data-testid="edit-user-phone-input"
                    className="bg-zinc-950 border-zinc-800 text-zinc-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Role</Label>
                  <Select
                    value={selectedUser.role}
                    onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value })}
                    data-testid="edit-user-role-select"
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="sales_manager">Sales Manager</SelectItem>
                      <SelectItem value="club_manager">Club Manager</SelectItem>
                      <SelectItem value="consultant">Consultant</SelectItem>
                      <SelectItem value="assistant">Assistant</SelectItem>
                      <SelectItem value="marketing_agent">Marketing Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedUser.role === 'assistant' && (
                  <div className="space-y-2" data-testid="edit-linked-consultants-section">
                    <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">
                      Link to Consultants / Managers
                    </Label>
                    <p className="text-xs text-zinc-500 mb-2">
                      Select which consultants or managers this assistant can access leads and appointments for.
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-1 p-3 bg-zinc-950 rounded-md border border-zinc-800">
                      {users
                        .filter(u => ['consultant', 'sales_manager', 'club_manager'].includes(u.role) && u.active && u.id !== selectedUser.id)
                        .map(u => (
                          <label
                            key={u.id}
                            className="flex items-center gap-3 p-2 rounded hover:bg-zinc-900 cursor-pointer"
                            data-testid={`edit-link-user-${u.id}`}
                          >
                            <input
                              type="checkbox"
                              checked={(selectedUser.linked_consultants || []).includes(u.id)}
                              onChange={(e) => {
                                const linked = selectedUser.linked_consultants || [];
                                if (e.target.checked) {
                                  setSelectedUser({ ...selectedUser, linked_consultants: [...linked, u.id] });
                                } else {
                                  setSelectedUser({ ...selectedUser, linked_consultants: linked.filter(id => id !== u.id) });
                                }
                              }}
                              className="rounded border-zinc-700 bg-zinc-950 text-lime-400 focus:ring-lime-400"
                            />
                            <div>
                              <span className="text-sm font-medium text-zinc-200">{u.name}</span>
                              <span className="ml-2 text-xs text-zinc-500 capitalize">({u.role.replace('_', ' ')})</span>
                            </div>
                          </label>
                        ))}
                      {users.filter(u => ['consultant', 'sales_manager', 'club_manager'].includes(u.role) && u.active && u.id !== selectedUser.id).length === 0 && (
                        <p className="text-xs text-zinc-500 text-center py-2">No consultants or managers found</p>
                      )}
                    </div>
                    {(selectedUser.linked_consultants || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(selectedUser.linked_consultants || []).map(lcId => {
                          const linkedUser = users.find(u => u.id === lcId);
                          return linkedUser ? (
                            <span key={lcId} className="text-xs bg-lime-400/20 text-lime-400 px-2 py-1 rounded-full">
                              {linkedUser.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setShowEditUserModal(false)}
                    data-testid="cancel-edit-user-button"
                    className="flex-1 bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    data-testid="submit-edit-user-button"
                    className="flex-1 bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
                  >
                    Update User
                  </Button>
                </div>
              </form>

              {/* Earnings Scale Section - Admin only, consultants only */}
              {user?.role === 'admin' && selectedUser.role === 'consultant' && (
                <EarningsScaleEditor
                  selectedUser={selectedUser}
                  setSelectedUser={setSelectedUser}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTemplateModal} onOpenChange={setShowAddTemplateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50" data-testid="add-template-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-zinc-50">Add Message Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTemplate} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Template Name</Label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                required
                data-testid="new-template-name-input"
                className="bg-zinc-950 border-zinc-800 text-zinc-50"
                placeholder="e.g., Welcome Message"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Message Content</Label>
              <textarea
                value={newTemplate.content}
                onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                required
                data-testid="new-template-content-input"
                className="w-full min-h-[120px] bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-50"
                placeholder="Hi {client_name}, I'm {consultant_name}..."
              />
              <p className="text-xs text-zinc-500">
                Variables: {'{client_name}'}, {'{consultant_name}'}, {'{assistant_name}'}, {'{phone}'}, {'{appointment_date}'}, {'{appointment_time}'}, {'{address}'}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setShowAddTemplateModal(false)}
                data-testid="cancel-add-template-button"
                className="flex-1 bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-testid="submit-add-template-button"
                className="flex-1 bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
              >
                Create Template
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditTemplateModal} onOpenChange={setShowEditTemplateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50" data-testid="edit-template-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-zinc-50">Edit Message Template</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <form onSubmit={handleUpdateTemplate} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Template Name</Label>
                <Input
                  value={selectedTemplate.name}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                  required
                  data-testid="edit-template-name-input"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Message Content</Label>
                <textarea
                  value={selectedTemplate.content}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, content: e.target.value })}
                  required
                  data-testid="edit-template-content-input"
                  className="w-full min-h-[120px] bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-50"
                />
                <p className="text-xs text-zinc-500">
                  Variables: {'{client_name}'}, {'{consultant_name}'}, {'{assistant_name}'}, {'{phone}'}, {'{appointment_date}'}, {'{appointment_time}'}, {'{address}'}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setShowEditTemplateModal(false)}
                  data-testid="cancel-edit-template-button"
                  className="flex-1 bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="submit-edit-template-button"
                  className="flex-1 bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
                >
                  Update Template
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AIWritingAssistant
        open={showAIAssistant}
        onOpenChange={setShowAIAssistant}
        onSelectMessage={(message) => {
          setNewTemplate({ ...newTemplate, content: message });
          setShowAddTemplateModal(true);
        }}
      />
    </Layout>
  );
};

export default Settings;
