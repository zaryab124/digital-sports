import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Wrote:', path)

# 1. Globals CSS
write_file('src/app/globals.css', """@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #f8fafc;
  --foreground: #0f172a;
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.scorecard-glow {
  box-shadow: 0 4px 20px -2px rgba(34, 197, 94, 0.15);
}

.glass-card {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(226, 232, 240, 0.8);
}
""")

# 2. UI Components
write_file('src/components/ui/Badge.tsx', """import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'gray' | 'gold';
  className?: string;
}

export function Badge({ children, variant = 'green', className }: BadgeProps) {
  const styles = {
    green: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    yellow: 'bg-amber-100 text-amber-800 border-amber-300',
    red: 'bg-rose-100 text-rose-800 border-rose-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    gray: 'bg-slate-100 text-slate-700 border-slate-300',
    gold: 'bg-amber-400 text-amber-950 font-bold border-amber-500 shadow-sm',
  };

  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', styles[variant], className)}>
      {children}
    </span>
  );
}
""")

# 3. Navbar
write_file('src/components/layout/Navbar.tsx', """'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Trophy, MapPin, User, LogOut, ChevronDown, Bell, Sparkles, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  useEffect(() => {
    fetchMe();
    fetchCities();

    const storedCity = localStorage.getItem('viewing_city');
    if (storedCity) setSelectedCity(storedCity);
  }, []);

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) setUser(data.user);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCities = async () => {
    try {
      const res = await fetch('/api/cities');
      const data = await res.json();
      if (data.cities) setCities(data.cities);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCityChange = (cityCode: string) => {
    setSelectedCity(cityCode);
    localStorage.setItem('viewing_city', cityCode);
    setShowCityDropdown(false);
    if (cityCode === 'all') router.push('/');
    else router.push(`/community/${cityCode.toLowerCase()}`);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  const demoAccounts = [
    { email: 'superadmin@sports.pk', role: 'Super Admin', label: 'Platform Master' },
    { email: 'cityadmin.jampur@sports.pk', role: 'City Admin', label: 'Jampur Admin' },
    { email: 'captain.ali@sports.pk', role: 'Captain', label: 'Jampur Lions Captain' },
    { email: 'official.ahmed@sports.pk', role: 'Official', label: 'Match Scorer' },
    { email: 'player.bilal@sports.pk', role: 'Player', label: 'Fast Bowler' },
    { email: 'fan.sana@sports.pk', role: 'Fan', label: 'Sports Fan' },
  ];

  const handleDemoLogin = async (email: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      if (res.ok) {
        setShowRoleModal(false);
        fetchMe();
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center text-slate-950 font-extrabold shadow-md">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                SPORTS <span className="text-emerald-400">COMMUNITY</span>
              </span>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">South Punjab Network</p>
            </div>
          </Link>

          {/* City Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowCityDropdown(!showCityDropdown)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {selectedCity === 'all'
                  ? 'All Cities (South Punjab)'
                  : cities.find((c) => c.code.toLowerCase() === selectedCity.toLowerCase())?.name || selectedCity}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showCityDropdown && (
              <div className="absolute left-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Sports City
                </div>
                <button
                  onClick={() => handleCityChange('all')}
                  className="w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-slate-700 flex items-center justify-between"
                >
                  <span>All Cities (South Punjab)</span>
                  {selectedCity === 'all' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </button>
                <div className="border-t border-slate-700 my-1"></div>
                {cities.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => handleCityChange(city.code)}
                    className="w-full text-left px-4 py-2 text-xs text-slate-200 hover:bg-slate-700 flex items-center justify-between"
                  >
                    <span>{city.name}</span>
                    {selectedCity.toLowerCase() === city.code.toLowerCase() && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-300">
          <Link href="/matches" className="hover:text-emerald-400 transition">Fixtures & Scores</Link>
          <Link href="/teams" className="hover:text-emerald-400 transition">Teams</Link>
          <Link href="/rankings" className="hover:text-emerald-400 transition">Leaderboards</Link>
          <Link href="/transfers" className="hover:text-emerald-400 transition">Transfers</Link>
          {user && (
            <Link href="/dashboard" className="text-emerald-400 font-semibold hover:text-emerald-300 transition flex items-center gap-1">
              Dashboard
            </Link>
          )}
        </nav>

        {/* User / Demo Switcher */}
        <div className="flex items-center space-x-3">
          {/* Demo Login Trigger */}
          <button
            onClick={() => setShowRoleModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Switch Role</span>
          </button>

          {user ? (
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-white">{user.fullName}</div>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <Badge variant="green">{user.roles[0]?.roleCode || 'MEMBER'}</Badge>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/login" className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition">
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg shadow-sm transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Role Quick Switch Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold">1-Click Role Switcher</h3>
              </div>
              <button onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-white text-sm font-bold">✕</button>
            </div>

            <p className="text-xs text-slate-400 my-4">
              Select any pre-configured role to immediately test permission scopes, approval queues, match scorebooks, or administration.
            </p>

            <div className="space-y-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => handleDemoLogin(acc.email)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 transition text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{acc.label}</div>
                    <div className="text-xs text-slate-400">{acc.email}</div>
                  </div>
                  <Badge variant="green">{acc.role}</Badge>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
""")

# 4. Root Layout
write_file('src/app/layout.tsx', """import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Sports Community | South Punjab Multi-City Sports Platform',
  description: 'Official digital sports platform for Jampur, DG Khan, Rajanpur, Multan, Taunsa, Muzaffargarh, and Layyah. Real scorebooks, player transfers, tournaments, and rankings.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="bg-slate-900 border-t border-slate-800 py-8 text-center text-xs text-slate-500">
          <p>© 2026 Sports Community Platform. Built for South Punjab Regional Sports Network.</p>
          <p className="mt-1">Jampur • Dera Ghazi Khan • Rajanpur • Taunsa • Multan • Muzaffargarh • Layyah</p>
        </footer>
      </body>
    </html>
  );
}
""")

print('[DONE] Frontend Part 1 written.')
