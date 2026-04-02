import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  QrCode,
  Power,
  ArrowsClockwise,
  CurrencyCircleDollar
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
          <div key={idx} className="flex items-center gap-2">
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
          <div key={idx} className="flex items-center gap-2">
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
          <div key={idx} className="flex items-center gap-2">
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



const WhatsAppStatusBadge = ({ userId }) => {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    const check = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/whatsapp/status/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatus(res.data.connected);
      } catch {
        setStatus(false);
      }
    };
    check();
  }, [userId]);
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800" data-testid={`wa-badge-${userId}`}>
      <WhatsappLogo size={14} weight="duotone" className={status ? 'text-emerald-500' : 'text-zinc-600'} />
      <span className={`text-xs font-medium ${status ? 'text-emerald-400' : 'text-zinc-500'}`}>
        {status === null ? '...' : status ? 'WA' : 'No WA'}
      </span>
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
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [checkingWhatsApp, setCheckingWhatsApp] = useState(false);
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
    active: true
  });
  // WhatsApp session management state
  const [waSessionStatus, setWaSessionStatus] = useState({});
  const [waQrCode, setWaQrCode] = useState(null);
  const [waLoading, setWaLoading] = useState(false);
  const [waPolling, setWaPolling] = useState(false);
  const qrPollRef = useRef(null);
  const connectionCheckRef = useRef(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchSettings();
      fetchUsers();
    }
    fetchMessageTemplates();
    checkWhatsAppStatus();
  }, [user]);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings');
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users');
    }
  };

  const fetchMessageTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/message-templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessageTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch message templates');
    }
  };

  const checkWhatsAppStatus = async () => {
    setCheckingWhatsApp(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/whatsapp/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWhatsappConnected(response.data.connected);
    } catch (error) {
      console.error('Failed to check WhatsApp status');
    } finally {
      setCheckingWhatsApp(false);
    }
  };

  // Cleanup polling on unmount or modal close
  useEffect(() => {
    return () => {
      if (qrPollRef.current) clearTimeout(qrPollRef.current);
      if (connectionCheckRef.current) clearInterval(connectionCheckRef.current);
    };
  }, []);

  // When edit user modal opens for consultant/assistant, check their WA status
  useEffect(() => {
    if (showEditUserModal && selectedUser && (selectedUser.role === 'consultant' || selectedUser.role === 'assistant')) {
      fetchUserWaStatus(selectedUser.id);
    }
    if (!showEditUserModal) {
      // Cleanup when modal closes
      setWaQrCode(null);
      setWaLoading(false);
      setWaPolling(false);
      if (qrPollRef.current) clearTimeout(qrPollRef.current);
      if (connectionCheckRef.current) clearInterval(connectionCheckRef.current);
    }
  }, [showEditUserModal, selectedUser]);

  const fetchUserWaStatus = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/whatsapp/status/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWaSessionStatus(response.data);
    } catch {
      setWaSessionStatus({ connected: false, hasQR: false });
    }
  };

  const handleStartWaSession = async (userId) => {
    setWaLoading(true);
    setWaQrCode(null);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/whatsapp/start-session?user_id=${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      startQRPolling(userId);
    } catch {
      toast.error('Failed to start WhatsApp session');
      setWaLoading(false);
    }
  };

  const startQRPolling = (userId) => {
    setWaPolling(true);
    let attempts = 0;
    const maxAttempts = 60;

    const pollQR = async () => {
      if (attempts >= maxAttempts) {
        setWaPolling(false);
        setWaLoading(false);
        toast.error('QR code generation timed out');
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/whatsapp/qr/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.qrCode) {
          setWaQrCode(response.data.qrCode);
          setWaPolling(false);
          setWaLoading(false);
          startConnectionCheck(userId);
          return;
        }
      } catch { /* QR not ready yet */ }
      attempts++;
      qrPollRef.current = setTimeout(pollQR, 1500);
    };
    pollQR();
  };

  const startConnectionCheck = (userId) => {
    connectionCheckRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/whatsapp/status/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.connected) {
          clearInterval(connectionCheckRef.current);
          setWaQrCode(null);
          setWaSessionStatus(response.data);
          toast.success(`WhatsApp connected for ${selectedUser?.name}!`);
        }
      } catch { /* ignore */ }
    }, 2500);
    // Stop after 2 minutes
    setTimeout(() => {
      if (connectionCheckRef.current) clearInterval(connectionCheckRef.current);
    }, 120000);
  };

  const handleDisconnectWa = async (userId) => {
    if (!window.confirm(`Disconnect WhatsApp for ${selectedUser?.name}?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/whatsapp/logout?user_id=${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`WhatsApp disconnected for ${selectedUser?.name}`);
      setWaSessionStatus({ connected: false, hasQR: false });
      setWaQrCode(null);
    } catch {
      toast.error('Failed to disconnect WhatsApp');
    }
  };

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
      setNewUser({ name: '', email: '', password: '', role: 'consultant', phone: '', active: true });
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
        role: selectedUser.role
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
                  <h3 className="text-xl font-semibold text-zinc-100">WhatsApp Web Automation</h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Individual consultant WhatsApp sessions via Baileys multi-session service
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-zinc-950 rounded-md border border-zinc-800">
                <h4 className="text-sm font-bold text-zinc-300 mb-3">How to Activate:</h4>
                <ol className="space-y-2 text-sm text-zinc-400">
                  <li>1. Go to the <strong className="text-zinc-200">User Management</strong> tab</li>
                  <li>2. Click the edit button on a consultant/assistant's profile</li>
                  <li>3. Scroll down to the <strong className="text-zinc-200">WhatsApp Integration</strong> section</li>
                  <li>4. Click <strong className="text-lime-400">Activate WhatsApp</strong> and scan the QR code with their phone</li>
                  <li>5. Once connected, messages will be sent via that consultant's session</li>
                </ol>
                <div className="mt-4 p-3 bg-lime-400/10 border border-lime-400/20 rounded">
                  <p className="text-xs text-lime-400 font-semibold">Multi-Session Architecture:</p>
                  <p className="text-xs text-zinc-400 mt-1">Each consultant has their own WhatsApp session. Messages sent to leads are delivered from the assigned consultant's number, keeping communication personal and trackable.</p>
                </div>
              </div>
            </Card>

            <Card className="stat-card p-6" data-testid="meta-integration-card">
              <div className="flex items-start gap-4">
                <FileText size={48} weight="duotone" className="text-cyan-500" />
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-zinc-100">Meta Lead Forms</h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Automatically capture leads from Facebook/Instagram ads
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-zinc-950 rounded-md border border-zinc-800">
                <h4 className="text-sm font-bold text-zinc-300 mb-3">Setup Instructions:</h4>
                <ol className="space-y-2 text-sm text-zinc-400">
                  <li>1. Go to Facebook Business Settings → Webhooks</li>
                  <li>2. Subscribe to leadgen events</li>
                  <li>3. Add webhook URL: <code className="bg-zinc-900 px-2 py-1 rounded">{API_URL}/api/webhooks/meta</code></li>
                  <li>4. Set verify token: <code className="bg-zinc-900 px-2 py-1 rounded">xac_crm_meta_verify</code></li>
                  <li>5. Test the connection from Facebook</li>
                </ol>
              </div>
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(u.role === 'consultant' || u.role === 'assistant') && (
                        <WhatsAppStatusBadge userId={u.id} />
                      )}
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <WhatsappLogo size={32} weight="duotone" className={whatsappConnected ? 'text-emerald-500' : 'text-zinc-600'} />
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-100">WhatsApp Integration</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${whatsappConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm text-zinc-400">
                        {checkingWhatsApp ? 'Checking...' : whatsappConnected ? 'Connected & Active' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={checkWhatsAppStatus}
                  disabled={checkingWhatsApp}
                  data-testid="refresh-whatsapp-status"
                  className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                >
                  {checkingWhatsApp ? 'Checking...' : 'Refresh Status'}
                </Button>
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

              {/* WhatsApp Integration Section - only for consultants/assistants */}
              {(selectedUser.role === 'consultant' || selectedUser.role === 'assistant') && (
                <div className="border-t border-zinc-800 pt-5" data-testid="wa-integration-section">
                  <div className="flex items-center gap-3 mb-4">
                    <WhatsappLogo size={28} weight="duotone" className="text-lime-400" />
                    <div>
                      <h4 className="text-base font-bold text-zinc-100">WhatsApp Integration</h4>
                      <p className="text-xs text-zinc-500">Link {selectedUser.name}'s WhatsApp for CRM messaging</p>
                    </div>
                  </div>

                  {/* Status display */}
                  <div className="flex items-center gap-3 mb-4 p-3 bg-zinc-950 rounded-md border border-zinc-800">
                    <div className={`w-3 h-3 rounded-full ${waSessionStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`}></div>
                    <span className="text-sm text-zinc-300">
                      {waSessionStatus.connected ? 'Connected & Active' : 'Not Connected'}
                    </span>
                    <Button
                      onClick={() => fetchUserWaStatus(selectedUser.id)}
                      data-testid="wa-refresh-status"
                      className="ml-auto p-1.5 bg-zinc-800 hover:bg-zinc-700"
                      title="Refresh status"
                    >
                      <ArrowsClockwise size={16} />
                    </Button>
                  </div>

                  {/* If connected - show disconnect */}
                  {waSessionStatus.connected ? (
                    <Button
                      onClick={() => handleDisconnectWa(selectedUser.id)}
                      data-testid="wa-disconnect-button"
                      className="w-full bg-red-900/50 border border-red-800 text-red-200 hover:bg-red-900 flex items-center justify-center gap-2"
                    >
                      <Power size={18} />
                      Disconnect WhatsApp
                    </Button>
                  ) : (
                    <>
                      {/* QR code display or setup button */}
                      {waQrCode ? (
                        <div className="space-y-3">
                          <div className="p-3 bg-lime-400/10 border border-lime-400/20 rounded-lg">
                            <ol className="text-xs text-zinc-300 space-y-1">
                              <li><span className="font-bold text-lime-400">1.</span> Open WhatsApp on <strong>{selectedUser.name}'s phone</strong></li>
                              <li><span className="font-bold text-lime-400">2.</span> Go to <strong>Settings &rarr; Linked Devices</strong></li>
                              <li><span className="font-bold text-lime-400">3.</span> Tap <strong>Link a Device</strong></li>
                              <li><span className="font-bold text-lime-400">4.</span> Scan the QR code below</li>
                            </ol>
                          </div>
                          <div className="flex justify-center">
                            <div className="bg-white p-3 rounded-lg">
                              <img src={waQrCode} alt="WhatsApp QR Code" className="w-52 h-52" data-testid="wa-qr-image" />
                            </div>
                          </div>
                          <p className="text-xs text-zinc-500 text-center">Waiting for scan... This may take a few seconds.</p>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleStartWaSession(selectedUser.id)}
                          disabled={waLoading || waPolling}
                          data-testid="wa-activate-button"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2"
                        >
                          {waLoading || waPolling ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              Generating QR Code...
                            </>
                          ) : (
                            <>
                              <QrCode size={20} weight="bold" />
                              Activate WhatsApp
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

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
