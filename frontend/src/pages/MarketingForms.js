import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import AIWritingAssistant from '../components/AIWritingAssistant';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, PencilSimple, Trash, Copy, Link, CaretDown, CaretUp, Robot, Image } from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PLATFORMS = [
  { value: 'facebook', label: 'Facebook', color: 'bg-blue-500' },
  { value: 'instagram', label: 'Instagram', color: 'bg-pink-500' },
  { value: 'tiktok', label: 'TikTok', color: 'bg-cyan-500' },
  { value: 'website', label: 'Website', color: 'bg-lime-500' },
  { value: 'other', label: 'Other', color: 'bg-zinc-500' }
];

const ANSWER_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'number', label: 'Number' }
];

const MarketingForms = ({ user }) => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    headline: '',
    description: '',
    platform: 'website',
    questions: [{ question: '', answer_type: 'text', options: [] }],
    media_ids: [],
    active: true
  });
  const [expandedForm, setExpandedForm] = useState(null);

  useEffect(() => {
    fetchForms();
    fetchGallery();
  }, []);

  const fetchForms = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/forms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setForms(res.data);
    } catch (error) {
      console.error('Failed to fetch forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGallery = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/gallery`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGallery(res.data);
    } catch { /* ignore */ }
  };

  const openCreateForm = () => {
    setEditingForm(null);
    setFormData({
      name: '', headline: '', description: '', platform: 'website',
      questions: [{ question: '', answer_type: 'text', options: [] }],
      media_ids: [], active: true
    });
    setShowFormModal(true);
  };

  const openEditForm = (form) => {
    setEditingForm(form);
    setFormData({
      name: form.name,
      headline: form.headline || '',
      description: form.description || '',
      platform: form.platform,
      questions: form.questions?.length ? form.questions : [{ question: '', answer_type: 'text', options: [] }],
      media_ids: form.media_ids || [],
      active: form.active
    });
    setShowFormModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (editingForm) {
        await axios.put(`${API_URL}/api/forms/${editingForm.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Form updated successfully');
      } else {
        await axios.post(`${API_URL}/api/forms`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Form created successfully');
      }
      setShowFormModal(false);
      fetchForms();
    } catch (error) {
      toast.error('Failed to save form');
    }
  };

  const handleDeleteForm = async (formId) => {
    if (!window.confirm('Delete this form? This cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/forms/${formId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Form deleted');
      fetchForms();
    } catch {
      toast.error('Failed to delete form');
    }
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, { question: '', answer_type: 'text', options: [] }]
    });
  };

  const updateQuestion = (idx, field, value) => {
    const updated = [...formData.questions];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormData({ ...formData, questions: updated });
  };

  const removeQuestion = (idx) => {
    setFormData({ ...formData, questions: formData.questions.filter((_, i) => i !== idx) });
  };

  const copyWebhookUrl = (url) => {
    navigator.clipboard.writeText(`${window.location.origin}${url}`);
    toast.success('Webhook URL copied!');
  };

  const toggleMediaSelection = (mediaId) => {
    const ids = formData.media_ids || [];
    if (ids.includes(mediaId)) {
      setFormData({ ...formData, media_ids: ids.filter(id => id !== mediaId) });
    } else {
      setFormData({ ...formData, media_ids: [...ids, mediaId] });
    }
  };

  const getPlatformInfo = (platform) => PLATFORMS.find(p => p.value === platform) || PLATFORMS[4];

  return (
    <Layout user={user}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid="marketing-forms-page">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50" data-testid="forms-title">
              Forms
            </h1>
            <p className="mt-2 text-base text-zinc-400">Create and manage lead capture forms</p>
          </div>
          <Button
            onClick={openCreateForm}
            data-testid="create-form-button"
            className="bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500 flex items-center gap-2"
          >
            <Plus size={20} weight="bold" />
            Create Form
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading forms...</div>
        ) : forms.length === 0 ? (
          <Card className="stat-card p-12 text-center">
            <p className="text-zinc-500 text-lg">No forms yet. Create your first form to start capturing leads!</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {forms.map(form => {
              const pInfo = getPlatformInfo(form.platform);
              const isExpanded = expandedForm === form.id;
              return (
                <Card key={form.id} className="stat-card overflow-hidden" data-testid={`form-card-${form.id}`}>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-2 h-12 rounded-full ${pInfo.color} shrink-0`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-zinc-100">{form.name}</h3>
                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${pInfo.color} text-white`}>
                              {form.platform}
                            </span>
                            {!form.active && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-300">Inactive</span>
                            )}
                          </div>
                          {form.headline && <p className="text-sm text-zinc-400 mt-1">{form.headline}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button onClick={() => openEditForm(form)} data-testid={`edit-form-${form.id}`} className="p-2 bg-zinc-800 hover:bg-zinc-700">
                          <PencilSimple size={16} />
                        </Button>
                        <Button onClick={() => handleDeleteForm(form.id)} data-testid={`delete-form-${form.id}`} className="p-2 bg-red-900 hover:bg-red-800 text-red-100">
                          <Trash size={16} />
                        </Button>
                        <Button onClick={() => setExpandedForm(isExpanded ? null : form.id)} className="p-2 bg-zinc-800 hover:bg-zinc-700">
                          {isExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
                        </Button>
                      </div>
                    </div>

                    {/* Performance Summary */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-center">
                        <p className="text-2xl font-black text-lime-400">{form.performance?.total_leads || 0}</p>
                        <p className="text-xs text-zinc-500">Leads</p>
                      </div>
                      <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-center">
                        <p className="text-2xl font-black text-cyan-400">{form.performance?.deals || 0}</p>
                        <p className="text-xs text-zinc-500">Deals</p>
                      </div>
                      <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-center">
                        <p className={`text-2xl font-black ${(form.performance?.conversion_rate || 0) >= 20 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                          {form.performance?.conversion_rate || 0}%
                        </p>
                        <p className="text-xs text-zinc-500">Conversion</p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-zinc-800 pt-4 space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-zinc-950 rounded-md border border-zinc-800">
                        <Link size={16} className="text-lime-400 shrink-0" />
                        <code className="text-xs text-zinc-300 truncate flex-1">{window.location.origin}{form.webhook_url}</code>
                        <Button onClick={() => copyWebhookUrl(form.webhook_url)} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 shrink-0" data-testid={`copy-webhook-${form.id}`}>
                          <Copy size={14} />
                        </Button>
                      </div>
                      {form.questions?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-zinc-500 uppercase mb-2">Questions ({form.questions.length})</p>
                          <div className="space-y-1">
                            {form.questions.map((q, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="text-zinc-500 w-5">{idx + 1}.</span>
                                <span className="text-zinc-300">{q.question}</span>
                                <span className="text-xs px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 ml-auto">{q.answer_type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {form.description && (
                        <p className="text-sm text-zinc-400">{form.description}</p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Create/Edit Form Modal */}
        <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="form-modal">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-zinc-50">
                {editingForm ? 'Edit Form' : 'Create Form'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitForm} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Form Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="form-name-input"
                    className="bg-zinc-950 border-zinc-800 text-zinc-50"
                    placeholder="e.g., Summer Promo"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Platform</Label>
                  <Select value={formData.platform} onValueChange={(v) => setFormData({ ...formData, platform: v })}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-50" data-testid="form-platform-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {PLATFORMS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Headline</Label>
                  <Button type="button" onClick={() => setShowAIAssistant(true)} className="text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 px-2 py-1 flex items-center gap-1">
                    <Robot size={12} /> AI Assist
                  </Button>
                </div>
                <Input
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  data-testid="form-headline-input"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50"
                  placeholder="e.g., Join Revival Fitness Today!"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Description</Label>
                  <Button type="button" onClick={() => setShowAIAssistant(true)} className="text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 px-2 py-1 flex items-center gap-1">
                    <Robot size={12} /> AI Assist
                  </Button>
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="form-description-input"
                  className="w-full min-h-[80px] bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-50"
                  placeholder="Describe the promotion or form purpose..."
                />
              </div>

              {/* Questions Builder */}
              <div className="space-y-3">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Questions</Label>
                {formData.questions.map((q, idx) => (
                  <div key={idx} className="p-3 bg-zinc-950 rounded-md border border-zinc-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 w-5">{idx + 1}.</span>
                      <Input
                        value={q.question}
                        onChange={(e) => updateQuestion(idx, 'question', e.target.value)}
                        placeholder="Enter question..."
                        data-testid={`question-${idx}-input`}
                        className="bg-zinc-900 border-zinc-700 text-zinc-50 flex-1"
                      />
                      <Select value={q.answer_type} onValueChange={(v) => updateQuestion(idx, 'answer_type', v)}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-50 w-36" data-testid={`question-${idx}-type`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          {ANSWER_TYPES.map(at => (
                            <SelectItem key={at.value} value={at.value}>{at.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.questions.length > 1 && (
                        <Button type="button" onClick={() => removeQuestion(idx)} className="p-1.5 bg-red-900 hover:bg-red-800 text-red-100">
                          <Trash size={14} />
                        </Button>
                      )}
                    </div>
                    {(q.answer_type === 'dropdown' || q.answer_type === 'radio' || q.answer_type === 'checkbox') && (
                      <div className="ml-7 space-y-1">
                        <p className="text-xs text-zinc-500">Options (comma separated):</p>
                        <Input
                          value={(q.options || []).join(', ')}
                          onChange={(e) => updateQuestion(idx, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          placeholder="Option 1, Option 2, Option 3"
                          data-testid={`question-${idx}-options`}
                          className="bg-zinc-900 border-zinc-700 text-zinc-50"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <Button type="button" onClick={addQuestion} data-testid="add-question-button" className="text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
                  + Add Question
                </Button>
              </div>

              {/* Media from Gallery */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Attached Media</Label>
                  <Button type="button" onClick={() => setShowGalleryPicker(true)} data-testid="attach-media-button" className="text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 px-2 py-1 flex items-center gap-1">
                    <Image size={12} /> Browse Gallery
                  </Button>
                </div>
                {formData.media_ids.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.media_ids.map(mid => {
                      const media = gallery.find(g => g.id === mid);
                      return media ? (
                        <div key={mid} className="relative group">
                          {media.content_type?.startsWith('image/') ? (
                            <img src={`${API_URL}${media.url}`} alt={media.original_name} className="w-16 h-16 object-cover rounded border border-zinc-700" />
                          ) : (
                            <div className="w-16 h-16 bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center text-xs text-zinc-400">{media.original_name?.split('.').pop()}</div>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleMediaSelection(mid)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                          >x</button>
                        </div>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No media attached. Browse the gallery to add images/videos.</p>
                )}
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <Switch checked={formData.active} onCheckedChange={(v) => setFormData({ ...formData, active: v })} data-testid="form-active-toggle" />
                <span className="text-sm text-zinc-300">Form Active</span>
              </div>

              <div className="flex gap-3">
                <Button type="button" onClick={() => setShowFormModal(false)} className="flex-1 bg-zinc-800 text-zinc-50 hover:bg-zinc-700">Cancel</Button>
                <Button type="submit" data-testid="submit-form-button" className="flex-1 bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500">
                  {editingForm ? 'Update Form' : 'Create Form'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Gallery Picker Modal */}
        <Dialog open={showGalleryPicker} onOpenChange={setShowGalleryPicker}>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="gallery-picker-modal">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-zinc-50">Select Media</DialogTitle>
            </DialogHeader>
            {gallery.length === 0 ? (
              <p className="text-center py-8 text-zinc-500">No media in gallery. Upload files in the Gallery page first.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {gallery.map(m => {
                  const isSelected = (formData.media_ids || []).includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMediaSelection(m.id)}
                      className={`relative rounded-lg overflow-hidden border-2 transition ${isSelected ? 'border-lime-400' : 'border-zinc-700 hover:border-zinc-500'}`}
                      data-testid={`gallery-pick-${m.id}`}
                    >
                      {m.content_type?.startsWith('image/') ? (
                        <img src={`${API_URL}${m.url}`} alt={m.original_name} className="w-full h-24 object-cover" />
                      ) : (
                        <div className="w-full h-24 bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">{m.original_name}</div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-lime-400/20 flex items-center justify-center">
                          <div className="w-6 h-6 bg-lime-400 rounded-full flex items-center justify-center text-zinc-950 font-bold text-xs">✓</div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <Button onClick={() => setShowGalleryPicker(false)} className="w-full bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500 mt-4">
              Done
            </Button>
          </DialogContent>
        </Dialog>

        {/* AI Writing Assistant */}
        {showAIAssistant && (
          <AIWritingAssistant
            onClose={() => setShowAIAssistant(false)}
            onUseMessage={(text) => {
              if (!formData.headline) {
                setFormData({ ...formData, headline: text });
              } else {
                setFormData({ ...formData, description: text });
              }
              setShowAIAssistant(false);
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default MarketingForms;
