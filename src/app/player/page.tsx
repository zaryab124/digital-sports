'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, Trophy, Activity, ArrowRightLeft, Shield, MapPin, Star } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function PlayerDashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users/profile')
      .then((r) => r.json())
      .then((d) => setProfile(d.user))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading Athlete Dashboard...</div>;
  if (!profile) return <div className="text-center py-20 text-slate-400">Please sign in.</div>;

  const playerProf = profile.playerProfile;
  const stats = playerProf?.statistics?.[0] || {};
  const activeTeams = profile.teamMemberships || [];

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Badge variant="gold">{playerProf?.performanceCategory || 'DEVELOPING'}</Badge>
            <span className="text-xs text-slate-400 font-semibold">{playerProf?.primarySport?.name || 'Multi-Sport'} • {profile.homeCity?.name}</span>
          </div>
          <h1 className="text-3xl font-black text-white">{profile.fullName}</h1>
          <p className="text-xs text-slate-400">
            Jersey #{playerProf?.jerseyNumber || '-'} • Position: {playerProf?.position || 'Athlete'}
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/transfers" className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition">
            Club Transfer Market
          </Link>
          <Link href="/profile" className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition">
            Edit Athlete Profile
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-3xl font-black text-emerald-400">{stats.ratingScore || 100}</div>
          <div className="text-[11px] text-slate-400 font-semibold uppercase mt-1">Performance Rating</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-3xl font-black text-white">{stats.matchesPlayed || 0}</div>
          <div className="text-[11px] text-slate-400 font-semibold uppercase mt-1">Matches Played</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-3xl font-black text-amber-400">{stats.mvpCount || 0}</div>
          <div className="text-[11px] text-slate-400 font-semibold uppercase mt-1">Match MVP Awards</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-3xl font-black text-emerald-400">{stats.wins || 0}W - {stats.losses || 0}L</div>
          <div className="text-[11px] text-slate-400 font-semibold uppercase mt-1">Win/Loss Record</div>
        </div>
      </div>

      {/* Active Team Memberships */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          Active Team Memberships
        </h2>

        {activeTeams.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
            You are not currently rostered in an active team. Browse <Link href="/teams" className="text-emerald-400 underline">Teams</Link> to join a roster.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeTeams.map((mem: any) => (
              <div key={mem.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-base font-bold text-white">{mem.team?.name}</div>
                  <div className="text-xs text-slate-400">{mem.team?.sport?.name} • {mem.team?.city?.name}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Role: {mem.role} • Joined {new Date(mem.joinedAt).toLocaleDateString()}</div>
                </div>
                <Link
                  href={`/teams/${mem.team?.id}`}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
                >
                  View Team &rarr;
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
