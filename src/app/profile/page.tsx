'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, MapPin, Trophy, Shield, CheckCircle2, AlertCircle, Save, Award, ArrowRightLeft, Clock, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [cities, setCities] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [tab, setTab] = useState<'PERSONAL' | 'SPORTS' | 'TRANSFERS_CLUBS' | 'ROLE_DATA'>('PERSONAL');

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

          
          {tab === 'TRANSFERS_CLUBS' && (
            <div className="space-y-6">
              {/* Transfer Metrics Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 text-center">
                  <span className="block text-2xl font-black text-emerald-400">
                    {user.teamMemberships?.filter((m: any) => m.status === 'ACTIVE').length || 0}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Active Squads</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 text-center">
                  <span className="block text-2xl font-black text-amber-400">
                    {user.teamMemberships?.filter((m: any) => m.status === 'FORMER').length || 0}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Previous Clubs (Alumni)</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 text-center">
                  <span className="block text-2xl font-black text-purple-400">
                    {(user.transfersAsPlayer || user.transfers || [])?.filter((t: any) => t.status === 'COMPLETED').length || 0}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Career Transfers</span>
                </div>
              </div>

              {/* Current Active Squads */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Current Active Squads</span>
                </h3>
                {(!user.teamMemberships || user.teamMemberships.filter((m: any) => m.status === 'ACTIVE').length === 0) ? (
                  <p className="text-xs text-slate-500 p-4 bg-slate-800 rounded-2xl">Not actively rostered in any squad currently.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {user.teamMemberships.filter((m: any) => m.status === 'ACTIVE').map((m: any) => (
                      <div key={m.id} className="p-4 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-between">
                        <div className="space-y-1">
                          <Link href={`/teams/${m.teamId}`} className="font-bold text-white hover:text-emerald-400 transition text-sm block">
                            {m.team.name}
                          </Link>
                          <span className="text-[11px] text-slate-400 block">{m.team.sport?.name} &bull; {m.team.city?.name}</span>
                          <span className="text-[10px] text-slate-500 block">Joined: {new Date(m.joinedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant="success">ACTIVE</Badge>
                          {m.jerseyNumber && <span className="block text-xs font-mono font-bold text-emerald-400">#{m.jerseyNumber}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Previous Clubs / Alumni Archives */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Previous Clubs & Alumni Archives (Permanent History)</span>
                </h3>
                {(!user.teamMemberships || user.teamMemberships.filter((m: any) => m.status === 'FORMER').length === 0) ? (
                  <p className="text-xs text-slate-500 p-4 bg-slate-800 rounded-2xl">No historical club releases on record.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {user.teamMemberships.filter((m: any) => m.status === 'FORMER').map((m: any) => (
                      <div key={m.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-300 text-sm block">{m.team.name}</span>
                          <span className="text-[11px] text-slate-400 block">{m.team.sport?.name} &bull; {m.team.city?.name}</span>
                          <span className="text-[10px] text-slate-500 block">
                            {new Date(m.joinedAt).toLocaleDateString()} &rarr; {m.leftAt ? new Date(m.leftAt).toLocaleDateString() : 'Transferred'}
                          </span>
                        </div>
                        <Badge variant="neutral">FORMER</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Transfer History Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowRightLeft className="w-4 h-4 text-purple-400" />
                    <span>Official Transfer History</span>
                  </h3>
                  <Link href="/transfers" className="text-xs text-emerald-400 hover:text-emerald-300 font-bold">
                    Go to Transfer Hub &rarr;
                  </Link>
                </div>
                {(!(user.transfersAsPlayer || user.transfers || []) || (user.transfersAsPlayer || user.transfers || []).length === 0) ? (
                  <p className="text-xs text-slate-500 p-4 bg-slate-800 rounded-2xl">No transfer applications recorded.</p>
                ) : (
                  <div className="space-y-2.5">
                    {(user.transfersAsPlayer || user.transfers || []).map((t: any) => (
                      <div key={t.id} className="p-4 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{t.oldTeam?.name}</span>
                            <span className="text-slate-500">&rarr;</span>
                            <span className="font-bold text-emerald-400">{t.newTeam?.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 block">
                            {t.sport?.name} &bull; Fee: PKR {t.fee} &bull; Requested: {new Date(t.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={t.status === 'COMPLETED' ? 'success' : t.status === 'REJECTED' ? 'danger' : 'gold'}>
                            {t.status}
                          </Badge>
                          {t.completedAt && (
                            <span className="text-[10px] text-slate-400">{new Date(t.completedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
