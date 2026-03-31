import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Robot, PaperPlaneRight, Sparkle } from '@phosphor-icons/react';

const EmergentFixes = ({ user }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: "👋 Hi! I'm your Emergent AI assistant. I can help you with:\n\n• Bug fixes and troubleshooting\n• Feature modifications\n• UI/UX improvements\n• Database queries\n• Code optimizations\n• Integration issues\n\nWhat would you like me to help with today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages([...messages, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        type: 'assistant',
        content: "I've received your request. In a production environment, this would connect to the Emergent AI backend to process your request and provide real-time assistance.\n\nFor now, you can:\n1. Describe the issue or feature you need\n2. Include specific details (page names, error messages, etc.)\n3. Attach screenshots if needed\n\nI'll help you implement the fix or feature directly in your codebase!",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  if (user?.role !== 'admin') {
    return (
      <Layout user={user}>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="text-center py-12">
            <Robot size={64} className="mx-auto text-zinc-700 mb-4" />
            <h2 className="text-2xl font-bold text-zinc-400">Access Denied</h2>
            <p className="text-zinc-500 mt-2">Only administrators can access Emergent Fixes</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="p-4 sm:p-6 lg:p-8 h-[calc(100vh-2rem)]" data-testid="emergent-fixes-page">
        <div className="flex flex-col h-full max-w-4xl mx-auto">
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-lime-400 to-cyan-500 rounded-lg">
                <Robot size={32} weight="duotone" className="text-zinc-950" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-50" data-testid="emergent-fixes-title">
                  Emergent AI Assistant
                </h1>
                <p className="text-sm text-zinc-400">Live fixes and development support</p>
              </div>
            </div>
          </div>

          <Card className="flex-1 flex flex-col bg-zinc-900/40 border-zinc-800 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="chat-messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  data-testid={`message-${message.type}-${message.id}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.type === 'user'
                        ? 'bg-lime-400 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-50 border border-zinc-700'
                    }`}
                  >
                    {message.type === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkle size={16} weight="fill" className="text-cyan-400" />
                        <span className="text-xs font-semibold text-cyan-400">Emergent AI</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-60 mt-2">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-zinc-400">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-800">
              <div className="flex gap-3">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Describe the issue or feature you need..."
                  data-testid="chat-input"
                  className="flex-1 bg-zinc-950 border-zinc-800 text-zinc-50"
                />
                <Button
                  type="submit"
                  disabled={!inputMessage.trim() || isTyping}
                  data-testid="send-message-button"
                  className="bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
                >
                  <PaperPlaneRight size={20} weight="bold" />
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default EmergentFixes;
