'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Trophy, Shield, Activity, Search, Users, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function CitiesDirectoryPage() {
  const [cities, setCities] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cities')
      .then((r) => r.json())
      .then((d) => setCities(d.cities || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = cities.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.region?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <Badge variant="green">MULTI-CITY NETWORK</Badge>
          <h1 className="text-3xl font-black text-white">South Punjab Sports Cities</h1>
          <p className="text-xs text-slate-400">
            Explore grassroots sports hubs, local stadiums, community leagues, and active athlete rosters across all 7 regional centers.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search city or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading Sports Cities...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
          No cities found matching &quot;{search}&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((city) => (
            <Link
              key={city.id}
              href={`/cities/${city.slug || city.id}`}
              className="group rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition overflow-hidden shadow-lg flex flex-col justify-between"
            >
              {city.imageUrl && (
                <div className="h-44 w-full relative overflow-hidden bg-slate-800">
                  <img
                    src={city.imageUrl}
                    alt={city.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-80 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                  <div className="absolute top-3 left-3">
                    <Badge variant="green">{city.code}</Badge>
                  </div>
                </div>
              )}

              <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition">
                      {city.name}
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-400">{city.region?.name}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                    {city.description || 'Active sports hub fostering grassroots talent and regional tournaments.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-800/60">
                    <div className="font-bold text-white">{city._count?.grounds || 0}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Grounds</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/60">
                    <div className="font-bold text-emerald-400">{city._count?.teams || 0}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Teams</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/60">
                    <div className="font-bold text-amber-400">{city._count?.matches || 0}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Matches</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
