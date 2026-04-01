import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Upload, Trash, Image, VideoCamera, File, MagnifyingGlass } from '@phosphor-icons/react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Gallery = ({ user }) => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [filter, setFilter] = useState('all');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/gallery`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMedia(res.data);
    } catch (error) {
      console.error('Failed to fetch gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    let uploaded = 0;

    for (const file of files) {
      try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);
        await axios.post(`${API_URL}/api/gallery/upload`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
        uploaded++;
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (uploaded > 0) {
      toast.success(`${uploaded} file${uploaded > 1 ? 's' : ''} uploaded`);
      fetchMedia();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (mediaId) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/gallery/${mediaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('File deleted');
      fetchMedia();
    } catch {
      toast.error('Failed to delete file');
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (contentType) => {
    if (contentType?.startsWith('image/')) return <Image size={32} weight="duotone" className="text-lime-400" />;
    if (contentType?.startsWith('video/')) return <VideoCamera size={32} weight="duotone" className="text-cyan-400" />;
    return <File size={32} weight="duotone" className="text-zinc-400" />;
  };

  const filtered = media.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'images') return m.content_type?.startsWith('image/');
    if (filter === 'videos') return m.content_type?.startsWith('video/');
    return true;
  });

  return (
    <Layout user={user}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid="gallery-page">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50" data-testid="gallery-title">
              Media Gallery
            </h1>
            <p className="mt-2 text-base text-zinc-400">Upload and manage images & videos for forms</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUpload}
              multiple
              accept="image/*,video/*"
              className="hidden"
              data-testid="gallery-file-input"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              data-testid="upload-media-button"
              className="bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500 flex items-center gap-2"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-zinc-950 border-t-transparent"></div>
              ) : (
                <Upload size={20} weight="bold" />
              )}
              {uploading ? 'Uploading...' : 'Upload Files'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'images', 'videos'].map(f => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              data-testid={`filter-${f}`}
              className={`text-sm px-4 py-2 ${filter === f ? 'bg-lime-400 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
          <span className="ml-auto text-sm text-zinc-500 self-center">{filtered.length} files</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading gallery...</div>
        ) : filtered.length === 0 ? (
          <Card className="stat-card p-12 text-center">
            <Upload size={48} className="mx-auto text-zinc-700 mb-4" />
            <p className="text-zinc-500 text-lg">No media files yet. Upload your first image or video!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map(m => (
              <div key={m.id} className="group relative" data-testid={`media-item-${m.id}`}>
                <div
                  className="aspect-square rounded-lg overflow-hidden border border-zinc-800 cursor-pointer hover:border-zinc-600 transition bg-zinc-900"
                  onClick={() => setPreviewMedia(m)}
                >
                  {m.content_type?.startsWith('image/') ? (
                    <img src={`${API_URL}${m.url}`} alt={m.original_name} className="w-full h-full object-cover" loading="lazy" />
                  ) : m.content_type?.startsWith('video/') ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800">
                      <VideoCamera size={40} weight="duotone" className="text-cyan-400" />
                      <p className="text-xs text-zinc-400 mt-2 px-2 truncate w-full text-center">{m.original_name}</p>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800">
                      <File size={40} weight="duotone" className="text-zinc-500" />
                      <p className="text-xs text-zinc-400 mt-2 px-2 truncate w-full text-center">{m.original_name}</p>
                    </div>
                  )}
                </div>
                <div className="mt-1">
                  <p className="text-xs text-zinc-300 truncate">{m.original_name}</p>
                  <p className="text-xs text-zinc-500">{formatSize(m.size)}</p>
                </div>
                <Button
                  onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                  data-testid={`delete-media-${m.id}`}
                  className="absolute top-2 right-2 p-1.5 bg-red-900/80 hover:bg-red-800 text-red-100 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        <Dialog open={!!previewMedia} onOpenChange={() => setPreviewMedia(null)}>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 max-w-3xl" data-testid="media-preview-modal">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-zinc-50 truncate">{previewMedia?.original_name}</DialogTitle>
            </DialogHeader>
            {previewMedia && (
              <div className="space-y-3">
                {previewMedia.content_type?.startsWith('image/') ? (
                  <img src={`${API_URL}${previewMedia.url}`} alt={previewMedia.original_name} className="w-full rounded-lg max-h-[60vh] object-contain" />
                ) : previewMedia.content_type?.startsWith('video/') ? (
                  <video src={`${API_URL}${previewMedia.url}`} controls className="w-full rounded-lg max-h-[60vh]" />
                ) : (
                  <div className="p-8 text-center text-zinc-400">Preview not available for this file type</div>
                )}
                <div className="flex items-center justify-between text-sm text-zinc-400">
                  <span>Size: {formatSize(previewMedia.size)}</span>
                  <span>Uploaded by: {previewMedia.uploaded_by_name}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Gallery;
