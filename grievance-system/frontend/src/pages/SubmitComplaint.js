import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Sidebar from '../components/shared/Sidebar';

const SIDEBAR_LINKS = [
  { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { path: '/submit-complaint', icon: '📝', label: 'Submit Complaint' },
  { path: '/track', icon: '📍', label: 'Track Complaints' },
  { path: '/credits', icon: '🏆', label: 'My Credits' },
];

export default function SubmitComplaint() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [form, setForm] = useState({ title: '', description: '', address: '', lat: '', lng: '' });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm(f => ({ ...f, lat: latitude.toFixed(6), lng: longitude.toFixed(6) }));
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          setForm(f => ({ ...f, address: data.display_name || `${latitude}, ${longitude}` }));
          toast.success('Location detected!');
        } catch {
          setForm(f => ({ ...f, address: `${latitude}, ${longitude}` }));
        }
        setLocating(false);
      },
      () => { toast.error('Could not get location'); setLocating(false); }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) return toast.error('Title and description are required');
    setLoading(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => v && formData.append(k, v));
      if (image) formData.append('image', image);

      const { data } = await api.post('/complaints', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setAiResult({ category: data.complaint.category, priority: data.complaint.priority });
      toast.success(`Complaint submitted! ID: ${data.complaint.complaintNumber}`);

      setTimeout(() => navigate('/dashboard'), 2500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (aiResult) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar links={SIDEBAR_LINKS} subtitle="Citizen Portal" />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="card text-center max-w-md w-full animate-fadeInUp">
            <div className="text-7xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Complaint Submitted!</h2>
            <p className="text-gray-500 mb-6">AI has classified your complaint:</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="text-2xl mb-1">🏷️</div>
                <div className="text-xs text-gray-500">Category</div>
                <div className="font-bold text-blue-700 capitalize">{aiResult.category}</div>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <div className="text-2xl mb-1">⚡</div>
                <div className="text-xs text-gray-500">Priority</div>
                <div className="font-bold text-red-700 capitalize">{aiResult.priority}</div>
              </div>
            </div>
            <div className="text-sm text-gray-400">Redirecting to dashboard...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={SIDEBAR_LINKS} subtitle="Citizen Portal" />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">📝 Submit a Complaint</h1>
            <p className="text-gray-500 text-sm mt-1">AI will auto-classify and route to the right department</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="card">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Complaint Title *</label>
              <input className="input-field" placeholder="e.g., Deep pothole on MG Road near bus stop"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>

            {/* Description */}
            <div className="card">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
              <textarea className="input-field resize-none" rows={5}
                placeholder="Describe the issue in detail. Include what, when, and how severe it is..."
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
              <p className="text-xs text-gray-400 mt-1">The more detail you provide, the better AI can classify it</p>
            </div>

            {/* Location */}
            <div className="card">
              <label className="block text-sm font-semibold text-gray-700 mb-2">📍 Location</label>
              <div className="flex gap-2 mb-3">
                <input className="input-field flex-1" placeholder="Address or landmark"
                  value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                <button type="button" onClick={detectLocation} disabled={locating}
                  className="btn-secondary flex-shrink-0 flex items-center gap-2">
                  {locating ? '⏳' : '🎯'} {locating ? 'Detecting...' : 'Auto'}
                </button>
              </div>
              {form.lat && form.lng && (
                <div className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                  ✅ GPS: {form.lat}, {form.lng}
                </div>
              )}
            </div>

            {/* Image Upload */}
            <div className="card">
              <label className="block text-sm font-semibold text-gray-700 mb-2">📷 Photo (optional)</label>
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                  <button type="button" onClick={() => { setImage(null); setPreview(null); }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600">
                    ✕
                  </button>
                </div>
              ) : (
                <div onClick={() => fileRef.current.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all">
                  <div className="text-4xl mb-2">📸</div>
                  <p className="text-gray-500 text-sm">Click to upload a photo</p>
                  <p className="text-gray-400 text-xs mt-1">JPG, PNG, WebP up to 5MB</p>
                </div>
              )}
              <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImageChange} />
            </div>

            {/* AI Notice */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <p className="text-sm font-semibold text-indigo-800">AI-Powered Classification</p>
                <p className="text-xs text-indigo-600 mt-0.5">Your complaint will be automatically categorized and assigned to the relevant government department.</p>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
              {loading ? '⏳ Submitting & Analyzing...' : '🚀 Submit Complaint'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
