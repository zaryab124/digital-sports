import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Wrote dashboard:', path)

# 1. Captain Dashboard
write_file('src/app/captain/page.tsx', """'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Users, Activity, Plus, Trophy, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function CaptainDashboardPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/teams')
      .then((r) => r.json())
      .then((d) => setTeams(d.teams || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading Captain Hub...</div>;

  return (
    <div className="space-y-8">
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <Badge variant="green">CAPTAIN COMMAND HUB</Badge>
          <h1 className="text-3xl font-black text-white">Team Leadership & Roster Management</h1>
          <p className="text-xs text-slate-400">Manage squad rosters, propose match challenges, and monitor registration status</p>
        </div>

        <div className="flex gap-3">
          <Link href="/teams/create" className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Register New Squad</span>
          </Link>
          <Link href="/matches/create" className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition">
            Propose Match Challenge
          </Link>
        </div>
      </div>

      {/* Managed Teams Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          Your Squads & Active Rosters
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((t) => (
            <div key={t.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={t.status === 'ACTIVE' ? 'green' : 'yellow'}>{t.status}</Badge>
                  <span className="text-xs text-slate-400 font-semibold">{t.sport?.name} • {t.city?.name}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{t.name}</h3>
                <p className="text-xs text-slate-400">Code: <strong className="text-emerald-400 font-mono">{t.code}</strong></p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">{t._count?.members || 0} Rostered Athletes</span>
                <Link
                  href={`/teams/${t.id}`}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
                >
                  Manage &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
""")

# 2. Official Dashboard
write_file('src/app/official/page.tsx', """'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Shield, Trophy, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function OfficialDashboardPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/matches')
      .then((r) => r.json())
      .then((d) => setMatches(d.matches || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading Official Portal...</div>;

  return (
    <div className="space-y-8">
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <Badge variant="blue">MATCH OFFICIAL & SCORER PORTAL</Badge>
          <h1 className="text-3xl font-black text-white">Live Fixtures & Digital Scorebooks</h1>
          <p className="text-xs text-slate-400">Certified scorer console for logging events, runs, wickets, goals, and submitting verified results</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          Matches Ready for Scoring & Verification
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((m) => (
            <div key={m.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={m.isLocked ? 'gold' : 'green'}>{m.status.replace(/_/g, ' ')}</Badge>
                  <span className="text-xs text-slate-400 font-semibold">{m.sport?.name}</span>
                </div>
                <div className="text-xs text-slate-400">{m.city?.name} • {new Date(m.scheduledAt).toLocaleString()}</div>
                <div className="py-2 text-sm font-bold text-white">
                  {m.homeTeam?.name} <span className="text-emerald-400">({m.homeScore})</span> vs {m.awayTeam?.name} <span className="text-emerald-400">({m.awayScore})</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">{m.isLocked ? '🔒 Locked' : '● Live'}</span>
                <Link
                  href={`/matches/${m.id}/scorebook`}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow transition"
                >
                  Open Scorebook &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
""")

# 3. Admin Command Center
write_file('src/app/admin/page.tsx', """'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings, Shield, MapPin, DollarSign, CheckCircle, Clock, Activity, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function AdminDashboardPage() {
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
            Administrative Command Center
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

print('[DONE] Part 2 Dashboards written.')
