'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { KeyRound, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [tokenReceived, setTokenReceived] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');

      setTokenReceived(data.resetToken || 'TOKEN_SENT');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-white">Reset Your Password</h1>
        <p className="text-xs text-slate-400">Enter your registered email address to receive password recovery instructions</p>
      </div>

      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        {error && <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs">{error}</div>}

        {tokenReceived ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Reset Token Generated</h3>
            <p className="text-xs text-slate-300">
              A secure password reset token has been issued. Click below to set your new password.
            </p>
            {tokenReceived !== 'TOKEN_SENT' && (
              <Link
                href={`/reset-password?token=${tokenReceived}`}
                className="block w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition text-center"
              >
                Proceed to Reset Password &rarr;
              </Link>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Registered Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. captain.ali@sports.pk"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition"
            >
              {loading ? 'Generating...' : 'Send Password Reset Token'}
            </button>
          </form>
        )}
      </div>

      <div className="text-center text-xs text-slate-400">
        Remember your password?{' '}
        <Link href="/login" className="font-bold text-emerald-400 hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
