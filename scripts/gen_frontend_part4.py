import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Wrote:', path)

# 1. Player Transfer Market Page
write_file('src/app/transfers/page.tsx', """'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, Shield, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  const [sportId, setSportId] = useState('');
  const [newTeamId, setNewTeamId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [trRes, spRes, tmRes, meRes] = await Promise.all([
        fetch('/api/transfers').then((r) => r.json()),
        fetch('/api/sports').then((r) => r.json()),
        fetch('/api/teams').then((r) => r.json()),
        fetch('/api/auth/me').then((r) => r.json()),
      ]);

      setTransfers(trRes.transfers || []);
      setSports(spRes.sports || []);
      setTeams(tmRes.teams || []);
      setUser(meRes.user);

      if (spRes.sports?.length) setSportId(spRes.sports[0].id);
      if (tmRes.teams?.length) setNewTeamId(tmRes.teams[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sportId, newTeamId, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transfer request failed');

      setMsg(data.message || 'Transfer request created successfully!');
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTransfer = async (transferId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch(`/api/transfers/${transferId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || 'Action failed');
      else loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <ArrowRightLeft className="w-8 h-8 text-emerald-400" />
            Official Player Transfer Market
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Official transfers with Rs. 100 fee and strict prevention of dual active memberships in the same sport.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Request Transfer Form */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
          <h2 className="text-lg font-bold text-white">Initiate Official Transfer</h2>

          {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">{error}</div>}
          {msg && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">{msg}</div>}

          <form onSubmit={handleRequestTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Sport</label>
              <select
                value={sportId}
                onChange={(e) => setSportId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
              >
                {sports.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">New Target Team</label>
              <select
                value={newTeamId}
                onChange={(e) => setNewTeamId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
              >
                {teams
                  .filter((t) => !sportId || t.sportId === sportId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.city?.name})</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Transfer Reason / Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for transfer request..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-400">
              Transfer Fee: <strong className="text-emerald-400">PKR 100</strong>. Historical team membership will be preserved as FORMER.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs shadow-lg transition"
            >
              {loading ? 'Submitting...' : 'Submit Transfer Request'}
            </button>
          </form>
        </div>

        {/* Transfer Requests & History */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-white">Transfer Applications & Records ({transfers.length})</h2>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs uppercase font-bold text-slate-400">
                  <tr>
                    <th className="px-6 py-3">Player</th>
                    <th className="px-6 py-3">From &rarr; To</th>
                    <th className="px-6 py-3">Sport</th>
                    <th className="px-6 py-3">Fee Status</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {transfers.map((tr) => (
                    <tr key={tr.id} className="hover:bg-slate-800/50">
                      <td className="px-6 py-4 font-bold text-white">{tr.player?.fullName}</td>
                      <td className="px-6 py-4">
                        <span className="text-rose-400 font-semibold">{tr.oldTeam?.name}</span>
                        {' '}&rarr;{' '}
                        <span className="text-emerald-400 font-semibold">{tr.newTeam?.name}</span>
                      </td>
                      <td className="px-6 py-4 text-xs">{tr.sport?.name}</td>
                      <td className="px-6 py-4">
                        <Badge variant={tr.payment?.status === 'VERIFIED' ? 'green' : 'yellow'}>
                          PKR {tr.fee} ({tr.payment?.status || 'PENDING'})
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={tr.status === 'COMPLETED' ? 'green' : tr.status === 'REJECTED' ? 'red' : 'yellow'}>
                          {tr.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {tr.status !== 'COMPLETED' && tr.status !== 'REJECTED' && (
                          <>
                            <button
                              onClick={() => handleApproveTransfer(tr.id, 'APPROVE')}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApproveTransfer(tr.id, 'REJECT')}
                              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold rounded text-xs transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
""")

# 2. Matches & Digital Scorebook
write_file('src/app/matches/page.tsx', """'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Plus, Calendar, MapPin, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function MatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/matches')
      .then((r) => r.json())
      .then((d) => setMatches(d.matches || []));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <Activity className="w-8 h-8 text-emerald-400" />
            Fixtures & Digital Scorebooks
          </h1>
          <p className="text-xs text-slate-400 mt-1">Official matches, score events, and locked verified results</p>
        </div>
        <Link
          href="/matches/create"
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 shadow-lg transition"
        >
          <Plus className="w-4 h-4" />
          <span>Propose Match Challenge</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.map((m) => (
          <div key={m.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant={m.status === 'OFFICIAL_VERIFIED' ? 'gold' : m.status === 'SCHEDULED' ? 'blue' : 'green'}>
                  {m.status.replace(/_/g, ' ')}
                </Badge>
                <span className="text-xs text-slate-400 font-semibold">{m.sport?.name}</span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {m.ground?.name || m.city?.name}
              </div>
            </div>

            <div className="py-2 space-y-2 font-bold text-white">
              <div className="flex justify-between items-center text-base">
                <span>{m.homeTeam?.name}</span>
                <span className="text-2xl font-black text-emerald-400">{m.homeScore}</span>
              </div>
              <div className="flex justify-between items-center text-base">
                <span>{m.awayTeam?.name}</span>
                <span className="text-2xl font-black text-emerald-400">{m.awayScore}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">{new Date(m.scheduledAt).toLocaleDateString()}</span>
              <Link
                href={`/matches/${m.id}/scorebook`}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow transition"
              >
                Digital Scorebook &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
""")

write_file('src/app/matches/create/page.tsx', """'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowRight } from 'lucide-react';

export default function CreateMatchPage() {
  const router = useRouter();
  const [sports, setSports] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [grounds, setGrounds] = useState<any[]>([]);

  const [sportId, setSportId] = useState('');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [groundId, setGroundId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/sports').then((r) => r.json()),
      fetch('/api/teams').then((r) => r.json()),
      fetch('/api/grounds').then((r) => r.json()),
    ]).then(([s, t, g]) => {
      setSports(s.sports || []);
      setTeams(t.teams || []);
      setGrounds(g.grounds || []);

      if (s.sports?.length) setSportId(s.sports[0].id);
      if (t.teams?.length > 1) {
        setHomeTeamId(t.teams[0].id);
        setAwayTeamId(t.teams[1].id);
      }
      if (g.grounds?.length) setGroundId(g.grounds[0].id);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sportId,
          homeTeamId,
          awayTeamId,
          groundId: groundId || undefined,
          scheduledAt: new Date(scheduledAt || Date.now()).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to propose match');

      router.push(`/matches/${data.match?.id}/scorebook`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-white">Propose Match Challenge</h1>
        <p className="text-xs text-slate-400">Match workflow: Propose &rarr; Accept/Negotiate &rarr; Admin Schedule &rarr; Official Scoring</p>
      </div>

      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        {error && <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Sport</label>
            <select
              value={sportId}
              onChange={(e) => setSportId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
            >
              {sports.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Home Team</label>
              <select
                value={homeTeamId}
                onChange={(e) => setHomeTeamId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Away Opponent</label>
              <select
                value={awayTeamId}
                onChange={(e) => setAwayTeamId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Match Ground</label>
            <select
              value={groundId}
              onChange={(e) => setGroundId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
            >
              {grounds.map((g) => (
                <option key={g.id} value={g.id}>{g.name} ({g.city?.name})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Date & Time</label>
            <input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl shadow-lg transition flex items-center justify-center space-x-2 mt-4"
          >
            <span>{loading ? 'Submitting...' : 'Send Challenge Request'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
""")

# 3. Polymorphic Digital Scorebook Page
write_file('src/app/matches/[id]/scorebook/page.tsx', """'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Shield, Trophy, CheckCircle, Lock, Plus, User, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function DigitalScorebookPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<any>(null);
  const [scorebook, setScorebook] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Score event inputs
  const [eventType, setEventType] = useState('RUNS');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [runsValue, setRunsValue] = useState('1');
  const [cardType, setCardType] = useState('YELLOW');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    try {
      const [mRes, meRes] = await Promise.all([
        fetch(`/api/matches/${params.id}`).then((r) => r.json()),
        fetch('/api/auth/me').then((r) => r.json()),
      ]);

      setMatch(mRes.match);
      setScorebook(mRes.match?.scorebook);
      setUser(meRes.user);

      if (mRes.match?.homeTeamId) setSelectedTeamId(mRes.match.homeTeamId);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match) return;
    setSubmitting(true);

    try {
      let detailsJson: any = {};
      if (match.sport?.code === 'CRICKET') {
        if (eventType === 'RUNS') detailsJson = { runs: parseInt(runsValue) };
        if (eventType === 'WICKET') detailsJson = { isWicket: true, bowlerId: selectedPlayerId };
      } else if (match.sport?.code === 'FOOTBALL') {
        if (eventType === 'CARD') detailsJson = { cardType };
      }

      const res = await fetch(`/api/scorebook/${match.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          teamId: selectedTeamId,
          playerId: selectedPlayerId || undefined,
          detailsJson: JSON.stringify(detailsJson),
        }),
      });

      if (res.ok) {
        loadData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to add score event');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyAndLock = async () => {
    if (!confirm('Officially verify and lock this match? This will automatically compute stats, ratings, and update leaderboards.')) return;
    try {
      const res = await fetch(`/api/scorebook/${match.id}/verify`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        loadData();
      } else {
        alert(data.error || 'Verification failed');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-400">Loading Digital Scorebook...</div>;
  if (!match) return <div className="text-center py-20 text-slate-400">Match not found</div>;

  const sportCode = match.sport?.code;

  return (
    <div className="space-y-8">
      {/* Scoreboard Header */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-6 border-b border-slate-800 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Badge variant={match.isLocked ? 'gold' : 'green'}>{match.status.replace(/_/g, ' ')}</Badge>
            <span>{match.sport?.name} • {match.city?.name}</span>
          </div>
          <div>{new Date(match.scheduledAt).toLocaleString()}</div>
        </div>

        {/* Live Score Ticker */}
        <div className="py-8 grid grid-cols-3 items-center text-center">
          <div className="space-y-2">
            <div className="text-xl sm:text-2xl font-black text-white">{match.homeTeam?.name}</div>
            <div className="text-4xl sm:text-6xl font-black text-emerald-400">{match.homeScore}</div>
          </div>

          <div className="text-xs font-black text-slate-500 uppercase tracking-widest">
            {match.isLocked ? (
              <span className="px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center gap-1 mx-auto max-w-[140px]">
                <Lock className="w-3.5 h-3.5" /> LOCKED
              </span>
            ) : (
              'LIVE SCORING'
            )}
          </div>

          <div className="space-y-2">
            <div className="text-xl sm:text-2xl font-black text-white">{match.awayTeam?.name}</div>
            <div className="text-4xl sm:text-6xl font-black text-emerald-400">{match.awayScore}</div>
          </div>
        </div>

        {/* Official Lock Action */}
        {!match.isLocked && (
          <div className="pt-6 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleVerifyAndLock}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center space-x-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Verify Result & Lock Official Stats</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Scorer Input Panel (when not locked) */}
        {!match.isLocked && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              Record Score Event
            </h2>

            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Team</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                >
                  <option value={match.homeTeamId}>{match.homeTeam?.name}</option>
                  <option value={match.awayTeamId}>{match.awayTeam?.name}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                >
                  {sportCode === 'CRICKET' && (
                    <>
                      <option value="RUNS">Runs Scored</option>
                      <option value="WICKET">Wicket Fall</option>
                    </>
                  )}
                  {sportCode === 'FOOTBALL' && (
                    <>
                      <option value="GOAL">Goal</option>
                      <option value="CARD">Card</option>
                    </>
                  )}
                  {sportCode === 'VOLLEYBALL' && (
                    <>
                      <option value="POINT">Point</option>
                      <option value="ACE">Ace</option>
                      <option value="BLOCK">Block</option>
                    </>
                  )}
                  {(sportCode === 'BADMINTON' || sportCode === 'TABLE_TENNIS') && (
                    <option value="POINT">Point Won</option>
                  )}
                  {sportCode === 'SNOOKER' && (
                    <>
                      <option value="FRAME_POINT">Frame Points</option>
                      <option value="FRAME_WON">Frame Won</option>
                    </>
                  )}
                </select>
              </div>

              {sportCode === 'CRICKET' && eventType === 'RUNS' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Runs</label>
                  <select
                    value={runsValue}
                    onChange={(e) => setRunsValue(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  >
                    <option value="1">1 Run</option>
                    <option value="2">2 Runs</option>
                    <option value="3">3 Runs</option>
                    <option value="4">4 Runs (Boundary)</option>
                    <option value="6">6 Runs (Six)</option>
                  </select>
                </div>
              )}

              {sportCode === 'FOOTBALL' && eventType === 'CARD' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Card Type</label>
                  <select
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  >
                    <option value="YELLOW">Yellow Card</option>
                    <option value="RED">Red Card</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs shadow transition"
              >
                {submitting ? 'Recording...' : 'Log Event to Scorebook'}
              </button>
            </form>
          </div>
        )}

        {/* Live Score Event Log */}
        <div className={match.isLocked ? "lg:col-span-3 space-y-4" : "lg:col-span-2 space-y-4"}>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Official Score Events Timeline ({scorebook?.events?.length || 0})
          </h2>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-800">
              {scorebook?.events?.map((ev: any) => (
                <div key={ev.id} className="p-4 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <Badge variant={ev.eventType === 'GOAL' || ev.eventType === 'WICKET' ? 'green' : 'blue'}>
                      {ev.eventType}
                    </Badge>
                    <span className="font-bold text-white">{ev.team?.name || 'Team'}</span>
                    <span className="text-slate-400">{ev.minuteOrBall || ''}</span>
                  </div>
                  <span className="text-slate-500 font-mono">{new Date(ev.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
""")

print('[DONE] Frontend Part 4 written.')
