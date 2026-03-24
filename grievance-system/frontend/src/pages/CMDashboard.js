import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Sidebar from '../components/shared/Sidebar';
import StatCard from '../components/shared/StatCard';
import { formatCurrency, CATEGORY_LABELS, CATEGORY_COLORS, formatDateTime } from '../utils/helpers';
import { StatusBadge, PriorityBadge } from '../components/shared/ComplaintCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';

const SIDEBAR_LINKS = [{ path: '/cm', icon: '🏛️', label: 'CM Dashboard' }];
const COLORS_ARR = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6'];

export default function CMDashboard() {
  const [stats, setStats] = useState(null);
  const [deptPerf, setDeptPerf] = useState([]);
  const [catDist, setCatDist] = useState([]);
  const [trends, setTrends] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [s, d, c, t, comp] = await Promise.all([
        api.get('/cm/stats'),
        api.get('/cm/department-performance'),
        api.get('/cm/category-distribution'),
        api.get('/cm/monthly-trends'),
        api.get('/cm/complaints?limit=20'),
      ]);
      setStats(s.data.stats);
      setDeptPerf(d.data.performance);
      setCatDist(c.data.distribution.map(x => ({ name: CATEGORY_LABELS[x._id] || x._id, value: x.count })));
      setTrends(t.data.trends.map(x => ({
        name: `${x._id.month}/${x._id.year}`, total: x.total, resolved: x.resolved
      })));
      setComplaints(comp.data.complaints);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally { setLoading(false); }
  };

  const radarData = deptPerf.slice(0, 6).map(d => ({
    dept: d.code || d.name.substring(0, 6),
    score: d.resolutionRate,
  }));

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'departments', label: '🏢 Departments' },
    { id: 'complaints', label: '📋 All Complaints' },
    { id: 'analytics', label: '📈 Analytics' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={SIDEBAR_LINKS} subtitle="CM Office" />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🏛️ CM Office Dashboard</h1>
            <p className="text-gray-500 text-sm">Central monitoring of all grievance activities</p>
          </div>
          <div className="text-xs text-gray-400 bg-white border border-gray-200 rounded-xl px-3 py-2">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === t.id ? 'bg-primary-700 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <StatCard icon="📋" label="Total Complaints" value={stats?.totalComplaints || 0} color="blue" />
                  <StatCard icon="✅" label="Resolved" value={stats?.completedComplaints || 0} color="green" />
                  <StatCard icon="⏳" label="Pending" value={stats?.pendingComplaints || 0} color="orange" />
                  <StatCard icon="🔄" label="In Progress" value={stats?.inProgressComplaints || 0} color="purple" />
                  <StatCard icon="👥" label="Total Citizens" value={stats?.totalCitizens || 0} color="indigo" />
                  <StatCard icon="🏢" label="Departments" value={stats?.totalDepartments || 0} color="teal" />
                  <StatCard icon="💰" label="Total Expense" value={formatCurrency(stats?.totalExpense)} color="red" />
                  <StatCard icon="⚡" label="Resolution Rate" value={`${stats?.resolutionRate || 0}%`} color="green" />
                </div>

                <div className="grid lg:grid-cols-2 gap-6 mb-6">
                  <div className="card">
                    <h3 className="font-bold text-gray-800 mb-4">📈 Monthly Trends</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} name="Total" dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="card">
                    <h3 className="font-bold text-gray-800 mb-4">🏷️ By Category</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={catDist} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                          label={({ name, percent }) => `${name.split(' ')[1] || name}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}>
                          {catDist.map((_, i) => <Cell key={i} fill={COLORS_ARR[i % COLORS_ARR.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Department Performance bar */}
                <div className="card">
                  <h3 className="font-bold text-gray-800 mb-4">🏢 Department Resolution Rates</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={deptPerf} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit="%" />
                      <Tooltip formatter={(v) => `${v}%`} />
                      <Bar dataKey="resolutionRate" name="Resolution %" radius={[6, 6, 0, 0]}>
                        {deptPerf.map((_, i) => <Cell key={i} fill={COLORS_ARR[i % COLORS_ARR.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </>
        )}

        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div className="space-y-4">
            {loading ? (
              [...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)
            ) : deptPerf.map(d => (
              <div key={d.id} className="card">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-bold text-gray-800">{d.name}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{d.code}</span>
                  </div>
                  <div className={`text-2xl font-black ${d.resolutionRate >= 70 ? 'text-green-600' : d.resolutionRate >= 40 ? 'text-orange-500' : 'text-red-500'}`}>
                    {d.resolutionRate}%
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${d.resolutionRate >= 70 ? 'bg-green-500' : d.resolutionRate >= 40 ? 'bg-orange-400' : 'bg-red-500'}`}
                      style={{ width: `${d.resolutionRate}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4 text-center">
                  {[
                    ['Total', d.total, 'text-blue-700 bg-blue-50'],
                    ['Resolved', d.resolved, 'text-green-700 bg-green-50'],
                    ['Pending', d.pending, 'text-orange-700 bg-orange-50'],
                    ['In Progress', d.inProgress, 'text-purple-700 bg-purple-50'],
                    ['Expense', formatCurrency(d.totalExpense), 'text-red-700 bg-red-50'],
                  ].map(([label, val, cls]) => (
                    <div key={label} className={`rounded-xl p-2 ${cls}`}>
                      <div className="font-bold text-sm">{val}</div>
                      <div className="text-xs opacity-70">{label}</div>
                    </div>
                  ))}
                </div>
                {d.resolutionRate < 40 && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
                    ⚠️ <strong>Slow department alert!</strong> Resolution rate below 40%. Requires attention.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* All Complaints Tab */}
        {activeTab === 'complaints' && (
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-100 font-bold text-gray-800">
              All Complaints ({complaints.length} shown)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['#', 'Title', 'Category', 'Status', 'Priority', 'Department', 'Citizen', 'Date'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c, i) => (
                    <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-xs text-primary-600 font-medium whitespace-nowrap">{c.complaintNumber}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate">{c.title}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{CATEGORY_LABELS[c.category]}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{c.departmentId?.name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{c.citizenId?.name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4">🎯 Department Radar</h3>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="dept" tick={{ fontSize: 11 }} />
                  <Radar name="Resolution %" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                  <Tooltip formatter={(v) => `${v}%`} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4">💰 Expense by Department</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={deptPerf} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="code" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Bar dataKey="totalExpense" name="Expense" radius={[0, 6, 6, 0]}>
                    {deptPerf.map((_, i) => <Cell key={i} fill={COLORS_ARR[i % COLORS_ARR.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card lg:col-span-2">
              <h3 className="font-bold text-gray-800 mb-4">📊 Monthly Comparison</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" name="Total Filed" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" name="Total Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
