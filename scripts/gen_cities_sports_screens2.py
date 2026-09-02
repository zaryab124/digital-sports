import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Wrote screen:', path)

# 1. Sports Directory (/sports)
write_file('src/app/sports/page.tsx', """'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Users, Shield, ArrowRight, Award, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function SportsDirectoryPage() {
  const [sports, setSports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sports')
      .then((r) => r.json())
      .then((d) => setSports(d.sports || []))
      .finally(() => setLoading(false));
  }, []);

  const teamSports = sports.filter((s) => s.isTeamSport);
  const individualSports = sports.filter((s) => !s.isTeamSport);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <Badge variant="green">DYNAMIC SPORTS ECOSYSTEM</Badge>
          <h1 className="text-3xl font-black text-white">Official Core Sports</h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Browse official team and individual sports across South Punjab. Each sport includes custom rule engines, dynamic registration fees, and digital scorebook standards.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading Sports Ecosystem...</div>
      ) : (
        <div className="space-y-12">
          {/* Section 1: Team Sports */}
          <div className="space-y-5">
            <div className="flex items-center space-x-3">
              <span className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white">Team Sports</h2>
                <p className="text-xs text-slate-400">Squad-based competitions with squad rosters, player transfers, and league standings.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {teamSports.map((sport) => (
                <Link
                  key={sport.id}
                  href={`/sports/${sport.slug || sport.code.toLowerCase()}`}
                  className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition flex flex-col justify-between shadow-lg space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-4xl">{sport.icon || '🏅'}</span>
                      <Badge variant="green">Fee: PKR {sport.registrationFee || 1000}</Badge>
                    </div>
                    <h3 className="text-xl font-black text-white group-hover:text-emerald-400 transition">
                      {sport.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {sport.description || 'Competitive squad sports with verified scorebooks and dynamic rankings.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{sport.playersPerTeam} Players / Squad</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                      <span>Sport Hub</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Section 2: Individual Sports */}
          <div className="space-y-5">
            <div className="flex items-center space-x-3">
              <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Trophy className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white">Individual Sports</h2>
                <p className="text-xs text-slate-400">Singles and doubles athletic championships with individual player rankings.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {individualSports.map((sport) => (
                <Link
                  key={sport.id}
                  href={`/sports/${sport.slug || sport.code.toLowerCase()}`}
                  className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition flex flex-col justify-between shadow-lg space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-4xl">{sport.icon || '🏸'}</span>
                      <Badge variant="gold">Fee: PKR {sport.registrationFee || 500}</Badge>
                    </div>
                    <h3 className="text-xl font-black text-white group-hover:text-amber-400 transition">
                      {sport.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {sport.description || 'Precision racquet and cue sports with set and frame tracking.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{sport.registrationType} Registration</span>
                    <span className="font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                      <span>Sport Hub</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
""")

# 2. Dynamic Sport Hub (/sports/[sportSlug])
write_file('src/app/sports/[sportSlug]/page.tsx', """'use client';

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
""")

# 3. Compound City + Sport Hub (/cities/[citySlug]/[sportSlug])
write_file('src/app/cities/[citySlug]/[sportSlug]/page.tsx', """'use client';

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
""")

print('[DONE] Part 2 Screens generated.')
