import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { 
  Plus, Trash, ArrowUp, ArrowDown, Lightning, WhatsappLogo, 
  Clock, UserSwitch, Tag, Bell, FlowArrow, Power 
} from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STEP_TYPES = [
  { value: 'send_whatsapp', label: 'Send WhatsApp', icon: WhatsappLogo, color: 'bg-emerald-600' },
  { value: 'wait', label: 'Wait / Delay', icon: Clock, color: 'bg-amber-600' },
  { value: 'change_stage', label: 'Change Stage', icon: Tag, color: 'bg-violet-600' },
  { value: 'assign_to', label: 'Assign To', icon: UserSwitch, color: 'bg-cyan-600' },
  { value: 'send_reminder', label: 'Send Reminder', icon: Bell, color: 'bg-orange-600' },
];

const STAGES = [
  'New Lead', 'Contacted', 'Engaged', 'Appointment Set', 
  'Showed Up', 'Trial / Consultation', 'Closed Won', 'Closed Lost', 'Invalid'
];

const TRIGGER_OPTIONS = [
  { value: 'new_lead', label: 'New Lead Created' },
  { value: 'appointment', label: 'Appointment Booked' },
  { value: 'stage_change', label: 'Lead Stage Changed' },
  { value: 'deal_closed', label: 'Deal Closed' },
  { value: 'no_activity', label: 'No Activity (Idle Lead)' },
  { value: 'meta_lead', label: 'Meta/Facebook Lead Captured' },
];

const WorkflowBuilder = ({ user }) => {
  const [workflows, setWorkflows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [activeTab, setActiveTab] = useState('new_lead');
  
  const [workflowName, setWorkflowName] = useState('');
  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [workflowActive, setWorkflowActive] = useState(true);

  useEffect(() => {
    fetchWorkflows();
    fetchUsers();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/workflows`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkflows(res.data);
    } catch { toast.error('Failed to load workflows'); }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data.filter(u => u.active));
    } catch {}
  };

  const openNewBuilder = (triggerType) => {
    setEditingWorkflow(null);
    setWorkflowName('');
    setWorkflowSteps([]);
    setWorkflowActive(true);
    setActiveTab(triggerType);
    setShowBuilder(true);
  };

  const openEditBuilder = (wf) => {
    setEditingWorkflow(wf);
    setWorkflowName(wf.name);
    setWorkflowSteps(wf.steps || []);
    setWorkflowActive(wf.active);
    setActiveTab(wf.trigger_type);
    setShowBuilder(true);
  };

  const addStep = (type) => {
    const newStep = { id: Date.now().toString(), type, config: {} };
    if (type === 'send_whatsapp') newStep.config = { message: '' };
    if (type === 'wait') newStep.config = { duration: 30, unit: 'minutes' };
    if (type === 'change_stage') newStep.config = { stage: 'Contacted' };
    if (type === 'assign_to') newStep.config = { user_id: '', method: 'specific' };
    if (type === 'send_reminder') newStep.config = { message: '', timing: '24h_before' };
    setWorkflowSteps([...workflowSteps, newStep]);
  };

  const removeStep = (idx) => {
    setWorkflowSteps(workflowSteps.filter((_, i) => i !== idx));
  };

  const moveStep = (idx, dir) => {
    const newSteps = [...workflowSteps];
    const target = idx + dir;
    if (target < 0 || target >= newSteps.length) return;
    [newSteps[idx], newSteps[target]] = [newSteps[target], newSteps[idx]];
    setWorkflowSteps(newSteps);
  };

  const updateStepConfig = (idx, key, value) => {
    const newSteps = [...workflowSteps];
    newSteps[idx].config[key] = value;
    setWorkflowSteps(newSteps);
  };

  const handleSave = async () => {
    if (!workflowName.trim()) { toast.error('Enter a workflow name'); return; }
    if (workflowSteps.length === 0) { toast.error('Add at least one step'); return; }

    const token = localStorage.getItem('token');
    const payload = {
      name: workflowName,
      trigger_type: activeTab,
      steps: workflowSteps,
      active: workflowActive
    };

    try {
      if (editingWorkflow) {
        await axios.put(`${API_URL}/api/workflows/${editingWorkflow.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Workflow updated');
      } else {
        await axios.post(`${API_URL}/api/workflows`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Workflow created');
      }
      setShowBuilder(false);
      fetchWorkflows();
    } catch { toast.error('Failed to save workflow'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this workflow?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/workflows/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Workflow deleted');
      fetchWorkflows();
    } catch { toast.error('Failed to delete'); }
  };

  const handleToggle = async (wf) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/workflows/${wf.id}`, { active: !wf.active }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchWorkflows();
    } catch { toast.error('Failed to toggle'); }
  };

  const filteredWorkflows = (type) => workflows.filter(w => w.trigger_type === type);

  const renderStepConfig = (step, idx) => {
    const stepDef = STEP_TYPES.find(s => s.value === step.type);
    return (
      <div
        key={step.id}
        className="flex items-start gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg group"
        data-testid={`workflow-step-${idx}`}
      >
        <div className="flex flex-col gap-1 pt-1">
          <button onClick={() => moveStep(idx, -1)} className="text-zinc-500 hover:text-zinc-300" data-testid={`step-up-${idx}`}>
            <ArrowUp size={14} />
          </button>
          <div className={`w-8 h-8 rounded-md ${stepDef?.color || 'bg-zinc-700'} flex items-center justify-center`}>
            {stepDef && <stepDef.icon size={16} weight="bold" className="text-white" />}
          </div>
          <button onClick={() => moveStep(idx, 1)} className="text-zinc-500 hover:text-zinc-300" data-testid={`step-down-${idx}`}>
            <ArrowDown size={14} />
          </button>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-zinc-200">{stepDef?.label || step.type}</span>
            <button onClick={() => removeStep(idx)} className="text-red-500 hover:text-red-400" data-testid={`remove-step-${idx}`}>
              <Trash size={16} />
            </button>
          </div>

          {step.type === 'send_whatsapp' && (
            <textarea
              value={step.config.message || ''}
              onChange={(e) => updateStepConfig(idx, 'message', e.target.value)}
              placeholder="WhatsApp message... Use {client_name}, {consultant_name}"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-50 min-h-[60px]"
              data-testid={`step-message-${idx}`}
            />
          )}

          {step.type === 'wait' && (
            <div className="flex gap-2">
              <Input
                type="number"
                value={step.config.duration || 30}
                onChange={(e) => updateStepConfig(idx, 'duration', parseInt(e.target.value))}
                className="w-24 bg-zinc-950 border-zinc-800 text-zinc-50"
                data-testid={`step-duration-${idx}`}
              />
              <Select value={step.config.unit || 'minutes'} onValueChange={(v) => updateStepConfig(idx, 'unit', v)}>
                <SelectTrigger className="w-32 bg-zinc-950 border-zinc-800 text-zinc-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {step.type === 'change_stage' && (
            <Select value={step.config.stage || 'Contacted'} onValueChange={(v) => updateStepConfig(idx, 'stage', v)}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {step.type === 'assign_to' && (
            <div className="space-y-2">
              <Select value={step.config.method || 'specific'} onValueChange={(v) => updateStepConfig(idx, 'method', v)}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="specific">Specific User</SelectItem>
                  <SelectItem value="round_robin">Round Robin</SelectItem>
                </SelectContent>
              </Select>
              {step.config.method === 'specific' && (
                <Select value={step.config.user_id || ''} onValueChange={(v) => updateStepConfig(idx, 'user_id', v)}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-50">
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {users.filter(u => u.role === 'consultant' || u.role === 'sales_manager').map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {step.type === 'send_reminder' && (
            <div className="space-y-2">
              <Select value={step.config.timing || '24h_before'} onValueChange={(v) => updateStepConfig(idx, 'timing', v)}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="24h_before">24 Hours Before</SelectItem>
                  <SelectItem value="2h_before">2 Hours Before</SelectItem>
                  <SelectItem value="1h_before">1 Hour Before</SelectItem>
                  <SelectItem value="30m_before">30 Min Before</SelectItem>
                </SelectContent>
              </Select>
              <textarea
                value={step.config.message || ''}
                onChange={(e) => updateStepConfig(idx, 'message', e.target.value)}
                placeholder="Reminder message..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-50 min-h-[60px]"
                data-testid={`step-reminder-msg-${idx}`}
              />
            </div>
          )}
        </div>

        {/* Flow connector */}
        {idx < workflowSteps.length - 1 && (
          <div className="absolute -bottom-4 left-8 w-0.5 h-4 bg-zinc-700" />
        )}
      </div>
    );
  };

  const WorkflowList = ({ triggerType }) => {
    const wfs = filteredWorkflows(triggerType);
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-zinc-400">
            {wfs.length} workflow{wfs.length !== 1 ? 's' : ''} configured
          </p>
          <Button
            onClick={() => openNewBuilder(triggerType)}
            data-testid={`new-workflow-${triggerType}`}
            className="bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500 flex items-center gap-2"
          >
            <Plus size={16} weight="bold" />
            New Workflow
          </Button>
        </div>

        {wfs.length === 0 ? (
          <Card className="stat-card p-8 text-center">
            <FlowArrow size={48} className="mx-auto text-zinc-600 mb-3" />
            <p className="text-zinc-400">No workflows yet. Create one to automate this trigger.</p>
          </Card>
        ) : (
          wfs.map(wf => (
            <Card key={wf.id} className="stat-card p-4" data-testid={`workflow-card-${wf.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${wf.active ? 'bg-lime-400' : 'bg-zinc-600'}`} />
                  <div>
                    <h4 className="font-bold text-zinc-100">{wf.name}</h4>
                    <p className="text-xs text-zinc-500">{wf.steps?.length || 0} steps</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={wf.active}
                    onCheckedChange={() => handleToggle(wf)}
                    data-testid={`toggle-workflow-${wf.id}`}
                  />
                  <Button
                    onClick={() => openEditBuilder(wf)}
                    data-testid={`edit-workflow-${wf.id}`}
                    className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700 text-xs px-3"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(wf.id)}
                    data-testid={`delete-workflow-${wf.id}`}
                    className="bg-red-900 text-white hover:bg-red-800 text-xs px-3"
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    );
  };

  return (
    <Layout user={user}>
      <div className="p-4 sm:p-6 lg:p-8" data-testid="workflow-builder-page">
        <div className="mb-6">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50" data-testid="workflow-title">
            Workflow Builder
          </h1>
          <p className="mt-2 text-base text-zinc-400">Automate CRM actions with custom workflows</p>
        </div>

        <Tabs defaultValue="new_lead" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
            <TabsTrigger value="new_lead" data-testid="tab-new-lead" className="data-[state=active]:bg-lime-400 data-[state=active]:text-zinc-950 font-bold">
              New Lead
            </TabsTrigger>
            <TabsTrigger value="appointment" data-testid="tab-appointment" className="data-[state=active]:bg-lime-400 data-[state=active]:text-zinc-950 font-bold">
              Appointment
            </TabsTrigger>
            <TabsTrigger value="triggers" data-testid="tab-triggers" className="data-[state=active]:bg-lime-400 data-[state=active]:text-zinc-950 font-bold">
              Triggers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new_lead">
            <WorkflowList triggerType="new_lead" />
          </TabsContent>

          <TabsContent value="appointment">
            <WorkflowList triggerType="appointment" />
          </TabsContent>

          <TabsContent value="triggers">
            <div className="space-y-4">
              <p className="text-sm text-zinc-400 mb-4">Select a trigger to build a workflow for it:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TRIGGER_OPTIONS.map(trigger => {
                  const count = workflows.filter(w => w.trigger_type === trigger.value).length;
                  return (
                    <Card
                      key={trigger.value}
                      className="stat-card p-4 cursor-pointer hover:border-lime-400/30 transition-colors"
                      onClick={() => openNewBuilder(trigger.value)}
                      data-testid={`trigger-card-${trigger.value}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Lightning size={20} className="text-amber-400" />
                          <div>
                            <h4 className="font-bold text-zinc-100 text-sm">{trigger.label}</h4>
                            <p className="text-xs text-zinc-500">{count} workflow{count !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <Plus size={16} className="text-zinc-500" />
                      </div>
                    </Card>
                  );
                })}
              </div>
              
              {/* List all trigger-based workflows */}
              <div className="mt-6 space-y-3">
                {TRIGGER_OPTIONS.map(trigger => {
                  const wfs = workflows.filter(w => w.trigger_type === trigger.value);
                  if (wfs.length === 0) return null;
                  return (
                    <div key={trigger.value}>
                      <h4 className="text-xs uppercase font-bold text-zinc-500 mb-2">{trigger.label}</h4>
                      {wfs.map(wf => (
                        <Card key={wf.id} className="stat-card p-3 mb-2" data-testid={`trigger-wf-${wf.id}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${wf.active ? 'bg-lime-400' : 'bg-zinc-600'}`} />
                              <span className="font-semibold text-sm text-zinc-200">{wf.name}</span>
                              <span className="text-xs text-zinc-500">({wf.steps?.length} steps)</span>
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={() => openEditBuilder(wf)} className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700 text-xs px-2 h-7">Edit</Button>
                              <Button onClick={() => handleDelete(wf.id)} className="bg-red-900 text-white hover:bg-red-800 text-xs px-2 h-7"><Trash size={12} /></Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Workflow Builder Modal */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="workflow-builder-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-zinc-50">
              {editingWorkflow ? 'Edit Workflow' : 'New Workflow'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Workflow Name</Label>
                <Input
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="e.g. Welcome New Lead"
                  data-testid="workflow-name-input"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                />
              </div>
              <div className="flex items-end gap-2">
                <Label className="text-xs text-zinc-500 mb-2">Active</Label>
                <Switch checked={workflowActive} onCheckedChange={setWorkflowActive} data-testid="workflow-active-switch" />
              </div>
            </div>

            <div className="p-3 bg-zinc-950 rounded-md border border-zinc-800">
              <span className="text-xs font-bold text-zinc-500 uppercase">Trigger: </span>
              <span className="text-sm text-lime-400 font-semibold">
                {TRIGGER_OPTIONS.find(t => t.value === activeTab)?.label || activeTab}
              </span>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Steps</Label>
              {workflowSteps.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-4">No steps added yet. Add actions below.</p>
              ) : (
                <div className="space-y-3">
                  {workflowSteps.map((step, idx) => renderStepConfig(step, idx))}
                </div>
              )}
            </div>

            {/* Add Step */}
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Add Step</Label>
              <div className="flex flex-wrap gap-2">
                {STEP_TYPES.map(st => (
                  <Button
                    key={st.value}
                    onClick={() => addStep(st.value)}
                    data-testid={`add-step-${st.value}`}
                    className={`${st.color} text-white text-xs px-3 h-8 flex items-center gap-1.5 hover:opacity-90`}
                  >
                    <st.icon size={14} weight="bold" />
                    {st.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-zinc-800">
              <Button
                onClick={() => setShowBuilder(false)}
                data-testid="cancel-workflow"
                className="flex-1 bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                data-testid="save-workflow"
                className="flex-1 bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
              >
                {editingWorkflow ? 'Update Workflow' : 'Create Workflow'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default WorkflowBuilder;
