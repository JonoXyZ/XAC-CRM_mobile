import React, { useState } from 'react';
import axios from 'axios';
import { MagnifyingGlass, ArrowsClockwise, Check } from '@phosphor-icons/react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FetchLeadsButton = () => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const handleFetchLeads = async () => {
    setChecking(true);
    setResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/leads/fetch-check`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;
      setResult(data);
      if (data.new_leads > 0) {
        toast.success(`Found ${data.new_leads} new lead${data.new_leads > 1 ? 's' : ''}!`);
      } else {
        toast.info('No new leads found');
      }
    } catch (error) {
      console.error('Failed to check leads:', error);
      toast.error('Failed to check for new leads');
    } finally {
      setChecking(false);
      setTimeout(() => setResult(null), 5000);
    }
  };

  return (
    <button
      onClick={handleFetchLeads}
      disabled={checking}
      data-testid="fetch-check-leads-button"
      className="relative p-2 rounded-md text-zinc-400 hover:text-lime-400 hover:bg-zinc-800/50 transition-colors disabled:opacity-50"
      title="Fetch & Check New Leads"
    >
      {checking ? (
        <ArrowsClockwise size={22} weight="bold" className="animate-spin" />
      ) : result && result.new_leads > 0 ? (
        <>
          <Check size={22} weight="bold" className="text-lime-400" />
          <span className="absolute -top-1 -right-1 bg-lime-400 text-zinc-950 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {result.new_leads}
          </span>
        </>
      ) : (
        <MagnifyingGlass size={22} weight="bold" />
      )}
    </button>
  );
};

export default FetchLeadsButton;
