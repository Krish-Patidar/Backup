import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Sidebar from '../components/shared/Sidebar';
import { formatDate, formatCurrency } from '../utils/helpers';

const SIDEBAR_LINKS = [
  { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { path: '/submit-complaint', icon: '📝', label: 'Submit Complaint' },
  { path: '/track', icon: '📍', label: 'Track Complaints' },
  { path: '/credits', icon: '🏆', label: 'My Credits' },
];

export default function CreditsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => { fetchCredits(); }, []);

  const fetchCredits = async () => {
    try {
      const res = await api.get('/users/credits');
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load credits');
    } finally { setLoading(false); }
  };

  const claimReward = async () => {
    setClaiming(true);
    try {
      const res = await api.post('/users/claim-reward');
      toast.success(res.data.message);
      fetchCredits();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Claim failed');
    } finally { setClaiming(false); }
  };

  const rewardValue = data ? Math.floor(data.credits / 100) * 100 : 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar links={SIDEBAR_LINKS} subtitle="Citizen Portal" />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">🏆 My Credits & Rewards</h1>

          {loading ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>
          ) : (
            <>
              {/* Credit Balance */}
              <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-3xl p-8 text-white mb-6 shadow-xl">
                <div className="text-center">
                  <div className="text-6xl font-black mb-2">{data?.credits || 0}</div>
                  <div className="text-amber-100 text-lg font-semibold mb-1">Credit Points</div>
                  <div className="text-amber-200 text-sm">100 credits = ₹100 reward</div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-white/20 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold">{formatCurrency(data?.totalRewards || 0)}</div>
                    <div className="text-amber-100 text-xs mt-1">Total Rewards Claimed</div>
                  </div>
                  <div className="bg-white/20 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold">{formatCurrency(rewardValue)}</div>
                    <div className="text-amber-100 text-xs mt-1">Available to Claim</div>
                  </div>
                </div>
              </div>

              {/* Claim button */}
              <div className="card mb-6">
                <h3 className="font-bold text-gray-800 mb-2">💰 Claim Reward</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Rewards can be claimed every 3 months. You need at least 100 credits.
                  Current claimable: <strong>{formatCurrency(rewardValue)}</strong>
                </p>
                <div className="bg-gray-100 rounded-xl p-3 mb-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Progress to next ₹100</span>
                    <span className="font-bold">{data?.credits % 100}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all"
                      style={{ width: `${(data?.credits % 100)}%` }} />
                  </div>
                </div>
                <button onClick={claimReward} disabled={claiming || data?.credits < 100}
                  className="btn-primary w-full disabled:opacity-50">
                  {claiming ? '⏳ Processing...' : `🎁 Claim ${formatCurrency(rewardValue)} Reward`}
                </button>
              </div>

              {/* How it works */}
              <div className="card mb-6">
                <h3 className="font-bold text-gray-800 mb-4">📖 How Credits Work</h3>
                <div className="space-y-3">
                  {[
                    ['📝', 'Submit a genuine complaint', '+0 credits'],
                    ['✅', 'Complaint gets resolved', '+10 credits'],
                    ['🏆', 'Accumulate 100 credits', '= ₹100 reward'],
                    ['📅', 'Claim every 3 months', 'Minimum 100 credits'],
                  ].map(([icon, label, value]) => (
                    <div key={label} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{icon}</span>
                        <span className="text-sm text-gray-700">{label}</span>
                      </div>
                      <span className="text-sm font-bold text-green-600">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* History */}
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-4">📜 Credit History</h3>
                {(data?.history || []).length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">No credit history yet</p>
                ) : (
                  <div className="space-y-2">
                    {[...(data?.history || [])].reverse().map((h, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <div className="text-sm font-medium text-gray-700">{h.reason}</div>
                          <div className="text-xs text-gray-400">{formatDate(h.date)}</div>
                        </div>
                        <span className="text-green-600 font-bold">+{h.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
