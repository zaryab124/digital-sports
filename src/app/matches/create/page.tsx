'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Shield,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';

export default function CreateMatchPage() {
  const router = useRouter();
  const [sports, setSports] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [grounds, setGrounds] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  const [sportId, setSportId] = useState('');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [groundId, setGroundId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [format, setFormat] = useState('T20');
  const [rules, setRules] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Default kickoff time to tomorrow 4:00 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(16, 0, 0, 0);
    setScheduledAt(tomorrow.toISOString().slice(0, 16));

    Promise.all([
      fetch('/api/sports').then((r) => r.json()),
      fetch('/api/teams?status=ACTIVE').then((r) => r.json()),
      fetch('/api/grounds').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
    ]).then(([s, t, g, me]) => {
      setSports(s.sports || []);
      setTeams(t.teams || []);
      setGrounds(g.grounds || []);
      setUser(me.user);

      if (s.sports?.length) setSportId(s.sports[0].id);
    });
  }, []);

  const filteredTeams = teams.filter((t) => !sportId || t.sportId === sportId);

  useEffect(() => {
    if (filteredTeams.length > 0) {
      setHomeTeamId(filteredTeams[0].id);
      if (filteredTeams.length > 1) {
        setAwayTeamId(filteredTeams[1].id);
      } else {
        setAwayTeamId('');
      }
    }
  }, [sportId]);

  const handleSubmit = async (isDraft: boolean) => {
    setError('');
    setLoading(true);

    try {
      if (homeTeamId === awayTeamId) {
        throw new Error('Home squad and away opponent must be different clubs.');
      }

      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sportId,
          homeTeamId,
          awayTeamId,
          groundId: groundId || undefined,
          scheduledAt: new Date(scheduledAt).toISOString(),
          format,
          rules: rules || undefined,
          notes: notes || undefined,
          isDraft,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule match');

      router.push(`/matches/${data.match?.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <Link
        href="/matches"
        className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Matches</span>
      </Link>

      <div className="space-y-1">
        <h1 className="text-3xl font-black text-white flex items-center gap-2">
          <Activity className="w-8 h-8 text-emerald-400" />
          <span>Propose Match Challenge</span>
        </h1>
        <p className="text-xs text-slate-400">
          Fixture lifecycle: Propose &rarr; Opponent Review &rarr; Dual Captain Agreement &rarr; Admin Sanction &rarr; Live Scorebook.
        </p>
      </div>

      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 text-xs">
          {/* Sport & Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-300 uppercase mb-1.5">Sport Discipline</label>
              <select
                value={sportId}
                onChange={(e) => setSportId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold"
              >
                {sports.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase mb-1.5">Match Format</label>
              <input
                type="text"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder="e.g. T20, 50-Overs, 90-Mins, Best of 5"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          {/* Squad Clash Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-emerald-400 uppercase mb-1.5">Home Squad (Host)</label>
              <select
                value={homeTeamId}
                onChange={(e) => setHomeTeamId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold"
              >
                {filteredTeams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.city?.name})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-purple-400 uppercase mb-1.5">Away Squad (Opponent)</label>
              <select
                value={awayTeamId}
                onChange={(e) => setAwayTeamId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold"
              >
                {filteredTeams
                  .filter((t) => t.id !== homeTeamId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.city?.name})</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Venue Ground & Kickoff Date/Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-300 uppercase mb-1.5">Venue Ground</label>
              <select
                value={groundId}
                onChange={(e) => setGroundId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold"
              >
                <option value="">-- Select Allocated Ground --</option>
                {grounds.map((g) => (
                  <option key={g.id} value={g.id}>{g.name} ({g.city?.name})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase mb-1.5">Kickoff Date & Time</label>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          {/* Special Rules & Notes */}
          <div>
            <label className="block font-bold text-slate-300 uppercase mb-1.5">Ground Rules / Pitch Conditions</label>
            <textarea
              rows={2}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="e.g. White leather ball, turf pitch, boundary markers at 65 meters..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 uppercase mb-1.5">Captain Instructions / Special Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Reporting time 3:30 PM, kit color: Navy Blue..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={loading || !homeTeamId || !awayTeamId}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition"
            >
              Save as Draft
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={loading || !homeTeamId || !awayTeamId || !scheduledAt}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs shadow-xl transition flex items-center gap-2"
            >
              <span>{loading ? 'Submitting...' : 'Propose Official Match Challenge &rarr;'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
