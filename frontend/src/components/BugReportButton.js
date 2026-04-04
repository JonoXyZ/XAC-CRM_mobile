import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Bug, PaperPlaneTilt, X } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical - App Broken', color: 'bg-red-500' },
  { value: 'high', label: 'High - Feature Not Working', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium - Something Off', color: 'bg-amber-500' },
  { value: 'low', label: 'Low - Minor Issue', color: 'bg-blue-500' },
];

const BugReportButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [page, setPage] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    setPage(window.location.pathname);
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

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Please describe the bug');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/bug-reports`, {
        description: description.trim(),
        priority,
        page,
        browser: navigator.userAgent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success('Bug report submitted & sent via WhatsApp!');
        setDescription('');
        setPriority('medium');
        setIsOpen(false);
      }
    } catch (error) {
      const msg = error.response?.data?.detail || 'Failed to submit bug report';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-testid="bug-report-button"
        className="relative p-2 rounded-md text-zinc-400 hover:text-red-400 hover:bg-zinc-800/50 transition-colors"
        title="Report a Bug"
      >
        <Bug size={22} weight="bold" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-96 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-50"
          data-testid="bug-report-dropdown"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Bug size={18} className="text-red-400" />
                Report a Bug
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Priority</label>
                <div className="flex gap-2 mt-1">
                  {PRIORITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPriority(opt.value)}
                      data-testid={`priority-${opt.value}`}
                      className={`flex-1 text-xs py-1.5 px-2 rounded-md font-semibold border transition-colors ${
                        priority === opt.value
                          ? `${opt.color} text-white border-transparent`
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {opt.value.charAt(0).toUpperCase() + opt.value.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Page</label>
                <input
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-300"
                  data-testid="bug-report-page"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Describe the Bug *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What happened? What did you expect to happen?"
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-50 min-h-[100px] resize-none"
                  data-testid="bug-report-description"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || !description.trim()}
                data-testid="submit-bug-report"
                className="w-full bg-red-600 text-white font-bold hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <PaperPlaneTilt size={16} weight="bold" />
                {submitting ? 'Sending...' : 'Submit & Send via WhatsApp'}
              </Button>

              <p className="text-xs text-zinc-600 text-center">
                Report will be sent to admin via WhatsApp
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BugReportButton;
