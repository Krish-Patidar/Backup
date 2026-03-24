import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import StatCard from '../components/shared/StatCard';
import ComplaintCard from '../components/shared/ComplaintCard';
import { formatDate, CATEGORY_LABELS } from '../utils/helpers';

const SIDEBAR_LINKS = [
  { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { path: '/submit-complaint', icon: '📝', label: 'Submit Complaint' },
  { path: '/track', icon: '📍', label: 'Track Complaints' },
  { path: '/credits', icon: '🏆', label: 'My Credits' },
];

export default function CitizenDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, complaintsRes] = await Promise.all([
        api.get('/complaints/stats'),
        api.get('/complaints?limit=5'),
      ]);
      setStats(statsRes.data.stats);
      setComplaints(complaintsRes.data.complaints);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={SIDEBAR_LINKS} subtitle="Citizen Portal" />

      <main className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Good {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'}, {user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">Here's an overview of your complaints</p>
          </div>
          <button onClick={() => navigate('/submit-complaint')} className="btn-primary flex items-center gap-2">
            <span>📝</span> New Complaint
          </button>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon="📋" label="Total Complaints" value={stats?.total || 0} color="blue" />
            <StatCard icon="⏳" label="Pending" value={stats?.pending || 0} color="orange" />
            <StatCard icon="🔄" label="In Progress" value={stats?.inProgress || 0} color="purple" />
            <StatCard icon="✅" label="Resolved" value={stats?.completed || 0} color="green" />
          </div>
        )}

        {/* Credits Banner */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-5 mb-8 flex items-center justify-between shadow-md">
          <div>
            <div className="text-white font-bold text-lg">🏆 Your Credit Points</div>
            <div className="text-amber-100 text-sm mt-1">Earn 10 credits per resolved complaint</div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black text-white">{stats?.credits || user?.credits || 0}</div>
            <button onClick={() => navigate('/credits')} className="text-amber-900 text-xs bg-white/80 rounded-lg px-3 py-1 mt-1 hover:bg-white transition">
              View Details →
            </button>
          </div>
        </div>

        {/* Recent Complaints */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Recent Complaints</h2>
          <button onClick={() => navigate('/track')} className="text-primary-600 text-sm hover:underline">View All →</button>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
        ) : complaints.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-gray-600">No complaints yet</h3>
            <p className="text-gray-400 text-sm mt-1 mb-4">Submit your first complaint to get started</p>
            <button onClick={() => navigate('/submit-complaint')} className="btn-primary">
              📝 Submit Complaint
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map(c => (
              <ComplaintCard key={c._id} complaint={c} onClick={() => navigate(`/track/${c._id}`)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
