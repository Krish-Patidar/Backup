import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const sendOTP = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return toast.error('Name and email are required');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: form.email, name: form.name, password: form.password, purpose: 'register' });
      toast.success('OTP sent to your email!');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const register = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error('Enter OTP');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { ...form, otp });
      login(data.token, data.user);
      toast.success('Welcome to NagarSeva! 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-green-800 via-green-600 to-teal-500 flex-col items-center justify-center p-12">
        <div className="text-center">
          <div className="text-7xl mb-6">🌟</div>
          <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Join NagarSeva</h1>
          <p className="text-green-100 text-lg mb-8">Be a responsible citizen. Report issues, earn credits, win rewards.</p>
          <div className="space-y-3 text-left">
            {['Register in 60 seconds with email OTP', 'Submit complaints with photo & location', 'AI auto-classifies your complaint', 'Track status in real-time', 'Earn ₹ rewards for genuine reports'].map((t, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                <span className="text-green-300 font-bold">{i + 1}</span>
                <span className="text-white text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="card shadow-xl">
            <div className="text-center mb-8">
              <div className="text-4xl mb-2">📝</div>
              <h2 className="text-2xl font-bold text-gray-800">Create Account</h2>
              <p className="text-gray-500 text-sm mt-1">Register as a citizen — it's free!</p>
            </div>

            {step === 1 ? (
              <form onSubmit={sendOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input className="input-field" placeholder="Arjun Sharma" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input type="email" className="input-field" placeholder="arjun@example.com" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input type="tel" className="input-field" placeholder="+91 98765 43210" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" className="input-field" placeholder="******" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>

                
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? '⏳ Sending OTP...' : '📧 Send OTP to Email'}
                </button>
              </form>
            ) : (
              <form onSubmit={register} className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
                  📧 OTP sent to <strong>{form.email}</strong>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                  <input type="text" className="input-field text-center text-2xl tracking-widest font-bold"
                    placeholder="000000" maxLength="6" value={otp} onChange={e => setOtp(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? '⏳ Registering...' : '✅ Complete Registration'}
                </button>
                <button type="button" onClick={() => setStep(1)} className="btn-secondary w-full">← Go Back</button>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-gray-500">
              Already registered?{' '}
              <Link to="/login" className="text-primary-600 font-semibold hover:underline">Login here</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
