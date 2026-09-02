'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Trophy, Activity, ArrowRightLeft, CreditCard, Settings, User, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function DashboardRouterPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading Dashboard...</div>;
  if (!user) return (
    <div className="text-center py-20 space-y-4">
      <p className="text-slate-400">Please sign in to access your sports dashboard.</p>
      <Link href="/login" className="px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs inline-block">
        Sign In Now
      </Link>
    </div>
  );

  const roles = user.userRoles?.map((r: any) => r.role?.code) || [];
  const isSuperOrRegionalOrCityAdmin = roles.some((r: string) =>
    ['SUPER_ADMIN', 'REGIONAL_ADMIN', 'CITY_ADMIN', 'SPORTS_ADMIN'].includes(r)
  );
  const isCaptain = roles.includes('CAPTAIN');
  const isOfficial = roles.includes('OFFICIAL');
  const isPlayer = roles.includes('PLAYER');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Badge variant="green">{roles[0] || 'MEMBER'}</Badge>
            <span className="text-xs text-slate-400 font-semibold">{user.homeCity?.name}</span>
          </div>
          <h1 className="text-3xl font-black text-white">Welcome, {user.fullName}</h1>
          <p className="text-xs text-slate-400">{user.email} • South Punjab Sports Platform</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/profile" className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition">
            Edit Profile
          </Link>
          <Link href="/settings" className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition">
            Security Settings
          </Link>
        </div>
      </div>

      {/* Role-Dedicated Dashboard Quick Launchers */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          Role Dashboards & Command Hubs
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Admin Dashboard */}
          {isSuperOrRegionalOrCityAdmin && (
            <Link
              href="/admin"
              className="p-6 rounded-2xl bg-slate-900 border border-amber-500/40 hover:border-amber-400 hover:bg-slate-850 transition space-y-3 block shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                <Settings className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Admin Command Center</h3>
              <p className="text-xs text-slate-400">City management, fee configs, verification queues, and audit logs.</p>
              <span className="text-xs font-bold text-amber-400 inline-block pt-2">Open Admin Hub &rarr;</span>
            </Link>
          )}

          {/* Captain Dashboard */}
          {(isCaptain || isSuperOrRegionalOrCityAdmin) && (
            <Link
              href="/captain"
              className="p-6 rounded-2xl bg-slate-900 border border-emerald-500/40 hover:border-emerald-400 hover:bg-slate-850 transition space-y-3 block shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Captain Management Hub</h3>
              <p className="text-xs text-slate-400">Manage team roster, send player invites, and propose match challenges.</p>
              <span className="text-xs font-bold text-emerald-400 inline-block pt-2">Open Captain Hub &rarr;</span>
            </Link>
          )}

          {/* Official Dashboard */}
          {(isOfficial || isSuperOrRegionalOrCityAdmin) && (
            <Link
              href="/official"
              className="p-6 rounded-2xl bg-slate-900 border border-blue-500/40 hover:border-blue-400 hover:bg-slate-850 transition space-y-3 block shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Official Scorer Portal</h3>
              <p className="text-xs text-slate-400">Record digital scorebooks, track events, and submit verified results.</p>
              <span className="text-xs font-bold text-blue-400 inline-block pt-2">Open Scorer Portal &rarr;</span>
            </Link>
          )}

          {/* Player Dashboard */}
          {(isPlayer || isCaptain || !roles.length) && (
            <Link
              href="/player"
              className="p-6 rounded-2xl bg-slate-900 border border-purple-500/40 hover:border-purple-400 hover:bg-slate-850 transition space-y-3 block shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Athlete Performance Hub</h3>
              <p className="text-xs text-slate-400">View personal statistics, performance category, fixtures, and club transfers.</p>
              <span className="text-xs font-bold text-purple-400 inline-block pt-2">Open Athlete Hub &rarr;</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
