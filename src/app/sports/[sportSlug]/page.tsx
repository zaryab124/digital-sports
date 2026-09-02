'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Trophy, Users, Shield, ArrowRight, Plus, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function SportDetailsPage() {
  const params = useParams();
  const sportSlug = params?.sportSlug as string;

  const [data, setData] = useState<any>(null);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sportSlug) {
      Promise.all([
        fetch(`/api/sports/${sportSlug}`).then((r) => r.json()),
        fetch('/api/cities').then((r) => r.json()),
      ])
        .then(([sportData, cityData]) => {
          setData(sportData);
          setCities(cityData.cities || []);
        })
        .finally(() => setLoading(false));
    }
  }, [sportSlug]);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading Sport Hub...</div>;
  if (!data?.sport) return <div className="text-center py-20 text-slate-400">Sport not found.</div>;

  const sport = data.sport;
  const teams = sport.teams || [];
  const rankings = data.rankings || [];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-4xl shrink-0">
            {sport.icon || '🏅'}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Badge variant="green">{sport.category?.name?.replace(/_/g, ' ')}</Badge>
              <Badge variant="gold">Fee: PKR {sport.registrationFee}</Badge>
            </div>
            <h1 className="text-3xl font-black text-white">{sport.name} Championship</h1>
            <p className="text-xs text-slate-400 max-w-2xl">{sport.description}</p>
          </div>
        </div>

        <Link
          href="/teams/create"
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition shrink-0 flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Register New {sport.name} Club</span>
        </Link>
      </div>

      {/* Grid: City-Specific Compound Hubs */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-400" />
          Browse {sport.name} by City (Compound Hubs)
        </h2>
        <p className="text-xs text-slate-400">
          Select a city below to view dedicated {sport.name} standings, active squads, local grounds, and upcoming fixtures in that municipality.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cities.map((city) => (
            <Link
              key={city.id}
              href={`/cities/${city.slug || city.id}/${sport.slug || sport.code.toLowerCase()}`}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition block space-y-2 group shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-white group-hover:text-emerald-400 transition">{city.name}</span>
                <Badge variant="green">{city.code}</Badge>
              </div>
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>View {city.name} {sport.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Regional Top Rankings */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          South Punjab {sport.name} Leaderboard
        </h2>

        {rankings.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
            No official rankings computed for {sport.name} yet.
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-4">Rank</th>
                  <th className="p-4">Club / Squad</th>
                  <th className="p-4">City</th>
                  <th className="p-4 text-center">Points</th>
                  <th className="p-4 text-right">NRR / Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rankings.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-bold text-emerald-400">#{r.rankPosition}</td>
                    <td className="p-4 font-bold text-white">{r.team?.name}</td>
                    <td className="p-4 text-slate-400">{r.team?.city?.name}</td>
                    <td className="p-4 font-black text-center text-white">{r.points}</td>
                    <td className="p-4 text-right text-slate-400">{r.goalDiffOrNrr?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
