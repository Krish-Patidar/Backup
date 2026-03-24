import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import StatCard from '../components/shared/StatCard';
import { StatusBadge, PriorityBadge } from '../components/shared/ComplaintCard';
import { formatDateTime, CATEGORY_LABELS, getImageUrl, formatCurrency } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SIDEBAR_LINKS = [
  { path: '/department', icon: '🏢', label: 'Dashboard' },
];

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444'];

export default function DepartmentDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [filter, setFilter] = useState('all');
  const [updateForm, setUpdateForm] = useState({ status: '', assignedTo: '', expense: '', adminNotes: '' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [cRes, aRes, wRes] = await Promise.all([
        api.get('/complaints?limit=100'),
        api.get(`/departments/${user.departmentId}/analytics`),
        api.get(`/departments/${user.departmentId}/workers`),
      ]);
      setComplaints(cRes.data.complaints);
      setAnalytics(aRes.data.analytics);
      setWorkers(wRes.data.workers);
    } catch (err) {
      toast.error('Failed to load data');
    } finally { setLoading(false); }
  };

  const selectComplaint = (c) => {
    setSelected(c);
    setUpdateForm({ status: c.status, assignedTo: c.assignedTo?._id || '', expense: c.expense || '', adminNotes: c.adminNotes || '' });
  };

  const updateComplaint = async () => {
    setUpdating(true);
    try {
      const { data } = await api.put(`/complaints/${selected._id}`, updateForm);
      toast.success('Complaint updated!');
      setSelected(data.complaint);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setUpdating(false); }
  };

  const filtered = filter === 'all' ? complaints : complaints.filter(c => c.status === filter);

  const pieData = analytics ? [
    { name: 'Pending', value: analytics.byStatus.pending || 0 },
    { name: 'In Progress', value: analytics.byStatus.in_progress || 0 },
    { name: 'Completed', value: analytics.byStatus.completed || 0 },
    { name: 'Rejected', value: analytics.byStatus.rejected || 0 },
  ] : [];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={SIDEBAR_LINKS} subtitle="Department Admin" />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🏢 Department Dashboard</h1>
          <p className="text-gray-500 text-sm">Manage complaints assigned to your department</p>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon="📋" label="Total" value={analytics?.total || 0} color="blue" />
            <StatCard icon="⏳" label="Pending" value={analytics?.byStatus?.pending || 0} color="orange" />
            <StatCard icon="✅" label="Resolved" value={analytics?.byStatus?.completed || 0} color="green" />
            <StatCard icon="💰" label="Total Expense" value={formatCurrency(analytics?.totalExpense)} color="purple" />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Complaints list */}
          <div className="lg:col-span-1 card p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="font-bold text-gray-800 mb-3">Complaints</div>
              <div className="flex gap-1 flex-wrap">
                {['all', 'pending', 'in_progress', 'completed'].map(s => (
                  <button key={s} onClick={() => setFilter(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${filter === s ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto max-h-[500px]">
              {filtered.map(c => (
                <div key={c._id} onClick={() => selectComplaint(c)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${selected?._id === c._id ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-800 truncate">{c.title}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-xs text-gray-400 flex gap-2">
                    <span>{c.complaintNumber}</span>
                    <span>·</span>
                    <PriorityBadge priority={c.priority} />
                  </div>
                  {c.assignedTo && <div className="text-xs text-blue-600 mt-1">👷 {c.assignedTo.name}</div>}
                </div>
              ))}
              {filtered.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No complaints</div>}
            </div>
          </div>

          {/* Detail + Update panel */}
          <div className="lg:col-span-2 space-y-4">
            {!selected ? (
              <div className="card flex items-center justify-center h-64 text-gray-400 flex-col gap-3">
                <div className="text-5xl">📋</div>
                <p>Select a complaint to manage</p>
              </div>
            ) : (
              <>
                <div className="card">
                  <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
                    <div>
                      <h2 className="font-bold text-gray-800">{selected.title}</h2>
                      <p className="text-sm text-primary-600">{selected.complaintNumber}</p>
                    </div>
                    <div className="flex gap-2">
                      <StatusBadge status={selected.status} />
                      <PriorityBadge priority={selected.priority} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{selected.description}</p>
                  {selected.location?.address && <p className="text-xs text-gray-400 mb-3">📍 {selected.location.address}</p>}
                  {selected.image && <img src={getImageUrl(selected.image)} alt="" className="w-full h-40 object-cover rounded-xl" />}
                  <div className="mt-3 text-xs text-gray-400">
                    By: {selected.citizenId?.name} · {formatDateTime(selected.createdAt)}
                  </div>
                </div>

                {/* Update form */}
                <div className="card">
                  <h3 className="font-bold text-gray-800 mb-4">⚙️ Update Complaint</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                      <select className="input-field" value={updateForm.status}
                        onChange={e => setUpdateForm({ ...updateForm, status: e.target.value })}>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Assign Worker</label>
                      <select className="input-field" value={updateForm.assignedTo}
                        onChange={e => setUpdateForm({ ...updateForm, assignedTo: e.target.value })}>
                        <option value="">— Unassigned —</option>
                        {workers.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Expense (₹)</label>
                      <input type="number" className="input-field" placeholder="0"
                        value={updateForm.expense} onChange={e => setUpdateForm({ ...updateForm, expense: e.target.value })} />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Admin Notes</label>
                    <textarea className="input-field resize-none" rows={3} placeholder="Internal notes..."
                      value={updateForm.adminNotes} onChange={e => setUpdateForm({ ...updateForm, adminNotes: e.target.value })} />
                  </div>
                  <button onClick={updateComplaint} disabled={updating} className="btn-primary w-full">
                    {updating ? '⏳ Updating...' : '💾 Save Changes'}
                  </button>
                </div>
              </>
            )}

            {/* Analytics chart */}
            {analytics && (
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-4">📊 Status Distribution</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
