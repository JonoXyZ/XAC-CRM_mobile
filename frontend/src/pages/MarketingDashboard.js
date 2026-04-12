import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ChartBar, FileText, Image, TrendUp, Globe, Question, ArrowRight } from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MarketingDashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/marketing/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch marketing stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const platformIcon = (p) => {
    const icons = { facebook: 'fb', instagram: 'ig', tiktok: 'tk', website: 'web' };
    return icons[p] || p;
  };

  const platformColor = (p) => {
    const colors = { facebook: 'text-blue-400', instagram: 'text-pink-400', tiktok: 'text-cyan-400', website: 'text-lime-400' };
    return colors[p] || 'text-zinc-400';
  };

  return (
    <Layout user={user}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid="marketing-dashboard-page">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50" data-testid="marketing-dashboard-title">
            Marketing Dashboard
          </h1>
          <p className="mt-2 text-base text-zinc-400">Form performance & lead generation overview</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="overview" data-testid="overview-tab">
              <ChartBar size={20} className="mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="howto" data-testid="howto-tab">
              <Question size={20} className="mr-2" />
              How-To Guide
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading stats...</div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="stat-card" data-testid="total-forms-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs tracking-wider uppercase font-bold text-zinc-500">Total Forms</p>
                    <p className="mt-2 text-3xl font-black text-zinc-50">{stats.total_forms}</p>
                    <p className="text-xs text-zinc-500 mt-1">{stats.active_forms} active</p>
                  </div>
                  <FileText size={32} weight="duotone" className="text-lime-400" />
                </div>
              </Card>

              <Card className="stat-card" data-testid="total-leads-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs tracking-wider uppercase font-bold text-zinc-500">Total Leads</p>
                    <p className="mt-2 text-3xl font-black text-zinc-50">{stats.total_leads}</p>
                    <p className="text-xs text-zinc-500 mt-1">from all forms</p>
                  </div>
                  <TrendUp size={32} weight="duotone" className="text-cyan-500" />
                </div>
              </Card>

              <Card className="stat-card" data-testid="media-count-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs tracking-wider uppercase font-bold text-zinc-500">Media Files</p>
                    <p className="mt-2 text-3xl font-black text-zinc-50">{stats.total_media}</p>
                  </div>
                  <Image size={32} weight="duotone" className="text-amber-500" />
                </div>
              </Card>

              <Card className="stat-card" data-testid="platforms-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs tracking-wider uppercase font-bold text-zinc-500">Platforms</p>
                    <p className="mt-2 text-3xl font-black text-zinc-50">{stats.platform_stats?.length || 0}</p>
                  </div>
                  <Globe size={32} weight="duotone" className="text-emerald-500" />
                </div>
              </Card>
            </div>

            {/* Platform Breakdown */}
            {stats.platform_stats?.length > 0 && (
              <Card className="stat-card p-6" data-testid="platform-breakdown-card">
                <h3 className="text-lg font-bold text-zinc-100 mb-4">Platform Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stats.platform_stats.map(ps => (
                    <div key={ps.platform} className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 text-center">
                      <p className={`text-sm font-bold uppercase ${platformColor(ps.platform)}`}>{ps.platform}</p>
                      <p className="text-2xl font-black text-zinc-50 mt-2">{ps.forms}</p>
                      <p className="text-xs text-zinc-500">forms</p>
                      <p className="text-lg font-bold text-zinc-300 mt-1">{ps.leads}</p>
                      <p className="text-xs text-zinc-500">leads</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Top Performing Forms */}
            <Card className="stat-card p-6" data-testid="top-forms-card">
              <h3 className="text-lg font-bold text-zinc-100 mb-4">Form Performance</h3>
              {stats.top_forms?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900/80 text-zinc-400 font-semibold uppercase text-xs">
                      <tr>
                        <th className="p-3">Form Name</th>
                        <th className="p-3">Platform</th>
                        <th className="p-3">Leads</th>
                        <th className="p-3">Deals</th>
                        <th className="p-3">Conversion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.top_forms.map((f, idx) => (
                        <tr key={f.name || `form-${idx}`} className="border-t border-zinc-800/50 hover:bg-zinc-800/30">
                          <td className="p-3 font-semibold text-zinc-100">{f.name}</td>
                          <td className={`p-3 ${platformColor(f.platform)} font-bold uppercase text-xs`}>{f.platform}</td>
                          <td className="p-3 text-zinc-300">{f.leads}</td>
                          <td className="p-3 text-zinc-300">{f.deals}</td>
                          <td className="p-3">
                            <span className={`font-bold ${f.conversion >= 20 ? 'text-emerald-400' : f.conversion >= 10 ? 'text-amber-400' : 'text-zinc-400'}`}>
                              {f.conversion}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-8 text-zinc-500">No forms created yet. Go to Forms to create your first one!</p>
              )}
            </Card>
          </>
        ) : (
          <div className="text-center py-12 text-zinc-500">Failed to load marketing stats.</div>
        )}
          </TabsContent>

          <TabsContent value="howto" className="space-y-6">
            <Card className="stat-card p-6" data-testid="howto-card">
              <h3 className="text-2xl font-bold text-zinc-100 mb-6">How to Use Marketing Tools</h3>
              
              <div className="space-y-6">
                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lime-400 text-zinc-950 flex items-center justify-center font-bold text-sm">1</div>
                    <div>
                      <h4 className="font-bold text-zinc-100 mb-2">Create a Lead Capture Form</h4>
                      <p className="text-sm text-zinc-400">
                        Go to <strong>Forms</strong> in the sidebar. Click <strong>"Create Form"</strong>. 
                        Give it a name, choose the platform (Facebook, Instagram, TikTok, or Website), 
                        and add your questions (name, phone, email, etc.). Each form gets a unique webhook URL.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lime-400 text-zinc-950 flex items-center justify-center font-bold text-sm">2</div>
                    <div>
                      <h4 className="font-bold text-zinc-100 mb-2">Connect to External Platforms</h4>
                      <p className="text-sm text-zinc-400">
                        Copy the <strong>Webhook URL</strong> shown on each form. Paste it into your Meta Lead Ad, 
                        TikTok Lead Gen, or website contact form as the submission endpoint. When someone fills out 
                        your ad form, the lead automatically appears in the CRM pipeline.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lime-400 text-zinc-950 flex items-center justify-center font-bold text-sm">3</div>
                    <div>
                      <h4 className="font-bold text-zinc-100 mb-2">Webhook Payload Format</h4>
                      <p className="text-sm text-zinc-400 mb-2">
                        Send a POST request with JSON body to the webhook URL. Required fields:
                      </p>
                      <pre className="text-xs bg-zinc-900 p-3 rounded-md border border-zinc-800 text-lime-400 overflow-x-auto">
{`{
  "name": "John",
  "surname": "Doe",
  "email": "john@example.com",
  "phone": "0712345678",
  "answers": { "question1": "answer1" }
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lime-400 text-zinc-950 flex items-center justify-center font-bold text-sm">4</div>
                    <div>
                      <h4 className="font-bold text-zinc-100 mb-2">Upload Media to Gallery</h4>
                      <p className="text-sm text-zinc-400">
                        Go to <strong>Gallery</strong> to upload images and videos for your marketing campaigns. 
                        You can attach media to forms during creation. Supported formats: JPG, PNG, MP4, etc.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lime-400 text-zinc-950 flex items-center justify-center font-bold text-sm">5</div>
                    <div>
                      <h4 className="font-bold text-zinc-100 mb-2">Monitor Performance</h4>
                      <p className="text-sm text-zinc-400">
                        Track leads, deals, and conversion rates per form on this dashboard. 
                        The <strong>Form Performance</strong> table shows which forms are converting best 
                        so you can optimize your ad spend.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default MarketingDashboard;
