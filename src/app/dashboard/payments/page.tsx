'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function PaymentsPortalPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EASYPAISA');
  const [transactionRef, setTransactionRef] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const [pRes, meRes] = await Promise.all([
        fetch('/api/payments').then((r) => r.json()),
        fetch('/api/auth/me').then((r) => r.json()),
      ]);
      setPayments(pRes.payments || []);
      setUser(meRes.user);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentId) return;

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: selectedPaymentId,
          paymentMethod,
          transactionReference: transactionRef,
          remarks,
        }),
      });
      if (res.ok) {
        setSelectedPaymentId('');
        setTransactionRef('');
        loadPayments();
      } else {
        const d = await res.json();
        alert(d.error || 'Submission failed');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerify = async (paymentId: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) loadPayments();
      else {
        const d = await res.json();
        alert(d.error || 'Verification failed');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isAdmin = user?.roles?.some((r: any) =>
    ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'CITY_ADMIN'].includes(r.roleCode)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-2">
          <CreditCard className="w-8 h-8 text-emerald-400" />
          Payment Orders & Verification Queue
        </h1>
        <p className="text-xs text-slate-400 mt-1">Manual & automated verification for team registrations and player transfers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Submit Proof Form */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h2 className="text-lg font-bold text-white">Submit Payment Proof</h2>

          <form onSubmit={handleSubmitProof} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Select Pending Order</label>
              <select
                value={selectedPaymentId}
                onChange={(e) => setSelectedPaymentId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              >
                <option value="">-- Choose an order --</option>
                {payments
                  .filter((p) => p.status === 'PENDING')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.paymentType} - PKR {p.amount} ({p.team?.name || p.user?.fullName})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Payment Channel</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              >
                <option value="EASYPAISA">EasyPaisa</option>
                <option value="JAZZCASH">JazzCash</option>
                <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                <option value="CASH">Cash Deposit / Manual</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Transaction ID / Reference #</label>
              <input
                type="text"
                required
                placeholder="e.g. EP-892341908"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Remarks (Optional)</label>
              <input
                type="text"
                placeholder="Sender name or bank reference..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow transition"
            >
              Submit Proof for Verification
            </button>
          </form>
        </div>

        {/* Orders Table */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-white">Payment Transactions ({payments.length})</h2>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800 text-xs uppercase font-bold text-slate-400">
                <tr>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">User / Team</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-bold text-white text-xs">{p.paymentType}</td>
                    <td className="px-6 py-4 text-xs">{p.team?.name || p.user?.fullName}</td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-400">PKR {p.amount}</td>
                    <td className="px-6 py-4">
                      <Badge variant={p.status === 'VERIFIED' ? 'green' : p.status === 'SUBMITTED' ? 'yellow' : 'gray'}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {isAdmin && p.status === 'SUBMITTED' && (
                        <>
                          <button
                            onClick={() => handleVerify(p.id, 'APPROVED')}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleVerify(p.id, 'REJECTED')}
                            className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold rounded text-xs transition"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
