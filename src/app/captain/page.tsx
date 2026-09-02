'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Shield, Users, UserPlus, Calendar, Trophy, FileText,
  DollarSign, ArrowRightLeft, Settings, Plus, CheckCircle2,
  XCircle, Clock, MapPin, Phone, Mail, AlertTriangle, Trash2
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

type CaptainTab =
  | 'my-team'
  | 'players'
  | 'requests'
  | 'matches'
  | 'results'
  | 'scorebook'
  | 'performance'
  | 'payments'
  | 'transfers'
  | 'settings';

function CaptainDashboardContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as CaptainTab) || 'my-team';
  const [activeTab, setActiveTab] = useState<CaptainTab>(initialTab);

  const [captainTeams, setCaptainTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamData, setTeamData] = useState<any>(null);
  const [grounds, setGrounds] = useState<any[]>([]);
  const [teamTransfers, setTeamTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [opponentTeamId, setOpponentTeamId] = useState('');
  const [matchGroundId, setMatchGroundId] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [availableOpponents, setAvailableOpponents] = useState<any[]>([]);

  const [editDesc, setEditDesc] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editGround, setEditGround] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editReqs, setEditReqs] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'EASYPAISA' | 'JAZZCASH' | 'BANK_TRANSFER' | 'CASH'>('EASYPAISA');
  const [txRef, setTxRef] = useState('');
  const [txProof, setTxProof] = useState('');

  const loadCaptainTeams = async () => {
    try {
      const userRes = await fetch('/api/users/profile');
      if (!userRes.ok) return;
      const userData = await userRes.json();
      const userId = userData.user?.id;
      if (!userId) return;

      const teamsRes = await fetch(`/api/teams?captainId=${userId}`);
      const teamsData = await teamsRes.json();
      const squads = teamsData.teams || [];
      setCaptainTeams(squads);

      if (squads.length > 0) {
        const tId = selectedTeamId || squads[0].id;
        setSelectedTeamId(tId);
        await loadTeamDetails(tId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/teams/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setTeamData(data);
        fetch(`/api/transfers?teamId=${id}`)
          .then((r) => r.json())
          .then((trData) => setTeamTransfers(trData.transfers || []))
          .catch(() => {});

      setEditDesc(data.team.description || '');
      setEditLogo(data.team.logoUrl || '');
      setEditGround(data.team.homeGroundId || '');
      setEditPhone(data.team.contactPhone || '');
      setEditEmail(data.team.contactEmail || '');
      setEditReqs(data.team.playerRequirements || '');

      if (data.team?.sportId) {
        fetch(`/api/teams?sportId=${data.team.sportId}`)
          .then((r) => r.json())
          .then((d) => {
            const opps = (d.teams || []).filter((t: any) => t.id !== id && t.status === 'ACTIVE');
            setAvailableOpponents(opps);
            if (opps.length) setOpponentTeamId(opps[0].id);
          });
      }

      fetch('/api/grounds')
        .then((r) => r.json())
        .then((d) => setGrounds(d.grounds || []));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCaptainTeams();
  }, []);

  const handleSelectTeam = (id: string) => {
    setSelectedTeamId(id);
    loadTeamDetails(id);
  };

  const handleInvitePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/teams/${selectedTeamId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerEmail: inviteEmail, message: inviteMsg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation');

      setMessage({ type: 'success', text: `Invitation sent to ${inviteEmail}!` });
      setInviteEmail('');
      setInviteMsg('');
      loadTeamDetails(selectedTeamId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespondRequest = async (reqId: string, action: 'ACCEPT' | 'DECLINE') => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/teams/${selectedTeamId}/requests/${reqId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process request');

      setMessage({ type: 'success', text: action === 'ACCEPT' ? 'Athlete added to squad!' : 'Request declined.' });
      loadTeamDetails(selectedTeamId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemovePlayer = async (memberId: string, playerName: string) => {
    if (!confirm(`Are you sure you want to remove ${playerName} from active squad? Their historical club record will be preserved in alumni archives.`)) return;

    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/teams/${selectedTeamId}/members/${memberId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove member');

      setMessage({ type: 'success', text: `${playerName} moved to historical alumni roster.` });
      loadTeamDetails(selectedTeamId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleProposeMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sportId: teamData.team.sportId,
          homeTeamId: selectedTeamId,
          awayTeamId: opponentTeamId,
          groundId: matchGroundId || undefined,
          scheduledAt: new Date(matchDate).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule match');

      setMessage({ type: 'success', text: 'Match fixture proposed successfully!' });
      setMatchDate('');
      loadTeamDetails(selectedTeamId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/teams/${selectedTeamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editDesc,
          logoUrl: editLogo || undefined,
          homeGroundId: editGround || null,
          contactPhone: editPhone,
          contactEmail: editEmail,
          playerRequirements: editReqs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');

      setMessage({ type: 'success', text: 'Squad profile settings saved!' });
      loadTeamDetails(selectedTeamId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      const paymentId = teamData.team.payments?.[0]?.id;
      if (!paymentId) throw new Error('No pending registration payment found');

      const res = await fetch(`/api/teams/${selectedTeamId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          paymentMethod,
          transactionReference: txRef,
          proofImageUrl: txProof || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit payment');

      setMessage({ type: 'success', text: 'Payment submitted! Status is now PENDING_APPROVAL.' });
      loadTeamDetails(selectedTeamId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading Captain Command Console...</div>;
  }

  if (captainTeams.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400">
          <Shield className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white">Captain Command Center</h1>
          <p className="text-slate-400 text-xs max-w-md mx-auto">
            You do not currently lead an active squad. Register your club in DRAFT status, pay the annual registration dues, and invite your athletes.
          </p>
        </div>
        <Link
          href="/teams/create"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs transition shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Squad &rarr;</span>
        </Link>
      </div>
    );
  }

  const team = teamData?.team;
  const metrics = teamData?.metrics || { matchesPlayed: 0, wins: 0, losses: 0, draws: 0, points: 0, rankingPosition: null };
  const activeMembers = teamData?.activeMembers || [];
  const formerMembers = teamData?.formerMembers || [];
  const matches = teamData?.matches || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 overflow-hidden font-black text-lg">
            {team?.logoUrl ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" /> : team?.code || 'TM'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">{team?.name}</h1>
              <Badge
                variant={
                  team?.status === 'ACTIVE'
                    ? 'success'
                    : team?.status === 'PENDING_APPROVAL' || team?.status === 'PAYMENT_SUBMITTED'
                    ? 'gold'
                    : team?.status === 'REJECTED'
                    ? 'danger'
                    : 'neutral'
                }
              >
                {team?.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
              <span>{team?.city?.name}</span>
              <span>&bull;</span>
              <span>{team?.sport?.name}</span>
              {team?.homeGround && (
                <>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    {team.homeGround.name}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {captainTeams.length > 1 && (
            <select
              value={selectedTeamId}
              onChange={(e) => handleSelectTeam(e.target.value)}
              className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold"
            >
              {captainTeams.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.sport?.name})</option>
              ))}
            </select>
          )}

          <Link
            href={`/teams/${selectedTeamId}`}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
          >
            Public Profile &rarr;
          </Link>
          <Link
            href="/teams/create"
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Squad</span>
          </Link>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">&times;</button>
        </div>
      )}

      {team?.status !== 'ACTIVE' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-amber-300">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>
              {team?.status === 'DRAFT' || team?.status === 'PENDING_PAYMENT'
                ? 'Your squad registration is currently in DRAFT status. Please submit the yearly registration fee to enable administrative approval.'
                : team?.status === 'PAYMENT_SUBMITTED' || team?.status === 'PENDING_APPROVAL'
                ? 'Payment proof submitted. Squad registration is undergoing City Sports Officer verification.'
                : 'Registration rejected. Please verify your team credentials and re-submit.'}
            </span>
          </div>
          {(team?.status === 'DRAFT' || team?.status === 'PENDING_PAYMENT') && (
            <button
              onClick={() => setActiveTab('payments')}
              className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg text-xs transition"
            >
              Pay Dues Now
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 text-xs font-bold scrollbar-none">
        {[
          { id: 'my-team', label: 'My Team', icon: Shield },
          { id: 'players', label: `Players (${activeMembers.length})`, icon: Users },
          { id: 'requests', label: `Pending Requests (${(team?.requests?.length || 0) + (team?.invitations?.length || 0)})`, icon: UserPlus },
          { id: 'matches', label: 'Matches', icon: Calendar },
          { id: 'results', label: 'Results', icon: Trophy },
          { id: 'scorebook', label: 'Scorebook', icon: FileText },
          { id: 'performance', label: 'Performance', icon: Trophy },
          { id: 'payments', label: 'Payments', icon: DollarSign },
          { id: 'transfers', label: 'Transfer Requests', icon: ArrowRightLeft },
          { id: 'settings', label: 'Team Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as CaptainTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'my-team' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h2 className="text-lg font-black text-white">Club Overview & Bio</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {team?.description || 'No biography or club statement has been entered yet. Navigate to Team Settings to add your club overview.'}
              </p>

              {team?.playerRequirements && (
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-1 text-xs">
                  <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">Recruitment Notice</span>
                  <p className="text-slate-200">{team.playerRequirements}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <span className="block text-2xl font-black text-white">{metrics.matchesPlayed}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Matches Played</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <span className="block text-2xl font-black text-emerald-400">{metrics.wins}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Wins</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <span className="block text-2xl font-black text-rose-400">{metrics.losses}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Losses</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <span className="block text-2xl font-black text-amber-400">{metrics.points}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">League Points</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Captain Credentials</h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-emerald-400">
                  {team?.captain?.fullName?.[0] || 'C'}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{team?.captain?.fullName}</h3>
                  <span className="text-xs text-emerald-400 font-medium">Head Team Captain</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 text-xs border-t border-slate-800">
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{team?.contactPhone || 'No contact phone set'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>{team?.contactEmail || 'No contact email set'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{team?.homeGround?.name || 'Municipal Ground'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'players' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">Active Squad Roster</h2>
              <p className="text-xs text-slate-400">Official registered athletes eligible for match scorebooks.</p>
            </div>
            <button
              onClick={() => setActiveTab('requests')}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Athlete</span>
            </button>
          </div>

          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Jersey</th>
                  <th className="p-4">Athlete Name</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {activeMembers.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono font-bold text-emerald-400">#{m.jerseyNumber || '-'}</td>
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-emerald-400 font-bold">
                        {m.player.fullName?.[0]}
                      </div>
                      <span>{m.player.fullName}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant={m.role === 'CAPTAIN' ? 'success' : 'neutral'}>{m.role}</Badge>
                    </td>
                    <td className="p-4 text-slate-400">{new Date(m.joinedAt).toLocaleDateString()}</td>
                    <td className="p-4"><Badge variant="success">ACTIVE</Badge></td>
                    <td className="p-4 text-right">
                      {m.role !== 'CAPTAIN' && (
                        <button
                          onClick={() => handleRemovePlayer(m.id, m.player.fullName)}
                          disabled={actionLoading}
                          className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Release to Alumni</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {formerMembers.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Historical Club Alumni (Preserved)</h3>
                <p className="text-xs text-slate-500">Historical records of former squad members are permanently retained.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {formerMembers.map((fm: any) => (
                  <div key={fm.id} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-300 block">{fm.player.fullName}</span>
                      <span className="text-[10px] text-slate-500">Left: {new Date(fm.leftAt).toLocaleDateString()}</span>
                    </div>
                    <Badge variant="neutral">FORMER</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form onSubmit={handleInvitePlayer} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              <span>Invite Athlete to Squad</span>
            </h2>
            <p className="text-xs text-slate-400">Enter player email address to transmit an official roster invitation.</p>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Player Email Address</label>
              <input
                type="email"
                required
                placeholder="athlete@domain.pk"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Custom Invitation Message</label>
              <textarea
                rows={2}
                placeholder="e.g. We would like you to join as our leading fast bowler for the upcoming Municipal Championship."
                value={inviteMsg}
                onChange={(e) => setInviteMsg(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition"
            >
              Send Invitation &rarr;
            </button>
          </form>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>Inbound Join Requests ({(team?.requests || []).length})</span>
            </h2>

            {(team?.requests || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No pending join requests from athletes.</p>
            ) : (
              <div className="space-y-3">
                {team.requests.map((r: any) => (
                  <div key={r.id} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{r.player.fullName}</span>
                      <span className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    {r.message && <p className="text-xs text-slate-300 italic">&ldquo;{r.message}&rdquo;</p>}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleRespondRequest(r.id, 'ACCEPT')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs transition"
                      >
                        Accept to Roster
                      </button>
                      <button
                        onClick={() => handleRespondRequest(r.id, 'DECLINE')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-lg text-xs transition"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={handleProposeMatch} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>Propose Match Challenge</span>
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Opponent Squad</label>
              <select
                value={opponentTeamId}
                onChange={(e) => setOpponentTeamId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              >
                {availableOpponents.map((opp) => (
                  <option key={opp.id} value={opp.id}>{opp.name} ({opp.city?.name})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Designated Venue Ground</label>
              <select
                value={matchGroundId}
                onChange={(e) => setMatchGroundId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              >
                <option value="">Team Home Ground / Public Ground</option>
                {grounds.map((g) => (
                  <option key={g.id} value={g.id}>{g.name} ({g.city?.name})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Scheduled Date & Time</label>
              <input
                type="datetime-local"
                required
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition"
            >
              Submit Challenge &rarr;
            </button>
          </form>

          <div className="md:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-base font-black text-white">Scheduled Fixtures ({matches.length})</h2>
            {matches.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No fixtures scheduled.</p>
            ) : (
              <div className="space-y-3">
                {matches.map((m: any) => (
                  <div key={m.id} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white text-sm">
                        {m.homeTeam?.name} <span className="text-slate-500">vs</span> {m.awayTeam?.name}
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        {new Date(m.scheduledAt).toLocaleString()} &bull; {m.ground?.name || 'Local Ground'}
                      </div>
                    </div>
                    <Badge variant={m.status === 'OFFICIAL_VERIFIED' ? 'success' : 'neutral'}>
                      {m.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {(activeTab === 'results' || activeTab === 'scorebook') && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h2 className="text-base font-black text-white">Match Results & Verified Scorebooks</h2>
          {matches.filter((m: any) => m.scorebook).length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No completed scorebooks on record yet.</p>
          ) : (
            <div className="space-y-3">
              {matches.filter((m: any) => m.scorebook).map((m: any) => (
                <div key={m.id} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white text-sm">{m.homeTeam?.name} vs {m.awayTeam?.name}</span>
                    <span className="text-slate-400 block mt-0.5">{m.scorebook.summaryNotes || 'Scorebook verified'}</span>
                  </div>
                  <Badge variant="success">VERIFIED SCOREBOOK</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-3xl font-black text-white block">{metrics.matchesPlayed}</span>
              <span className="text-xs uppercase font-bold text-slate-400">Total Played</span>
            </div>
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-3xl font-black text-emerald-400 block">{metrics.wins}</span>
              <span className="text-xs uppercase font-bold text-slate-400">Total Wins</span>
            </div>
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-3xl font-black text-rose-400 block">{metrics.losses}</span>
              <span className="text-xs uppercase font-bold text-slate-400">Losses</span>
            </div>
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-3xl font-black text-amber-400 block">{metrics.points}</span>
              <span className="text-xs uppercase font-bold text-slate-400">Standings Points</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Yearly Club Registration Payments</span>
            </h2>

            <div className="space-y-3">
              {(team?.payments || []).map((p: any) => (
                <div key={p.id} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white text-sm">PKR {p.amount} ({p.paymentType})</span>
                    <span className="text-slate-400 block mt-0.5">Order ID: {p.id}</span>
                  </div>
                  <Badge variant={p.status === 'VERIFIED' ? 'success' : p.status === 'SUBMITTED' ? 'gold' : 'neutral'}>
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>

            {(team?.status === 'DRAFT' || team?.status === 'PENDING_PAYMENT') && (
              <form onSubmit={handlePayFee} className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-4 pt-4 mt-4">
                <h3 className="font-bold text-white text-xs">Submit Annual Registration Fee Payment Proof</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CASH'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`p-2 rounded-xl text-xs font-bold border transition ${
                        paymentMethod === m ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      {m.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  required
                  placeholder="Transaction Reference Number"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono font-bold"
                />

                <input
                  type="url"
                  placeholder="Proof Receipt Image URL (Optional)"
                  value={txProof}
                  onChange={(e) => setTxProof(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition"
                >
                  Submit Payment Proof &rarr;
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {activeTab === 'transfers' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl text-center py-10">
          <ArrowRightLeft className="w-10 h-10 text-emerald-400 mx-auto" />
          <h2 className="text-base font-black text-white">Player Transfer Requests</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Official inter-club transfer window requests for South Punjab leagues. Transfers must be authorized by both club captains.
          </p>
        </div>
      )}

      {activeTab === 'settings' && (
        <form onSubmit={handleUpdateSettings} className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl max-w-3xl">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <span>Squad Profile Settings</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Designated Home Ground</label>
              <select
                value={editGround}
                onChange={(e) => setEditGround(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              >
                <option value="">None / Public Municipal Ground</option>
                {grounds.map((g) => (
                  <option key={g.id} value={g.id}>{g.name} ({g.address})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Club Logo Image URL</label>
              <input
                type="url"
                value={editLogo}
                onChange={(e) => setEditLogo(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Contact Phone</label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Contact Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Team Description & History</label>
            <textarea
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Player Requirements Notice</label>
            <textarea
              rows={2}
              value={editReqs}
              onChange={(e) => setEditReqs(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={actionLoading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition"
          >
            Save Squad Settings &rarr;
          </button>
        </form>
      )}
    </div>
  );
}

export default function CaptainDashboardPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400">Loading Captain Console...</div>}>
      <CaptainDashboardContent />
    </Suspense>
  );
}
