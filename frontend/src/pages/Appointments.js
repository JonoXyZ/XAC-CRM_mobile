import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Calendar, Clock, User, Plus } from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TIME_SLOTS = {
  'Mon': ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'],
  'Tue': ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'],
  'Wed': ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'],
  'Thu': ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'],
  'Fri': ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'],
  'Sat': ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00']
};

const Appointments = ({ user }) => {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newAppointment, setNewAppointment] = useState({
    name: '',
    surname: '',
    phone: '',
    email: '',
    scheduled_at: '',
    notes: '',
    appointment_type: 'general'
  });

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/appointments?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(response.data);
    } catch (error) {
      toast.error('Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const getDayOfWeek = (dateStr) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const date = new Date(dateStr + 'T00:00:00');
    return days[date.getDay()];
  };

  const handleEditAppointment = (apt) => {
    setSelectedAppointment(apt);
    setShowEditModal(true);
  };

  const handleUpdateAppointment = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/appointments/${selectedAppointment.id}`,
        {
          scheduled_at: selectedAppointment.scheduled_at,
          notes: selectedAppointment.notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Appointment updated');
      setShowEditModal(false);
      fetchAppointments();
    } catch (error) {
      toast.error('Failed to update appointment');
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/appointments/standalone`, {
        ...newAppointment,
        email: newAppointment.email?.trim() || null,
        surname: newAppointment.surname?.trim() || null,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Appointment created');
      setShowNewModal(false);
      setNewAppointment({ name: '', surname: '', phone: '', email: '', scheduled_at: '', notes: '', appointment_type: 'general' });
      fetchAppointments();
    } catch (error) {
      toast.error('Failed to create appointment');
    }
  };

  const openNewAppointmentModal = (time) => {
    const dateTime = `${selectedDate}T${time}`;
    setNewAppointment(prev => ({ ...prev, scheduled_at: dateTime }));
    setShowNewModal(true);
  };

  const dayOfWeek = getDayOfWeek(selectedDate);
  const availableSlots = TIME_SLOTS[dayOfWeek] || [];

  const getAppointmentForSlot = (time) => {
    return appointments.find(apt => {
      const aptTime = apt.scheduled_at.split('T')[1]?.substring(0, 5);
      return aptTime === time;
    });
  };

  return (
    <Layout user={user}>
      <div className="p-4 sm:p-6 lg:p-8" data-testid="appointments-page">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50" data-testid="appointments-title">
              Appointments
            </h1>
            <p className="mt-2 text-base text-zinc-400">Manage your daily schedule</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setNewAppointment(prev => ({ ...prev, scheduled_at: `${selectedDate}T09:00` }));
                setShowNewModal(true);
              }}
              data-testid="new-appointment-button"
              className="bg-lime-400 text-zinc-950 font-bold rounded-md px-4 py-2 hover:bg-lime-500 active:scale-95 flex items-center gap-2"
            >
              <Plus size={20} weight="bold" />
              Make Appointment
            </Button>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              data-testid="date-picker"
              className="bg-zinc-950 border-zinc-800 text-zinc-50"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading appointments...</div>
        ) : (
          <Card className="stat-card p-6" data-testid="appointments-calendar">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">
              {dayOfWeek}, {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </h3>

            <div className="space-y-2">
              {availableSlots.map((time) => {
                const appointment = getAppointmentForSlot(time);
                
                return (
                  <div
                    key={time}
                    className={`flex items-center gap-4 p-4 rounded-md border ${
                      appointment
                        ? 'bg-lime-400/10 border-lime-400/30 hover:border-lime-400/50'
                        : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 cursor-pointer'
                    }`}
                    data-testid={`time-slot-${time}`}
                    onClick={() => !appointment && openNewAppointmentModal(time)}
                  >
                    <div className="w-20 flex items-center gap-2 text-sm font-semibold text-zinc-400">
                      <Clock size={16} />
                      {time}
                    </div>

                    {appointment ? (
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-zinc-100">
                            {appointment.lead_name} {appointment.lead_surname || ''}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-zinc-400">
                            <div className="flex items-center gap-1">
                              <User size={14} />
                              <span>{appointment.consultant_name}</span>
                            </div>
                            {appointment.booked_by_name && appointment.booked_by_name !== appointment.consultant_name && (
                              <span className="text-xs text-cyan-500">
                                Booked by: {appointment.booked_by_name}
                              </span>
                            )}
                            {appointment.notes && (
                              <span className="text-xs">Note: {appointment.notes}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleEditAppointment(appointment); }}
                          data-testid={`edit-appointment-${appointment.id}`}
                          className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                        >
                          Edit
                        </Button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm text-zinc-600">Available</span>
                        <Plus size={16} className="text-zinc-600" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* New Appointment Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50" data-testid="new-appointment-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-zinc-50">Make Appointment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAppointment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">First Name *</Label>
                <Input
                  value={newAppointment.name}
                  onChange={(e) => setNewAppointment({ ...newAppointment, name: e.target.value })}
                  required
                  data-testid="new-apt-name-input"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Surname</Label>
                <Input
                  value={newAppointment.surname}
                  onChange={(e) => setNewAppointment({ ...newAppointment, surname: e.target.value })}
                  data-testid="new-apt-surname-input"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Phone</Label>
                <Input
                  value={newAppointment.phone}
                  onChange={(e) => setNewAppointment({ ...newAppointment, phone: e.target.value })}
                  data-testid="new-apt-phone-input"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Email</Label>
                <Input
                  type="email"
                  value={newAppointment.email}
                  onChange={(e) => setNewAppointment({ ...newAppointment, email: e.target.value })}
                  data-testid="new-apt-email-input"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Date & Time *</Label>
              <Input
                type="datetime-local"
                value={newAppointment.scheduled_at}
                onChange={(e) => setNewAppointment({ ...newAppointment, scheduled_at: e.target.value })}
                required
                data-testid="new-apt-datetime-input"
                className="bg-zinc-950 border-zinc-800 text-zinc-50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Type</Label>
              <Select
                value={newAppointment.appointment_type}
                onValueChange={(value) => setNewAppointment({ ...newAppointment, appointment_type: value })}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-50" data-testid="new-apt-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="trial">Trial Session</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="tour">Gym Tour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Notes</Label>
              <textarea
                value={newAppointment.notes}
                onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                data-testid="new-apt-notes-input"
                className="w-full min-h-[80px] bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-50"
                placeholder="Any notes for this appointment..."
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setShowNewModal(false)}
                data-testid="cancel-new-apt-button"
                className="flex-1 bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-testid="submit-new-apt-button"
                className="flex-1 bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
              >
                Create Appointment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50" data-testid="edit-appointment-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-zinc-50">Edit Appointment</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <form onSubmit={handleUpdateAppointment} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={selectedAppointment.scheduled_at?.substring(0, 16)}
                  onChange={(e) => setSelectedAppointment({
                    ...selectedAppointment,
                    scheduled_at: e.target.value + ':00'
                  })}
                  data-testid="edit-appointment-datetime"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Notes</Label>
                <Input
                  value={selectedAppointment.notes || ''}
                  onChange={(e) => setSelectedAppointment({
                    ...selectedAppointment,
                    notes: e.target.value
                  })}
                  data-testid="edit-appointment-notes"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  data-testid="cancel-edit-appointment"
                  className="flex-1 bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="submit-edit-appointment"
                  className="flex-1 bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
                >
                  Update
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Appointments;
