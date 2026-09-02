const fs = require('fs');

const rankingsPageCode = `'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Star,
  Shield,
  MapPin,
  Flame,
  Medal,
  Award,
  Filter,
  Sliders,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function RankingsPage() {
  const [sports, setSports] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  const [selectedSport, setSelectedSport] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [tab, setTab] = useState<'TEAMS' | 'PLAYERS' | 'CITIES'>('TEAMS');

  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin Config Modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [editingRule, setEditingRule] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/sports').then((r) => r.json()),
      fetch('/api/cities').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
    ]).then(([sData, cData, meData]) => {
      setSports(sData.sports || []);
      setCities(cData.cities || []);
      setUser(meData.user);
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

      const res = await fetch(\`/api/rankings?\${params.toString()}\`);
      const data = await res.json();
      setRankings(data.rankings || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadRules = async () => {
    try {
      const res = await fetch('/api/admin/ranking-rules');
      const data = await res.json();
      setRules(data.rules || []);
      if (data.rules?.length > 0) setEditingRule(data.rules[0]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;
    try {
      const res = await fetch('/api/admin/ranking-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRule),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Ranking rules updated successfully.');
        setShowConfigModal(false);
        loadRankings();
      } else {
        alert(data.error || 'Failed to update rules');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'ELITE':
        return <Badge variant="gold" className="font-black">👑 ELITE</Badge>;
      case 'EXCELLENT':
        return <Badge variant="green" className="font-black">⭐ EXCELLENT</Badge>;
      case 'ADVANCED':
        return <Badge variant="blue" className="font-black">⚡ ADVANCED</Badge>;
      case 'INTERMEDIATE':
        return <Badge variant="purple" className="font-black">🔷 INTERMEDIATE</Badge>;
      default:
        return <Badge variant="neutral" className="font-bold">🌱 DEVELOPING</Badge>;
    }
  };

  const getRankMedal = (rank: number) => {
    if (rank === 1) return <span className="text-xl">🥇</span>;
    if (rank === 2) return <span className="text-xl">🥈</span>;
    if (rank === 3) return <span className="text-xl">🥉</span>;
    return <span className="font-mono font-bold text-slate-400">#{rank}</span>;
  };

  const isAdmin = user && (user.roles?.includes('SUPER_ADMIN') || user.roles?.includes('CITY_ADMIN'));

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2.5">
            <Trophy className="w-8 h-8 text-amber-400" />
            <span>Official Rankings & Leaderboards</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Algorithmic standings and player performance ratings computed exclusively from official verified matches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => {
                loadRules();
                setShowConfigModal(true);
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-2xl text-xs border border-slate-700 transition flex items-center gap-1.5"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Configure Ranking Rules</span>
            </button>
          )}

          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setTab('TEAMS')}
              className={\`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 \${
                tab === 'TEAMS' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'
              }\`}
            >
              <Shield className="w-4 h-4" />
              <span>Teams</span>
            </button>
            <button
              onClick={() => setTab('PLAYERS')}
              className={\`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 \${
                tab === 'PLAYERS' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'
              }\`}
            >
              <Star className="w-4 h-4" />
              <span>Players</span>
            </button>
            <button
              onClick={() => setTab('CITIES')}
              className={\`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 \${
                tab === 'CITIES' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'
              }\`}
            >
              <MapPin className="w-4 h-4" />
              <span>Cities</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-400">
            <Filter className="w-4 h-4 text-emerald-400" />
            <span>Scope:</span>
          </div>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white"
          >
            <option value="ALL">All Cities (Regional Scope)</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name} (Municipal)</option>
            ))}
          </select>

          {tab !== 'CITIES' && (
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white"
            >
              <option value="ALL">All Sports</option>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Official Locked Match Records Only</span>
        </div>
      </div>

      {/* Content View */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">Calculating Official Standings...</div>
      ) : rankings.length === 0 ? (
        <div className="p-16 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Standings Found</h3>
          <p className="text-xs text-slate-400">
            No official locked matches recorded yet for this filter selection.
          </p>
        </div>
      ) : (
        <>
          {/* TAB 1: TEAM RANKINGS */}
          {tab === 'TEAMS' && (
            <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Club Squad</th>
                    <th className="px-6 py-4">City</th>
                    <th className="px-6 py-4">Sport</th>
                    <th className="px-4 py-4 text-center">P</th>
                    <th className="px-4 py-4 text-center">W</th>
                    <th className="px-4 py-4 text-center">D</th>
                    <th className="px-4 py-4 text-center">L</th>
                    <th className="px-4 py-4 text-center">Diff / NRR</th>
                    <th className="px-6 py-4 text-right font-black text-emerald-400">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {rankings.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-black">{getRankMedal(r.rankPosition)}</td>
                      <td className="px-6 py-4">
                        <Link href={\`/teams/\${r.teamId}\`} className="font-bold text-white hover:text-emerald-400 transition flex items-center gap-2">
                          <span>{r.teamName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({r.teamCode})</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{r.city}</td>
                      <td className="px-6 py-4 font-bold text-slate-300">{r.sport}</td>
                      <td className="px-4 py-4 text-center font-mono text-slate-300">{r.matchesPlayed}</td>
                      <td className="px-4 py-4 text-center font-mono font-bold text-emerald-400">{r.wins}</td>
                      <td className="px-4 py-4 text-center font-mono text-slate-400">{r.draws}</td>
                      <td className="px-4 py-4 text-center font-mono text-rose-400">{r.losses}</td>
                      <td className="px-4 py-4 text-center font-mono font-bold text-slate-200">
                        {r.goalDiffOrNrr > 0 ? \`+\${r.goalDiffOrNrr}\` : r.goalDiffOrNrr}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-black text-base text-emerald-400">
                        {r.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: PLAYER LEADERBOARDS */}
          {tab === 'PLAYERS' && (
            <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Athlete</th>
                    <th className="px-6 py-4">City</th>
                    <th className="px-6 py-4">Sport</th>
                    <th className="px-6 py-4">Performance Tier</th>
                    <th className="px-4 py-4 text-center">Matches</th>
                    <th className="px-4 py-4 text-center">Goals / Runs</th>
                    <th className="px-4 py-4 text-center">MVP Awards</th>
                    <th className="px-6 py-4 text-right font-black text-amber-400">Rating Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {rankings.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-black">{getRankMedal(r.rankPosition)}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-white block">{r.fullName}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{r.city}</td>
                      <td className="px-6 py-4 font-bold text-slate-300">{r.sport}</td>
                      <td className="px-6 py-4">{getCategoryBadge(r.performanceCategory)}</td>
                      <td className="px-4 py-4 text-center font-mono text-slate-300">{r.matchesPlayed}</td>
                      <td className="px-4 py-4 text-center font-mono font-bold text-emerald-400">
                        {r.goals > 0 ? \`\${r.goals} goals\` : r.runs > 0 ? \`\${r.runs} runs\` : r.points > 0 ? \`\${r.points} pts\` : '-'}
                      </td>
                      <td className="px-4 py-4 text-center font-mono font-black text-amber-400">
                        {r.mvpCount > 0 ? \`⭐ \${r.mvpCount}\` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-black text-base text-amber-400">
                        {Math.round(r.performanceRating)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: CITY & REGIONAL STANDINGS */}
          {tab === 'CITIES' && (
            <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Municipal City</th>
                    <th className="px-6 py-4">Province / Region</th>
                    <th className="px-6 py-4 text-center">Active Clubs</th>
                    <th className="px-6 py-4 text-center">Official Matches Played</th>
                    <th className="px-6 py-4 text-right font-black text-purple-400">Championship Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {rankings.map((r) => (
                    <tr key={r.cityId} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-black">{getRankMedal(r.rankPosition)}</td>
                      <td className="px-6 py-4">
                        <Link href={\`/cities/\${r.citySlug}\`} className="font-bold text-white hover:text-emerald-400 transition">
                          {r.cityName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{r.province} &bull; {r.region}</td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-emerald-400">{r.activeClubs}</td>
                      <td className="px-6 py-4 text-center font-mono text-slate-300">{r.officialMatchesPlayed}</td>
                      <td className="px-6 py-4 text-right font-mono font-black text-base text-purple-400">
                        {r.championshipPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Admin Ranking Rules Configuration Modal */}
      {showConfigModal && editingRule && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <span>Configure Sport Ranking Rules</span>
              </h3>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-white text-lg font-bold">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Sport Discipline</label>
                <select
                  value={editingRule.sportId}
                  onChange={(e) => {
                    const r = rules.find((x) => x.sportId === e.target.value);
                    if (r) setEditingRule(r);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-xs"
                >
                  {rules.map((r) => (
                    <option key={r.sportId} value={r.sportId}>{r.sportName} ({r.sportCode})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-emerald-400 uppercase mb-1">Win Points</label>
                  <input
                    type="number"
                    value={editingRule.winPoints}
                    onChange={(e) => setEditingRule({ ...editingRule, winPoints: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-amber-400 uppercase mb-1">Draw Points</label>
                  <input
                    type="number"
                    value={editingRule.drawPoints}
                    onChange={(e) => setEditingRule({ ...editingRule, drawPoints: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-rose-400 uppercase mb-1">Loss Points</label>
                  <input
                    type="number"
                    value={editingRule.lossPoints}
                    onChange={(e) => setEditingRule({ ...editingRule, lossPoints: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">MVP Player Bonus Points</label>
                <input
                  type="number"
                  value={editingRule.mvpBonusPoints}
                  onChange={(e) => setEditingRule({ ...editingRule, mvpBonusPoints: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-xl transition"
              >
                Save Official Ranking Rules &rarr;
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/app/rankings/page.tsx', rankingsPageCode.trim() + '\n', 'utf8');
console.log('[OK] Created enhanced src/app/rankings/page.tsx');
