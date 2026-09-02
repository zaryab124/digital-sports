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
  Plus
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  // Form State
  const [selectedSportId, setSelectedSportId] = useState('');
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
        fetch('/api/transfers').then((r) => r.json()),
        fetch('/api/sports').then((r) => r.json()),
        fetch('/api/teams?status=ACTIVE').then((r) => r.json()),
        fetch('/api/auth/me').then((r) => r.json()),
      ]);

      setTransfers(trRes.transfers || []);
      setSports(spRes.sports || []);
      setTeams(tmRes.teams || []);
      setUser(meRes.user);

      if (spRes.sports?.length) setSelectedSportId(spRes.sports[0].id);
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
            <p className="text-xs text-slate-400">Select target squad and submit Rs. 100 transfer application.</p>
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

          <form onSubmit={handleRequestTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Sport</label>
              <select
                value={selectedSportId}
                onChange={(e) => setSelectedSportId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold"
              >
                {sports.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Destination Target Squad</label>
              <select
                value={newTeamId}
                onChange={(e) => setNewTeamId(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold"
              >
                <option value="">-- Choose New Team --</option>
                {teams
                  .filter((t) => !selectedSportId || t.sportId === selectedSportId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.city?.name})</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Transfer Reason</label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State athletic rationale for squad transfer..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1 text-slate-300">
              <div className="flex justify-between font-bold text-white">
                <span>Transfer Processing Fee:</span>
                <span className="text-emerald-400 font-mono">PKR 100.00</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Historical membership records in current club are permanently preserved as FORMER.
              </p>
            </div>

            <button
              type="submit"
              disabled={submittingRequest || !newTeamId}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs shadow-lg transition"
            >
              {submittingRequest ? 'Submitting...' : 'Submit Transfer Application &rarr;'}
            </button>
          </form>
        </div>

        {/* Right Column: Transfer Feed & Action Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-300">Filters:</span>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="REQUESTED">Requested</option>
                <option value="PAYMENT_SUBMITTED">Payment Submitted</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-white"
              >
                <option value="ALL">All Sports</option>
                {sports.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-slate-400">Loading Transfer Hub...</div>
          ) : filteredTransfers.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <ArrowRightLeft className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Transfers Found</h3>
              <p className="text-xs text-slate-400">No transfer records matched your selected criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransfers.map((tr) => {
                const isPlayer = tr.playerId === user?.id;
                const isOldCaptain = tr.oldTeam?.captainId === user?.id;
                const isNewCaptain = tr.newTeam?.captainId === user?.id;
                const isPaymentPending = !tr.payment || tr.payment.status === 'PENDING';

                return (
                  <div key={tr.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-emerald-400 text-xs">
                          {tr.player?.fullName?.[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm">{tr.player?.fullName}</h3>
                          <span className="text-[11px] text-slate-400">{tr.sport?.name} &bull; {tr.city?.name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            tr.status === 'COMPLETED'
                              ? 'success'
                              : tr.status === 'REJECTED' || tr.status === 'CANCELLED'
                              ? 'danger'
                              : 'gold'
                          }
                        >
                          {tr.status}
                        </Badge>
                        <span className="text-xs font-mono font-bold text-emerald-400">Rs. {tr.fee}</span>
                      </div>
                    </div>

                    {/* Team Migration Banner */}
                    <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-rose-400 uppercase font-bold">Releasing Squad</span>
                        <span className="font-bold text-white block">{tr.oldTeam?.name}</span>
                        <span className="text-[10px] text-slate-400">Capt: {tr.oldTeam?.captain?.fullName || 'Captain'}</span>
                      </div>

                      <div className="flex items-center justify-center px-4">
                        <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
                      </div>

                      <div className="space-y-0.5 text-right">
                        <span className="text-[10px] text-emerald-400 uppercase font-bold">Receiving Squad</span>
                        <span className="font-bold text-white block">{tr.newTeam?.name}</span>
                        <span className="text-[10px] text-slate-400">Capt: {tr.newTeam?.captain?.fullName || 'Captain'}</span>
                      </div>
                    </div>

                    {/* Progress Checklist */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${tr.releasingApproved ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        {tr.releasingApproved ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        <span>Releasing NOC</span>
                      </div>

                      <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${!isPaymentPending ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        {!isPaymentPending ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        <span>Rs. 100 Fee Paid</span>
                      </div>

                      <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${tr.receivingApproved ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        {tr.receivingApproved ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        <span>Receiving Accept</span>
                      </div>

                      <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${tr.status === 'COMPLETED' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        {tr.status === 'COMPLETED' ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        <span>Admin Finalized</span>
                      </div>
                    </div>

                    {/* Actions Row */}
                    {tr.status !== 'COMPLETED' && tr.status !== 'REJECTED' && tr.status !== 'CANCELLED' && (
                      <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          {isPaymentPending && (isPlayer || isNewCaptain || isAdmin) && (
                            <button
                              onClick={() => setPayTransfer(tr)}
                              className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-slate-950 font-black rounded-xl transition flex items-center gap-1.5 shadow"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Pay Rs. 100 Fee</span>
                            </button>
                          )}

                          {!tr.releasingApproved && (isOldCaptain || isAdmin) && (
                            <button
                              onClick={() => handleAction(tr.id, 'RELEASE_APPROVE')}
                              disabled={actionLoading}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl transition flex items-center gap-1.5 shadow"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Grant Releasing NOC</span>
                            </button>
                          )}

                          {!tr.receivingApproved && (isNewCaptain || isAdmin) && (
                            <button
                              onClick={() => handleAction(tr.id, 'RECEIVING_APPROVE')}
                              disabled={actionLoading}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl transition flex items-center gap-1.5 shadow"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept into Squad</span>
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => handleAction(tr.id, 'ADMIN_VERIFY')}
                              disabled={actionLoading}
                              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl transition flex items-center gap-1.5 shadow"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Admin Finalize Transfer</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {(isOldCaptain || isNewCaptain || isAdmin) && (
                            <button
                              onClick={() => setRejectTransfer(tr)}
                              className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl transition flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          )}

                          {(isPlayer || tr.requesterId === user?.id) && (
                            <button
                              onClick={() => handleAction(tr.id, 'CANCEL')}
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold rounded-xl transition"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pay Rs. 100 Fee Modal */}
      {payTransfer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Pay Official Transfer Fee</h3>
              <button onClick={() => setPayTransfer(null)} className="text-slate-400 hover:text-white">&times;</button>
            </div>

            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1">
              <div className="flex justify-between font-bold text-white">
                <span>Fee Amount Due:</span>
                <span className="text-purple-400 font-mono text-sm">PKR 100.00</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Transfer of {payTransfer.player?.fullName} to {payTransfer.newTeam?.name}
              </p>
            </div>

            <form onSubmit={handlePayTransfer} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1.5">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {['EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CASH'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                        paymentMethod === method
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {method.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1.5">Transaction ID / Reference #</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TRX-99881122"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1.5">Receipt / Screenshot URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={submittingPayment || !transactionRef}
                className="w-full py-3 bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs shadow-lg transition"
              >
                {submittingPayment ? 'Submitting...' : 'Submit PKR 100 Proof &rarr;'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectTransfer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Decline Transfer Request</h3>
              <button onClick={() => setRejectTransfer(null)} className="text-slate-400 hover:text-white">&times;</button>
            </div>

            <p className="text-xs text-slate-400">
              Please enter the official rationale for declining the transfer of {rejectTransfer.player?.fullName}.
            </p>

            <textarea
              rows={3}
              required
              placeholder="e.g. Roster limit reached, contractual commitment..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectTransfer(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(rejectTransfer.id, 'REJECT', rejectionReason)}
                disabled={actionLoading || !rejectionReason}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-black"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
