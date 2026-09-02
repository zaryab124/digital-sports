'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trophy, MapPin, User, LogOut, ChevronDown, Bell, Sparkles, CheckCircle2, Shield, Settings } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Badge } from '@/components/ui/Badge';

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

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
    { email: 'superadmin@sports.pk', role: 'SUPER_ADMIN', label: 'Platform Master', dest: '/admin' },
    { email: 'cityadmin.jampur@sports.pk', role: 'CITY_ADMIN', label: 'Jampur Admin', dest: '/admin' },
    { email: 'cityadmin.dgkhan@sports.pk', role: 'CITY_ADMIN', label: 'DG Khan Admin', dest: '/admin' },
    { email: 'captain.ali@sports.pk', role: 'CAPTAIN', label: 'Jampur Lions Captain', dest: '/captain' },
    { email: 'official.ahmed@sports.pk', role: 'OFFICIAL', label: 'Match Scorer', dest: '/official' },
    { email: 'player.bilal@sports.pk', role: 'PLAYER', label: 'Fast Bowler', dest: '/player' },
    { email: 'fan.sana@sports.pk', role: 'FAN', label: 'Sports Fan', dest: '/dashboard' },
  ];

  const handleDemoLogin = async (email: string, dest: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      if (res.ok) {
        setShowRoleModal(false);
        window.location.href = dest;
      }
    } catch (e) {
      console.error(e);
    }
  };

  const userRoles = user?.roles?.map((r: any) => r.roleCode) || [];

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
        <nav className="hidden md:flex items-center space-x-5 text-xs font-semibold text-slate-300">
          <Link href="/cities" className="hover:text-emerald-400 transition">Cities</Link>
          <Link href="/sports" className="hover:text-emerald-400 transition">Sports</Link>
          <Link href="/matches" className="hover:text-emerald-400 transition">Fixtures</Link>
          <Link href="/teams" className="hover:text-emerald-400 transition">Teams</Link>
          <Link href="/rankings" className="hover:text-emerald-400 transition">Leaderboards</Link>
          <Link href="/transfers" className="hover:text-emerald-400 transition">Transfers</Link>
          {user && (
            <Link href="/dashboard" className="text-emerald-400 font-bold hover:text-emerald-300 transition">
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
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-800 transition"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  {user.fullName?.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-white">{user.fullName}</div>
                  <div className="text-[10px] text-emerald-400 font-semibold">{userRoles[0] || 'MEMBER'}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
                  <Link
                    href="/profile"
                    onClick={() => setShowUserDropdown(false)}
                    className="block px-4 py-2 text-slate-200 hover:bg-slate-700 transition"
                  >
                    User Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setShowUserDropdown(false)}
                    className="block px-4 py-2 text-slate-200 hover:bg-slate-700 transition"
                  >
                    Account Settings
                  </Link>
                  <div className="border-t border-slate-700 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-rose-400 hover:bg-rose-500/10 transition flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
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
              Select any pre-configured role to immediately test permission scopes, dashboards, approval queues, or match scorebooks.
            </p>

            <div className="space-y-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => handleDemoLogin(acc.email, acc.dest)}
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
