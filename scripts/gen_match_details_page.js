const fs = require('fs');
fs.mkdirSync('src/app/matches/[id]', { recursive: true });

const matchDetailsPage = `'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Activity,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Shield,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
  ArrowRightLeft,
  Users,
  Play,
  Lock,
  Edit,
  ArrowLeft,
  Share2
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function MatchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.id as string;

  const [match, setMatch] = useState<any>(null);
  const [permissions, setPermissions] = useState<any>({});
  const [grounds, setGrounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Negotiation Modal
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [counterDate, setCounterDate] = useState('');
  const [counterGroundId, setCounterGroundId] = useState('');
  const [negotiationNotes, setNegotiationNotes] = useState('');

  useEffect(() => {
    if (matchId) {
      loadMatchDetails();
      fetch('/api/grounds').then((r) => r.json()).then((d) => setGrounds(d.grounds || []));
    }
  }, [matchId]);

  const loadMatchDetails = async () => {
    try {
      const res = await fetch(\`/api/matches/\${matchId}\`);
      const data = await res.json();
      if (data.match) {
        setMatch(data.match);
        setPermissions(data.permissions || {});
        setCounterDate(new Date(data.match.scheduledAt).toISOString().slice(0, 16));
        setCounterGroundId(data.match.groundId || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, extraBody?: any) => {
    setActionLoading(true);
    try {
      const res = await fetch(\`/api/matches/\${matchId}/action\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraBody }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Action failed');
      } else {
        setShowNegotiateModal(false);
        loadMatchDetails();
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading Match Details...</div>;
  }

  if (!match) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Match Fixture Not Found</h2>
        <Link href="/matches" className="text-xs text-emerald-400 font-bold hover:underline">
          &larr; Back to Matches Directory
        </Link>
      </div>
    );
  }

  const isCompleted = match.status === 'OFFICIAL' || match.status === 'OFFICIAL_VERIFIED' || match.status === 'LOCKED' || match.status === 'COMPLETED';
  const isLive = match.status === 'LIVE';

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/matches"
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Matches</span>
        </Link>

        <div className="flex items-center gap-2">
          {match.format && <Badge variant="neutral">{match.format}</Badge>}
          <Badge
            variant={
              isLive
                ? 'red'
                : match.status === 'SCHEDULED' || match.status === 'APPROVED'
                ? 'green'
                : match.status === 'OFFICIAL' || match.status === 'LOCKED' || match.status === 'OFFICIAL_VERIFIED'
                ? 'gold'
                : 'yellow'
            }
          >
            {match.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      {/* Hero Match Board */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span>{match.sport?.name} &bull; {match.city?.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{new Date(match.scheduledAt).toLocaleDateString()} at {new Date(match.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Squad Clash Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center py-4 border-y border-slate-800">
          {/* Home Squad */}
          <div className="space-y-2 flex flex-col items-center">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center font-black text-2xl text-emerald-400 shadow-lg">
              {match.homeTeam?.name?.[0]}
            </div>
            <div>
              <Link href={\`/teams/\${match.homeTeamId}\`} className="font-black text-lg text-white hover:text-emerald-400 transition">
                {match.homeTeam?.name}
              </Link>
              <span className="block text-xs text-slate-400">Capt: {match.homeTeam?.captain?.fullName || 'Captain'}</span>
            </div>
          </div>

          {/* Versus & Live Scores */}
          <div className="space-y-2">
            {isLive || isCompleted ? (
              <div className="flex items-center justify-center gap-4">
                <span className="text-4xl font-black text-emerald-400 font-mono">{match.homeScore}</span>
                <span className="text-xl font-black text-slate-600">-</span>
                <span className="text-4xl font-black text-purple-400 font-mono">{match.awayScore}</span>
              </div>
            ) : (
              <div className="inline-block px-4 py-1.5 rounded-2xl bg-slate-800 text-slate-400 text-xs font-black uppercase tracking-widest">
                VS
              </div>
            )}
            <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>{match.ground?.name || 'Local Municipal Ground'}</span>
            </div>
          </div>

          {/* Away Squad */}
          <div className="space-y-2 flex flex-col items-center">
            <div className="w-20 h-20 rounded-3xl bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center font-black text-2xl text-purple-400 shadow-lg">
              {match.awayTeam?.name?.[0]}
            </div>
            <div>
              <Link href={\`/teams/\${match.awayTeamId}\`} className="font-black text-lg text-white hover:text-purple-400 transition">
                {match.awayTeam?.name}
              </Link>
              <span className="block text-xs text-slate-400">Capt: {match.awayTeam?.captain?.fullName || 'Captain'}</span>
            </div>
          </div>
        </div>

        {/* Stage Progress Tracker */}
        <div className="space-y-2 pt-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Agreement & Sanctioning Lifecycle
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className={\`p-3 rounded-2xl border flex items-center gap-2 \${match.homeCaptainApproved ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}\`}>
              {match.homeCaptainApproved ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              <span>Home Proposed</span>
            </div>
            <div className={\`p-3 rounded-2xl border flex items-center gap-2 \${match.awayCaptainApproved ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}\`}>
              {match.awayCaptainApproved ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              <span>Away Accepted</span>
            </div>
            <div className={\`p-3 rounded-2xl border flex items-center gap-2 \${match.adminApproved ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}\`}>
              {match.adminApproved ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              <span>Admin Approved</span>
            </div>
            <div className={\`p-3 rounded-2xl border flex items-center gap-2 \${match.isLocked ? 'bg-gold-500/10 border-amber-500/30 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-400'}\`}>
              {match.isLocked ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              <span>Official Locked</span>
            </div>
          </div>
        </div>

        {/* Action Controls Toolbar for Captains & Admins */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Away Captain Accept */}
            {!match.awayCaptainApproved && (permissions.isAwayCaptain || permissions.isAdmin) && (
              <button
                onClick={() => handleAction('ACCEPT')}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Accept Match Challenge</span>
              </button>
            )}

            {/* Negotiate / Counter Offer */}
            {!match.isLocked && (permissions.isHomeCaptain || permissions.isAwayCaptain || permissions.isAdmin) && (
              <button
                onClick={() => setShowNegotiateModal(true)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-xl text-xs border border-slate-700 transition flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                <span>Propose New Time / Ground</span>
              </button>
            )}

            {/* Admin Sanction */}
            {!match.adminApproved && permissions.isAdmin && (
              <button
                onClick={() => handleAction('ADMIN_APPROVE')}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-lg transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Admin Sanction & Schedule</span>
              </button>
            )}

            {/* Start Live Match */}
            {(match.status === 'SCHEDULED' || match.status === 'APPROVED') && (permissions.isOfficial || permissions.isHomeCaptain || permissions.isAdmin) && (
              <button
                onClick={() => handleAction('START_LIVE')}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-black rounded-xl text-xs shadow-lg transition flex items-center gap-1.5 animate-pulse"
              >
                <Play className="w-4 h-4" />
                <span>Kickoff Match (Start Live)</span>
              </button>
            )}

            {/* Lock Match */}
            {(match.status === 'LIVE' || match.status === 'COMPLETED' || match.status === 'RESULT_PENDING_VERIFICATION') && (permissions.isAdmin || permissions.isOfficial) && (
              <button
                onClick={() => handleAction('LOCK_MATCH')}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-purple-500 hover:bg-purple-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>Lock Official Result & Update Rankings</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={\`/matches/\${match.id}/scorebook\`}
              className="px-5 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 font-black text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <Activity className="w-4 h-4" />
              <span>Digital Scorebook &rarr;</span>
            </Link>

            {!match.isLocked && (permissions.isHomeCaptain || permissions.isAwayCaptain || permissions.isAdmin) && (
              <button
                onClick={() => handleAction('CANCEL')}
                className="px-3 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Match Details & Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Specifications */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Match Specifications & Rules</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex justify-between">
              <span className="text-slate-400">Match Format:</span>
              <span className="font-bold text-white">{match.format || 'Standard Regulation'}</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex justify-between">
              <span className="text-slate-400">Allocated Venue:</span>
              <span className="font-bold text-emerald-400">{match.ground?.name || 'Local Ground'}</span>
            </div>

            {match.rules && (
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                <span className="text-slate-400 block font-bold">Special Ground Rules:</span>
                <p className="text-slate-300">{match.rules}</p>
              </div>
            )}

            {match.notes && (
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
                <span className="text-slate-400 block font-bold">Captain Instructions / Notes:</span>
                <p className="text-slate-300">{match.notes}</p>
              </div>
            )}

            {match.negotiationNotes && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <span className="text-amber-400 block font-bold">Latest Negotiation Remarks:</span>
                <p className="text-slate-300">{match.negotiationNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Squad Lineups */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Active Squad Rosters</span>
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Home Roster */}
            <div className="space-y-2">
              <span className="font-bold text-emerald-400 block pb-1 border-b border-slate-800">{match.homeTeam?.name}</span>
              {(match.homeTeam?.members || []).slice(0, 8).map((m: any) => (
                <div key={m.id} className="p-2 rounded-xl bg-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-200 truncate">{m.player?.fullName}</span>
                  {m.jerseyNumber && <span className="font-mono text-emerald-400 font-bold">#{m.jerseyNumber}</span>}
                </div>
              ))}
            </div>

            {/* Away Roster */}
            <div className="space-y-2">
              <span className="font-bold text-purple-400 block pb-1 border-b border-slate-800">{match.awayTeam?.name}</span>
              {(match.awayTeam?.members || []).slice(0, 8).map((m: any) => (
                <div key={m.id} className="p-2 rounded-xl bg-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-200 truncate">{m.player?.fullName}</span>
                  {m.jerseyNumber && <span className="font-mono text-purple-400 font-bold">#{m.jerseyNumber}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Negotiation Modal */}
      {showNegotiateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Propose Fixture Amendment</h3>
              <button onClick={() => setShowNegotiateModal(false)} className="text-slate-400 hover:text-white">&times;</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1.5">Proposed Date & Kickoff Time</label>
                <input
                  type="datetime-local"
                  value={counterDate}
                  onChange={(e) => setCounterDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1.5">Venue Ground</label>
                <select
                  value={counterGroundId}
                  onChange={(e) => setCounterGroundId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold"
                >
                  <option value="">-- Keep Current Ground --</option>
                  {grounds.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({g.city?.name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1.5">Negotiation Note / Reason</label>
                <textarea
                  rows={3}
                  value={negotiationNotes}
                  onChange={(e) => setNegotiationNotes(e.target.value)}
                  placeholder="e.g. Ground booked on Saturday, propose Sunday morning instead..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <button
                onClick={() =>
                  handleAction('NEGOTIATE', {
                    counterScheduledAt: new Date(counterDate).toISOString(),
                    counterGroundId: counterGroundId || undefined,
                    negotiationNotes,
                  })
                }
                disabled={actionLoading || !counterDate}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-lg transition"
              >
                Submit Amendment Proposal &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/app/matches/[id]/page.tsx', matchDetailsPage.trim() + '\n', 'utf8');
console.log('[OK] Created src/app/matches/[id]/page.tsx');
