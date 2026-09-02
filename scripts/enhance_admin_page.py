import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Updated Admin Console:', path)

write_file('src/app/admin/page.tsx', """'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings, Shield, MapPin, DollarSign, CheckCircle, Clock, Activity, AlertCircle, Trophy, Plus, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [cities, setCities] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tab, setTab] = useState<'OVERVIEW' | 'CITIES' | 'SPORTS' | 'FEES' | 'AUDIT'>('OVERVIEW');

  // City form states
  const [newCityName, setNewCityName] = useState('');
  const [newCitySlug, setNewCitySlug] = useState('');
  const [newCityCode, setNewCityCode] = useState('');
  const [newCityDesc, setNewCityDesc] = useState('');
  const [newCityImage, setNewCityImage] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [regions, setRegions] = useState<any[]>([]);

  // Sport form states
  const [newSportName, setNewSportName] = useState('');
  const [newSportSlug, setNewSportSlug] = useState('');
  const [newSportCode, setNewSportCode] = useState('');
  const [newSportIcon, setNewSportIcon] = useState('⚽');
  const [newSportCatId, setNewSportCatId] = useState('');
  const [newSportRegType, setNewSportRegType] = useState('TEAM');
  const [newSportFee, setNewSportFee] = useState(1000);
  const [newSportDesc, setNewSportDesc] = useState('');
  const [newSportIsTeam, setNewSportIsTeam] = useState(true);

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
      if (spRes.sports?.length) {
        const uniqueCats = Array.from(new Set(spRes.sports.map((s: any) => JSON.stringify(s.category)))).map((c: any) => JSON.parse(c));
        setCategories(uniqueCats);
        if (uniqueCats.length) setNewSportCatId(uniqueCats[0].id);
      }
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
          slug: newCitySlug || undefined,
          code: newCityCode.toUpperCase(),
          regionId: selectedRegionId,
          description: newCityDesc || undefined,
          imageUrl: newCityImage || undefined,
          isActive: true,
          status: 'ACTIVE',
        }),
      });
      if (res.ok) {
        setNewCityName('');
        setNewCitySlug('');
        setNewCityCode('');
        setNewCityDesc('');
        setNewCityImage('');
        loadAdminData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to add city');
      }
    } catch (e) {
      console.error(e);
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
          categoryId: newSportCatId,
          icon: newSportIcon,
          registrationType: newSportRegType,
          registrationFee: Number(newSportFee),
          description: newSportDesc || undefined,
          isTeamSport: newSportIsTeam,
          isActive: true,
        }),
      });
      if (res.ok) {
        setNewSportName('');
        setNewSportSlug('');
        setNewSportCode('');
        setNewSportDesc('');
        loadAdminData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to add sport');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleCity = async (citySlugOrId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/cities/${citySlugOrId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive, status: !currentActive ? 'ACTIVE' : 'INACTIVE' }),
      });
      if (res.ok) loadAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSport = async (sportSlugOrId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/sports/${sportSlugOrId}`, {
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
          <h1 className="text-3xl font-black text-white">Administrative Command Center</h1>
          <p className="text-xs text-slate-400">
            Multi-City Governance, Dynamic Sports Configurator, Dynamic Fees & Audit Logs
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/payments"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
          >
            Payment Approval Desk &rarr;
          </Link>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setTab('OVERVIEW')}
          className={`px-4 py-2 rounded-xl transition shrink-0 ${tab === 'OVERVIEW' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
        >
          System Overview
        </button>
        <button
          onClick={() => setTab('CITIES')}
          className={`px-4 py-2 rounded-xl transition shrink-0 ${tab === 'CITIES' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
        >
          Dynamic Cities ({cities.length})
        </button>
        <button
          onClick={() => setTab('SPORTS')}
          className={`px-4 py-2 rounded-xl transition shrink-0 ${tab === 'SPORTS' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
        >
          Dynamic Sports ({sports.length})
        </button>
        <button
          onClick={() => setTab('FEES')}
          className={`px-4 py-2 rounded-xl transition shrink-0 ${tab === 'FEES' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
        >
          Dynamic Fees ({fees.length})
        </button>
        <button
          onClick={() => setTab('AUDIT')}
          className={`px-4 py-2 rounded-xl transition shrink-0 ${tab === 'AUDIT' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
        >
          Audit Trail
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-3xl font-black text-emerald-400">{overview?.counts?.totalUsers || 0}</div>
              <div className="text-xs text-slate-400 uppercase font-bold mt-1">Verified Users</div>
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

      {/* CITIES TAB */}
      {tab === 'CITIES' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              Add New Dynamic City & Provision Community
            </h2>
            <form onSubmit={handleAddCity} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="City Name (e.g. Kot Addu)"
                  value={newCityName}
                  onChange={(e) => {
                    setNewCityName(e.target.value);
                    if (!newCitySlug) setNewCitySlug(e.target.value.toLowerCase().replace(/\\s+/g, '-'));
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
                <input
                  type="text"
                  placeholder="Slug (e.g. kot-addu)"
                  value={newCitySlug}
                  onChange={(e) => setNewCitySlug(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                />
                <input
                  type="text"
                  required
                  placeholder="Code (e.g. KOT)"
                  maxLength={5}
                  value={newCityCode}
                  onChange={(e) => setNewCityCode(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs uppercase font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={selectedRegionId}
                  onChange={(e) => setSelectedRegionId(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.province?.name})</option>
                  ))}
                </select>
                <input
                  type="url"
                  placeholder="Hero Banner URL (https://...)"
                  value={newCityImage}
                  onChange={(e) => setNewCityImage(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <textarea
                placeholder="City description & athletic history..."
                value={newCityDesc}
                onChange={(e) => setNewCityDesc(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />

              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                + Create City & Auto-Provision Community
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="px-6 py-4">City</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Region</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {cities.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-bold text-white">
                      <Link href={`/cities/${c.slug || c.id}`} className="hover:text-emerald-400 transition">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">{c.slug || c.id}</td>
                    <td className="px-6 py-4 font-mono font-semibold text-emerald-400">{c.code}</td>
                    <td className="px-6 py-4">{c.region?.name}</td>
                    <td className="px-6 py-4">
                      <Badge variant={c.isActive ? 'green' : 'red'}>{c.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleCity(c.slug || c.id, c.isActive)}
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

      {/* SPORTS TAB */}
      {tab === 'SPORTS' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-400" />
              Add New Dynamic Sport & Rule Engine
            </h2>
            <form onSubmit={handleAddSport} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Sport Name (e.g. Futsal)"
                  value={newSportName}
                  onChange={(e) => {
                    setNewSportName(e.target.value);
                    if (!newSportSlug) setNewSportSlug(e.target.value.toLowerCase().replace(/\\s+/g, '-'));
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
                <input
                  type="text"
                  placeholder="Slug (e.g. futsal)"
                  value={newSportSlug}
                  onChange={(e) => setNewSportSlug(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                />
                <input
                  type="text"
                  required
                  placeholder="Code (e.g. FUTSAL)"
                  value={newSportCode}
                  onChange={(e) => setNewSportCode(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs uppercase font-mono"
                />
                <input
                  type="text"
                  placeholder="Icon Emoji (e.g. ⚽, 🏑)"
                  value={newSportIcon}
                  onChange={(e) => setNewSportIcon(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs text-center"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={newSportCatId}
                  onChange={(e) => setNewSportCatId(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={newSportRegType}
                  onChange={(e) => {
                    setNewSportRegType(e.target.value);
                    setNewSportIsTeam(e.target.value === 'TEAM');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                >
                  <option value="TEAM">Team Squad Sport</option>
                  <option value="INDIVIDUAL">Individual Sport</option>
                  <option value="DUAL">Dual / Pairs Sport</option>
                </select>

                <input
                  type="number"
                  placeholder="Registration Fee (PKR)"
                  value={newSportFee}
                  onChange={(e) => setNewSportFee(Number(e.target.value))}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold"
                />
              </div>

              <textarea
                placeholder="Sport rules, format and description..."
                value={newSportDesc}
                onChange={(e) => setNewSportDesc(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />

              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                + Create Dynamic Sport
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="px-6 py-4">Sport</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Registration Fee</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sports.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                      <span className="text-xl">{s.icon || '🏅'}</span>
                      <Link href={`/sports/${s.slug || s.code.toLowerCase()}`} className="hover:text-emerald-400 transition">
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">{s.slug || s.code.toLowerCase()}</td>
                    <td className="px-6 py-4">{s.registrationType}</td>
                    <td className="px-6 py-4 font-bold text-emerald-400">PKR {s.registrationFee || 1000}</td>
                    <td className="px-6 py-4">
                      <Badge variant={s.isActive ? 'green' : 'red'}>{s.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleSport(s.slug || s.id, s.isActive)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                      >
                        {s.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FEES TAB */}
      {tab === 'FEES' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-white">Dynamic Fee Configurations</h2>
            <p className="text-xs text-slate-400">
              Manage platform dues, transfer fees, and sport-specific overrides.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="px-6 py-4">Fee Type</th>
                  <th className="px-6 py-4">Scope</th>
                  <th className="px-6 py-4">Current Amount</th>
                  <th className="px-6 py-4 text-right">Update (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {fees.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-bold text-white">{f.feeType}</td>
                    <td className="px-6 py-4">{f.cityId ? 'City Override' : f.sportId ? 'Sport Override' : 'Global Default'}</td>
                    <td className="px-6 py-4 font-black text-emerald-400">PKR {f.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <input
                        type="number"
                        defaultValue={f.amount}
                        onBlur={(e) => handleUpdateFee(f.id, Number(e.target.value))}
                        className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-xs font-bold text-right"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUDIT TAB */}
      {tab === 'AUDIT' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white">Platform System Audit Trail</h2>
          <div className="divide-y divide-slate-800">
            {overview?.recentAudits?.map((log: any) => (
              <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-400">{log.action}</span>
                  <span className="text-slate-400 ml-2">by {log.user?.fullName || 'System'}</span>
                  <span className="text-slate-500 ml-2 font-mono">[{log.entityType}: {log.entityId}]</span>
                </div>
                <span className="text-slate-500 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
""")
