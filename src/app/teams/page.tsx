'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Plus, Users, MapPin, Trophy, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function TeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [selectedSport, setSelectedSport] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/teams').then((r) => r.json()),
      fetch('/api/sports').then((r) => r.json()),
      fetch('/api/cities').then((r) => r.json()),
    ]).then(([teamsData, sportsData, citiesData]) => {
      setTeams(teamsData.teams || []);
      setSports(sportsData.sports || []);
      setCities(citiesData.cities || []);
    }).finally(() => setLoading(false));
  }, []);

  const filteredTeams = teams.filter((t) => {
    if (selectedSport !== 'ALL' && t.sportId !== selectedSport) return false;
    if (selectedCity !== 'ALL' && t.cityId !== selectedCity) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase()) && !t.code.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Registered Squads & Clubs</h1>
          <p className="text-xs text-slate-400 mt-1">Official registered sports squads and clubs across South Punjab</p>
        </div>
        <Link
          href="/teams/create"
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs flex items-center gap-2 shadow-lg transition"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Squad &rarr;</span>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-4 p-4 rounded-3xl bg-slate-900 border border-slate-800">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by team name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
          />
        </div>

        <select
          value={selectedSport}
          onChange={(e) => setSelectedSport(e.target.value)}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white"
        >
          <option value="ALL">All Sports</option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white"
        >
          <option value="ALL">All Cities</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading Squads Directory...</div>
      ) : filteredTeams.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <Shield className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Squads Found</h3>
          <p className="text-xs text-slate-400">No registered clubs matched your selected filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition flex flex-col justify-between space-y-4 shadow-sm group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge
                    variant={
                      team.status === 'ACTIVE'
                        ? 'success'
                        : team.status === 'PENDING_APPROVAL' || team.status === 'PAYMENT_SUBMITTED'
                        ? 'gold'
                        : team.status === 'REJECTED'
                        ? 'danger'
                        : 'neutral'
                    }
                  >
                    {team.status}
                  </Badge>
                  <span className="text-xs text-slate-400 font-bold">{team.sport?.name}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-emerald-400 text-sm overflow-hidden">
                    {team.logoUrl ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" /> : team.code}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition">{team.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      {team.city?.name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Captain: <strong className="text-slate-200">{team.captain?.fullName}</strong></span>
                <span>{team._count?.members || 0} Players</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
