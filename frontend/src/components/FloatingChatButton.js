import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Robot, Sparkle } from '@phosphor-icons/react';

const FloatingChatButton = ({ user, type = 'emergent' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show button on the page it leads to
  if (type === 'emergent' && location.pathname === '/emergent-fixes') return null;
  
  // Only show Emergent button for admin
  if (type === 'emergent' && user?.role !== 'admin') return null;

  const handleClick = () => {
    if (type === 'emergent') {
      navigate('/emergent-fixes');
    }
  };

  return (
    <button
      onClick={handleClick}
      data-testid={`floating-${type}-button`}
      className={`fixed ${type === 'emergent' ? 'bottom-6 right-6' : 'bottom-24 right-6'} z-50 group`}
      title={type === 'emergent' ? 'Emergent AI Assistant' : 'AI Writing Assistant'}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400 to-cyan-500 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
        <div className="relative w-14 h-14 bg-gradient-to-br from-lime-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform">
          {type === 'emergent' ? (
            <Robot size={28} weight="bold" className="text-zinc-950" />
          ) : (
            <Sparkle size={28} weight="fill" className="text-zinc-950" />
          )}
        </div>
        
        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-lime-400 to-cyan-500 animate-ping opacity-20"></div>
      </div>

      {/* Tooltip */}
      <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-zinc-900 text-zinc-50 text-xs font-semibold px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-zinc-800 shadow-xl">
        {type === 'emergent' ? 'Chat with Emergent AI' : 'AI Writing Helper'}
        <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-zinc-900"></div>
      </div>
    </button>
  );
};

export default FloatingChatButton;
