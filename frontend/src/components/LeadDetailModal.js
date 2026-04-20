import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { 
  User, Phone, Envelope, Tag, Clock, CalendarCheck, 
  WhatsappLogo, TrendUp, Star, ChatDots, ArrowRight,
  Handshake, PlusCircle, NotePencil
} from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ACTIVITY_CONFIG = {
  lead_created: { icon: PlusCircle, color: 'text-sky-400', bg: 'bg-sky-500/10', label: 'Lead Created' },
  stage_changed: { icon: ArrowRight, color: 'text-violet-400', bg: 'bg-violet-500/10', label: 'Stage Changed' },
  appointment_booked: { icon: CalendarCheck, color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'Appointment Booked' },
  appointment_auto_created: { icon: CalendarCheck, color: 'text-teal-400', bg: 'bg-teal-500/10', label: 'Auto Appointment' },
  deal_closed: { icon: Handshake, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Deal Closed' },
  whatsapp_sent: { icon: WhatsappLogo, color: 'text-green-400', bg: 'bg-green-500/10', label: 'WhatsApp Sent' },
  note: { icon: NotePencil, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Note Added' },
  call: { icon: Phone, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Call Made' },
  email: { icon: Envelope, color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Email Sent' },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
};

const LeadDetailModal = ({ lead, open, onClose }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!lead?.id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/activities/${lead.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivities(response.data);
    } catch (error) {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [lead?.id]);

  useEffect(() => {
    if (open && lead?.id) {
      fetchActivities();
    }
  }, [open, lead?.id, fetchActivities]);

  if (!lead) return null;

  const stageColors = {
    'New Lead': 'bg-sky-500',
    'Contacted': 'bg-violet-500',
    'Engaged': 'bg-amber-500',
    'Appointment Set': 'bg-cyan-500',
    'Showed Up': 'bg-teal-500',
    'Trial / Consultation': 'bg-orange-500',
    'Closed Won': 'bg-emerald-500',
    'Closed Lost': 'bg-red-500',
    'Invalid': 'bg-zinc-600',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 max-w-lg max-h-[85vh] overflow-hidden flex flex-col" data-testid="lead-detail-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-zinc-50 flex items-center gap-3">
            <User size={28} weight="duotone" className="text-lime-400" />
            {lead.name} {lead.surname || ''}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Lead Info */}
          <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2" data-testid="lead-info-section">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full text-white ${stageColors[lead.stage] || 'bg-zinc-600'}`}>
                {lead.stage}
              </span>
              {lead.score > 0 && (
                <div className="flex items-center gap-1 text-amber-400">
                  <Star size={14} weight="fill" />
                  <span className="text-xs font-bold">{lead.score}/10</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {lead.phone && (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Phone size={16} className="text-zinc-500" />
                  <span>{lead.phone}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Envelope size={16} className="text-zinc-500" />
                  <span className="truncate">{lead.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Tag size={16} className="text-zinc-500" />
                <span>{lead.source}</span>
              </div>
              {lead.owner_name && (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <User size={16} className="text-zinc-500" />
                  <span>{lead.owner_name}</span>
                </div>
              )}
              {lead.created_at && (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Clock size={16} className="text-zinc-500" />
                  <span>{new Date(lead.created_at).toLocaleDateString('en-ZA')}</span>
                </div>
              )}
            </div>
            {lead.notes && (
              <div className="mt-3 p-3 bg-zinc-900 rounded border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Notes</p>
                <p className="text-sm text-zinc-300">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div data-testid="activity-timeline">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ChatDots size={16} />
              Activity Timeline
            </h3>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-lime-400 border-t-transparent" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-6 text-zinc-600 text-sm">
                No activity recorded yet
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-800" />
                
                <div className="space-y-1">
                  {activities.map((activity) => {
                    const config = ACTIVITY_CONFIG[activity.activity_type] || ACTIVITY_CONFIG.note;
                    const Icon = config.icon;
                    
                    return (
                      <div 
                        key={activity.id} 
                        className="relative flex items-start gap-3 pl-1 py-2"
                        data-testid={`activity-${activity.id}`}
                      >
                        <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${config.bg} border border-zinc-800`}>
                          <Icon size={14} weight="bold" className={config.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-200">{activity.content}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {activity.user_name && (
                              <span className="text-xs text-zinc-500">{activity.user_name}</span>
                            )}
                            <span className="text-xs text-zinc-600">{formatDate(activity.created_at)}</span>
                          </div>
                          {activity.notes && (
                            <p className="text-xs text-zinc-500 mt-1 italic">"{activity.notes}"</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-800">
          <Button
            onClick={onClose}
            data-testid="close-lead-detail"
            className="w-full bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailModal;
