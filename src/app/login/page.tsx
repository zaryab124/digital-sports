'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trophy, ArrowRight, ShieldAlert, Sparkles, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      // Check user roles to redirect appropriately
      const isSuperAdmin = data.user?.roles?.some((r: any) => r.roleCode === 'SUPER_ADMIN' || r.roleCode === 'CITY_ADMIN');
      if (isSuperAdmin) {
        window.location.href = '/admin';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdminLogin = async () => {
    setError('');
    setAdminLoading(true);

    try {
      const res = await fetch('/api/auth/quick-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Quick Admin Login failed');

      window.location.href = '/admin';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center text-slate-950 font-extrabold mx-auto shadow-lg">
          <Trophy className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-black text-white">Sign In to Platform</h1>
        <p className="text-xs text-slate-400">South Punjab Multi-City Sports Community Network</p>
      </div>

      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        {/* Quick Admin Master Access Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 to-slate-900 border border-purple-500/30 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-purple-400" />
              <span>Platform Owner & Admin Access</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">1-Click</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Instantly access the Master Admin Console to approve players, sanction matches, manage fees, and assign roles.
          </p>
          <button
            type="button"
            onClick={handleQuickAdminLogin}
            disabled={adminLoading}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-purple-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{adminLoading ? 'Authenticating Master Admin...' : '⚡ 1-Click Master Admin Sign In'}</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@sports.pk or your email"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Password</label>
              <Link href="/forgot-password" className="text-xs text-emerald-400 hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Don&apos;t have an account yet?{' '}
            <Link href="/register" className="font-bold text-emerald-400 hover:underline">
              Create New Account &rarr;
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
