'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRightLeft,
  Shield,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  User,
  MapPin,
  Trophy,
  Filter,
  Check,
  X,
  CreditCard,
  Plus,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

const FALLBACK_SPORTS = [
  { id: 'cricket', name: 'Cricket', icon: '🏏', slug: 'cricket' },
  { id: 'football', name: 'Football', icon: '⚽', slug: 'football' },
  { id: 'volleyball', name: 'Volleyball', icon: '🏐', slug: 'volleyball' },
  { id: 'badminton', name: 'Badminton', icon: '🏸', slug: 'badminton' },
  { id: 'table-tennis', name: 'Table Tennis', icon: '🏓', slug: 'table-tennis' },
  { id: 'snooker', name: 'Snooker', icon: '🎱', slug: 'snooker' },
];

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>(FALLBACK_SPORTS);
  const [teams, setTeams] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userMemberships, setUserMemberships] = useState<any[]>([]);

  // Form State
  const [selectedSportId, setSelectedSportId] = useState(FALLBACK_SPORTS[0].id);
  const [newTeamId, setNewTeamId] = useState('');
  const [reason, setReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [formMsg, setFormMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Payment Modal State
  const [payTransfer, setPayTransfer] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('EASYPAISA');
  const [transactionRef, setTransactionRef] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Action / Rejection Modal State
  const [rejectTransfer, setRejectTransfer] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Filter State
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sportFilter, setSportFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [trRes, spRes, tmRes, meRes] = await Promise.all([
        fetch('/api/transfers').then((r) => r.json()).catch(() => ({ transfers: [] })),
        fetch('/api/sports').then((r) => r.json()).catch(() => ({ sports: [] })),
        fetch('/api/teams?status=ACTIVE').then((r) => r.json()).catch(() => ({ teams: [] })),
        fetch('/api/auth/me').then((r) => r.json()).catch(() => ({ user: null })),
      ]);

      setTransfers(trRes.transfers || []);
      if (spRes.sports && spRes.sports.length > 0) {
        setSports(spRes.sports);
        setSelectedSportId(spRes.sports[0].id);
      }
      setTeams(tmRes.teams || []);
      setUser(meRes.user);

      if (meRes.user?.teamMemberships) {
        setUserMemberships(meRes.user.teamMemberships.filter((m: any) => m.status === 'ACTIVE'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    setSubmittingRequest(true);

    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sportId: selectedSportId, newTeamId, reason }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to submit transfer request');

      setFormMsg({ text: 'Transfer request submitted successfully! PKR 100 fee order generated.', type: 'success' });
      setReason('');
      setNewTeamId('');
      loadData();
    } catch (err: any) {
      setFormMsg({ text: err.message, type: 'error' });
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleAction = async (transferId: string, action: 'RELEASE_APPROVE' | 'RECEIVING_APPROVE' | 'ADMIN_VERIFY' | 'REJECT' | 'CANCEL', extraReason?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/transfers/${transferId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectionReason: extraReason || rejectionReason }),
      });
      const data = await res.json();

      if (!res.ok) alert(data.error || 'Action failed');
      else {
        setRejectTransfer(null);
        setRejectionReason('');
        loadData();
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTransfer) return;
    setSubmittingPayment(true);

    try {
      const res = await fetch(`/api/transfers/${payTransfer.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          transactionReference: transactionRef,
          proofImageUrl: proofUrl || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Payment proof submission failed');

      setPayTransfer(null);
      setTransactionRef('');
      setProofUrl('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const userRoles = user?.roles?.map((r: any) => r.roleCode) || [];
  const isAdmin = userRoles.includes('SUPER_ADMIN') || userRoles.includes('CITY_ADMIN') || userRoles.includes('REGIONAL_ADMIN');

  const filteredTransfers = transfers.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (sportFilter !== 'ALL' && t.sportId !== sportFilter) return false;
    return true;
  });

  const completedCount = transfers.filter((t) => t.status === 'COMPLETED').length;
  const inFlightCount = transfers.filter((t) => t.status !== 'COMPLETED' && t.status !== 'REJECTED' && t.status !== 'CANCELLED').length;

  const currentSportTeams = teams.filter((t) => !selectedSportId || t.sportId === selectedSportId || t.sport?.id === selectedSportId);

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Header & Market Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2.5">
            <ArrowRightLeft className="w-8 h-8 text-emerald-400" />
            <span>Official Player Transfer Market</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Official municipal athlete transfers with PKR 100 transfer fee, NOC verification, and anti-dual-membership governance.
          </p>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-center shadow-lg">
          <span className="block text-2xl font-black text-white">{transfers.length}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Transfer Records</span>
        </div>
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-center shadow-lg">
          <span className="block text-2xl font-black text-amber-400">{inFlightCount}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Active In-Flight</span>
        </div>
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-center shadow-lg">
          <span className="block text-2xl font-black text-emerald-400">{completedCount}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Transfers Completed</span>
        </div>
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-center shadow-lg">
          <span className="block text-2xl font-black text-purple-400">Rs. 100</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Standard Transfer Fee</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Apply for Transfer */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl h-fit">
          <div className="space-y-1">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Initiate Official Transfer</span>
            </h2>
            <p className="text-xs text-slate-400">Select sport and target squad to submit your transfer application.</p>
          </div>

          {formMsg && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold ${
                formMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {formMsg.text}
            </div>
          )}

          <form onSubmit={handleRequestTransfer} className="space-y-5">
            {/* Sport Selector Pills */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">1. Select Sport Discipline</label>
              <div className="grid grid-cols-2 gap-2">
                {sports.map((s) => {
                  const isSelected = selectedSportId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedSportId(s.id);
                        setNewTeamId('');
                      }}
                      className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-lg shadow-emerald-500/10'
                          : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-xl">{s.icon || '🏅'}</span>
                      <span className="text-xs font-bold truncate">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Destination Team Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">2. Destination Target Squad</label>
              {currentSportTeams.length > 0 ? (
                <div className="relative">
                  <select
                    value={newTeamId}
                    onChange={(e) => setNewTeamId(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-emerald-500 appearance-none pr-10 cursor-pointer"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">-- Choose Destination Team --</option>
                    {currentSportTeams.map((t) => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-white py-2">
                        {t.name} {t.city?.name ? `(${t.city.name})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-center space-y-2">
                  <Shield className="w-6 h-6 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-300 font-semibold">No squads registered in this sport yet</p>
                  <p className="text-[10px] text-slate-500">Captains can register clubs using the Team Registration Wizard.</p>
                  <Link href="/teams/create" className="inline-block text-xs font-bold text-emerald-400 hover:underline">
                    Register a Squad &rarr;
                  </Link>
                </div>
              )}
            </div>

            {/* Transfer Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">3. Athletic Rationale</label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State athletic rationale for squad transfer (e.g., relocation, match playing time)..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 placeholder-slate-500"
              />
            </div>

            {/* Fee Notice */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1 text-slate-300">
              <div className="flex justify-between font-bold text-white">
                <span>Transfer Processing Fee:</span>
                <span className="text-emerald-400 font-mono">PKR 100.00</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Historical membership records in current squad are permanently preserved as FORMER.
              </p>
            </div>

            <button
              type="submit"
              disabled={submittingRequest || !newTeamId}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-2xl text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              {submittingRequest ? 'Submitting Transfer...' : 'Submit Transfer Application &rarr;'}
            </button>
          </form>
        </div>

        {/* Right Column: Transfer Feed & Action Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-300">Filter Transfers:</span>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-white">All Statuses</option>
                <option value="PENDING_PAYMENT" className="bg-slate-900 text-white">Pending Payment</option>
                <option value="PAYMENT_SUBMITTED" className="bg-slate-900 text-white">Payment Submitted</option>
                <option value="PENDING_APPROVAL" className="bg-slate-900 text-white">Pending Approval</option>
                <option value="APPROVED" className="bg-slate-900 text-white">Approved</option>
                <option value="COMPLETED" className="bg-slate-900 text-white">Completed</option>
                <option value="REJECTED" className="bg-slate-900 text-white">Rejected</option>
              </select>

              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-white">All Sports</option>
                {sports.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transfers List */}
          {filteredTransfers.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <ArrowRightLeft className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-base font-bold text-white">No Transfer Records Found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No player transfer applications match the selected filter. Submit a transfer request using the form.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransfers.map((tr) => {
                const isPlayer = user?.id === tr.playerId;
                const isReleasingCaptain = user?.id === tr.oldTeam?.captainId;
                const isReceivingCaptain = user?.id === tr.newTeam?.captainId;

                return (
                  <div key={tr.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white">{tr.player?.fullName || 'Athlete'}</h3>
                          <span className="text-[10px] text-slate-400">Ref: {tr.id.slice(0, 8)} &bull; {tr.sport?.name || 'Sport'}</span>
                        </div>
                      </div>

                      <Badge
                        variant={
                          tr.status === 'COMPLETED'
                            ? 'green'
                            : tr.status === 'REJECTED' || tr.status === 'CANCELLED'
                            ? 'red'
                            : tr.status === 'PENDING_PAYMENT'
                            ? 'yellow'
                            : 'blue'
                        }
                      >
                        {tr.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    {/* Transfer Route */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center py-2 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/50">
                      <div className="text-center sm:text-left">
                        <span className="block text-[10px] text-slate-500 uppercase font-bold">Origin Club</span>
                        <span className="text-xs font-bold text-white">{tr.oldTeam?.name || 'Previous Team'}</span>
                        <span className="block text-[10px] text-slate-400">{tr.oldTeam?.city?.name}</span>
                      </div>

                      <div className="flex items-center justify-center text-emerald-400 font-bold text-xs gap-1">
                        <ArrowRightLeft className="w-4 h-4 animate-pulse" />
                        <span>PKR {tr.fee}</span>
                      </div>

                      <div className="text-center sm:text-right">
                        <span className="block text-[10px] text-slate-500 uppercase font-bold">Target Club</span>
                        <span className="text-xs font-bold text-emerald-400">{tr.newTeam?.name || 'Destination Team'}</span>
                        <span className="block text-[10px] text-slate-400">{tr.newTeam?.city?.name}</span>
                      </div>
                    </div>

                    {tr.notes && (
                      <p className="text-xs text-slate-400 italic bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                        &ldquo;{tr.notes}&rdquo;
                      </p>
                    )}

                    {/* Workflow Progress Badges */}
                    <div className="flex flex-wrap gap-2 pt-1 text-[10px] font-bold">
                      <span className={`px-2.5 py-1 rounded-lg border ${tr.payment?.status === 'VERIFIED' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 bg-slate-800/60 text-slate-500'}`}>
                        Payment: {tr.payment?.status || 'PENDING'}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg border ${tr.releasingApproved ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 bg-slate-800/60 text-slate-500'}`}>
                        Origin NOC: {tr.releasingApproved ? 'GRANTED' : 'PENDING'}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg border ${tr.receivingApproved ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 bg-slate-800/60 text-slate-500'}`}>
                        Target Acceptance: {tr.receivingApproved ? 'ACCEPTED' : 'PENDING'}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      {/* Player Payment Action */}
                      {isPlayer && tr.status === 'PENDING_PAYMENT' && (
                        <button
                          onClick={() => setPayTransfer(tr)}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay Rs. 100 Transfer Fee</span>
                        </button>
                      )}

                      {/* Origin Captain NOC Release */}
                      {isReleasingCaptain && !tr.releasingApproved && tr.status === 'PENDING_APPROVAL' && (
                        <button
                          onClick={() => handleAction(tr.id, 'RELEASE_APPROVE')}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
                        >
                          Grant Release NOC
                        </button>
                      )}

                      {/* Target Captain Acceptance */}
                      {isReceivingCaptain && tr.releasingApproved && !tr.receivingApproved && tr.status === 'PENDING_APPROVAL' && (
                        <button
                          onClick={() => handleAction(tr.id, 'RECEIVING_APPROVE')}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
                        >
                          Accept Player into Squad
                        </button>
                      )}

                      {/* Admin Final Verification */}
                      {isAdmin && tr.status === 'PENDING_APPROVAL' && tr.releasingApproved && tr.receivingApproved && (
                        <button
                          onClick={() => handleAction(tr.id, 'ADMIN_VERIFY')}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition cursor-pointer shadow-lg shadow-purple-500/20"
                        >
                          Admin Execute Transfer
                        </button>
                      )}

                      {/* Reject / Cancel */}
                      {(isReleasingCaptain || isReceivingCaptain || isAdmin) && tr.status === 'PENDING_APPROVAL' && (
                        <button
                          onClick={() => setRejectTransfer(tr)}
                          disabled={actionLoading}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs transition cursor-pointer"
                        >
                          Decline
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Payment Proof Modal */}
      {payTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span>Submit Rs. 100 Transfer Fee</span>
              </h3>
              <button onClick={() => setPayTransfer(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePayTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold"
                >
                  <option value="EASYPAISA" className="bg-slate-900 text-white">EasyPaisa (0300-1234567)</option>
                  <option value="JAZZCASH" className="bg-slate-900 text-white">JazzCash (0300-9876543)</option>
                  <option value="BANK_TRANSFER" className="bg-slate-900 text-white">Meezan Bank (PK89MEZN001122)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Transaction ID / Reference</label>
                <input
                  type="text"
                  required
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. TRX-99882211"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Receipt Screenshot URL (Optional)</label>
                <input
                  type="url"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={submittingPayment || !transactionRef}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs shadow-lg transition cursor-pointer"
              >
                {submittingPayment ? 'Submitting...' : 'Confirm & Upload Proof &rarr;'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {rejectTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white text-rose-400">Decline Transfer Request</h3>
              <button onClick={() => setRejectTransfer(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Decline Reason</label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="State reason for declining transfer application..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejectTransfer(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(rejectTransfer.id, 'REJECT')}
                  disabled={actionLoading || !rejectionReason}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black cursor-pointer shadow-lg shadow-rose-600/20"
                >
                  Confirm Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
