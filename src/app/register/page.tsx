'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trophy, ArrowRight, MapPin, CheckCircle2 } from 'lucide-react';

const FALLBACK_CITIES = [
  { id: 'jampur-city', name: 'Jampur', slug: 'jampur', code: 'JAM' },
  { id: 'dgk-city', name: 'Dera Ghazi Khan', slug: 'dera-ghazi-khan', code: 'DGK' },
  { id: 'rajanpur-city', name: 'Rajanpur', slug: 'rajanpur', code: 'RAJ' },
  { id: 'taunsa-city', name: 'Taunsa', slug: 'taunsa', code: 'TAU' },
  { id: 'multan-city', name: 'Multan', slug: 'multan', code: 'MUL' },
  { id: 'muzaffargarh-city', name: 'Muzaffargarh', slug: 'muzaffargarh', code: 'MZG' },
  { id: 'layyah-city', name: 'Layyah', slug: 'layyah', code: 'LAY' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [cities, setCities] = useState<any[]>(FALLBACK_CITIES);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [homeCityId, setHomeCityId] = useState(FALLBACK_CITIES[0].id);
  const [initialRole, setInitialRole] = useState('PLAYER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cities')
      .then((res) => res.json())
      .then((data) => {
        if (data.cities && data.cities.length > 0) {
          setCities(data.cities);
          setHomeCityId(data.cities[0].id);
        }
      })
      .catch((err) => {
        console.warn('Using default South Punjab cities:', err);
      })
      .finally(() => {
        setCitiesLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!homeCityId) {
      setError('Please select your registered home municipal city.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          phone: phone || undefined,
          homeCityId,
          initialRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      router.push('/dashboard');
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center text-slate-950 font-extrabold mx-auto shadow-lg shadow-emerald-500/20">
          <Trophy className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Join Sports Community</h1>
        <p className="text-xs text-slate-400">Official digital registration for athletes, captains, officials, and fans</p>
      </div>

      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ali Raza"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ali@gmail.com"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Phone (Optional)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 1234567"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Registered Home City</span>
                {citiesLoading && <span className="text-[10px] text-emerald-400 font-normal">Loading...</span>}
              </label>
              <div className="relative">
                <select
                  value={homeCityId}
                  onChange={(e) => setHomeCityId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 appearance-none pr-8 cursor-pointer"
                >
                  {cities.map((c) => (
                    <option key={c.id || c.code} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Primary Role</label>
            <select
              value={initialRole}
              onChange={(e) => setInitialRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="PLAYER">Player / Athlete</option>
              <option value="CAPTAIN">Team Captain (Club Manager)</option>
              <option value="OFFICIAL">Match Official / Scorer</option>
              <option value="SUPER_ADMIN">System Administrator / Commissioner</option>
              <option value="CITY_ADMIN">City Sports Officer</option>
              <option value="FAN">Fan / Spectator</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-2 mt-4 cursor-pointer"
          >
            <span>{loading ? 'Creating Profile...' : 'Complete Registration'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="text-center text-xs text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="font-bold text-emerald-400 hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
