import React, { useState, useEffect } from 'react';
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
  PencilSimple
} from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

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

  if (user?.role !== 'admin' && user?.role !== 'consultant' && user?.role !== 'assistant' && user?.role !== 'sales_manager' && user?.role !== 'club_manager') {
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
                    Connect WhatsApp for automated lead follow-ups and messaging
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${whatsappConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-zinc-300">
                      {whatsappConnected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-zinc-950 rounded-md border border-zinc-800">
                <h4 className="text-sm font-bold text-zinc-300 mb-3">Setup Instructions:</h4>
                <ol className="space-y-2 text-sm text-zinc-400">
                  <li>1. The WhatsApp service runs on Node.js with Baileys library</li>
                  <li>2. Start the WhatsApp service: <code className="bg-zinc-900 px-2 py-1 rounded">node whatsapp-service.js</code></li>
                  <li>3. Scan the QR code that appears in your terminal</li>
                  <li>4. Open WhatsApp on your phone → Settings → Linked Devices → Link a Device</li>
                  <li>5. Once connected, automated messages will be sent through this session</li>
                </ol>
                <div className="mt-4">
                  <p className="text-xs text-zinc-500">
                    Note: WhatsApp service must run continuously. Consider using PM2 for production deployment.
                  </p>
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
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50" data-testid="edit-user-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-zinc-50">Edit User</DialogTitle>
          </DialogHeader>
          {selectedUser && (
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
