import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showPortal, setShowPortal] = useState(false);
  const [companyPassword, setCompanyPassword] = useState('');
  const [error, setError] = useState('');

  const companies = [
    { name: 'Revival Fitness Centre', code: 'RFC911', logo: '/assets/xac-logo.png' }
  ];

  const handleCompanyLogin = (e) => {
    e.preventDefault();
    const match = companies.find(c => c.code === companyPassword.trim());
    if (match) {
      localStorage.setItem('company', JSON.stringify(match));
      navigate('/login');
    } else {
      setError('Invalid company code');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50" data-testid="landing-page">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(132,204,22,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(6,182,212,0.1) 0%, transparent 50%)' }} />
        
        <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <img src="/assets/xac-logo.png" alt="XAC" className="w-10 h-10 object-contain" />
            <span className="text-xl font-black tracking-tight">XAC CRM</span>
          </div>
          <Button
            onClick={() => setShowPortal(true)}
            data-testid="portal-login-button"
            className="bg-lime-400 text-zinc-950 font-bold px-6 hover:bg-lime-500 rounded-full"
          >
            Client Portal
          </Button>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
          <div className="max-w-3xl">
            <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-lime-400/30 bg-lime-400/5">
              <span className="text-sm font-semibold text-lime-400">Next-Gen Fitness CRM</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]">
              Close more deals.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-cyan-400">
                Grow your gym.
              </span>
            </h1>
            <p className="mt-8 text-lg text-zinc-400 max-w-xl leading-relaxed">
              XAC CRM is built exclusively for fitness businesses. Capture leads from Facebook, WhatsApp, and walk-ins. 
              Auto-assign to consultants. Track deals. Manage commissions. All in one place.
            </p>
            <div className="mt-10 flex gap-4">
              <Button
                onClick={() => setShowPortal(true)}
                data-testid="get-started-button"
                className="bg-lime-400 text-zinc-950 font-bold px-8 py-6 text-lg rounded-full hover:bg-lime-500 active:scale-95 transition-transform"
              >
                Get Started
              </Button>
              <Button
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                data-testid="learn-more-button"
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold px-8 py-6 text-lg rounded-full hover:bg-zinc-800"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="border-y border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '10x', label: 'Faster Lead Response' },
            { value: '100%', label: 'WhatsApp Integrated' },
            { value: '24/7', label: 'Auto Lead Capture' },
            { value: 'Real-time', label: 'Commission Tracking' }
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-black text-lime-400">{stat.value}</div>
              <div className="text-sm text-zinc-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black">Everything you need to <span className="text-lime-400">dominate</span> gym sales</h2>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">From lead capture to deal closure, XAC CRM handles the entire sales pipeline so your team can focus on what matters — converting.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Lead Pipeline', desc: 'Kanban board with color-coded stages. Drag leads from New to Closed Won. Every stage is visible at a glance.', color: 'from-sky-500 to-cyan-500' },
            { title: 'WhatsApp Integration', desc: 'Multi-session WhatsApp built in. Send messages, auto-schedule appointments with .appointment trigger, and push notifications.', color: 'from-emerald-500 to-lime-500' },
            { title: 'Facebook Lead Ads', desc: 'Automatic lead capture from Meta. Leads flow directly into your pipeline via webhook — no manual entry needed.', color: 'from-blue-500 to-violet-500' },
            { title: 'Commission Dashboard', desc: 'Real-time earnings tracking with configurable scales. Cash deals, debit orders, joining fees — all calculated automatically.', color: 'from-amber-500 to-orange-500' },
            { title: 'Smart Notifications', desc: 'In-app bell + WhatsApp push for every event. New leads, appointments, stage changes, deal closures — nothing gets missed.', color: 'from-red-500 to-pink-500' },
            { title: 'Multi-Role Access', desc: 'Admin, Sales Manager, Consultant, Assistant, Marketing Agent — each role sees exactly what they need.', color: 'from-purple-500 to-violet-500' }
          ].map((f, i) => (
            <div key={i} className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors group">
              <div className={`w-12 h-1.5 rounded-full bg-gradient-to-r ${f.color} mb-4`} />
              <h3 className="text-xl font-bold text-zinc-100 mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-zinc-800 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-8 py-24">
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-16">How XAC CRM works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Capture', desc: 'Leads flow in from Facebook ads, website forms, WhatsApp, or manual entry.' },
              { step: '02', title: 'Assign', desc: 'Round-robin auto-assigns leads to consultants. No leads fall through the cracks.' },
              { step: '03', title: 'Engage', desc: 'WhatsApp messages, appointments, follow-ups — all tracked in the pipeline.' },
              { step: '04', title: 'Close', desc: 'Record deals, track commissions, generate month-end reports. Done.' }
            ].map((s, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-black text-zinc-800/50 mb-4">{s.step}</div>
                <h3 className="text-lg font-bold text-lime-400 mb-2">{s.title}</h3>
                <p className="text-sm text-zinc-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-8 py-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-black mb-6">Ready to transform your gym sales?</h2>
        <p className="text-zinc-400 mb-10 max-w-lg mx-auto">Join Revival Fitness and other gyms already using XAC CRM to close more deals and grow their membership base.</p>
        <Button
          onClick={() => setShowPortal(true)}
          data-testid="cta-button"
          className="bg-lime-400 text-zinc-950 font-bold px-10 py-6 text-lg rounded-full hover:bg-lime-500 active:scale-95 transition-transform"
        >
          Access Your Portal
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/assets/xac-logo.png" alt="XAC" className="w-6 h-6 object-contain" />
            <span className="text-sm font-bold text-zinc-500">XAC CRM</span>
          </div>
          <p className="text-xs text-zinc-600">Powered by XAC Systems</p>
        </div>
      </footer>

      {/* Company Portal Modal */}
      <Dialog open={showPortal} onOpenChange={setShowPortal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 max-w-md" data-testid="company-portal-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Company Portal</DialogTitle>
          </DialogHeader>
          <div className="text-center mb-4">
            <p className="text-sm text-zinc-400">Enter your company access code to continue</p>
          </div>
          <form onSubmit={handleCompanyLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                value={companyPassword}
                onChange={(e) => { setCompanyPassword(e.target.value); setError(''); }}
                placeholder="Company Code"
                data-testid="company-code-input"
                className="bg-zinc-950 border-zinc-800 text-zinc-50 text-center text-lg tracking-widest"
                autoFocus
              />
              {error && <p className="text-red-400 text-sm text-center" data-testid="company-error">{error}</p>}
            </div>
            <Button
              type="submit"
              data-testid="company-submit-button"
              className="w-full bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500 py-5 text-base"
            >
              Enter Portal
            </Button>
          </form>
          <div className="mt-4 p-4 bg-zinc-950 rounded-lg border border-zinc-800">
            <p className="text-xs text-zinc-500 text-center">Registered companies</p>
            <div className="flex items-center justify-center gap-3 mt-2">
              <img src="/assets/xac-logo.png" alt="XAC" className="w-8 h-8 object-contain opacity-50" />
              <span className="text-sm text-zinc-400">Revival Fitness Centre</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;
