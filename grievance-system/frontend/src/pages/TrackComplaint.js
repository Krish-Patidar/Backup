import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Sidebar from '../components/shared/Sidebar';
import ComplaintCard, { StatusBadge, PriorityBadge } from '../components/shared/ComplaintCard';
import { formatDateTime, CATEGORY_LABELS, getImageUrl, formatCurrency } from '../utils/helpers';

const SIDEBAR_LINKS = [
  { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { path: '/submit-complaint', icon: '📝', label: 'Submit Complaint' },
  { path: '/track', icon: '📍', label: 'Track Complaints' },
  { path: '/credits', icon: '🏆', label: 'My Credits' },
];

const STEPS = ['pending', 'in_progress', 'completed'];

export default function TrackComplaint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    if (id && complaints.length > 0) {
      const found = complaints.find(c => c._id === id);
      if (found) setSelected(found);
    }
  }, [id, complaints]);

  const fetchComplaints = async () => {
    try {
      const { data } = await api.get('/complaints?limit=50');
      setComplaints(data.complaints);
      if (id) {
        const found = data.complaints.find(c => c._id === id);
        if (found) setSelected(found);
        else {
          const res = await api.get(`/complaints/${id}`);
          setSelected(res.data.complaint);
        }
      }
    } catch (err) {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all' ? complaints : complaints.filter(c => c.status === filter);

  const StatusTimeline = ({ status }) => (
    <div className="flex items-center gap-2 my-4">
      {STEPS.map((s, i) => {
        const idx = STEPS.indexOf(status);
        const done = i <= idx && status !== 'rejected';
        return (
          <React.Fragment key={s}>
            <div className={`flex flex-col items-center ${done ? 'opacity-100' : 'opacity-30'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className="text-xs mt-1 capitalize">{s.replace('_', ' ')}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-1 rounded ${i < STEPS.indexOf(status) && status !== 'rejected' ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={SIDEBAR_LINKS} subtitle="Citizen Portal" />

      <main className="flex-1 flex overflow-hidden">
        {/* List */}
        <div className="w-full lg:w-96 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3">My Complaints</h2>
            <div className="flex gap-2 flex-wrap">
              {['all', 'pending', 'in_progress', 'completed'].map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${filter === s ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s === 'all' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              [...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No complaints found</div>
            ) : (
              filtered.map(c => (
                <div key={c._id} onClick={() => setSelected(c)}
                  className={`p-3 rounded-xl cursor-pointer border transition-all ${selected?._id === c._id ? 'border-primary-400 bg-primary-50' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm text-gray-800 truncate">{c.title}</div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{c.complaintNumber} · {CATEGORY_LABELS[c.category]}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="hidden lg:flex flex-1 flex-col overflow-y-auto p-6">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
              <div className="text-6xl">👈</div>
              <p>Select a complaint to view details</p>
            </div>
          ) : (
            <div className="max-w-2xl w-full animate-fadeInUp">
              <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{selected.title}</h1>
                  <p className="text-sm text-primary-600 font-medium">{selected.complaintNumber}</p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge status={selected.status} />
                  <PriorityBadge priority={selected.priority} />
                </div>
              </div>

              <div className="card mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Progress Timeline</h3>
                <StatusTimeline status={selected.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="card">
                  <div className="text-xs text-gray-400 mb-1">Category</div>
                  <div className="font-semibold">{CATEGORY_LABELS[selected.category]}</div>
                </div>
                <div className="card">
                  <div className="text-xs text-gray-400 mb-1">Department</div>
                  <div className="font-semibold">{selected.departmentId?.name || 'Being assigned'}</div>
                </div>
                <div className="card">
                  <div className="text-xs text-gray-400 mb-1">Submitted</div>
                  <div className="font-semibold text-sm">{formatDateTime(selected.createdAt)}</div>
                </div>
                {selected.completedAt && (
                  <div className="card">
                    <div className="text-xs text-gray-400 mb-1">Resolved</div>
                    <div className="font-semibold text-sm">{formatDateTime(selected.completedAt)}</div>
                  </div>
                )}
              </div>

              <div className="card mb-4">
                <div className="text-xs text-gray-400 mb-1">Description</div>
                <p className="text-gray-700 text-sm">{selected.description}</p>
              </div>

              {selected.location?.address && (
                <div className="card mb-4">
                  <div className="text-xs text-gray-400 mb-1">Location</div>
                  <p className="text-gray-700 text-sm">📍 {selected.location.address}</p>
                </div>
              )}

              {selected.image && (
                <div className="card mb-4">
                  <div className="text-xs text-gray-400 mb-2">Submitted Photo</div>
                  <img src={getImageUrl(selected.image)} alt="complaint" className="w-full max-h-56 object-cover rounded-xl" />
                </div>
              )}

              {selected.workerNotes && (
                <div className="card mb-4 border-l-4 border-green-400">
                  <div className="text-xs text-gray-400 mb-1">Resolution Notes</div>
                  <p className="text-gray-700 text-sm">{selected.workerNotes}</p>
                </div>
              )}

              {selected.status === 'completed' && selected.isGenuine && (
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 text-center">
                  <div className="text-3xl mb-1">🏆</div>
                  <p className="text-white font-bold">+10 Credits Awarded!</p>
                  <p className="text-amber-100 text-xs">Thank you for being an active citizen</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
