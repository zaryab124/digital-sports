import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Wrote:', path)

# 1. Rankings Page
write_file('src/app/rankings/page.tsx', """'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Star, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function RankingsPage() {
  const [sports, setSports] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [selectedSport, setSelectedSport] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [tab, setTab] = useState<'TEAMS' | 'PLAYERS'>('TEAMS');

  const [teamRankings, setTeamRankings] = useState<any[]>([]);
  const [playerRankings, setPlayerRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/sports').then((r) => r.json()),
      fetch('/api/cities').then((r) => r.json()),
    ]).then(([sData, cData]) => {
      setSports(sData.sports || []);
      setCities(cData.cities || []);
    });
  }, []);

  useEffect(() => {
    loadRankings();
  }, [selectedSport, selectedCity, tab]);

  const loadRankings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSport !== 'ALL') params.append('sportId', selectedSport);
      if (selectedCity !== 'ALL') params.append('cityId', selectedCity);
      params.append('type', tab);

      const res = await fetch(`/api/rankings?${params.toString()}`);
      const data = await res.json();
      setTeamRankings(data.teamRankings || []);
      setPlayerRankings(data.playerRankings || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <Trophy className="w-8 h-8 text-amber-400" />
            Official Rankings & Leaderboards
          </h1>
          <p className="text-xs text-slate-400 mt-1">Multi-city official ranking points computed from verified locked matches</p>
        </div>

        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setTab('TEAMS')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              tab === 'TEAMS' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Team Rankings</span>
          </button>
          <button
            onClick={() => setTab('PLAYERS')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              tab === 'PLAYERS' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Player Leaderboards</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <select
          value={selectedSport}
          onChange={(e) => setSelectedSport(e.target.value)}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white"
        >
          <option value="ALL">All Sports</option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white"
        >
          <option value="ALL">All Cities</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        {tab === 'TEAMS' ? (
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase font-bold text-slate-400">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Team</th>
                <th className="px-6 py-4">Sport</th>
                <th className="px-6 py-4">City</th>
                <th className="px-6 py-4 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {teamRankings.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-800/50">
                  <td className="px-6 py-4 font-black text-white">
                    {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${r.rankPosition}`}
                  </td>
                  <td className="px-6 py-4 font-bold text-white">{r.team?.name}</td>
                  <td className="px-6 py-4">{r.sport?.name}</td>
                  <td className="px-6 py-4 text-slate-400">{r.city?.name}</td>
                  <td className="px-6 py-4 text-right font-black text-emerald-400 text-base">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase font-bold text-slate-400">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Athlete</th>
                <th className="px-6 py-4">Sport</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Rating Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {playerRankings.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-800/50">
                  <td className="px-6 py-4 font-black text-white">
                    {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${r.rankPosition}`}
                  </td>
                  <td className="px-6 py-4 font-bold text-white">{r.playerProfile?.user?.fullName}</td>
                  <td className="px-6 py-4">{r.sport?.name}</td>
                  <td className="px-6 py-4">
                    <Badge variant="gold">{r.playerProfile?.performanceCategory || 'DEVELOPING'}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-emerald-400 text-base">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
""")

# 2. User Dashboard
write_file('src/app/dashboard/page.tsx', """'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Trophy, Activity, ArrowRightLeft, CreditCard, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading Dashboard...</div>;
  if (!user) return <div className="text-center py-20 text-slate-400">Please sign in to access your dashboard.</div>;

  const isAdmin = user.roles?.some((r: any) =>
    ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'CITY_ADMIN', 'SPORTS_ADMIN'].includes(r.roleCode)
  );

  return (
    <div className="space-y-8">
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Badge variant="green">{user.roles?.[0]?.roleCode || 'MEMBER'}</Badge>
            <span className="text-xs text-slate-400 font-semibold">{user.homeCity?.name}</span>
          </div>
          <h1 className="text-3xl font-black text-white">{user.fullName}</h1>
          <p className="text-xs text-slate-400">{user.email} • {user.phone || 'No phone recorded'}</p>
        </div>

        {isAdmin && (
          <Link
            href="/dashboard/admin"
            className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs flex items-center space-x-2 shadow-lg transition"
          >
            <Settings className="w-4 h-4" />
            <span>Admin Control Center</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/teams"
          className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition space-y-3"
        >
          <Shield className="w-8 h-8 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Teams & Rosters</h3>
          <p className="text-xs text-slate-400">Manage your team rosters, memberships, and player invites.</p>
        </Link>

        <Link
          href="/matches"
          className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition space-y-3"
        >
          <Activity className="w-8 h-8 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Fixtures & Scorebooks</h3>
          <p className="text-xs text-slate-400">Challenge opponents, track live scorecards, and lock official results.</p>
        </Link>

        <Link
          href="/transfers"
          className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition space-y-3"
        >
          <ArrowRightLeft className="w-8 h-8 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Transfer Market</h3>
          <p className="text-xs text-slate-400">Initiate transfers to new teams with Rs. 100 transfer fee verification.</p>
        </Link>

        <Link
          href="/dashboard/payments"
          className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition space-y-3"
        >
          <CreditCard className="w-8 h-8 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Payment Orders</h3>
          <p className="text-xs text-slate-400">Submit proofs for team registrations, transfers, and track approvals.</p>
        </Link>
      </div>
    </div>
  );
}
""")

print('[DONE] Rankings & Dashboard written.')
