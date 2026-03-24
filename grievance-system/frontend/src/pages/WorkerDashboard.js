import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/shared/Sidebar';
import { StatusBadge, PriorityBadge } from '../components/shared/ComplaintCard';
import { formatDateTime, CATEGORY_LABELS, getImageUrl } from '../utils/helpers';

const SIDEBAR_LINKS = [{ path: '/worker', icon: '👷', label: 'My Tasks' }];

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ status: '', workerNotes: '' });
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try {
      const { data } = await api.get('/workers/tasks');
      setTasks(data.complaints);
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally { setLoading(false); }
  };

  const selectTask = (t) => {
    setSelected(t);
    setForm({ status: t.status, workerNotes: t.workerNotes || '' });
  };

  const updateTask = async () => {
    setSaving(true);
    try {
      await api.put(`/workers/tasks/${selected._id}`, form);
      toast.success('Task updated!');
      fetchTasks();
    } catch (err) {
      toast.error('Update failed');
    } finally { setSaving(false); }
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={SIDEBAR_LINKS} subtitle="Worker Portal" />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">👷 My Tasks</h1>
          <p className="text-gray-500 text-sm">Manage your assigned complaints</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Assigned', value: stats.total, icon: '📋', color: 'bg-blue-100 text-blue-700' },
            { label: 'Pending', value: stats.pending, icon: '⏳', color: 'bg-orange-100 text-orange-700' },
            { label: 'In Progress', value: stats.inProgress, icon: '🔄', color: 'bg-purple-100 text-purple-700' },
            { label: 'Completed', value: stats.completed, icon: '✅', color: 'bg-green-100 text-green-700' },
          ].map(s => (
            <div key={s.label} className="card flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${s.color}`}>{s.icon}</div>
              <div>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Task list */}
          <div className="lg:col-span-2 card p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="font-bold text-gray-800 mb-3">Assigned Tasks</div>
              <div className="flex gap-1 flex-wrap">
                {['all', 'pending', 'in_progress', 'completed'].map(s => (
                  <button key={s} onClick={() => setFilter(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${filter === s ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto max-h-[600px]">
              {loading ? (
                [...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 m-3 rounded-xl" />)
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-sm">No tasks found</p>
                </div>
              ) : (
                filtered.map(t => (
                  <div key={t._id} onClick={() => selectTask(t)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${selected?._id === t._id ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-800 line-clamp-1">{t.title}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{t.complaintNumber}</span>
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{CATEGORY_LABELS[t.category]}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Detail */}
          <div className="lg:col-span-3 space-y-4">
            {!selected ? (
              <div className="card flex items-center justify-center h-64 text-gray-400 flex-col gap-3">
                <div className="text-5xl">👈</div>
                <p>Select a task to view details</p>
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

                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-400 mb-1">Category</div>
                      <div className="font-medium">{CATEGORY_LABELS[selected.category]}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-400 mb-1">Submitted</div>
                      <div className="font-medium text-xs">{formatDateTime(selected.createdAt)}</div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{selected.description}</p>

                  {selected.location?.address && (
                    <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700 mb-3">
                      📍 {selected.location.address}
                    </div>
                  )}

                  {selected.image && (
                    <img src={getImageUrl(selected.image)} alt="" className="w-full h-48 object-cover rounded-xl" />
                  )}

                  {selected.citizenId && (
                    <div className="mt-3 text-xs text-gray-400">
                      Reported by: {selected.citizenId.name} ({selected.citizenId.email})
                    </div>
                  )}
                </div>

                {/* Update form */}
                <div className="card">
                  <h3 className="font-bold text-gray-800 mb-4">📝 Update Progress</h3>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                    <select className="input-field" value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Work Notes</label>
                    <textarea className="input-field resize-none" rows={4}
                      placeholder="Describe what work was done, materials used, etc."
                      value={form.workerNotes} onChange={e => setForm({ ...form, workerNotes: e.target.value })} />
                  </div>
                  <button onClick={updateTask} disabled={saving} className="btn-primary w-full">
                    {saving ? '⏳ Saving...' : '💾 Update Task'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
