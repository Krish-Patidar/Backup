import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function AdminLoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/admin-login', form);
      login(data.token, data.user);
      toast.success(`Welcome, ${data.user.name}!`);
      const routes = { cm_admin: '/cm', department_admin: '/department', worker: '/worker' };
      navigate(routes[data.user.role] || '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="card shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔐</div>
            <h2 className="text-2xl font-bold text-gray-800">Admin Portal</h2>
            <p className="text-gray-500 text-sm mt-1">For Department Admins & CM Office</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-xs text-amber-700">
            <strong>Demo credentials:</strong><br />
            CM Admin: cm@grievance.gov.in / Admin@123<br />
            Dept Admin: admin.road@grievance.gov.in / Admin@123
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" className="input-field" placeholder="admin@grievance.gov.in"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" className="input-field" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '⏳ Logging in...' : '🔐 Login'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Are you a citizen?{' '}
            <Link to="/login" className="text-primary-600 hover:underline font-semibold">Citizen Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
