'use client';

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
