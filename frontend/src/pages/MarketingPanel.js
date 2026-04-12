import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Megaphone, Link, ChartBar, Lightning, Copy, ArrowSquareOut, Spinner
} from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MarketingPanel = ({ user }) => {
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [landingPages, setLandingPages] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [businessType, setBusinessType] = useState('gym');
  const [businessName, setBusinessName] = useState('Revival Fitness Centre');

  const fetchWebhookLogs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/webhook-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWebhookLogs(res.data || []);
    } catch (error) {
      console.error('Failed to fetch webhook logs:', error);
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchWebhookLogs();
    const saved = localStorage.getItem('xac_landing_pages');
    if (saved) {
      try { setLandingPages(JSON.parse(saved)); }
      catch (error) { console.error('Failed to parse saved landing pages:', error); }
    }
  }, [fetchWebhookLogs]);

  const generateLandingPages = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/ai/landing-pages`, {
        business_type: businessType,
        business_name: businessName
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (res.data?.pages) {
        setLandingPages(res.data.pages);
        localStorage.setItem('xac_landing_pages', JSON.stringify(res.data.pages));
        toast.success('Landing pages generated!');
      }
    } catch (error) {
      console.error('AI landing pages endpoint unavailable, using templates:', error);
      // Fallback - generate locally if AI endpoint not available
      const templates = [
        { title: `${businessName} - Transform Your Body`, slug: 'transform', hook: 'Start your fitness journey today. First session FREE!', cta: 'Claim Free Session' },
        { title: `${businessName} - Summer Ready Program`, slug: 'summer', hook: 'Get beach-body ready in 12 weeks. Limited spots available.', cta: 'Reserve Your Spot' },
        { title: `${businessName} - Personal Training`, slug: 'pt', hook: 'Expert 1-on-1 coaching tailored to your goals.', cta: 'Book Consultation' },
        { title: `${businessName} - Family Fitness`, slug: 'family', hook: 'Bring the whole family. Group rates now available!', cta: 'Get Family Rate' },
        { title: `${businessName} - Corporate Wellness`, slug: 'corporate', hook: 'Boost team productivity with corporate gym packages.', cta: 'Get Corporate Quote' },
        { title: `${businessName} - New Year Challenge`, slug: 'challenge', hook: 'Join our 30-day transformation challenge. Cash prizes!', cta: 'Join Challenge' },
      ];
      setLandingPages(templates);
      localStorage.setItem('xac_landing_pages', JSON.stringify(templates));
      toast.success('Landing page templates generated!');
    } finally {
      setGenerating(false);
    }
  };

  const webhookUrl = `${API_URL}/api/webhooks/meta`;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Layout user={user}>
      <div className="p-4 sm:p-6 lg:p-8" data-testid="marketing-panel-page">
        <div className="mb-6">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50" data-testid="marketing-panel-title">
            Marketing Manager
          </h1>
          <p className="mt-2 text-base text-zinc-400">Ad campaigns & landing page management</p>
        </div>

        <Tabs defaultValue="ad_manager" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
            <TabsTrigger value="ad_manager" data-testid="tab-ad-manager" className="data-[state=active]:bg-lime-400 data-[state=active]:text-zinc-950 font-bold">
              Ad Manager
            </TabsTrigger>
            <TabsTrigger value="landing_hooks" data-testid="tab-landing-hooks" className="data-[state=active]:bg-lime-400 data-[state=active]:text-zinc-950 font-bold">
              Landing Hooks
            </TabsTrigger>
          </TabsList>

          {/* Ad Manager Tab */}
          <TabsContent value="ad_manager">
            <div className="space-y-4">
              {/* Meta Webhook Info */}
              <Card className="stat-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Megaphone size={24} className="text-lime-400" />
                  <h3 className="text-lg font-bold text-zinc-100">Meta Lead Ads Webhook</h3>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">ACTIVE</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-950 p-3 rounded-md border border-zinc-800">
                  <code className="text-sm text-cyan-400 flex-1 break-all" data-testid="webhook-url">{webhookUrl}</code>
                  <Button
                    onClick={() => copyToClipboard(webhookUrl)}
                    data-testid="copy-webhook-url"
                    className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700 px-3"
                  >
                    <Copy size={16} />
                  </Button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  This endpoint receives leads from your Facebook/Meta Ad campaigns automatically.
                </p>
              </Card>

              {/* Ad Performance Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="stat-card p-5">
                  <p className="text-xs uppercase font-bold text-zinc-500 mb-1">Total Meta Leads</p>
                  <p className="text-3xl font-black text-zinc-100" data-testid="meta-leads-count">
                    {webhookLogs.length}
                  </p>
                </Card>
                <Card className="stat-card p-5">
                  <p className="text-xs uppercase font-bold text-zinc-500 mb-1">This Month</p>
                  <p className="text-3xl font-black text-zinc-100">
                    {webhookLogs.filter(l => {
                      const d = new Date(l.received_at);
                      const now = new Date();
                      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                </Card>
                <Card className="stat-card p-5">
                  <p className="text-xs uppercase font-bold text-zinc-500 mb-1">Today</p>
                  <p className="text-3xl font-black text-zinc-100">
                    {webhookLogs.filter(l => {
                      const d = new Date(l.received_at);
                      const now = new Date();
                      return d.toDateString() === now.toDateString();
                    }).length}
                  </p>
                </Card>
              </div>

              {/* Recent Webhook Logs */}
              <Card className="stat-card p-5">
                <h3 className="text-lg font-bold text-zinc-100 mb-3">Recent Ad Leads</h3>
                {loading ? (
                  <p className="text-zinc-400 text-center py-4">Loading...</p>
                ) : webhookLogs.length === 0 ? (
                  <p className="text-zinc-500 text-center py-4">No Meta leads captured yet. Configure your Facebook Lead Ads to point to the webhook URL above.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {webhookLogs.slice(0, 20).map((log, idx) => (
                      <div key={log.id || `log-${idx}`} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-md" data-testid={`webhook-log-${idx}`}>
                        <div>
                          <p className="text-sm font-semibold text-zinc-200">{log.lead_name || 'Lead'}</p>
                          <p className="text-xs text-zinc-500">{new Date(log.received_at).toLocaleString()}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${log.status === 'processed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {log.status || 'received'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Landing Hooks Tab */}
          <TabsContent value="landing_hooks">
            <div className="space-y-4">
              <Card className="stat-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Link size={24} className="text-cyan-400" />
                  <h3 className="text-lg font-bold text-zinc-100">Landing Page Generator</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-4">
                  Generate 6 SEO-optimized landing page concepts with hooks and CTAs for lead capture.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Business Name</Label>
                    <Input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      data-testid="business-name-input"
                      className="bg-zinc-950 border-zinc-800 text-zinc-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Business Type</Label>
                    <Input
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      data-testid="business-type-input"
                      className="bg-zinc-950 border-zinc-800 text-zinc-50"
                    />
                  </div>
                </div>
                <Button
                  onClick={generateLandingPages}
                  disabled={generating}
                  data-testid="generate-landing-pages-btn"
                  className="bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500 flex items-center gap-2"
                >
                  {generating ? <Spinner size={16} className="animate-spin" /> : <Lightning size={16} weight="bold" />}
                  {generating ? 'Generating...' : 'Generate 6 Landing Pages'}
                </Button>
              </Card>

              {/* Generated Landing Pages */}
              {landingPages.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {landingPages.map((page, idx) => (
                    <Card key={page.slug || `page-${idx}`} className="stat-card p-5 hover:border-lime-400/30 transition-colors" data-testid={`landing-page-${idx}`}>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded-full">
                            Page {idx + 1}
                          </span>
                          <Button
                            onClick={() => copyToClipboard(`${page.title}\n\n${page.hook}\n\nCTA: ${page.cta}\n\nWebhook: ${webhookUrl}`)}
                            className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700 p-1 h-7 w-7"
                            title="Copy page details"
                          >
                            <Copy size={14} />
                          </Button>
                        </div>
                        <h4 className="font-bold text-zinc-100 text-sm leading-tight">{page.title}</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">{page.hook}</p>
                        <div className="pt-2 border-t border-zinc-800">
                          <span className="text-xs font-bold text-lime-400">CTA: {page.cta}</span>
                        </div>
                        <div className="text-xs text-zinc-600">
                          Slug: /{page.slug}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default MarketingPanel;
