import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Enter email & password');

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });

      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name}! 🎉`);

      const routes = {
        citizen: '/dashboard',
        department_admin: '/department',
        worker: '/worker',
        cm_admin: '/cm'
      };

      navigate(routes[data.user.role] || '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-900 via-primary-700 to-blue-600 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white"
              style={{ width: `${(i + 1) * 80}px`, height: `${(i + 1) * 80}px`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
          ))}
        </div>
        <div className="relative text-center">
          <div className="text-7xl mb-6">🏛️</div>
          <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>NagarSeva</h1>
          <p className="text-blue-200 text-lg mb-8">Smart Citizen Grievance Redressal System</p>
          <div className="grid grid-cols-2 gap-4 text-left">
            {[['📋', 'Submit Complaints', 'File complaints easily with photo & location'],
              ['🤖', 'AI Classification', 'Automatic routing to right department'],
              ['📍', 'Track Status', 'Real-time updates on your complaints'],
              ['🏆', 'Earn Credits', 'Get rewarded for genuine reports']
            ].map(([icon, title, desc]) => (
              <div key={title} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-white font-semibold text-sm">{title}</div>
                <div className="text-blue-200 text-xs mt-1">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="card shadow-xl">
            <div className="text-center mb-8">
              <div className="text-4xl mb-2">🏛️</div>
              <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>
              <p className="text-gray-500 text-sm mt-1">Sign in to your citizen account</p>
            </div>

            {/* ✅ CLEAN LOGIN FORM (NO OTP) */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="******"
                  value={password}
                  onChange={e => setPassword(e.target.value)}  // ✅ fixed
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? '⏳ Logging in...' : '🔐 Login'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              New citizen?{' '}
              <Link to="/register" className="text-primary-600 font-semibold hover:underline">
                Register here
              </Link>
            </div>

            <div className="mt-2 text-center text-sm text-gray-400">
              Department/CM Admin?{' '}
              <Link to="/admin-login" className="text-gray-600 hover:underline">
                Admin Login
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}