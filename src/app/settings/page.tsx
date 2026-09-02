'use client';

import React, { useState, useEffect } from 'react';
import { KeyRound, Shield, Mail, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [sentCode, setSentCode] = useState('');

  // Visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [vMsg, setVMsg] = useState('');
  const [vError, setVError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/users/profile')
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, []);

  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const isLengthValid = newPassword.length >= 6;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwMsg('');

    if (newPassword.trim() !== confirmPassword.trim()) {
      setPwError('New passwords do not match. Please verify both fields.');
      return;
    }

    if (newPassword.trim().length < 6) {
      setPwError('New password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      setPwMsg('✓ Password updated successfully! You can now use your new password.');
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
        body: JSON.stringify({ token: verifyCode.trim() }),
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
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-2">
          <Shield className="w-8 h-8 text-emerald-400" />
          <span>Account & Security Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">Manage credentials, verification status, and security preferences</p>
      </div>

      {/* Verification Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Mail className="w-5 h-5 text-emerald-400" />
          <span>Email & Phone Verification</span>
        </h2>

        {vError && <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-semibold">{vError}</div>}
        {vMsg && <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-semibold">{vMsg}</div>}

        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800 border border-slate-700">
          <div>
            <div className="text-sm font-bold text-white">{user?.email || 'Loading...'}</div>
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
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
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
                  className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs flex-1 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Verify Now
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Change Password Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <span>Change Account Password</span>
          </h2>
          <span className="text-[10px] text-slate-400">Min. 6 characters</span>
        </div>

        {pwError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{pwError}</span>
          </div>
        )}

        {pwMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{pwMsg}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-200"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className={`w-full px-4 py-3 rounded-xl bg-slate-800 border text-white placeholder-slate-500 text-sm focus:outline-none pr-10 ${
                    newPassword.length > 0 && !isLengthValid
                      ? 'border-amber-500 focus:border-amber-500'
                      : 'border-slate-700 focus:border-emerald-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-200"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword.length > 0 && !isLengthValid && (
                <span className="text-[10px] text-amber-400 mt-1 block">Must be at least 6 characters</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className={`w-full px-4 py-3 rounded-xl bg-slate-800 border text-white placeholder-slate-500 text-sm focus:outline-none pr-10 ${
                    passwordsMatch
                      ? 'border-emerald-500 focus:border-emerald-500'
                      : passwordsMismatch
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-700 focus:border-emerald-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-200"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordsMatch && (
                <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Passwords match
                </span>
              )}
              {passwordsMismatch && (
                <span className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Passwords do not match
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !currentPassword || !newPassword || !confirmPassword || passwordsMismatch || !isLengthValid}
            className="py-3 px-8 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
