import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Phone, Envelope, Tag, PencilSimple, CalendarPlus, SquaresFour, Table, Star } from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STAGES = [
  'New Lead',
  'Contacted',
  'Engaged',
  'Appointment Set',
  'Showed Up',
  'Trial / Consultation',
  'Closed Won',
  'Closed Lost',
  'Invalid'
];

const Leads = ({ user }) => {
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban');
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showEditLeadModal, setShowEditLeadModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [newLead, setNewLead] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    source: 'Manual',
    notes: ''
  });
  const [dealData, setDealData] = useState({
    payment_type: 'Cash',
    deal_date: new Date().toISOString().split('T')[0],
    closed_by: user?.id || '',
    to_by: '',
    sales_value: '',
    term: '',
    units: '',
    joining_fee: '',
    debit_order_value: ''
  });
  const [appointmentData, setAppointmentData] = useState({
    scheduled_at: '',
    notes: ''
  });
  const [leadScore, setLeadScore] = useState(0);
  const [showScoreModal, setShowScoreModal] = useState(false);

  useEffect(() => {
    fetchLeads();
    fetchUsers();
  }, []);

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/leads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeads(response.data);
    } catch (error) {
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
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

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/leads`, newLead, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Lead created successfully');
      setShowNewLeadModal(false);
      setNewLead({ name: '', surname: '', email: '', phone: '', source: 'Manual', notes: '' });
      fetchLeads();
    } catch (error) {
      toast.error('Failed to create lead');
    }
  };

  const handleUpdateLead = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/leads/${selectedLead.id}`,
        {
          name: selectedLead.name,
          surname: selectedLead.surname,
          email: selectedLead.email,
          phone: selectedLead.phone,
          notes: selectedLead.notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Lead updated successfully');
      setShowEditLeadModal(false);
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/appointments`,
        {
          lead_id: selectedLead.id,
          scheduled_at: appointmentData.scheduled_at,
          notes: appointmentData.notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Appointment booked successfully');
      setShowAppointmentModal(false);
      setAppointmentData({ scheduled_at: '', notes: '' });
      fetchLeads();
    } catch (error) {
      toast.error('Failed to book appointment');
    }
  };

  const handleUpdateScore = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/leads/${selectedLead.id}/score`,
        leadScore,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params: { score: leadScore }
        }
      );
      toast.success('Lead score updated');
      setShowScoreModal(false);
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update score');
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStage = STAGES[destination.droppableId.split('-')[1]];
    
    const lead = leads.find(l => l.id === draggableId);
    
    if (newStage === 'Closed Won') {
      setSelectedLead(lead);
      setDealData({
        ...dealData,
        payment_type: 'Cash',
        closed_by: user?.id || '',
        to_by: lead.owner_id || ''
      });
      setShowDealModal(true);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/leads/${draggableId}`,
        { stage: newStage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setLeads(leads.map(l => l.id === draggableId ? { ...l, stage: newStage } : l));
      toast.success('Lead stage updated');
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  const handleStageChange = async (leadId, newStage) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/leads/${leadId}`,
        { stage: newStage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLeads(leads.map(l => l.id === leadId ? { ...l, stage: newStage } : l));
      toast.success('Lead stage updated');
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  const handleSubmitDeal = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/deals`,
        {
          ...dealData,
          lead_id: selectedLead.id,
          sales_value: dealData.sales_value ? parseFloat(dealData.sales_value) : null,
          term: dealData.term ? parseInt(dealData.term) : null,
          units: dealData.units ? parseInt(dealData.units) : null,
          joining_fee: dealData.joining_fee ? parseFloat(dealData.joining_fee) : null,
          debit_order_value: dealData.debit_order_value ? parseFloat(dealData.debit_order_value) : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Deal closed successfully!');
      setShowDealModal(false);
      fetchLeads();
    } catch (error) {
      toast.error('Failed to close deal');
    }
  };

  const getLeadsByStage = (stage) => {
    return leads.filter(lead => lead.stage === stage);
  };

  return (
    <Layout user={user}>
      <div className="p-4 sm:p-6 lg:p-8" data-testid="leads-page">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50" data-testid="leads-title">
              Lead Pipeline
            </h1>
            <p className="mt-2 text-base text-zinc-400">Manage and track your leads</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 bg-zinc-900 p-1 rounded-md border border-zinc-800">
              <Button
                onClick={() => setViewMode('kanban')}
                data-testid="kanban-view-button"
                className={`px-3 py-2 ${viewMode === 'kanban' ? 'bg-lime-400 text-zinc-950' : 'bg-transparent text-zinc-400 hover:text-zinc-50'}`}
              >
                <SquaresFour size={20} weight={viewMode === 'kanban' ? 'fill' : 'regular'} />
              </Button>
              <Button
                onClick={() => setViewMode('table')}
                data-testid="table-view-button"
                className={`px-3 py-2 ${viewMode === 'table' ? 'bg-lime-400 text-zinc-950' : 'bg-transparent text-zinc-400 hover:text-zinc-50'}`}
              >
                <Table size={20} weight={viewMode === 'table' ? 'fill' : 'regular'} />
              </Button>
            </div>
            <Button
              onClick={() => setShowNewLeadModal(true)}
              data-testid="add-lead-button"
              className="bg-lime-400 text-zinc-950 font-bold rounded-md px-4 py-2 hover:bg-lime-500 active:scale-95 flex items-center gap-2"
            >
              <Plus size={20} weight="bold" />
              Add Lead
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading leads...</div>
        ) : viewMode === 'kanban' ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="kanban-container" data-testid="kanban-board">
              {STAGES.map((stage, stageIndex) => (
                <Droppable droppableId={`stage-${stageIndex}`} key={stage}>
                  {(provided) => (
                    <div
                      className="kanban-column"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      data-testid={`kanban-column-${stage.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="kanban-column-header">
                        <h3 className="text-sm font-bold text-zinc-300">{stage}</h3>
                        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                          {getLeadsByStage(stage).length}
                        </span>
                      </div>
                      <div className="kanban-cards">
                        {getLeadsByStage(stage).map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided) => (
                              <div
                                className="kanban-card relative group"
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                data-testid={`lead-card-${lead.id}`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-zinc-100">
                                      {lead.name} {lead.surname || ''}
                                    </h4>
                                    {lead.score > 0 && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <Star size={14} weight="fill" className="text-amber-500" />
                                        <span className="text-xs text-amber-500 font-semibold">Score: {lead.score}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedLead(lead);
                                        setLeadScore(lead.score || 0);
                                        setShowScoreModal(true);
                                      }}
                                      data-testid={`score-lead-${lead.id}`}
                                      className="opacity-0 group-hover:opacity-100 p-1 h-auto bg-amber-500 hover:bg-amber-600"
                                      title="Score Lead"
                                    >
                                      <Star size={14} weight="bold" />
                                    </Button>
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedLead(lead);
                                        setShowEditLeadModal(true);
                                      }}
                                      data-testid={`edit-lead-${lead.id}`}
                                      className="opacity-0 group-hover:opacity-100 p-1 h-auto bg-zinc-800 hover:bg-zinc-700"
                                    >
                                      <PencilSimple size={14} />
                                    </Button>
                                  </div>
                                </div>
                                <div className="space-y-1 text-xs text-zinc-400">
                                  {lead.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone size={14} />
                                      <span>{lead.phone}</span>
                                    </div>
                                  )}
                                  {lead.email && (
                                    <div className="flex items-center gap-2">
                                      <Envelope size={14} />
                                      <span className="truncate">{lead.email}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Tag size={14} />
                                    <span>{lead.source}</span>
                                  </div>
                                  {lead.notes && (
                                    <div className="mt-2 p-2 bg-zinc-950 rounded text-xs text-zinc-500">
                                      {lead.notes}
                                    </div>
                                  )}
                                  {lead.owner_name && (
                                    <div className="mt-2 text-xs text-zinc-500">
                                      Owner: {lead.owner_name}
                                    </div>
                                  )}
                                </div>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLead(lead);
                                    setShowAppointmentModal(true);
                                  }}
                                  data-testid={`book-appointment-${lead.id}`}
                                  className="w-full mt-3 bg-cyan-500 text-zinc-950 font-bold hover:bg-cyan-600 flex items-center justify-center gap-2"
                                >
                                  <CalendarPlus size={16} weight="bold" />
                                  Book Appointment
                                </Button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        ) : (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg overflow-hidden" data-testid="table-view">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/80 text-zinc-400 font-semibold uppercase text-xs">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Source</th>
                  <th className="p-4">Owner</th>
                  <th className="p-4">Score</th>
                  <th className="p-4">Stage</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-t border-zinc-800/50 hover:bg-zinc-800/30" data-testid={`table-row-${lead.id}`}>
                    <td className="p-4 font-semibold text-zinc-100">
                      {lead.name} {lead.surname || ''}
                    </td>
                    <td className="p-4 text-zinc-300">{lead.phone}</td>
                    <td className="p-4 text-zinc-300">{lead.email || '-'}</td>
                    <td className="p-4 text-zinc-300">{lead.source}</td>
                    <td className="p-4 text-zinc-300">{lead.owner_name || '-'}</td>
                    <td className="p-4">
                      {lead.score > 0 ? (
                        <div className="flex items-center gap-1">
                          <Star size={16} weight="fill" className="text-amber-500" />
                          <span className="font-semibold text-amber-500">{lead.score}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Select
                        value={lead.stage}
                        onValueChange={(value) => handleStageChange(lead.id, value)}
                        data-testid={`stage-select-${lead.id}`}
                      >
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-50 w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          {STAGES.map(stage => (
                            <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setSelectedLead(lead);
                            setLeadScore(lead.score || 0);
                            setShowScoreModal(true);
                          }}
                          data-testid={`table-score-${lead.id}`}
                          className="p-2 bg-amber-500 hover:bg-amber-600"
                          title="Score Lead"
                        >
                          <Star size={16} weight="bold" />
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowEditLeadModal(true);
                          }}
                          data-testid={`table-edit-${lead.id}`}
                          className="p-2 bg-zinc-800 hover:bg-zinc-700"
                        >
                          <PencilSimple size={16} />
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowAppointmentModal(true);
                          }}
                          data-testid={`table-book-${lead.id}`}
                          className="p-2 bg-cyan-500 hover:bg-cyan-600"
                        >
                          <CalendarPlus size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Lead Modal */}
      <Dialog open={showNewLeadModal} onOpenChange={setShowNewLeadModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50" data-testid="new-lead-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-zinc-50">Add New Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLead} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">First Name</Label>
              <Input
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                required
                data-testid="new-lead-name-input"
                className="bg-zinc-950 border-zinc-800 text-zinc-50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Surname</Label>
              <Input
                value={newLead.surname}
                onChange={(e) => setNewLead({ ...newLead, surname: e.target.value })}
                data-testid="new-lead-surname-input"
                className="bg-zinc-950 border-zinc-800 text-zinc-50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Email</Label>
              <Input
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                data-testid="new-lead-email-input"
                className="bg-zinc-950 border-zinc-800 text-zinc-50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Phone</Label>
              <Input
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                required
                data-testid="new-lead-phone-input"
                className="bg-zinc-950 border-zinc-800 text-zinc-50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Source</Label>
              <Select
                value={newLead.source}
                onValueChange={(value) => setNewLead({ ...newLead, source: value })}
                data-testid="new-lead-source-select"
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="Manual">Manual Entry</SelectItem>
                  <SelectItem value="Meta">Meta Lead Form</SelectItem>
                  <SelectItem value="Website">Website Form</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Walk-in">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Notes</Label>
              <textarea
                value={newLead.notes}
                onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                data-testid="new-lead-notes-input"
                className="w-full min-h-[80px] bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-50"
                placeholder="Add any notes about this lead..."
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setShowNewLeadModal(false)}
                data-testid="cancel-new-lead-button"
                className="flex-1 bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-testid="submit-new-lead-button"
                className="flex-1 bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
              >
                Create Lead
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Modal */}
      <Dialog open={showEditLeadModal} onOpenChange={setShowEditLeadModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50" data-testid="edit-lead-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-zinc-50">Edit Lead</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <form onSubmit={handleUpdateLead} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">First Name</Label>
                <Input
                  value={selectedLead.name}
                  onChange={(e) => setSelectedLead({ ...selectedLead, name: e.target.value })}
                  required
                  data-testid="edit-lead-name-input"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Surname</Label>
                <Input
                  value={selectedLead.surname || ''}
                  onChange={(e) => setSelectedLead({ ...selectedLead, surname: e.target.value })}
                  data-testid="edit-lead-surname-input"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Email</Label>
                <Input
                  type="email"
                  value={selectedLead.email || ''}
                  onChange={(e) => setSelectedLead({ ...selectedLead, email: e.target.value })}
                  data-testid="edit-lead-email-input"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Phone</Label>
                <Input
                  value={selectedLead.phone}
                  onChange={(e) => setSelectedLead({ ...selectedLead, phone: e.target.value })}
                  required
                  data-testid="edit-lead-phone-input"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Notes</Label>
                <textarea
                  value={selectedLead.notes || ''}
                  onChange={(e) => setSelectedLead({ ...selectedLead, notes: e.target.value })}
                  data-testid="edit-lead-notes-input"
                  className="w-full min-h-[80px] bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-50"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setShowEditLeadModal(false)}
                  data-testid="cancel-edit-lead-button"
                  className="flex-1 bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="submit-edit-lead-button"
                  className="flex-1 bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
                >
                  Update Lead
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Book Appointment Modal */}
      <Dialog open={showAppointmentModal} onOpenChange={setShowAppointmentModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50" data-testid="book-appointment-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-zinc-50">Book Appointment</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div className="p-3 bg-zinc-950 rounded-md border border-zinc-800">
                <p className="text-sm text-zinc-400">Lead:</p>
                <p className="font-semibold text-zinc-100">
                  {selectedLead.name} {selectedLead.surname || ''}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={appointmentData.scheduled_at}
                  onChange={(e) => setAppointmentData({ ...appointmentData, scheduled_at: e.target.value })}
                  required
                  data-testid="appointment-datetime-input"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Notes</Label>
                <Input
                  value={appointmentData.notes}
                  onChange={(e) => setAppointmentData({ ...appointmentData, notes: e.target.value })}
                  data-testid="appointment-notes-input"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                  placeholder="Any special notes for this appointment..."
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setShowAppointmentModal(false)}
                  data-testid="cancel-appointment-button"
                  className="flex-1 bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="submit-appointment-button"
                  className="flex-1 bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
                >
                  Book Appointment
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Deal Modal (same as before) */}
      <Dialog open={showDealModal} onOpenChange={setShowDealModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 max-w-2xl" data-testid="deal-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-zinc-50">Close Deal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitDeal}>
            <Tabs value={dealData.payment_type} onValueChange={(value) => setDealData({ ...dealData, payment_type: value })}>
              <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
                <TabsTrigger value="Cash" data-testid="cash-tab">Cash</TabsTrigger>
                <TabsTrigger value="Debit Order" data-testid="debit-order-tab">Debit Order</TabsTrigger>
              </TabsList>

              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Deal Date</Label>
                    <Input
                      type="date"
                      value={dealData.deal_date}
                      onChange={(e) => setDealData({ ...dealData, deal_date: e.target.value })}
                      data-testid="deal-date-input"
                      className="bg-zinc-950 border-zinc-800 text-zinc-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">T/O By</Label>
                    <Select
                      value={dealData.to_by}
                      onValueChange={(value) => setDealData({ ...dealData, to_by: value })}
                      data-testid="to-by-select"
                    >
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-50">
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <TabsContent value="Cash" className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Sales Value (R)</Label>
                    <Input
                      type="number"
                      value={dealData.sales_value}
                      onChange={(e) => setDealData({ ...dealData, sales_value: e.target.value })}
                      data-testid="sales-value-input"
                      className="bg-zinc-950 border-zinc-800 text-zinc-50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Term (months)</Label>
                      <Input
                        type="number"
                        value={dealData.term}
                        onChange={(e) => setDealData({ ...dealData, term: e.target.value })}
                        data-testid="term-input"
                        className="bg-zinc-950 border-zinc-800 text-zinc-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Units</Label>
                      <Input
                        type="number"
                        value={dealData.units}
                        onChange={(e) => setDealData({ ...dealData, units: e.target.value })}
                        data-testid="units-input"
                        className="bg-zinc-950 border-zinc-800 text-zinc-50"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="Debit Order" className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Joining Fee (R)</Label>
                    <Input
                      type="number"
                      value={dealData.joining_fee}
                      onChange={(e) => setDealData({ ...dealData, joining_fee: e.target.value })}
                      data-testid="joining-fee-input"
                      className="bg-zinc-950 border-zinc-800 text-zinc-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Debit Order Value (R)</Label>
                    <Input
                      type="number"
                      value={dealData.debit_order_value}
                      onChange={(e) => setDealData({ ...dealData, debit_order_value: e.target.value })}
                      data-testid="debit-order-value-input"
                      className="bg-zinc-950 border-zinc-800 text-zinc-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Units</Label>
                    <Input
                      type="number"
                      value={dealData.units}
                      onChange={(e) => setDealData({ ...dealData, units: e.target.value })}
                      data-testid="units-debit-input"
                      className="bg-zinc-950 border-zinc-800 text-zinc-50"
                    />
                  </div>
                </TabsContent>

                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    onClick={() => setShowDealModal(false)}
                    data-testid="cancel-deal-button"
                    className="flex-1 bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    data-testid="submit-deal-button"
                    className="flex-1 bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
                  >
                    Close Deal
                  </Button>
                </div>
              </div>
            </Tabs>
          </form>
        </DialogContent>
      </Dialog>

      {/* Score Lead Modal */}
      <Dialog open={showScoreModal} onOpenChange={setShowScoreModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50" data-testid="score-lead-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-zinc-50">Score Lead</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <form onSubmit={handleUpdateScore} className="space-y-4">
              <div className="p-3 bg-zinc-950 rounded-md border border-zinc-800">
                <p className="text-sm text-zinc-400">Lead:</p>
                <p className="font-semibold text-zinc-100">
                  {selectedLead.name} {selectedLead.surname || ''}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Lead Score (0-100)</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={leadScore}
                    onChange={(e) => setLeadScore(parseInt(e.target.value))}
                    data-testid="score-slider"
                    className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex items-center gap-2 min-w-[80px] justify-center bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2">
                    <Star size={20} weight="fill" className="text-amber-500" />
                    <span className="text-2xl font-bold text-amber-500">{leadScore}</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Score leads based on quality, engagement, and conversion likelihood
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setShowScoreModal(false)}
                  data-testid="cancel-score-button"
                  className="flex-1 bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="submit-score-button"
                  className="flex-1 bg-amber-500 text-zinc-950 font-bold hover:bg-amber-600"
                >
                  Update Score
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Leads;
