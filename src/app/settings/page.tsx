'use client';

import React, { useState, useEffect } from 'react';
import { KeyRound, Shield, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [sentCode, setSentCode] = useState('');

  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [vMsg, setVMsg] = useState('');
  const [vError, setVError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/users/profile')
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwMsg('');

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      setPwMsg('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerification = async () => {
    setVError('');
    setVMsg('');
    try {
      const res = await fetch('/api/auth/send-verification', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');

      setSentCode(data.code || 'SENT');
      setVMsg(`Verification code generated: ${data.code}`);
    } catch (err: any) {
      setVError(err.message);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setVError('');
    setVMsg('');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setVMsg('Email verified successfully!');
      setUser({ ...user, isEmailVerified: true });
    } catch (err: any) {
      setVError(err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-2">
          <Shield className="w-8 h-8 text-emerald-400" />
          Account & Security Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">Manage credentials, verification status, and security preferences</p>
      </div>

      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Mail className="w-5 h-5 text-emerald-400" />
          Email & Phone Verification
        </h2>

        {vError && <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs">{vError}</div>}
        {vMsg && <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs">{vMsg}</div>}

        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800 border border-slate-700">
          <div>
            <div className="text-sm font-bold text-white">{user?.email}</div>
            <div className="text-xs text-slate-400">Account primary email address</div>
          </div>
          <Badge variant={user?.isEmailVerified ? 'green' : 'yellow'}>
            {user?.isEmailVerified ? '✓ Verified' : 'Unverified'}
          </Badge>
        </div>

        {!user?.isEmailVerified && (
          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={handleSendVerification}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition"
            >
              Send Verification Code
            </button>

            {sentCode && (
              <form onSubmit={handleVerifyEmail} className="flex gap-3">
                <input
                  type="text"
                  required
                  placeholder="Enter 6-digit code"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs flex-1"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition"
                >
                  Verify Now
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-amber-400" />
          Change Account Password
        </h2>

        {pwError && <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs">{pwError}</div>}
        {pwMsg && <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs">{pwMsg}</div>}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="py-3 px-6 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs transition"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

    </div>
  );
}
