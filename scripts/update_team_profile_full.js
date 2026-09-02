const fs = require('fs');

const pageCode = `'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Shield,
  MapPin,
  Trophy,
  Users,
  Calendar,
  Image as ImageIcon,
  Award,
  Phone,
  Mail,
  Plus,
  CheckCircle2,
  Clock,
  ArrowLeft,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function TeamProfilePage() {
  const params = useParams();
  const id = params?.id as string;

  const [teamData, setTeamData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'roster' | 'alumni' | 'matches' | 'performance' | 'photos' | 'about'>('roster');
  const [loading, setLoading] = useState(true);

  // Join Request Modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMsg, setJoinMsg] = useState('');
  const [submittingJoin, setSubmittingJoin] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamProfile();
    fetchCurrentUser();
  }, [id]);

  const fetchTeamProfile = async () => {
    try {
      const res = await fetch(`/api/teams/${id}`);
      const data = await res.json();
      if (res.ok) setTeamData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.user) setCurrentUser(data.user);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingJoin(true);
    setJoinError(null);

    try {
      const res = await fetch(`/api/teams/${id}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: joinMsg }),
      });
      const data = await res.json();

      if (res.ok) {
        setJoinSuccess(true);
        setTimeout(() => {
          setShowJoinModal(false);
          setJoinSuccess(false);
          setJoinMsg('');
        }, 2000);
      } else {
        setJoinError(data.error || 'Failed to submit join request');
      }
    } catch (err: any) {
      setJoinError(err.message);
    } finally {
      setSubmittingJoin(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading Squad Profile...</div>;
  }

  if (!teamData?.team) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <h1 className="text-xl font-bold text-white">Squad Not Found</h1>
        <p className="text-xs text-slate-400">The requested team profile does not exist or has been removed.</p>
        <Link href="/teams" className="inline-block px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl">
          &larr; Back to Teams Directory
        </Link>
      </div>
    );
  }

  const team = teamData.team;
  const metrics = teamData.metrics || { matchesPlayed: 0, wins: 0, losses: 0, draws: 0, points: 0, rankingPosition: null };
  const activeMembers = teamData.activeMembers || [];
  const formerMembers = teamData.formerMembers || [];
  const matches = teamData.matches || [];
  const matchPhotos = team.matchPhotos || [];

  const upcomingMatches = matches.filter((m: any) => m.status !== 'OFFICIAL_VERIFIED' && !m.isLocked);
  const recentResults = matches.filter((m: any) => m.status === 'OFFICIAL_VERIFIED' || m.isLocked);

  const winRate = metrics.matchesPlayed > 0 ? Math.round((metrics.wins / metrics.matchesPlayed) * 100) : 0;

  const isCaptain = currentUser?.id === team.captainId;
  const isMember = activeMembers.some((m: any) => m.playerId === currentUser?.id);

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6">
      {/* Top Breadcrumb */}
      <Link href="/teams" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition font-bold">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Squads Directory</span>
      </Link>

      {/* Main Squad Header Banner */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-emerald-400 font-black text-2xl overflow-hidden shadow-inner flex-shrink-0">
              {team.logoUrl ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" /> : team.code}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{team.name}</h1>
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
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <Link href={`/cities/${team.city?.slug || team.cityId}`} className="hover:text-emerald-400 font-bold transition flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{team.city?.name}</span>
                </Link>
                <span>&bull;</span>
                <Link href={`/sports/${team.sport?.slug || team.sportId}`} className="hover:text-emerald-400 font-bold transition flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{team.sport?.name}</span>
                </Link>
                {team.homeGround && (
                  <>
                    <span>&bull;</span>
                    <span className="text-slate-300 flex items-center gap-1">
                      <span>Home Ground:</span>
                      <strong className="text-white">{team.homeGround.name}</strong>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isCaptain ? (
              <Link
                href="/captain"
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs transition shadow-lg flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                <span>Captain Dashboard &rarr;</span>
              </Link>
            ) : isMember ? (
              <div className="px-5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Active Squad Member</span>
              </div>
            ) : (
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs transition shadow-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Request to Join Squad</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-8 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-slate-800/50 text-center">
            <span className="block text-xl font-black text-white">{metrics.matchesPlayed}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Matches</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-800/50 text-center">
            <span className="block text-xl font-black text-emerald-400">{metrics.wins}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Wins</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-800/50 text-center">
            <span className="block text-xl font-black text-rose-400">{metrics.losses}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Losses</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-800/50 text-center">
            <span className="block text-xl font-black text-slate-300">{metrics.draws}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Draws</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-800/50 text-center">
            <span className="block text-xl font-black text-amber-400">{metrics.points}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Points</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-800/50 text-center">
            <span className="block text-xl font-black text-purple-400">
              {metrics.rankingPosition ? `#${metrics.rankingPosition}` : 'Unranked'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">City Rank</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs font-bold overflow-x-auto scrollbar-none">
        {[
          { id: 'roster', label: `Active Players (${activeMembers.length})`, icon: Users },
          { id: 'matches', label: `Matches (${matches.length})`, icon: Calendar },
          { id: 'performance', label: 'Performance & Stats', icon: TrendingUp },
          { id: 'photos', label: `Winning Photos (${matchPhotos.length})`, icon: ImageIcon },
          { id: 'alumni', label: `Club Alumni (${formerMembers.length})`, icon: Award },
          { id: 'about', label: 'Club History & Bio', icon: Shield },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ACTIVE PLAYERS */}
      {activeTab === 'roster' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">Active Roster</h2>
                <p className="text-xs text-slate-400">Registered squad athletes eligible for official match competitions.</p>
              </div>
              <Badge variant="success">{activeMembers.length} Athletes</Badge>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Jersey</th>
                  <th className="p-4">Athlete Name</th>
                  <th className="p-4">Position / Role</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {activeMembers.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono font-bold text-emerald-400">#{m.jerseyNumber || '-'}</td>
                    <td className="p-4 font-bold text-white flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 text-xs">
                        {m.player?.fullName?.[0]}
                      </div>
                      <div>
                        <span>{m.player?.fullName}</span>
                        {m.player?.playerProfile?.position && (
                          <span className="block text-[10px] text-slate-400">{m.player.playerProfile.position}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={m.role === 'CAPTAIN' ? 'success' : 'neutral'}>{m.role}</Badge>
                    </td>
                    <td className="p-4 text-slate-400">{new Date(m.joinedAt).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <Badge variant="success">ACTIVE</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Captain Contact Widget */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Captain</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-emerald-400">
                  {team.captain?.fullName?.[0]}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{team.captain?.fullName}</h4>
                  <span className="text-xs text-emerald-400 font-medium">Head Squad Captain</span>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
                {team.contactPhone && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{team.contactPhone}</span>
                  </div>
                )}
                {team.contactEmail && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{team.contactEmail}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MATCHES (RECENT RESULTS & UPCOMING FIXTURES) */}
      {activeTab === 'matches' && (
        <div className="space-y-8">
          {/* Upcoming Matches */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Upcoming Fixtures ({upcomingMatches.length})</span>
              </h2>
            </div>

            {upcomingMatches.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No upcoming fixtures scheduled at this time.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingMatches.map((m: any) => (
                  <div key={m.id} className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 font-medium">{new Date(m.scheduledAt).toLocaleString()}</span>
                      <Badge variant="gold">UPCOMING</Badge>
                    </div>
                    <div className="text-sm font-bold text-white flex items-center justify-between">
                      <span className={m.homeTeamId === team.id ? 'text-emerald-400' : ''}>{m.homeTeam?.name}</span>
                      <span className="text-xs text-slate-500 px-2">vs</span>
                      <span className={m.awayTeamId === team.id ? 'text-emerald-400' : ''}>{m.awayTeam?.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span>{m.ground?.name || 'Local Ground'}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Results */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <span>Recent Match Results ({recentResults.length})</span>
              </h2>
            </div>

            {recentResults.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No verified match results recorded yet for this season.</p>
            ) : (
              <div className="space-y-3">
                {recentResults.map((m: any) => {
                  const isWinner = m.winnerTeamId === team.id;
                  const isDraw = !m.winnerTeamId;
                  return (
                    <div key={m.id} className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700 flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {m.homeTeam?.name} <span className="text-slate-500">vs</span> {m.awayTeam?.name}
                          </span>
                          <Badge variant={isWinner ? 'success' : isDraw ? 'neutral' : 'danger'}>
                            {isWinner ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT'}
                          </Badge>
                        </div>
                        <span className="text-slate-400 text-[11px] block">
                          {new Date(m.scheduledAt).toLocaleDateString()} &bull; {m.ground?.name || 'Local Ground'}
                        </span>
                      </div>
                      <Badge variant="success">VERIFIED</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PERFORMANCE & ANALYTICS */}
      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl md:col-span-2">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Squad Analytics & Win Rate</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 text-center">
                <span className="block text-2xl font-black text-emerald-400">{winRate}%</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Win Ratio</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 text-center">
                <span className="block text-2xl font-black text-white">{metrics.matchesPlayed}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Fixtures Played</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 text-center">
                <span className="block text-2xl font-black text-amber-400">{metrics.points}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Standings Points</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 text-center">
                <span className="block text-2xl font-black text-purple-400">
                  {metrics.rankingPosition ? `#${metrics.rankingPosition}` : 'Unranked'}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Municipal Rank</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-xs text-slate-300 space-y-2">
              <h3 className="font-bold text-white text-sm">Competitive Performance Record</h3>
              <p className="text-slate-400 leading-relaxed">
                Rankings and standings are dynamically calculated by the official Sports Community rankings engine following match scorebook verification.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-base font-black text-white">Standings Breakdown</h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                <span>Wins (+3 pts)</span>
                <strong className="text-emerald-400">{metrics.wins}</strong>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                <span>Draws (+1 pt)</span>
                <strong className="text-slate-200">{metrics.draws}</strong>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                <span>Losses (0 pts)</span>
                <strong className="text-rose-400">{metrics.losses}</strong>
              </div>
              <div className="flex justify-between py-2 text-slate-300 font-bold">
                <span>Total Accumulated Points</span>
                <strong className="text-amber-400 text-sm">{metrics.points}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WINNING PHOTOS */}
      {activeTab === 'photos' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h2 className="text-lg font-black text-white">Winning Photos & Championship Celebrations</h2>
          {matchPhotos.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No championship or victory photos uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {matchPhotos.map((photo: any) => (
                <div key={photo.id} className="rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 space-y-1">
                  <img src={photo.photoUrl} alt={photo.caption || 'Match celebration photo'} className="w-full h-36 object-cover" />
                  {photo.caption && <p className="p-2 text-[11px] text-slate-300 truncate">{photo.caption}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CLUB ALUMNI (HISTORICAL PRESERVATION) */}
      {activeTab === 'alumni' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
            <h2 className="text-lg font-black text-white">Historical Club Alumni</h2>
            <p className="text-xs text-slate-400">
              In accordance with Sports Community rules, historical squad membership records are permanently retained in club archives.
            </p>
          </div>

          {formerMembers.length === 0 ? (
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-500">
              No historical alumni transfers on record. All founding athletes remain active.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {formerMembers.map((fm: any) => (
                <div key={fm.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white text-sm block">{fm.player.fullName}</span>
                    <span className="text-[10px] text-slate-400">Joined: {new Date(fm.joinedAt).toLocaleDateString()}</span>
                    <span className="text-[10px] text-slate-500 block">Departed: {new Date(fm.leftAt).toLocaleDateString()}</span>
                  </div>
                  <Badge variant="neutral">FORMER</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: ABOUT & RECRUITMENT */}
      {activeTab === 'about' && (
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl max-w-3xl">
          <div className="space-y-2">
            <h2 className="text-lg font-black text-white">Club Biography & Athletic Ambition</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {team.description || 'No biography entered for this squad.'}
            </p>
          </div>

          {team.playerRequirements && (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1 text-xs">
              <span className="font-black text-emerald-400 uppercase text-[10px] tracking-wider">Recruitment Requirements</span>
              <p className="text-slate-200">{team.playerRequirements}</p>
            </div>
          )}
        </div>
      )}

      {/* Join Request Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Request to Join {team.name}</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-slate-400 hover:text-white">&times;</button>
            </div>

            {joinSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 text-xs font-bold text-center">
                Join request sent to Captain {team.captain?.fullName}!
              </div>
            ) : (
              <form onSubmit={handleSendJoinRequest} className="space-y-4">
                {joinError && <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs">{joinError}</div>}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Note to Captain</label>
                  <textarea
                    rows={3}
                    placeholder="Introduce yourself, your primary playing position, and athletic experience..."
                    value={joinMsg}
                    onChange={(e) => setJoinMsg(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingJoin}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition"
                >
                  Send Join Request &rarr;
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/app/teams/[id]/page.tsx', pageCode.trim() + '\n', 'utf8');
console.log('Successfully written enhanced src/app/teams/[id]/page.tsx');
