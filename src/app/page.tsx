'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Users, MapPin, Activity, Shield, ArrowRight, Star, Calendar, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function HomePage() {
  const [cities, setCities] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [topRankings, setTopRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [citiesRes, sportsRes, matchesRes, rankingsRes] = await Promise.all([
          fetch('/api/cities'),
          fetch('/api/sports'),
          fetch('/api/matches'),
          fetch('/api/rankings?type=TEAMS'),
        ]);

        const citiesData = await citiesRes.json();
        const sportsData = await sportsRes.json();
        const matchesData = await matchesRes.json();
        const rankingsData = await rankingsRes.json();

        setCities(citiesData.cities || []);
        setSports(sportsData.sports || []);
        setMatches(matchesData.matches || []);
        setTopRankings(rankingsData.teamRankings || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-12">
      
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 border border-slate-800 p-8 sm:p-12 shadow-2xl">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide uppercase">
            <Zap className="w-3.5 h-3.5" />
            <span>Official Multi-City Sports Platform</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Elevating Grassroots Sports in <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">South Punjab</span>
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Real digital scorebooks, verified team rosters, player transfer market, and regional rankings across 7 cities. From Jampur to Multan, every match counts.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/register"
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition"
            >
              <span>Register Team or Athlete</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/matches"
              className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition"
            >
              Live Scorecards
            </Link>
          </div>
        </div>
      </section>

      {/* Multi-City Communities Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <MapPin className="w-6 h-6 text-emerald-400" />
              Regional Sports Communities
            </h2>
            <p className="text-xs text-slate-400 mt-1">Browse teams, tournaments, and scorebooks by city without changing your home city</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cities.map((city) => (
            <Link
              key={city.id}
              href={`/community/${city.code.toLowerCase()}`}
              className="group p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm transition">
                    {city.code}
                  </div>
                  <Badge variant="green">{city._count?.teams || 0} Teams</Badge>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition">{city.name}</h3>
                  <p className="text-xs text-slate-400">{city.region?.name}, {city.region?.province?.name}</p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-emerald-400 transition">
                <span>View Community Hub</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Live & Recent Matches */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-400" />
              Featured Match Action
            </h2>
            <p className="text-xs text-slate-400 mt-1">Real digital scorebooks and official results verified by certified scorers</p>
          </div>
          <Link href="/matches" className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1">
            View All Fixtures &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.slice(0, 3).map((match) => (
            <div key={match.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between text-xs">
                <Badge variant={match.status === 'OFFICIAL_VERIFIED' ? 'gold' : match.status === 'SCHEDULED' ? 'blue' : 'green'}>
                  {match.status.replace(/_/g, ' ')}
                </Badge>
                <span className="text-slate-400 font-medium">{match.sport?.name} • {match.city?.name}</span>
              </div>

              {/* Teams & Score */}
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between font-bold text-white text-base">
                  <span className="truncate">{match.homeTeam?.name}</span>
                  <span className="text-xl font-black text-emerald-400 ml-2">{match.homeScore}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-white text-base">
                  <span className="truncate">{match.awayTeam?.name}</span>
                  <span className="text-xl font-black text-emerald-400 ml-2">{match.awayScore}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">{new Date(match.scheduledAt).toLocaleDateString()}</span>
                <Link
                  href={`/matches/${match.id}/scorebook`}
                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                >
                  Digital Scorebook &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Team Rankings */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              Official Team Leaderboards
            </h2>
            <p className="text-xs text-slate-400 mt-1">Calculated directly from official locked scorebooks</p>
          </div>
          <Link href="/rankings" className="text-xs font-bold text-emerald-400 hover:underline">
            Full Leaderboards &rarr;
          </Link>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs uppercase font-bold text-slate-400">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Team</th>
                  <th className="px-6 py-4">Sport</th>
                  <th className="px-6 py-4">City</th>
                  <th className="px-6 py-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {topRankings.slice(0, 5).map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-800/50 transition">
                    <td className="px-6 py-4 font-black text-white">
                      {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${r.rankPosition}`}
                    </td>
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                      <span>{r.team?.name}</span>
                    </td>
                    <td className="px-6 py-4">{r.sport?.name}</td>
                    <td className="px-6 py-4 text-slate-400">{r.city?.name}</td>
                    <td className="px-6 py-4 text-right font-black text-emerald-400 text-base">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </div>
  );
}
