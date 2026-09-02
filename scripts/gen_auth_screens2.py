import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Wrote screen:', path)

# 1. Profile Screen
write_file('src/app/profile/page.tsx', """'use client';

import React, { useEffect, useState } from 'react';
import { User, MapPin, Trophy, Shield, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [cities, setCities] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [tab, setTab] = useState<'PERSONAL' | 'SPORTS' | 'ROLE_DATA'>('PERSONAL');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [homeCityId, setHomeCityId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [primarySportId, setPrimarySportId] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [position, setPosition] = useState('');
  const [battingStyle, setBattingStyle] = useState('');
  const [bowlingStyle, setBowlingStyle] = useState('');
  const [dominantFoot, setDominantFoot] = useState('');
  const [bio, setBio] = useState('');

  const [officialType, setOfficialType] = useState('REFEREE');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [experienceYears, setExperienceYears] = useState('1');
  const [certification, setCertification] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [uRes, cRes, sRes] = await Promise.all([
        fetch('/api/users/profile').then((r) => r.json()),
        fetch('/api/cities').then((r) => r.json()),
        fetch('/api/sports').then((r) => r.json()),
      ]);

      if (uRes.user) {
        const u = uRes.user;
        setUser(u);
        setFullName(u.fullName || '');
        setPhone(u.phone || '');
        setHomeCityId(u.homeCityId || '');
        setAvatarUrl(u.avatarUrl || '');

        if (u.playerProfile) {
          setPrimarySportId(u.playerProfile.primarySportId || '');
          setJerseyNumber(u.playerProfile.jerseyNumber?.toString() || '');
          setPosition(u.playerProfile.position || '');
          setBattingStyle(u.playerProfile.battingStyle || '');
          setBowlingStyle(u.playerProfile.bowlingStyle || '');
          setDominantFoot(u.playerProfile.dominantFoot || '');
          setBio(u.playerProfile.bio || '');
        }

        if (u.captainProfile) {
          setExperienceYears(u.captainProfile.experienceYears?.toString() || '1');
          setCertification(u.captainProfile.certification || '');
        }

        if (u.officialProfile) {
          setOfficialType(u.officialProfile.officialType || 'REFEREE');
          setBadgeNumber(u.officialProfile.badgeNumber || '');
        }
      }

      setCities(cRes.cities || []);
      setSports(sRes.sports || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setSaving(true);

    try {
      const payload: any = {
        fullName,
        phone,
        homeCityId,
        avatarUrl,
        playerProfile: {
          primarySportId: primarySportId || null,
          jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null,
          position,
          battingStyle,
          bowlingStyle,
          dominantFoot,
          bio,
        },
        captainProfile: {
          experienceYears: parseInt(experienceYears) || 1,
          certification,
        },
        officialProfile: {
          officialType,
          badgeNumber,
        },
      };

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setMsg('Profile updated successfully!');
      loadProfile();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-400">Loading Profile...</div>;
  if (!user) return <div className="text-center py-20 text-slate-400">Please sign in to view your profile.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-400 text-slate-950 flex items-center justify-center font-black text-3xl overflow-hidden shadow-lg">
          {avatarUrl ? (
            <img src={avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
          ) : (
            user.fullName?.charAt(0) || 'U'
          )}
        </div>

        <div className="space-y-2 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-2xl font-black text-white">{user.fullName}</h1>
            {user.isEmailVerified && <Badge variant="green">✓ Verified</Badge>}
            <Badge variant="gold">{user.userRoles?.[0]?.role?.code || 'MEMBER'}</Badge>
          </div>
          <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            {user.homeCity?.name}, South Punjab • {user.email}
          </p>
        </div>
      </div>

      <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
        <button
          onClick={() => setTab('PERSONAL')}
          className={`px-5 py-2.5 rounded-xl transition ${tab === 'PERSONAL' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Personal Info
        </button>
        <button
          onClick={() => setTab('SPORTS')}
          className={`px-5 py-2.5 rounded-xl transition ${tab === 'SPORTS' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Sports Attributes
        </button>
        <button
          onClick={() => setTab('ROLE_DATA')}
          className={`px-5 py-2.5 rounded-xl transition ${tab === 'ROLE_DATA' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Role & Licensing
        </button>
      </div>

      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        {error && <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs">{error}</div>}
        {msg && <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs">{msg}</div>}

        <form onSubmit={handleSave} className="space-y-6">
          {tab === 'PERSONAL' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Official Home City</label>
                  <select
                    value={homeCityId}
                    onChange={(e) => setHomeCityId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  >
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Profile Photo URL</label>
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'SPORTS' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Primary Sport</label>
                  <select
                    value={primarySportId}
                    onChange={(e) => setPrimarySportId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  >
                    <option value="">-- Select Primary Sport --</option>
                    {sports.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Jersey Number</label>
                  <input
                    type="number"
                    value={jerseyNumber}
                    onChange={(e) => setJerseyNumber(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Playing Position</label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g. Strike Bowler"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Batting Style</label>
                  <input
                    type="text"
                    value={battingStyle}
                    onChange={(e) => setBattingStyle(e.target.value)}
                    placeholder="e.g. Right-hand"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Bowling Style</label>
                  <input
                    type="text"
                    value={bowlingStyle}
                    onChange={(e) => setBowlingStyle(e.target.value)}
                    placeholder="e.g. Right-arm fast"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Athlete Bio / Highlights</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share your sports journey, awards, and career highlights..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                />
              </div>
            </div>
          )}

          {tab === 'ROLE_DATA' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-slate-300">
                Assigned Role: <strong className="text-emerald-400">{user.userRoles?.[0]?.role?.code}</strong>. Roles are administered via official verification.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Official Badge / License #</label>
                  <input
                    type="text"
                    value={badgeNumber}
                    onChange={(e) => setBadgeNumber(e.target.value)}
                    placeholder="PCB-8812"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Captain Certification</label>
                  <input
                    type="text"
                    value={certification}
                    onChange={(e) => setCertification(e.target.value)}
                    placeholder="e.g. Level-1 Leadership"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs shadow-lg transition flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
""")

# 2. Settings Screen
write_file('src/app/settings/page.tsx', """'use client';

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
""")

print('[DONE] Part 2 written.')
