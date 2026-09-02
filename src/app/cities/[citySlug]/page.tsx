'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MapPin, Trophy, Shield, Activity, Users, ArrowRight, MessageSquare, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function CityDetailsPage() {
  const params = useParams();
  const citySlug = params?.citySlug as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'OVERVIEW' | 'SPORTS' | 'GROUNDS' | 'TEAMS' | 'COMMUNITY'>('OVERVIEW');

  useEffect(() => {
    if (citySlug) {
      fetch(`/api/cities/${citySlug}`)
        .then((r) => r.json())
        .then((d) => setData(d))
        .finally(() => setLoading(false));
    }
  }, [citySlug]);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading City Sports Hub...</div>;
  if (!data?.city) return <div className="text-center py-20 text-slate-400">City not found.</div>;

  const city = data.city;
  const sports = data.sports || [];
  const teams = city.teams || [];
  const grounds = city.grounds || [];
  const matches = city.matches || [];
  const posts = city.community?.posts || [];

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl relative">
        {city.imageUrl && (
          <div className="h-60 w-full relative">
            <img src={city.imageUrl} alt={city.name} className="w-full h-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
          </div>
        )}

        <div className="p-8 space-y-4 relative -mt-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <Badge variant="green">{city.code}</Badge>
                <span className="text-xs font-semibold text-slate-300">{city.region?.name}, Punjab</span>
              </div>
              <h1 className="text-4xl font-black text-white mt-1">{city.name} Sports Hub</h1>
            </div>

            <div className="flex gap-2">
              <Link
                href="/teams/create"
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Register Squad in {city.name}</span>
              </Link>
            </div>
          </div>

          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            {city.description || 'Official sports community and competitive athletic network.'}
          </p>

          {/* Quick Metrics */}
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
              <div className="text-xl font-bold text-white">{grounds.length}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Grounds</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
              <div className="text-xl font-bold text-emerald-400">{teams.length}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Registered Teams</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
              <div className="text-xl font-bold text-amber-400">{matches.length}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Recorded Matches</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
              <div className="text-xl font-bold text-white">{city._count?.users || 0}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Athletes & Fans</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setTab('OVERVIEW')}
          className={`px-5 py-2.5 rounded-xl transition shrink-0 ${tab === 'OVERVIEW' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Overview & Featured Sports
        </button>
        <button
          onClick={() => setTab('SPORTS')}
          className={`px-5 py-2.5 rounded-xl transition shrink-0 ${tab === 'SPORTS' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Sports ({sports.length})
        </button>
        <button
          onClick={() => setTab('GROUNDS')}
          className={`px-5 py-2.5 rounded-xl transition shrink-0 ${tab === 'GROUNDS' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Sports Grounds ({grounds.length})
        </button>
        <button
          onClick={() => setTab('TEAMS')}
          className={`px-5 py-2.5 rounded-xl transition shrink-0 ${tab === 'TEAMS' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Squads & Clubs ({teams.length})
        </button>
        <button
          onClick={() => setTab('COMMUNITY')}
          className={`px-5 py-2.5 rounded-xl transition shrink-0 ${tab === 'COMMUNITY' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Community Feed ({posts.length})
        </button>
      </div>

      {/* TAB CONTENT: OVERVIEW & SPORTS HUB */}
      {tab === 'OVERVIEW' && (
        <div className="space-y-8">
          
          {/* Sports in this City (Direct links to /cities/[citySlug]/[sportSlug]) */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-400" />
              Sports Played in {city.name} (Compound Hubs)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { name: 'Cricket', slug: 'cricket', icon: '🏏', desc: 'Leagues, T20 matches, and ball-by-ball scorebooks in ' + city.name },
                { name: 'Football', slug: 'football', icon: '⚽', desc: 'Local football clubs, 90-min matches, and standings in ' + city.name },
                { name: 'Volleyball', slug: 'volleyball', icon: '🏐', desc: 'Sets and points championships across ' + city.name + ' grounds' },
                { name: 'Badminton', slug: 'badminton', icon: '🏸', desc: 'Singles and doubles tournaments in ' + city.name },
                { name: 'Table Tennis', slug: 'table-tennis', icon: '🏓', desc: 'Indoor racket sports competitions in ' + city.name },
                { name: 'Snooker', slug: 'snooker', icon: '🎱', desc: 'Frames and break tournaments in ' + city.name },
              ].map((s) => (
                <Link
                  key={s.slug}
                  href={`/cities/${city.slug || city.id}/${s.slug}`}
                  className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition space-y-3 block shadow-md group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{s.icon}</span>
                    <span className="text-xs font-bold text-emerald-400 group-hover:underline flex items-center gap-1">
                      <span>View Hub</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition">{city.name} {s.name}</h3>
                  <p className="text-xs text-slate-400">{s.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Matches */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Recent & Upcoming Fixtures in {city.name}
            </h2>

            {matches.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                No matches scheduled in {city.name} yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.map((m: any) => (
                  <div key={m.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <Badge variant={m.isLocked ? 'gold' : 'green'}>{m.status.replace(/_/g, ' ')}</Badge>
                      <span className="text-slate-400">{m.sport?.name} • {new Date(m.scheduledAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm font-bold text-white">
                      {m.homeTeam?.name} vs {m.awayTeam?.name}
                    </div>
                    <div className="text-xs text-slate-400">{m.ground?.name || 'Local Sports Arena'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: GROUNDS */}
      {tab === 'GROUNDS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {grounds.map((g: any) => (
            <div key={g.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="green">Capacity: {g.capacity?.toLocaleString()} Spectators</Badge>
                <MapPin className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white">{g.name}</h3>
              <p className="text-xs text-slate-400">{g.address}</p>
            </div>
          ))}
        </div>
      )}

      {/* TAB: TEAMS */}
      {tab === 'TEAMS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {teams.map((t: any) => (
            <Link key={t.id} href={`/teams/${t.id}`} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 block hover:border-emerald-500/50 transition">
              <div className="flex items-center justify-between">
                <Badge variant="green">{t.sport?.name}</Badge>
                <span className="text-xs font-mono font-bold text-emerald-400">{t.code}</span>
              </div>
              <h3 className="text-base font-bold text-white">{t.name}</h3>
              <p className="text-xs text-slate-400">Captain: {t.captain?.fullName}</p>
            </Link>
          ))}
        </div>
      )}

      {/* TAB: COMMUNITY */}
      {tab === 'COMMUNITY' && (
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            {city.name} Community Wall
          </h3>
          <p className="text-xs text-slate-400">
            Athletes and fans from {city.name} discuss upcoming match fixtures, tournament schedules, and athlete recognitions.
          </p>
        </div>
      )}
    </div>
  );
}
