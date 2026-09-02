'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Trophy, Users, MapPin, Calendar, Activity, ArrowLeft, Plus, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function CitySportCompoundHubPage() {
  const params = useParams();
  const citySlug = params?.citySlug as string;
  const sportSlug = params?.sportSlug as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (citySlug && sportSlug) {
      fetch(`/api/cities/${citySlug}/${sportSlug}`)
        .then((r) => r.json())
        .then((d) => setData(d))
        .finally(() => setLoading(false));
    }
  }, [citySlug, sportSlug]);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading City Sport Hub...</div>;
  if (!data?.city || !data?.sport) return <div className="text-center py-20 text-slate-400">Hub not found.</div>;

  const city = data.city;
  const sport = data.sport;
  const teams = data.teams || [];
  const grounds = data.grounds || [];
  const standings = data.standings || [];
  const matches = data.matches || [];
  const topPlayers = data.topPlayers || [];

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-xs text-slate-400">
        <Link href="/cities" className="hover:text-emerald-400 transition">Cities</Link>
        <span>/</span>
        <Link href={`/cities/${city.slug || city.id}`} className="hover:text-emerald-400 transition">{city.name}</Link>
        <span>/</span>
        <span className="text-white font-bold">{sport.name}</span>
      </div>

      {/* Main Hub Hero */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-4xl shrink-0">
            {sport.icon || '🏅'}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Badge variant="green">{city.name} Official</Badge>
              <Badge variant="gold">Registration: PKR {sport.registrationFee}</Badge>
            </div>
            <h1 className="text-3xl font-black text-white">{city.name} {sport.name} Hub</h1>
            <p className="text-xs text-slate-400">
              Grassroots squads, municipal standings, hosting stadiums, and live scorebooks in {city.name}.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href="/teams/create"
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Register {city.name} Squad</span>
          </Link>
        </div>
      </div>

      {/* Section 1: City Standings & Teams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Standings Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-400" />
              {city.name} {sport.name} Standings
            </h2>
            <span className="text-xs text-slate-400">{standings.length} Ranked Clubs</span>
          </div>

          {standings.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
              No league standings recorded in {city.name} yet.
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-4">Pos</th>
                    <th className="p-4">Squad Name</th>
                    <th className="p-4 text-center">Points</th>
                    <th className="p-4 text-right">NRR / Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {standings.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-bold text-emerald-400">#{s.rankPosition}</td>
                      <td className="p-4 font-bold text-white">
                        <Link href={`/teams/${s.team?.id}`} className="hover:text-emerald-400 transition">
                          {s.team?.name}
                        </Link>
                      </td>
                      <td className="p-4 font-black text-center text-white">{s.points}</td>
                      <td className="p-4 text-right text-slate-400">{s.goalDiffOrNrr?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Col: Active Squads in this City */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Registered Clubs ({teams.length})
          </h2>

          <div className="space-y-3">
            {teams.map((t: any) => (
              <Link
                key={t.id}
                href={`/teams/${t.id}`}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition block space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{t.name}</span>
                  <Badge variant="green">{t.code}</Badge>
                </div>
                <div className="text-xs text-slate-400">Captain: {t.captain?.fullName}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: Grounds & Fixtures in City for Sport */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Grounds */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            Stadiums & Grounds Hosting {sport.name}
          </h2>

          {grounds.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs text-center">
              No designated grounds found for {sport.name} in {city.name}.
            </div>
          ) : (
            <div className="space-y-3">
              {grounds.map((g: any) => (
                <div key={g.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm">{g.name}</h3>
                    <Badge variant="green">Capacity: {g.capacity?.toLocaleString()}</Badge>
                  </div>
                  <p className="text-xs text-slate-400">{g.address}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Matches */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Matches in {city.name}
          </h2>

          {matches.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs text-center">
              No recent or upcoming fixtures recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((m: any) => (
                <div key={m.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant={m.isLocked ? 'gold' : 'green'}>{m.status.replace(/_/g, ' ')}</Badge>
                    <span className="text-slate-400">{new Date(m.scheduledAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm font-bold text-white">
                    {m.homeTeam?.name} vs {m.awayTeam?.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
