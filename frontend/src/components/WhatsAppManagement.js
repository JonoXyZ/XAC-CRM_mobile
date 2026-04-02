import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { WhatsappLogo, QrCode, Power, Check, X } from '@phosphor-icons/react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const WhatsAppManagement = ({ users }) => {
  const [whatsappStatuses, setWhatsappStatuses] = useState({});
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pollingQR, setPollingQR] = useState(false);

  useEffect(() => {
    fetchAllStatuses();
    const interval = setInterval(fetchAllStatuses, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchAllStatuses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/whatsapp/status-all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWhatsappStatuses(response.data);
    } catch (error) {
      console.error('Failed to fetch WhatsApp statuses');
    }
  };

  const handleStartSession = async (user) => {
    setSelectedUser(user);
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/whatsapp/start-session?user_id=${user.id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Whether session just started or was already running, show QR modal
      setShowQRModal(true);
      startQRPolling(user.id);
    } catch (error) {
      toast.error('Failed to start WhatsApp session');
      setLoading(false);
    }
  };

  const startQRPolling = async (userId) => {
    setPollingQR(true);
    const maxAttempts = 60;
    let attempts = 0;

    const pollQR = async () => {
      if (attempts >= maxAttempts) {
        setPollingQR(false);
        setLoading(false);
        toast.error('QR code generation timeout');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/whatsapp/qr/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.qrCode) {
          setQrCode(response.data.qrCode);
          setPollingQR(false);
          setLoading(false);
          startConnectionCheck(userId);
        } else {
          attempts++;
          setTimeout(pollQR, 1000);
        }
      } catch (error) {
        attempts++;
        setTimeout(pollQR, 1000);
      }
    };

    pollQR();
  };

  const startConnectionCheck = (userId) => {
    const checkInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/whatsapp/status/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.connected) {
          clearInterval(checkInterval);
          setShowQRModal(false);
          setQrCode(null);
          toast.success(`WhatsApp connected for ${selectedUser.name}!`);
          fetchAllStatuses();
        }
      } catch (error) {
        console.error('Connection check error');
      }
    }, 2000);

    setTimeout(() => clearInterval(checkInterval), 120000); // Stop after 2 minutes
  };

  const handleLogout = async (user) => {
    if (!window.confirm(`Disconnect WhatsApp for ${user.name}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/whatsapp/logout?user_id=${user.id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`WhatsApp disconnected for ${user.name}`);
      fetchAllStatuses();
    } catch (error) {
      toast.error('Failed to disconnect WhatsApp');
    }
  };

  const consultants = users.filter(u => u.role === 'consultant' || u.role === 'assistant');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {consultants.map(user => {
          const status = whatsappStatuses[user.id] || {};
          const isConnected = status.connected || false;

          return (
            <Card key={user.id} className="stat-card p-4" data-testid={`whatsapp-user-${user.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <WhatsappLogo size={32} weight="duotone" className={isConnected ? 'text-emerald-500' : 'text-zinc-600'} />
                  <div>
                    <p className="font-semibold text-zinc-100">{user.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-zinc-600'}`}></div>
                      <span className="text-xs text-zinc-400">
                        {isConnected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                </div>

                {isConnected ? (
                  <Button
                    onClick={() => handleLogout(user)}
                    data-testid={`disconnect-whatsapp-${user.id}`}
                    className="bg-red-900 hover:bg-red-800 text-red-100"
                  >
                    <Power size={18} />
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleStartSession(user)}
                    data-testid={`setup-whatsapp-${user.id}`}
                    className="bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
                  >
                    <QrCode size={18} weight="bold" className="mr-1" />
                    Setup
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50" data-testid="qr-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-zinc-50 flex items-center gap-2">
              <WhatsappLogo size={28} weight="duotone" className="text-lime-400" />
              Setup WhatsApp - {selectedUser?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-lime-400/10 border border-lime-400/20 rounded-lg">
              <ol className="text-sm text-zinc-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-lime-400">1.</span>
                  <span>Open WhatsApp on <strong>{selectedUser?.name}'s phone</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-lime-400">2.</span>
                  <span>Go to <strong>Settings → Linked Devices</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-lime-400">3.</span>
                  <span>Tap <strong>Link a Device</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-lime-400">4.</span>
                  <span>Scan the QR code below</span>
                </li>
              </ol>
            </div>

            {loading || pollingQR ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-lime-400 border-t-transparent mb-4"></div>
                <p className="text-sm text-zinc-400">Generating QR code...</p>
              </div>
            ) : qrCode ? (
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                </div>
                <p className="text-sm text-zinc-400 mt-4 text-center">
                  Waiting for scan... This may take a few seconds after scanning.
                </p>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppManagement;
