import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Wrote:', path)

# 1. City Community Hub Page
write_file('src/app/community/[citySlug]/page.tsx', """'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Users, Trophy, Activity, MessageSquare, Plus, CheckCircle, Calendar, Shield, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function CityCommunityPage({ params }: { params: { citySlug: string } }) {
  const [city, setCity] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState('ANNOUNCEMENT');
  const [showPostModal, setShowPostModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCityData();
  }, [params.citySlug]);

  const loadCityData = async () => {
    try {
      // Find city by code / slug
      const citiesRes = await fetch('/api/cities');
      const citiesData = await citiesRes.json();
      const matchedCity = citiesData.cities?.find(
        (c: any) => c.code.toLowerCase() === params.citySlug.toLowerCase() || c.name.toLowerCase() === params.citySlug.toLowerCase()
      );

      if (matchedCity) {
        const [cityRes, postsRes, photosRes, matchesRes] = await Promise.all([
          fetch(`/api/cities/${matchedCity.id}`),
          fetch(`/api/community/${matchedCity.id}/posts`),
          fetch(`/api/community/${matchedCity.id}/photos`),
          fetch(`/api/matches?cityId=${matchedCity.id}`),
        ]);

        const cityData = await cityRes.json();
        const postsData = await postsRes.json();
        const photosData = await photosRes.json();
        const matchesData = await matchesRes.json();

        setCity(cityData.city);
        setPosts(postsData.posts || []);
        setPhotos(photosData.photos || []);
        setMatches(matchesData.matches || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city) return;
    try {
      const res = await fetch(`/api/community/${city.id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPostTitle,
          content: newPostContent,
          postType: newPostType,
        }),
      });
      if (res.ok) {
        setShowPostModal(false);
        setNewPostTitle('');
        setNewPostContent('');
        loadCityData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-400">Loading Community Hub...</div>;
  if (!city) return <div className="text-center py-20 text-slate-400">City Community not found</div>;

  return (
    <div className="space-y-8">
      {/* City Hero Header */}
      <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <MapPin className="w-4 h-4" />
              <span>{city.region?.name}, {city.region?.province?.name}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white">{city.name} Sports Community</h1>
            <p className="text-sm text-slate-300 max-w-2xl">{city.community?.description}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPostModal(true)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Post Announcement</span>
            </button>
            <Link
              href="/teams/create"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition"
            >
              + Register Team
            </Link>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800 text-center">
          <div className="p-3 bg-slate-800/40 rounded-xl">
            <div className="text-2xl font-black text-emerald-400">{city._count?.teams || 0}</div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Active Teams</div>
          </div>
          <div className="p-3 bg-slate-800/40 rounded-xl">
            <div className="text-2xl font-black text-white">{city._count?.matches || 0}</div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Matches Recorded</div>
          </div>
          <div className="p-3 bg-slate-800/40 rounded-xl">
            <div className="text-2xl font-black text-white">{city._count?.grounds || 0}</div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Sports Grounds</div>
          </div>
          <div className="p-3 bg-slate-800/40 rounded-xl">
            <div className="text-2xl font-black text-emerald-400">{city._count?.users || 0}</div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Registered Citizens</div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Feed & Recent Matches */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Community Announcements Feed */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              Community Announcements & Highlights
            </h2>

            {posts.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
                No community announcements posted yet for {city.name}.
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant={post.postType === 'ANNOUNCEMENT' ? 'blue' : 'green'}>{post.postType}</Badge>
                        {post.isPinned && <Badge variant="yellow">📌 Pinned</Badge>}
                      </div>
                      <span className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-base font-bold text-white">{post.title}</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{post.content}</p>
                    <div className="pt-2 text-xs text-slate-500 font-medium">
                      Posted by {post.author?.fullName}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* City Matches */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              City Fixtures & Official Scorecards
            </h2>

            <div className="space-y-3">
              {matches.map((m) => (
                <div key={m.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-400 font-medium">
                      {m.sport?.name} • {new Date(m.scheduledAt).toLocaleDateString()}
                    </div>
                    <div className="font-bold text-white text-sm">
                      {m.homeTeam?.name} <span className="text-emerald-400">({m.homeScore})</span> vs {m.awayTeam?.name} <span className="text-emerald-400">({m.awayScore})</span>
                    </div>
                  </div>
                  <Link
                    href={`/matches/${m.id}/scorebook`}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition"
                  >
                    Scorebook &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Active Teams & Victory Gallery */}
        <div className="space-y-8">
          
          {/* Active Teams */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Registered Teams
            </h2>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              {city.teams?.map((t: any) => (
                <Link
                  key={t.id}
                  href={`/teams/${t.id}`}
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-750 flex items-center justify-between transition block"
                >
                  <div>
                    <div className="text-sm font-bold text-white">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.sport?.name} • Captain: {t.captain?.fullName}</div>
                  </div>
                  <Badge variant="green">ACTIVE</Badge>
                </Link>
              ))}
            </div>
          </div>

          {/* Winning Photos Gallery */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-400" />
              Victory Photo Gallery
            </h2>

            {photos.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                No official match winning photos uploaded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {photos.map((ph) => (
                  <div key={ph.id} className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
                    <img src={ph.photoUrl} alt="Winning Team" className="w-full h-44 object-cover" />
                    <div className="p-4 space-y-1">
                      <div className="text-xs font-bold text-emerald-400">{ph.team?.name}</div>
                      <p className="text-xs text-slate-300">{ph.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold">Post to {city.name} Community</h3>
              <button onClick={() => setShowPostModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="e.g. Football Tournament Registration Open"
                  className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Type</label>
                <select
                  value={newPostType}
                  onChange={(e) => setNewPostType(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                >
                  <option value="ANNOUNCEMENT">Announcement</option>
                  <option value="HIGHLIGHT">Match Highlight / Recap</option>
                  <option value="EVENT">Upcoming Event</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Content</label>
                <textarea
                  required
                  rows={4}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Write your announcement details..."
                  className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition"
              >
                Publish Announcement
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
""")

# 2. Teams List & Create Team
write_file('src/app/teams/page.tsx', """'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Plus, Users, MapPin, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function TeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [selectedSport, setSelectedSport] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');

  useEffect(() => {
    Promise.all([
      fetch('/api/teams').then((r) => r.json()),
      fetch('/api/sports').then((r) => r.json()),
      fetch('/api/cities').then((r) => r.json()),
    ]).then(([teamsData, sportsData, citiesData]) => {
      setTeams(teamsData.teams || []);
      setSports(sportsData.sports || []);
      setCities(citiesData.cities || []);
    });
  }, []);

  const filteredTeams = teams.filter((t) => {
    if (selectedSport !== 'ALL' && t.sportId !== selectedSport) return false;
    if (selectedCity !== 'ALL' && t.cityId !== selectedCity) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Registered Teams & Rosters</h1>
          <p className="text-xs text-slate-400 mt-1">Official registered teams across all South Punjab sports communities</p>
        </div>
        <Link
          href="/teams/create"
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 shadow-lg transition"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Team</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <select
          value={selectedSport}
          onChange={(e) => setSelectedSport(e.target.value)}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white"
        >
          <option value="ALL">All Sports</option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white"
        >
          <option value="ALL">All Cities</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <Link
            key={team.id}
            href={`/teams/${team.id}`}
            className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant={team.status === 'ACTIVE' ? 'green' : team.status === 'PENDING_APPROVAL' ? 'yellow' : 'gray'}>
                  {team.status}
                </Badge>
                <span className="text-xs text-slate-400 font-semibold">{team.sport?.name}</span>
              </div>
              <h3 className="text-lg font-bold text-white">{team.name}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {team.city?.name}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Captain: <strong className="text-slate-200">{team.captain?.fullName}</strong></span>
              <span>{team._count?.members || 0} Players</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
""")

write_file('src/app/teams/create/page.tsx', """'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function CreateTeamPage() {
  const router = useRouter();
  const [cities, setCities] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [cityId, setCityId] = useState('');
  const [sportId, setSportId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/cities').then((r) => r.json()),
      fetch('/api/sports').then((r) => r.json()),
    ]).then(([citiesData, sportsData]) => {
      if (citiesData.cities?.length) {
        setCities(citiesData.cities);
        setCityId(citiesData.cities[0].id);
      }
      if (sportsData.sports?.length) {
        setSports(sportsData.sports);
        setSportId(sportsData.sports[0].id);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityId, sportId, name, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create team');

      setCreatedOrder(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-black text-white">Register New Sports Team</h1>
        <p className="text-xs text-slate-400">Step 1: Define team details & generate yearly registration fee order (Rs. 1,000)</p>
      </div>

      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {createdOrder ? (
          <div className="space-y-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{createdOrder.team?.name} Registered!</h3>
              <p className="text-xs text-slate-400 mt-1">Status: <strong className="text-amber-400">PENDING_PAYMENT</strong></p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 text-left space-y-2 text-xs text-slate-300">
              <div className="flex justify-between font-bold text-white text-sm">
                <span>Yearly Registration Fee:</span>
                <span className="text-emerald-400">PKR {createdOrder.payment?.amount}</span>
              </div>
              <p className="text-slate-400">
                To activate your team and begin participating in matches, please submit payment proof via EasyPaisa, JazzCash, or Bank Transfer.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/dashboard/payments`)}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition"
              >
                Submit Payment Proof Now
              </button>
              <button
                onClick={() => router.push(`/teams/${createdOrder.team?.id}`)}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition"
              >
                View Team Profile
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Team Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Taunsa Thunderbolts"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Team Code</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="TTB"
                  maxLength={6}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Sport</label>
                <select
                  value={sportId}
                  onChange={(e) => setSportId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  {sports.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.category?.type})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Official Registered City</label>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-400 space-y-1">
              <div className="font-bold text-slate-200">Registration Fee Policy</div>
              <div>Team Sports: PKR 1,000 / year • Individual Sports: PKR 500 / year. Fee order will be generated upon creation.</div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Submitting...' : 'Create Team & Generate Fee Order'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
""")

write_file('src/app/teams/[id]/page.tsx', """'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Users, MapPin, Trophy, Calendar, Plus, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function TeamProfilePage({ params }: { params: { id: string } }) {
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/teams/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setTeam(data.team);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading Team Profile...</div>;
  if (!team) return <div className="text-center py-20 text-slate-400">Team not found</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Badge variant={team.status === 'ACTIVE' ? 'green' : team.status === 'PENDING_APPROVAL' ? 'yellow' : 'gray'}>
              {team.status}
            </Badge>
            <span className="text-xs text-slate-400 font-semibold">{team.sport?.name} • {team.city?.name}</span>
          </div>
          <h1 className="text-3xl font-black text-white">{team.name}</h1>
          <p className="text-xs text-slate-400">Captain: <strong className="text-slate-200">{team.captain?.fullName}</strong> ({team.captain?.email})</p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/matches/create"
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
          >
            Propose Match
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Roster */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Official Active Roster ({team.members?.length || 0} Athletes)
          </h2>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs uppercase font-bold text-slate-400">
                <tr>
                  <th className="px-6 py-3">Player</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Jersey</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {team.members?.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-bold text-white">{m.player?.fullName}</td>
                    <td className="px-6 py-4">{m.role}</td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-400">#{m.jerseyNumber || '-'}</td>
                    <td className="px-6 py-4">
                      <Badge variant="gold">{m.player?.playerProfile?.performanceCategory || 'DEVELOPING'}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={m.status === 'ACTIVE' ? 'green' : 'gray'}>{m.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Team Stats & Details */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">Cumulative Performance</h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-slate-800/50 rounded-xl">
                <div className="text-xl font-black text-emerald-400">{team.teamStats?.[0]?.points || 0}</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Ranking Points</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-xl">
                <div className="text-xl font-black text-white">{team.teamStats?.[0]?.wins || 0}W - {team.teamStats?.[0]?.losses || 0}L</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Win/Loss</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
""")

print('[DONE] Frontend Part 3 written.')
