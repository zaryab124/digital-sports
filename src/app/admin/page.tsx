'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Settings, Shield, MapPin, DollarSign, CheckCircle, Clock, Activity,
  AlertCircle, Trophy, Plus, ArrowRight, Users, Award, Calendar,
  CreditCard, Repeat, RefreshCw, Eye, Lock, Unlock, Check, X,
  FileText, Search, Bell, Camera, Filter, AlertTriangle, Sparkles, Send
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function SuperAdminDashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [rankingRules, setRankingRules] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Navigation Tab
  const [tab, setTab] = useState<
    'OVERVIEW' | 'USERS' | 'CITIES' | 'SPORTS' | 'TEAMS' | 'MATCHES' |
    'PAYMENTS' | 'TRANSFERS' | 'PHOTOS' | 'RANKINGS' | 'NOTIFICATIONS' | 'SETTINGS' | 'AUDIT'
  >('OVERVIEW');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Role Assignment State
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRoleCode, setAssignRoleCode] = useState('CITY_ADMIN');
  const [assignCityId, setAssignCityId] = useState('');
  const [assignSportId, setAssignSportId] = useState('');

  // City form states
  const [newCityName, setNewCityName] = useState('');
  const [newCitySlug, setNewCitySlug] = useState('');
  const [newCityCode, setNewCityCode] = useState('');
  const [newCityDesc, setNewCityDesc] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('');

  // Sport form states
  const [newSportName, setNewSportName] = useState('');
  const [newSportSlug, setNewSportSlug] = useState('');
  const [newSportCode, setNewSportCode] = useState('');
  const [newSportIcon, setNewSportIcon] = useState('🏏');
  const [newSportCatId, setNewSportCatId] = useState('');
  const [newSportRegType, setNewSportRegType] = useState('TEAM');
  const [newSportFee, setNewSportFee] = useState(1000);
  const [newSportPlayers, setNewSportPlayers] = useState(11);
  const [newSportMinPlayers, setNewSportMinPlayers] = useState(7);
  const [newSportIsTeam, setNewSportIsTeam] = useState(true);

  // Broadcast Notification State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastCityId, setBroadcastCityId] = useState('');
  const [broadcastType, setBroadcastType] = useState('INFO');

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [
        ovRes, usRes, ciRes, reRes, spRes, tmRes, maRes, paRes, trRes, phRes, feRes, rrRes, auRes
      ] = await Promise.all([
        fetch('/api/admin/overview').then((r) => r.json()),
        fetch('/api/admin/users').then((r) => r.json()),
        fetch('/api/cities?includeInactive=true').then((r) => r.json()),
        fetch('/api/regions').then((r) => r.json()),
        fetch('/api/sports?includeInactive=true').then((r) => r.json()),
        fetch('/api/admin/teams').then((r) => r.json()),
        fetch('/api/admin/matches').then((r) => r.json()),
        fetch('/api/payments').then((r) => r.json()),
        fetch('/api/admin/transfers').then((r) => r.json()),
        fetch('/api/admin/photos').then((r) => r.json()),
        fetch('/api/admin/fees').then((r) => r.json()),
        fetch('/api/admin/ranking-rules').then((r) => r.json()),
        fetch('/api/admin/audit-logs').then((r) => r.json()),
      ]);

      setOverview(ovRes);
      setUsers(usRes.users || []);
      setRolesList(usRes.roles || []);
      setCities(ciRes.cities || []);
      setRegions(reRes.regions || []);
      setSports(spRes.sports || []);
      setTeams(tmRes.teams || []);
      setMatches(maRes.matches || []);
      setPayments(paRes.payments || []);
      setTransfers(trRes.transfers || []);
      setPhotos(phRes.photos || []);
      setFees(feRes.fees || []);
      setRankingRules(rrRes.rules || []);
      setAuditLogs(auRes.auditLogs || []);

      if (reRes.regions?.length) setSelectedRegionId(reRes.regions[0].id);
      if (spRes.sports?.length && spRes.sports[0].categoryId) {
        setNewSportCatId(spRes.sports[0].categoryId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserId || !assignRoleCode) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: assignUserId,
          roleCode: assignRoleCode,
          cityId: assignCityId || undefined,
          sportId: assignSportId || undefined,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        alert('Role assigned successfully.');
        setAssignUserId('');
        loadAllAdminData();
      } else {
        alert(d.error || 'Failed to assign role');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTeamAction = async (teamId: string, action: 'APPROVE' | 'REJECT', reason?: string) => {
    try {
      const res = await fetch('/api/admin/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, action, reason }),
      });
      if (res.ok) {
        alert(`Team ${action === 'APPROVE' ? 'Approved' : 'Rejected'} successfully.`);
        loadAllAdminData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMatchAction = async (matchId: string, action: 'APPROVE' | 'REJECT' | 'LOCK' | 'UNLOCK') => {
    try {
      const res = await fetch('/api/admin/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, action }),
      });
      if (res.ok) {
        alert(`Match action ${action} executed successfully.`);
        loadAllAdminData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePaymentVerify = async (paymentId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        alert(`Payment marked as ${status}`);
        loadAllAdminData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePhotoAction = async (photoId: string, action: 'APPROVE' | 'REJECT' | 'DELETE') => {
    try {
      const res = await fetch(`/api/community/photos/${photoId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        alert(`Photo action ${action} completed.`);
        loadAllAdminData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBroadcastNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
          type: broadcastType,
          targetCityId: broadcastCityId || undefined,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        alert(d.message || 'Notification broadcasted successfully.');
        setBroadcastTitle('');
        setBroadcastMessage('');
      } else {
        alert(d.error || 'Broadcast failed');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateFee = async (feeId: string, amount: number) => {
    try {
      const res = await fetch('/api/admin/fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: feeId, amount }),
      });
      if (res.ok) {
        alert('Fee configuration updated.');
        loadAllAdminData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRecalculateRankings = async (sportId?: string) => {
    try {
      const res = await fetch('/api/admin/ranking-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sportId }),
      });
      const d = await res.json();
      if (res.ok) {
        alert(d.message || 'Rankings recalculated successfully.');
        loadAllAdminData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCityName,
          slug: newCitySlug || undefined,
          code: newCityCode.toUpperCase(),
          regionId: selectedRegionId,
          description: newCityDesc || undefined,
          isActive: true,
          status: 'ACTIVE',
        }),
      });
      if (res.ok) {
        setNewCityName('');
        setNewCitySlug('');
        setNewCityCode('');
        setNewCityDesc('');
        loadAllAdminData();
        alert('City created successfully.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddSport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSportName,
          slug: newSportSlug || undefined,
          code: newSportCode.toUpperCase(),
          icon: newSportIcon,
          categoryId: newSportCatId || (sports[0]?.categoryId),
          registrationType: newSportRegType,
          registrationFee: parseFloat(String(newSportFee)),
          playersPerTeam: parseInt(String(newSportPlayers)),
          minPlayersRequired: parseInt(String(newSportMinPlayers)),
          isTeamSport: newSportIsTeam,
          isActive: true,
        }),
      });
      if (res.ok) {
        setNewSportName('');
        setNewSportSlug('');
        setNewSportCode('');
        loadAllAdminData();
        alert('Sport created successfully.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-400">Loading Super Admin Central Console...</div>;

  const metrics = overview?.metrics || {};

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>Platform Governance & Command</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Super Admin Control Center</h1>
          <p className="text-xs text-slate-400">
            Comprehensive multi-city sports board administration, financial records, dynamic rules, and security audits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleRecalculateRankings()}
            className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-xl flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recalculate Standings</span>
          </button>
          <button
            onClick={() => loadAllAdminData()}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs border border-slate-700 shadow-xl flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh All Data</span>
          </button>
        </div>
      </div>

      {/* 13 Comprehensive Dashboard Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Users</span>
          <span className="text-2xl font-black text-white">{metrics.totalUsers || 0}</span>
          <span className="text-[10px] text-slate-500 block">Registered Accounts</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Athletes / Players</span>
          <span className="text-2xl font-black text-emerald-400">{metrics.totalPlayers || 0}</span>
          <span className="text-[10px] text-slate-500 block">Active Profiles</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Captains</span>
          <span className="text-2xl font-black text-purple-400">{metrics.totalCaptains || 0}</span>
          <span className="text-[10px] text-slate-500 block">Team Leaders</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Match Officials</span>
          <span className="text-2xl font-black text-blue-400">{metrics.totalOfficials || 0}</span>
          <span className="text-[10px] text-slate-500 block">Certified Scorers</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Active Clubs</span>
          <span className="text-2xl font-black text-amber-400">{metrics.totalTeams || 0}</span>
          <span className="text-[10px] text-slate-500 block">Registered Squads</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Municipal Cities</span>
          <span className="text-2xl font-black text-white">{metrics.totalCities || 0}</span>
          <span className="text-[10px] text-slate-500 block">Ecosystem Hubs</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Sports Disciplines</span>
          <span className="text-2xl font-black text-white">{metrics.totalSports || 0}</span>
          <span className="text-[10px] text-slate-500 block">Dynamic Sports</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Upcoming Fixtures</span>
          <span className="text-2xl font-black text-indigo-400">{metrics.upcomingMatches || 0}</span>
          <span className="text-[10px] text-slate-500 block">Scheduled / Live</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Official Results</span>
          <span className="text-2xl font-black text-cyan-400">{metrics.completedMatches || 0}</span>
          <span className="text-[10px] text-slate-500 block">Locked Results</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-1 bg-amber-950/20">
          <span className="text-[10px] font-bold text-amber-400 uppercase block">Pending Approvals</span>
          <span className="text-2xl font-black text-amber-400">{metrics.pendingApprovals || 0}</span>
          <span className="text-[10px] text-slate-500 block">Teams/Matches/Transfers</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-1 bg-emerald-950/20">
          <span className="text-[10px] font-bold text-emerald-400 uppercase block">Total Revenue</span>
          <span className="text-2xl font-black text-emerald-400">Rs. {metrics.totalRevenue?.toLocaleString() || 0}</span>
          <span className="text-[10px] text-slate-500 block">Verified Payments</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Pending Payments</span>
          <span className="text-2xl font-black text-rose-400">{metrics.pendingPayments || 0}</span>
          <span className="text-[10px] text-slate-500 block">Awaiting Verification</span>
        </div>
      </div>

      {/* Navigation Modules Bar */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-black">
        {[
          { id: 'OVERVIEW', label: '1. Overview' },
          { id: 'USERS', label: `2. Users (${users.length})` },
          { id: 'TEAMS', label: `3. Teams (${teams.length})` },
          { id: 'MATCHES', label: `4. Matches (${matches.length})` },
          { id: 'PAYMENTS', label: `5. Payments (${payments.length})` },
          { id: 'TRANSFERS', label: `6. Transfers (${transfers.length})` },
          { id: 'PHOTOS', label: `7. Photos (${photos.length})` },
          { id: 'CITIES', label: `8. Cities (${cities.length})` },
          { id: 'SPORTS', label: `9. Sports (${sports.length})` },
          { id: 'RANKINGS', label: '10. Ranking Rules' },
          { id: 'NOTIFICATIONS', label: '11. Broadcast' },
          { id: 'SETTINGS', label: '12. System Settings' },
          { id: 'AUDIT', label: '13. Audit Trail' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id as any)}
            className={`px-3 py-2 rounded-xl transition ${tab === item.id ? 'bg-emerald-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & PENDING QUEUES */}
      {tab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Team Registrations Queue */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Pending Team Approvals</span>
                </span>
                <Badge variant="gold">
                  {teams.filter((t) => t.status === 'PENDING_APPROVAL' || t.status === 'PAYMENT_SUBMITTED').length} Pending
                </Badge>
              </h3>

              <div className="space-y-3 text-xs">
                {teams.filter((t) => t.status === 'PENDING_APPROVAL' || t.status === 'PAYMENT_SUBMITTED').length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No teams currently awaiting approval.</div>
                ) : (
                  teams
                    .filter((t) => t.status === 'PENDING_APPROVAL' || t.status === 'PAYMENT_SUBMITTED')
                    .slice(0, 5)
                    .map((t) => (
                      <div key={t.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="font-bold text-white block">{t.name} ({t.code})</span>
                          <span className="text-slate-400 block">{t.city?.name} &bull; {t.sport?.name} &bull; Cap: {t.captain?.fullName}</span>
                          <Badge variant="blue">{t.status}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTeamAction(t.id, 'APPROVE')}
                            className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs hover:bg-emerald-400"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleTeamAction(t.id, 'REJECT', 'Rejected by admin')}
                            className="px-3 py-1.5 bg-rose-500/20 text-rose-400 font-black rounded-xl text-xs hover:bg-rose-500/30"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Pending Match Sanctions Queue */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>Pending Match Sanctions</span>
                </span>
                <Badge variant="purple">
                  {matches.filter((m) => m.status === 'PENDING_ADMIN_APPROVAL').length} Pending
                </Badge>
              </h3>

              <div className="space-y-3 text-xs">
                {matches.filter((m) => m.status === 'PENDING_ADMIN_APPROVAL').length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No match challenges awaiting admin sanction.</div>
                ) : (
                  matches
                    .filter((m) => m.status === 'PENDING_ADMIN_APPROVAL')
                    .slice(0, 5)
                    .map((m) => (
                      <div key={m.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="font-bold text-white block">{m.homeTeam?.name} vs {m.awayTeam?.name}</span>
                          <span className="text-slate-400 block">{m.city?.name} &bull; {m.sport?.name} &bull; Venue: {m.ground?.name || 'TBD'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleMatchAction(m.id, 'APPROVE')}
                            className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs hover:bg-emerald-400"
                          >
                            Sanction
                          </button>
                          <button
                            onClick={() => handleMatchAction(m.id, 'REJECT')}
                            className="px-3 py-1.5 bg-rose-500/20 text-rose-400 font-black rounded-xl text-xs hover:bg-rose-500/30"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS & ROLES */}
      {tab === 'USERS' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Assign Administrative / Official Role</span>
            </h3>

            <form onSubmit={handleAssignRole} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <select
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                required
              >
                <option value="">-- Choose User --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                ))}
              </select>

              <select
                value={assignRoleCode}
                onChange={(e) => setAssignRoleCode(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
              >
                <option value="SUPER_ADMIN">SUPER_ADMIN (Global)</option>
                <option value="CITY_ADMIN">CITY_ADMIN (Municipal)</option>
                <option value="REGIONAL_ADMIN">REGIONAL_ADMIN (Division)</option>
                <option value="OFFICIAL">OFFICIAL (Scorer/Ref)</option>
                <option value="CAPTAIN">CAPTAIN</option>
                <option value="PLAYER">PLAYER</option>
              </select>

              <select
                value={assignCityId}
                onChange={(e) => setAssignCityId(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
              >
                <option value="">-- Municipal Scope (Optional) --</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={assignSportId}
                onChange={(e) => setAssignSportId(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
              >
                <option value="">-- Sport Scope (Optional) --</option>
                {sports.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <button
                type="submit"
                className="py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl shadow transition"
              >
                Assign Role &rarr;
              </button>
            </form>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">All Registered Users ({users.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase">
                    <th className="py-3 px-3">Name</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Home City</th>
                    <th className="py-3 px-3">Assigned Roles</th>
                    <th className="py-3 px-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-bold text-white">{u.fullName}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{u.email}</td>
                      <td className="py-3 px-3 text-slate-300">{u.homeCity?.name || 'Unassigned'}</td>
                      <td className="py-3 px-3 flex flex-wrap gap-1">
                        {u.userRoles?.map((ur: any) => (
                          <Badge key={ur.id} variant="blue">{ur.role?.code}</Badge>
                        ))}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEAMS */}
      {tab === 'TEAMS' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">All Squads & Clubs ({teams.length})</h3>
          <div className="space-y-3 text-xs">
            {teams.map((t) => (
              <div key={t.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-sm">{t.name}</span>
                    <Badge variant="blue">{t.code}</Badge>
                    <Badge variant={t.status === 'ACTIVE' ? 'green' : t.status === 'REJECTED' ? 'red' : 'gold'}>{t.status}</Badge>
                  </div>
                  <span className="text-slate-400 block">
                    City: <strong className="text-slate-200">{t.city?.name}</strong> &bull; Sport: <strong className="text-slate-200">{t.sport?.name}</strong> &bull; Captain: <strong className="text-slate-200">{t.captain?.fullName}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {t.status !== 'ACTIVE' && (
                    <button
                      onClick={() => handleTeamAction(t.id, 'APPROVE')}
                      className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs hover:bg-emerald-400"
                    >
                      Approve
                    </button>
                  )}
                  {t.status !== 'REJECTED' && (
                    <button
                      onClick={() => handleTeamAction(t.id, 'REJECT', 'Admin rejected')}
                      className="px-3 py-1.5 bg-rose-500/20 text-rose-400 font-black rounded-xl text-xs hover:bg-rose-500/30"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MATCHES */}
      {tab === 'MATCHES' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">All Matches & Sanctions ({matches.length})</h3>
          <div className="space-y-3 text-xs">
            {matches.map((m) => (
              <div key={m.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{m.homeTeam?.name} vs {m.awayTeam?.name}</span>
                    <Badge variant={m.isLocked ? 'gold' : 'blue'}>{m.status}</Badge>
                    {m.isLocked && <Badge variant="green">🔒 Locked</Badge>}
                  </div>
                  <span className="text-slate-400 block">{m.city?.name} &bull; {m.sport?.name} &bull; Score: {m.homeScore ?? '-'} - {m.awayScore ?? '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {m.status === 'PENDING_ADMIN_APPROVAL' && (
                    <button
                      onClick={() => handleMatchAction(m.id, 'APPROVE')}
                      className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs hover:bg-emerald-400"
                    >
                      Sanction
                    </button>
                  )}
                  {m.isLocked ? (
                    <button
                      onClick={() => handleMatchAction(m.id, 'UNLOCK')}
                      className="px-3 py-1.5 bg-amber-500/20 text-amber-400 font-black rounded-xl text-xs hover:bg-amber-500/30"
                    >
                      Unlock
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMatchAction(m.id, 'LOCK')}
                      className="px-3 py-1.5 bg-purple-500/20 text-purple-400 font-black rounded-xl text-xs hover:bg-purple-500/30"
                    >
                      Lock Result
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PAYMENTS */}
      {tab === 'PAYMENTS' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Financial Transactions ({payments.length})</h3>
          <div className="space-y-3 text-xs">
            {payments.map((p) => (
              <div key={p.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white font-mono text-sm">Rs. {p.amount}</span>
                    <Badge variant="purple">{p.feeType}</Badge>
                    <Badge variant={p.status === 'VERIFIED' ? 'green' : p.status === 'REJECTED' ? 'red' : 'gold'}>{p.status}</Badge>
                  </div>
                  <span className="text-slate-400 block font-mono">
                    Method: {p.paymentMethod} &bull; TrxID: {p.transactionRef || 'N/A'}
                  </span>
                </div>
                {p.status === 'PENDING' || p.status === 'SUBMITTED' ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePaymentVerify(p.id, 'VERIFIED')}
                      className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs hover:bg-emerald-400"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => handlePaymentVerify(p.id, 'REJECTED')}
                      className="px-3 py-1.5 bg-rose-500/20 text-rose-400 font-black rounded-xl text-xs hover:bg-rose-500/30"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: TRANSFERS */}
      {tab === 'TRANSFERS' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Player Transfers ({transfers.length})</h3>
          <div className="space-y-3 text-xs">
            {transfers.map((tr) => (
              <div key={tr.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="font-bold text-white block">{tr.player?.fullName}: {tr.oldTeam?.name} &rarr; {tr.newTeam?.name}</span>
                  <span className="text-slate-400 block">{tr.city?.name} &bull; {tr.sport?.name} &bull; Fee: Rs. {tr.fee}</span>
                </div>
                <Badge variant={tr.status === 'COMPLETED' ? 'green' : tr.status === 'REJECTED' ? 'red' : 'gold'}>{tr.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: PHOTOS */}
      {tab === 'PHOTOS' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Photo Moderation Queue ({photos.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {photos.map((ph) => (
              <div key={ph.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3 flex flex-col justify-between">
                <div className="aspect-video w-full rounded-xl bg-slate-800 overflow-hidden">
                  <img src={ph.photoUrl} alt="Match victory" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{ph.team?.name}</span>
                    <Badge variant={ph.status === 'APPROVED' ? 'green' : ph.status === 'REJECTED' ? 'red' : 'gold'}>{ph.status}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">{ph.caption}</p>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                  {ph.status !== 'APPROVED' && (
                    <button
                      onClick={() => handlePhotoAction(ph.id, 'APPROVE')}
                      className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg"
                    >
                      Approve
                    </button>
                  )}
                  {ph.status !== 'REJECTED' && (
                    <button
                      onClick={() => handlePhotoAction(ph.id, 'REJECT')}
                      className="px-3 py-1 bg-rose-500/20 text-rose-400 font-bold rounded-lg"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: CITIES */}
      {tab === 'CITIES' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Create Dynamic City</span>
            </h3>
            <form onSubmit={handleAddCity} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <input
                type="text"
                placeholder="City Name"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                required
              />
              <input
                type="text"
                placeholder="Slug"
                value={newCitySlug}
                onChange={(e) => setNewCitySlug(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
              />
              <input
                type="text"
                placeholder="Code (e.g. KHP)"
                value={newCityCode}
                onChange={(e) => setNewCityCode(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                required
              />
              <select
                value={selectedRegionId}
                onChange={(e) => setSelectedRegionId(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.province?.name})</option>
                ))}
              </select>
              <button
                type="submit"
                className="py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl shadow transition"
              >
                + Add City
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {cities.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-white text-sm">{c.name}</span>
                  <Badge variant="blue">{c.code}</Badge>
                </div>
                <span className="text-slate-400 block">{c.region?.name} &bull; {c.region?.province?.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 9: SPORTS */}
      {tab === 'SPORTS' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Create Dynamic Sport</span>
            </h3>
            <form onSubmit={handleAddSport} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <input
                type="text"
                placeholder="Sport Name"
                value={newSportName}
                onChange={(e) => setNewSportName(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                required
              />
              <input
                type="text"
                placeholder="Sport Code"
                value={newSportCode}
                onChange={(e) => setNewSportCode(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                required
              />
              <input
                type="number"
                placeholder="Registration Fee (PKR)"
                value={newSportFee}
                onChange={(e) => setNewSportFee(Number(e.target.value))}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
              />
              <button
                type="submit"
                className="py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl shadow transition"
              >
                + Add Sport
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {sports.map((s) => (
              <div key={s.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-white text-sm">{s.icon || '🏅'} {s.name}</span>
                  <Badge variant="green">Rs. {s.registrationFee}</Badge>
                </div>
                <span className="text-slate-400 block">{s.isTeamSport ? 'Team Sport' : 'Individual Sport'} &bull; {s.playersPerTeam} Players</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 10: RANKINGS & RULES */}
      {tab === 'RANKINGS' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Configurable Ranking Rules ({rankingRules.length})</span>
            </h3>
            <button
              onClick={() => handleRecalculateRankings()}
              className="px-4 py-2 bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow"
            >
              Trigger Full Recalculation
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {rankingRules.map((r) => (
              <div key={r.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                <span className="font-black text-white block text-sm">{r.sport?.name}</span>
                <div className="grid grid-cols-3 gap-1 text-center font-mono text-[11px] pt-1">
                  <div className="p-1.5 rounded-lg bg-emerald-950/40 text-emerald-400">Win: {r.winPoints}p</div>
                  <div className="p-1.5 rounded-lg bg-slate-900 text-slate-300">Draw: {r.drawPoints}p</div>
                  <div className="p-1.5 rounded-lg bg-rose-950/40 text-rose-400">Loss: {r.lossPoints}p</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 11: NOTIFICATIONS BROADCAST */}
      {tab === 'NOTIFICATIONS' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-400" />
            <span>Broadcast Platform Announcement</span>
          </h3>

          <form onSubmit={handleBroadcastNotification} className="space-y-4 text-xs max-w-xl">
            <div>
              <label className="block font-bold text-slate-300 uppercase mb-1">Announcement Title</label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. South Punjab Championship Registration Open"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase mb-1">Target Municipal Scope</label>
              <select
                value={broadcastCityId}
                onChange={(e) => setBroadcastCityId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold"
              >
                <option value="">-- Broadcast to All Cities across South Punjab --</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} Sports Community Only</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase mb-1">Broadcast Message Content</label>
              <textarea
                rows={4}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Details of the announcement..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                required
              />
            </div>

            <button
              type="submit"
              className="py-3 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl shadow transition"
            >
              Dispatch Broadcast to Users &rarr;
            </button>
          </form>
        </div>
      )}

      {/* TAB 12: SYSTEM SETTINGS */}
      {tab === 'SETTINGS' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Configurable Fees (No Hardcoding)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              {fees.map((f) => (
                <div key={f.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                  <span className="font-bold text-white block">{f.feeType}</span>
                  <span className="text-slate-400 block">{f.description}</span>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="number"
                      defaultValue={f.amount}
                      onBlur={(e) => handleUpdateFee(f.id, parseFloat(e.target.value))}
                      className="w-28 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono font-bold text-emerald-400"
                    />
                    <span className="text-slate-400">PKR</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 13: AUDIT LOGS */}
      {tab === 'AUDIT' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Platform Security Audit Trail ({auditLogs.length})</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Actor</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Entity</th>
                  <th className="py-3 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-3 font-bold text-white">{log.user?.fullName || 'System'}</td>
                    <td className="py-3 px-3">
                      <Badge variant="blue">{log.action}</Badge>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">{log.entityType} ({log.entityId?.slice(0, 8)})</td>
                    <td className="py-3 px-3 text-slate-300 font-mono truncate max-w-xs">{log.changesJson}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
