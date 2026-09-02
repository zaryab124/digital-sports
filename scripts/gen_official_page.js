const fs = require('fs');

const officialPage = `'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Shield,
  Trophy,
  CheckCircle,
  Clock,
  Filter,
  MapPin,
  Lock,
  Play,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function OfficialDashboardPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);

      const [mRes, meRes] = await Promise.all([
        fetch(\`/api/matches?\${params.toString()}\`).then((r) => r.json()),
        fetch('/api/auth/me').then((r) => r.json()),
      ]);

      setMatches(mRes.matches || []);
      setUser(meRes.user);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const liveMatches = matches.filter((m) => m.status === 'LIVE');
  const pendingVerify = matches.filter((m) => m.status === 'RESULT_PENDING_VERIFICATION' || m.status === 'COMPLETED');
  const scheduled = matches.filter((m) => m.status === 'SCHEDULED' || m.status === 'APPROVED');
  const lockedOfficial = matches.filter((m) => m.isLocked || m.status === 'OFFICIAL' || m.status === 'OFFICIAL_VERIFIED');

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Official Header */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <Badge variant="blue" className="flex items-center gap-1.5 w-fit">
            <Shield className="w-3.5 h-3.5" />
            <span>CERTIFIED MATCH OFFICIAL & SCORER CONSOLE</span>
          </Badge>
          <h1 className="text-3xl font-black text-white">Live Match Digital Scorebooks</h1>
          <p className="text-xs text-slate-400">
            Real-time sport-specific event recording, pre-match verification, photo evidence capture, and official match locking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/matches"
            className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-xs border border-slate-700 transition"
          >
            All Fixtures
          </Link>
          <Link
            href="/matches/create"
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs shadow-xl transition"
          >
            + Sanction Match
          </Link>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-center shadow-lg">
          <span className="block text-2xl font-black text-rose-500">{liveMatches.length}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Live Scoring Active</span>
        </div>
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-center shadow-lg">
          <span className="block text-2xl font-black text-amber-400">{pendingVerify.length}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Awaiting Verification</span>
        </div>
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-center shadow-lg">
          <span className="block text-2xl font-black text-emerald-400">{scheduled.length}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Scheduled Fixtures</span>
        </div>
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-center shadow-lg">
          <span className="block text-2xl font-black text-purple-400">{lockedOfficial.length}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Officially Locked</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-300">Filter By Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white"
          >
            <option value="ALL">All Officiating Matches</option>
            <option value="LIVE">Live Matches Only</option>
            <option value="SCHEDULED">Scheduled / Ready for Pre-Match</option>
            <option value="RESULT_PENDING_VERIFICATION">Awaiting Result Verification</option>
            <option value="OFFICIAL">Officially Locked Results</option>
          </select>
        </div>
      </div>

      {/* Matches Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading Officiating Fixtures...</div>
      ) : matches.length === 0 ? (
        <div className="p-16 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <Activity className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Officiating Matches Found</h3>
          <p className="text-xs text-slate-400">No match assignments found matching current filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((m) => {
            const isLive = m.status === 'LIVE';
            const isLocked = m.isLocked || m.status === 'OFFICIAL' || m.status === 'OFFICIAL_VERIFIED';

            return (
              <div
                key={m.id}
                className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={isLive ? 'red' : isLocked ? 'gold' : 'blue'}>
                      {isLive ? '🔴 LIVE NOW' : isLocked ? '🔒 OFFICIAL' : m.status.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{m.sport?.name}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      {m.ground?.name || m.city?.name}
                    </span>
                    <span>{new Date(m.scheduledAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between text-sm font-bold text-white">
                    <span>{m.homeTeam?.name}</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">{m.homeScore}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold text-white">
                    <span>{m.awayTeam?.name}</span>
                    <span className="text-xl font-black text-purple-400 font-mono">{m.awayScore}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {isLocked ? 'Immutable' : isLive ? 'In Progress' : 'Ready'}
                  </span>

                  <Link
                    href={\`/matches/\${m.id}/scorebook\`}
                    className={\`px-4 py-2 font-black text-xs rounded-xl shadow transition flex items-center gap-1.5 \${
                      isLive
                        ? 'bg-rose-500 hover:bg-rose-400 text-white animate-pulse'
                        : isLocked
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }\`}
                  >
                    <span>{isLive ? 'Live Keypad' : isLocked ? 'View Scorebook' : 'Open Scorebook'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
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

fs.writeFileSync('src/app/official/page.tsx', officialPage.trim() + '\n', 'utf8');
console.log('[OK] Created src/app/official/page.tsx');
