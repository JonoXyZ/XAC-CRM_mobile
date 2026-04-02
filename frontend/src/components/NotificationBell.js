import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bell, Check, X } from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const NOTIF_ICONS = {
  new_lead: { color: 'text-lime-400', bg: 'bg-lime-400/10' },
  meta_lead: { color: 'text-blue-400', bg: 'bg-blue-400/10' },
  appointment_booked: { color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  appointment_reminder: { color: 'text-amber-400', bg: 'bg-amber-400/10' },
  stage_changed: { color: 'text-purple-400', bg: 'bg-purple-400/10' },
  deal_closed: { color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  auto_appointment: { color: 'text-teal-400', bg: 'bg-teal-400/10' },
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(`${API_URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(res.data.count);
    } catch (e) { /* silent */ }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (e) { /* silent */ }
    setLoading(false);
  };

  const markRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/notifications/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) { /* silent */ }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const timeAgo = (dateStr) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-testid="notification-bell"
        className="relative p-2 rounded-lg hover:bg-zinc-800 transition-colors"
      >
        <Bell size={24} weight={unreadCount > 0 ? 'fill' : 'regular'} className="text-zinc-300" />
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          data-testid="notification-dropdown"
          className="absolute right-0 top-12 w-96 max-h-[28rem] bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h3 className="font-bold text-zinc-100 text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  data-testid="mark-all-read-button"
                  className="text-xs text-lime-400 hover:text-lime-300 font-semibold flex items-center gap-1"
                >
                  <Check size={14} weight="bold" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-zinc-500 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-sm">No notifications yet</div>
            ) : (
              notifications.map((notif) => {
                const style = NOTIF_ICONS[notif.type] || { color: 'text-zinc-400', bg: 'bg-zinc-800' };
                return (
                  <div
                    key={notif.id}
                    data-testid={`notification-${notif.id}`}
                    onClick={() => !notif.read && markRead(notif.id)}
                    className={`px-4 py-3 border-b border-zinc-800/50 cursor-pointer transition-colors ${
                      notif.read ? 'opacity-60' : 'hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${notif.read ? 'bg-zinc-700' : 'bg-lime-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold uppercase tracking-wider ${style.color}`}>
                            {notif.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-zinc-600">{timeAgo(notif.created_at)}</span>
                        </div>
                        <p className="text-sm font-semibold text-zinc-200 mt-0.5">{notif.title}</p>
                        <p className="text-xs text-zinc-400 mt-0.5 truncate">{notif.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
