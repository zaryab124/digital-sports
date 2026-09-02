import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Wrote:', path)

# 1. Admin Control Center
write_file('src/app/dashboard/admin/page.tsx', """'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings, Shield, MapPin, DollarSign, CheckCircle, Clock, Activity, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function AdminControlPage() {
  const [overview, setOverview] = useState<any>(null);
  const [cities, setCities] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [tab, setTab] = useState<'OVERVIEW' | 'CITIES' | 'SPORTS' | 'FEES' | 'AUDIT'>('OVERVIEW');

  const [newCityName, setNewCityName] = useState('');
  const [newCityCode, setNewCityCode] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [regions, setRegions] = useState<any[]>([]);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [ovRes, ciRes, spRes, feRes, reRes] = await Promise.all([
        fetch('/api/admin/overview').then((r) => r.json()),
        fetch('/api/cities?includeInactive=true').then((r) => r.json()),
        fetch('/api/sports?includeInactive=true').then((r) => r.json()),
        fetch('/api/admin/fees').then((r) => r.json()),
        fetch('/api/regions').then((r) => r.json()),
      ]);

      setOverview(ovRes);
      setCities(ciRes.cities || []);
      setSports(spRes.sports || []);
      setFees(feRes.fees || []);
      setRegions(reRes.regions || []);

      if (reRes.regions?.length) setSelectedRegionId(reRes.regions[0].id);
    } catch (e) {
      console.error(e);
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
          code: newCityCode.toUpperCase(),
          regionId: selectedRegionId,
        }),
      });
      if (res.ok) {
        setNewCityName('');
        setNewCityCode('');
        loadAdminData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to add city');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleCity = async (cityId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/cities/${cityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) loadAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateFee = async (feeId: string, newAmount: number) => {
    try {
      const res = await fetch('/api/admin/fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: feeId, amount: newAmount }),
      });
      if (res.ok) loadAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <Settings className="w-8 h-8 text-amber-400" />
            Administrative Control Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">Multi-City management, fee configurations, and audit trail</p>
        </div>

        <div className="flex flex-wrap gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setTab('OVERVIEW')}
            className={`px-4 py-2 rounded-xl transition ${tab === 'OVERVIEW' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setTab('CITIES')}
            className={`px-4 py-2 rounded-xl transition ${tab === 'CITIES' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            Cities ({cities.length})
          </button>
          <button
            onClick={() => setTab('SPORTS')}
            className={`px-4 py-2 rounded-xl transition ${tab === 'SPORTS' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            Sports ({sports.length})
          </button>
          <button
            onClick={() => setTab('FEES')}
            className={`px-4 py-2 rounded-xl transition ${tab === 'FEES' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            Fee Configs
          </button>
          <button
            onClick={() => setTab('AUDIT')}
            className={`px-4 py-2 rounded-xl transition ${tab === 'AUDIT' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            Audit Logs
          </button>
        </div>
      </div>

      {tab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-3xl font-black text-emerald-400">{overview?.counts?.totalUsers || 0}</div>
              <div className="text-xs text-slate-400 uppercase font-bold mt-1">Total Users</div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-3xl font-black text-white">{overview?.counts?.totalTeams || 0}</div>
              <div className="text-xs text-slate-400 uppercase font-bold mt-1">Active Teams</div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-3xl font-black text-amber-400">{overview?.counts?.pendingPayments || 0}</div>
              <div className="text-xs text-slate-400 uppercase font-bold mt-1">Pending Payments</div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-3xl font-black text-white">{overview?.counts?.totalMatches || 0}</div>
              <div className="text-xs text-slate-400 uppercase font-bold mt-1">Recorded Matches</div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-white">Recent Platform Audit Activity</h2>
            <div className="divide-y divide-slate-800">
              {overview?.recentAudits?.map((log: any) => (
                <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-emerald-400">{log.action}</span>
                    <span className="text-slate-400 ml-2">by {log.user?.fullName || 'System'}</span>
                  </div>
                  <span className="text-slate-500 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'CITIES' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-white">Add New City to Platform</h2>
            <form onSubmit={handleAddCity} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <input
                type="text"
                required
                placeholder="City Name (e.g. Kot Addu)"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
              <input
                type="text"
                required
                placeholder="Code (e.g. KOT)"
                maxLength={5}
                value={newCityCode}
                onChange={(e) => setNewCityCode(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
              <select
                value={selectedRegionId}
                onChange={(e) => setSelectedRegionId(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.province?.name})</option>
                ))}
              </select>
              <button
                type="submit"
                className="py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                + Add City Record
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800 text-xs uppercase font-bold text-slate-400">
                <tr>
                  <th className="px-6 py-4">City</th>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Region</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {cities.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-bold text-white">{c.name}</td>
                    <td className="px-6 py-4 font-mono font-semibold text-emerald-400">{c.code}</td>
                    <td className="px-6 py-4">{c.region?.name}</td>
                    <td className="px-6 py-4">
                      <Badge variant={c.isActive ? 'green' : 'red'}>{c.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleCity(c.id, c.isActive)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                      >
                        {c.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'FEES' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-white">Dynamic Fee Configurations</h2>
            <p className="text-xs text-slate-400">
              Adjust yearly registration and transfer fees across the platform without altering business logic.
            </p>

            <div className="space-y-4">
              {fees.map((fee) => (
                <div key={fee.id} className="p-5 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white">{fee.feeType.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-slate-400">{fee.description}</div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-bold text-emerald-400 text-sm">PKR {fee.amount}</span>
                    <button
                      onClick={() => {
                        const newAmt = prompt(`Enter new amount for ${fee.feeType}:`, fee.amount);
                        if (newAmt) handleUpdateFee(fee.id, parseFloat(newAmt));
                      }}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition"
                    >
                      Edit Fee
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'AUDIT' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white">Security & Operation Audit Logs</h2>
          <div className="divide-y divide-slate-800 text-xs">
            {overview?.recentAudits?.map((log: any) => (
              <div key={log.id} className="py-3 flex justify-between">
                <div>
                  <span className="font-bold text-white">{log.action}</span>
                  <span className="text-slate-400 ml-2">Entity: {log.entityType} ({log.entityId})</span>
                </div>
                <span className="text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
""")

# 2. Payments Verification Page
write_file('src/app/dashboard/payments/page.tsx', """'use client';

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
""")

print('[DONE] Admin & Payments Dashboard generated.')
