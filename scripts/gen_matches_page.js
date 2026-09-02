const fs = require('fs');

const matchesPage = `'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Plus,
  Calendar,
  MapPin,
  Trophy,
  Filter,
  Clock,
  Shield,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function MatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  // Filters
  const [selectedSport, setSelectedSport] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [onlyMyMatches, setOnlyMyMatches] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedSport, selectedCity, selectedStatus, onlyMyMatches]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSport !== 'ALL') params.set('sportId', selectedSport);
      if (selectedCity !== 'ALL') params.set('cityId', selectedCity);
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (onlyMyMatches) params.set('myMatches', 'true');

      const [mRes, sRes, cRes, meRes] = await Promise.all([
        fetch(\`/api/matches?\${params.toString()}\`).then((r) => r.json()),
        fetch('/api/sports').then((r) => r.json()),
        fetch('/api/cities').then((r) => r.json()),
        fetch('/api/auth/me').then((r) => r.json()),
      ]);

      setMatches(mRes.matches || []);
      setSports(sRes.sports || []);
      setCities(cRes.cities || []);
      setUser(meRes.user);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LIVE':
        return <Badge variant="red" className="animate-pulse">🔴 LIVE NOW</Badge>;
      case 'SCHEDULED':
      case 'APPROVED':
        return <Badge variant="green">SCHEDULED</Badge>;
      case 'PENDING_ADMIN_APPROVAL':
        return <Badge variant="yellow">PENDING ADMIN</Badge>;
      case 'OPPONENT_REVIEW':
      case 'REQUESTED':
        return <Badge variant="purple">CHALLENGE PROPOSED</Badge>;
      case 'NEGOTIATION':
        return <Badge variant="yellow">IN NEGOTIATION</Badge>;
      case 'OFFICIAL':
      case 'OFFICIAL_VERIFIED':
      case 'LOCKED':
        return <Badge variant="gold">OFFICIAL & LOCKED</Badge>;
      case 'COMPLETED':
      case 'RESULT_PENDING_VERIFICATION':
        return <Badge variant="blue">RESULT PENDING</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">CANCELLED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const liveMatches = matches.filter((m) => m.status === 'LIVE');
  const scheduledMatches = matches.filter((m) => m.status === 'SCHEDULED' || m.status === 'APPROVED');
  const pendingMatches = matches.filter((m) => m.status === 'REQUESTED' || m.status === 'OPPONENT_REVIEW' || m.status === 'PENDING_ADMIN_APPROVAL' || m.status === 'NEGOTIATION');
  const completedMatches = matches.filter((m) => m.status === 'COMPLETED' || m.status === 'OFFICIAL' || m.status === 'OFFICIAL_VERIFIED' || m.status === 'LOCKED');

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2.5">
            <Activity className="w-8 h-8 text-emerald-400" />
            <span>Fixtures & Match Schedules</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time inter-club match scheduling, dual captain agreement workflows, and live digital scorebooks.
          </p>
        </div>

        <Link
          href="/matches/create"
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs flex items-center space-x-2 shadow-xl transition w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Propose Match Challenge &rarr;</span>
        </Link>
      </div>

      {/* Overview Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-center shadow-lg">
          <span className="block text-2xl font-black text-rose-500">{liveMatches.length}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Live Matches Now</span>
        </div>
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-center shadow-lg">
          <span className="block text-2xl font-black text-emerald-400">{scheduledMatches.length}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Approved & Scheduled</span>
        </div>
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-center shadow-lg">
          <span className="block text-2xl font-black text-amber-400">{pendingMatches.length}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Awaiting Agreement</span>
        </div>
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-center shadow-lg">
          <span className="block text-2xl font-black text-purple-400">{completedMatches.length}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Completed / Official</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <Filter className="w-4 h-4 text-emerald-400" />
            <span>Filters:</span>
          </div>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white"
          >
            <option value="ALL">All Cities</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

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

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled & Approved</option>
            <option value="LIVE">Live Matches</option>
            <option value="REQUESTED">Pending Opponent Review</option>
            <option value="PENDING_ADMIN_APPROVAL">Pending Admin Approval</option>
            <option value="COMPLETED">Completed Results</option>
            <option value="OFFICIAL">Official & Locked</option>
          </select>
        </div>

        {user && (
          <button
            onClick={() => setOnlyMyMatches(!onlyMyMatches)}
            className={\`px-4 py-2 rounded-xl text-xs font-bold transition border \${
              onlyMyMatches
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }\`}
          >
            {onlyMyMatches ? '✓ Showing My Squad Matches' : 'Filter My Matches'}
          </button>
        )}
      </div>

      {/* Match Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading Matches & Fixtures...</div>
      ) : matches.length === 0 ? (
        <div className="p-16 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <Activity className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Match Fixtures Found</h3>
          <p className="text-xs text-slate-400">No scheduled fixtures matched your filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((m) => {
            const isCompleted = m.status === 'OFFICIAL' || m.status === 'OFFICIAL_VERIFIED' || m.status === 'LOCKED' || m.status === 'COMPLETED';
            const isLive = m.status === 'LIVE';

            return (
              <div
                key={m.id}
                className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
              >
                {/* Header Tag */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    {getStatusBadge(m.status)}
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{m.sport?.name}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      {m.ground?.name || m.city?.name}
                    </span>
                    {m.format && <span className="font-mono text-slate-400">{m.format}</span>}
                  </div>
                </div>

                {/* Score / Team Board */}
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
                        {m.homeTeam?.name?.[0]}
                      </div>
                      <span className="font-bold text-white text-sm">{m.homeTeam?.name}</span>
                    </div>
                    {(isCompleted || isLive) && (
                      <span className="text-xl font-black text-emerald-400 font-mono">{m.homeScore}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-xs">
                        {m.awayTeam?.name?.[0]}
                      </div>
                      <span className="font-bold text-white text-sm">{m.awayTeam?.name}</span>
                    </div>
                    {(isCompleted || isLive) && (
                      <span className="text-xl font-black text-purple-400 font-mono">{m.awayScore}</span>
                    )}
                  </div>
                </div>

                {/* Footer / Action */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{new Date(m.scheduledAt).toLocaleDateString()} &bull; {new Date(m.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={\`/matches/\${m.id}\`}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition"
                    >
                      Details
                    </Link>
                    {(isLive || isCompleted || m.status === 'SCHEDULED') && (
                      <Link
                        href={\`/matches/\${m.id}/scorebook\`}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center gap-1"
                      >
                        <span>Scorebook</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/app/matches/page.tsx', matchesPage.trim() + '\n', 'utf8');
console.log('[OK] Created enhanced src/app/matches/page.tsx');
