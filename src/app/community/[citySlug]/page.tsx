'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  MapPin, Users, Trophy, Activity, MessageSquare, Plus, CheckCircle,
  Calendar, Shield, Camera, Flag, Trash2, Check, X, Star, ChevronDown,
  Sparkles, AlertCircle, ArrowRight, Lock, Eye
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function CityCommunityPage() {
  const params = useParams();
  const router = useRouter();
  const citySlug = params?.citySlug as string;

  const [cities, setCities] = useState<any[]>([]);
  const [feedData, setFeedData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'FEED' | 'MATCHES' | 'RANKINGS' | 'PHOTOS' | 'SPOTLIGHT' | 'MODERATION'
  const [activeTab, setActiveTab] = useState('FEED');

  // Announcement Modal
  const [showPostModal, setShowPostModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState('ANNOUNCEMENT');

  // Upload Winning Photo Modal
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [submittingPhoto, setSubmittingPhoto] = useState(false);

  // Report Photo Modal
  const [reportingPhotoId, setReportingPhotoId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    loadAllCities();
  }, []);

  useEffect(() => {
    if (citySlug) {
      loadCityFeed(citySlug);
    }
  }, [citySlug]);

  const loadAllCities = async () => {
    try {
      const [cRes, meRes] = await Promise.all([
        fetch('/api/cities').then((r) => r.json()),
        fetch('/api/auth/me').then((r) => r.json()),
      ]);
      setCities(cRes.cities || []);
      setUser(meRes.user);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCityFeed = async (slug: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/community/' + slug + '/feed');
      const data = await res.json();
      if (data.city) {
        setFeedData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCitySwitch = (targetSlug: string) => {
    router.push('/community/' + targetSlug);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedData?.city?.id) return;
    try {
      const res = await fetch('/api/community/' + feedData.city.id + '/posts', {
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
        loadCityFeed(citySlug);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to create post');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUploadWinningPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedData?.city?.id || !selectedMatchId || !photoUrl) return;
    setSubmittingPhoto(true);
    try {
      const res = await fetch('/api/community/' + feedData.city.id + '/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: selectedMatchId,
          photoUrl,
          caption: photoCaption,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Photo uploaded successfully.');
        setShowPhotoModal(false);
        setPhotoUrl('');
        setPhotoCaption('');
        setSelectedMatchId('');
        loadCityFeed(citySlug);
      } else {
        alert(data.error || 'Failed to upload photo');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingPhoto(false);
    }
  };

  const handlePhotoAction = async (photoId: string, action: string, reason?: string) => {
    try {
      const res = await fetch('/api/community/photos/' + photoId + '/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Action executed successfully');
        setReportingPhotoId(null);
        setReportReason('');
        loadCityFeed(citySlug);
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-400">Loading Municipal Community Hub...</div>;
  if (!feedData) return <div className="text-center py-20 text-slate-400">City Community Hub Not Found</div>;

  const { city, upcomingMatches, recentResults, teamRankings, playerRankings, winningPhotos, announcements, featuredTeams, featuredPlayers } = feedData;
  const isAdmin = user && (user.roles?.includes('SUPER_ADMIN') || user.roles?.includes('CITY_ADMIN'));

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Top City Switcher Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-400">Viewing City Community:</span>
          <select
            value={city.slug}
            onChange={(e) => handleCitySwitch(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black text-white"
          >
            {cities.map((c) => (
              <option key={c.id} value={c.slug}>{c.name} Sports Community</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <span>Official Player Home:</span>
          <Badge variant="blue" className="font-bold">{user?.homeCity?.name || 'Registered Hub'}</Badge>
        </div>
      </div>

      {/* City Hero Header */}
      <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <MapPin className="w-4 h-4" />
              <span>{city.region} &bull; {city.province}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white">{city.name} Sports Community</h1>
            <p className="text-xs text-slate-300 max-w-2xl">{city.communityDescription || city.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowPhotoModal(true)}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl text-xs shadow-xl transition flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4" />
              <span>+ Post Victory Photo</span>
            </button>
            <button
              onClick={() => setShowPostModal(true)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs shadow-xl transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Announcement</span>
            </button>
          </div>
        </div>

        {/* Quick Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 text-center">
            <span className="block text-xl font-black text-emerald-400">{featuredTeams.length}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Active Squads</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 text-center">
            <span className="block text-xl font-black text-purple-400">{upcomingMatches.length}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Upcoming Matches</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 text-center">
            <span className="block text-xl font-black text-blue-400">{recentResults.length}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Verified Results</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 text-center">
            <span className="block text-xl font-black text-amber-400">{winningPhotos.length}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Winning Photos</span>
          </div>
        </div>
      </div>

      {/* Community Navigation Tabs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs font-black">
        <button
          onClick={() => setActiveTab('FEED')}
          className={`py-3 rounded-2xl border transition ${activeTab === 'FEED' ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}
        >
          1. Feed & Posts
        </button>
        <button
          onClick={() => setActiveTab('MATCHES')}
          className={`py-3 rounded-2xl border transition ${activeTab === 'MATCHES' ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}
        >
          2. Matches ({upcomingMatches.length})
        </button>
        <button
          onClick={() => setActiveTab('RESULTS')}
          className={`py-3 rounded-2xl border transition ${activeTab === 'RESULTS' ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}
        >
          3. Results ({recentResults.length})
        </button>
        <button
          onClick={() => setActiveTab('RANKINGS')}
          className={`py-3 rounded-2xl border transition ${activeTab === 'RANKINGS' ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}
        >
          4. Standings
        </button>
        <button
          onClick={() => setActiveTab('PHOTOS')}
          className={`py-3 rounded-2xl border transition ${activeTab === 'PHOTOS' ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}
        >
          5. Victory Photos ({winningPhotos.length})
        </button>
        <button
          onClick={() => setActiveTab('SPOTLIGHT')}
          className={`py-3 rounded-2xl border transition ${activeTab === 'SPOTLIGHT' ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}
        >
          6. Spotlight
        </button>
      </div>

      {/* TAB 1: COMMUNITY ANNOUNCEMENTS & FEED */}
      {activeTab === 'FEED' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Community Bulletin & News</span>
            </h3>

            {announcements.length === 0 ? (
              <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                No announcements posted yet in {city.name}.
              </div>
            ) : (
              announcements.map((p: any) => (
                <div key={p.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={p.postType === 'ANNOUNCEMENT' ? 'gold' : 'blue'}>{p.postType}</Badge>
                      {p.isPinned && <Badge variant="green">📌 Pinned</Badge>}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-base font-bold text-white">{p.title}</h4>
                  <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{p.content}</p>
                  <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-400 border-t border-slate-800">
                    <span>Posted by {p.author?.fullName || 'Community Admin'}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar Quick Standings Widget */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-between">
                <span>Top City Standings</span>
                <Link href="/rankings" className="text-emerald-400 hover:underline">Full Standings &rarr;</Link>
              </h3>
              <div className="space-y-2 text-xs">
                {teamRankings.slice(0, 4).map((r: any, idx: number) => (
                  <div key={r.id} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-400">#{idx + 1}</span>
                      <span className="font-bold text-white truncate max-w-[120px]">{r.team?.name}</span>
                    </div>
                    <span className="font-mono font-black text-emerald-400">{r.points} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UPCOMING MATCHES */}
      {activeTab === 'MATCHES' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Upcoming Matches in {city.name}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingMatches.length === 0 ? (
              <div className="col-span-full p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                No upcoming matches scheduled currently in {city.name}.
              </div>
            ) : (
              upcomingMatches.map((m: any) => (
                <div key={m.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant={m.status === 'LIVE' ? 'red' : 'blue'}>{m.status}</Badge>
                    <span className="font-bold text-slate-400">{m.sport?.name}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 text-center space-y-2">
                    <span className="font-bold text-white block">{m.homeTeam?.name}</span>
                    <span className="text-xs font-black text-emerald-400 font-mono">VS</span>
                    <span className="font-bold text-white block">{m.awayTeam?.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{m.ground?.name || city.name}</span>
                    <Link href={`/matches/${m.id}`} className="text-emerald-400 font-bold hover:underline">Details &rarr;</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RECENT RESULTS */}
      {activeTab === 'RESULTS' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Recent Official Results in {city.name}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentResults.length === 0 ? (
              <div className="col-span-full p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                No official match results recorded yet in {city.name}.
              </div>
            ) : (
              recentResults.map((m: any) => (
                <div key={m.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="gold" className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>OFFICIAL</span>
                    </Badge>
                    <span className="font-bold text-slate-400">{m.sport?.name}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2 text-xs font-bold">
                    <div className="flex items-center justify-between text-white">
                      <span>{m.homeTeam?.name}</span>
                      <span className="font-mono text-base text-emerald-400">{m.homeScore}</span>
                    </div>
                    <div className="flex items-center justify-between text-white">
                      <span>{m.awayTeam?.name}</span>
                      <span className="font-mono text-base text-purple-400">{m.awayScore}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-amber-400 font-bold">Winner: {m.winnerTeam?.name || 'Draw'}</span>
                    <Link href={`/matches/${m.id}`} className="text-emerald-400 font-bold hover:underline">Scorebook &rarr;</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MUNICIPAL STANDINGS */}
      {activeTab === 'RANKINGS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>{city.name} Team Standings</span>
            </h3>
            <div className="space-y-2 text-xs">
              {teamRankings.map((r: any, idx: number) => (
                <div key={r.id} className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-400">#{idx + 1}</span>
                    <span className="font-bold text-white">{r.team?.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({r.sport?.name})</span>
                  </div>
                  <span className="font-mono font-black text-emerald-400 text-sm">{r.points} pts</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              <span>Top Athletes in {city.name}</span>
            </h3>
            <div className="space-y-2 text-xs">
              {playerRankings.map((r: any, idx: number) => (
                <div key={r.id} className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-400">#{idx + 1}</span>
                    <span className="font-bold text-white">{r.playerProfile?.user?.fullName}</span>
                  </div>
                  <Badge variant="gold">Rating: {Math.round(r.performanceRating)}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: VICTORY PHOTOS GALLERY */}
      {activeTab === 'PHOTOS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-400" />
              <span>Match Victory Celebrations ({winningPhotos.length})</span>
            </h3>
            <button
              onClick={() => setShowPhotoModal(true)}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs shadow transition"
            >
              + Upload Victory Photo
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {winningPhotos.length === 0 ? (
              <div className="col-span-full p-16 rounded-3xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                No victory photos published yet for {city.name}.
              </div>
            ) : (
              winningPhotos.map((photo: any) => (
                <div key={photo.id} className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl space-y-3 p-4 flex flex-col justify-between">
                  <div className="aspect-video w-full rounded-2xl bg-slate-800 overflow-hidden relative">
                    <img src={photo.photoUrl} alt={photo.caption || 'Victory'} className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{photo.team?.name}</span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">{photo.sport?.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{photo.caption}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Uploaded by {photo.uploader?.fullName}</span>
                    <button
                      onClick={() => setReportingPhotoId(photo.id)}
                      className="text-rose-400 hover:underline flex items-center gap-1"
                    >
                      <Flag className="w-3 h-3" />
                      <span>Report</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: SPOTLIGHT ON PLAYERS & TEAMS */}
      {activeTab === 'SPOTLIGHT' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Featured Squads in {city.name}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {featuredTeams.map((t: any) => (
                <div key={t.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                  <span className="font-black text-white block">{t.name}</span>
                  <span className="text-[11px] text-slate-400 block">{t.sport?.name}</span>
                  <span className="text-[10px] text-emerald-400 font-bold block">Captain: {t.captain?.fullName}</span>
                  <Link href={`/teams/${t.id}`} className="text-[11px] text-emerald-400 font-bold hover:underline block pt-1">
                    View Club Profile &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              <span>Featured Athletes in {city.name}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {featuredPlayers.map((p: any) => (
                <div key={p.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                  <span className="font-black text-white block">{p.user?.fullName}</span>
                  <Badge variant="gold">{p.performanceCategory || 'DEVELOPING'}</Badge>
                  <span className="text-[10px] text-slate-400 block">Sport: {p.primarySport?.name || 'Multi-Sport'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-400" />
                <span>Upload Official Match Victory Photo</span>
              </h3>
              <button onClick={() => setShowPhotoModal(false)} className="text-slate-400 hover:text-white text-lg font-bold">
                &times;
              </button>
            </div>

            <form onSubmit={handleUploadWinningPhoto} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Select Official Match Result</label>
                <select
                  value={selectedMatchId}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-xs"
                  required
                >
                  <option value="">-- Choose Completed Official Match --</option>
                  {recentResults.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.homeTeam?.name} ({m.homeScore}) vs {m.awayTeam?.name} ({m.awayScore}) - Winner: {m.winnerTeam?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Photo Image URL</label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://example.com/victory-team-photo.jpg"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Photo Caption & Celebration Message</label>
                <textarea
                  rows={3}
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Celebration after claiming municipal victory in Jampur..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={submittingPhoto}
                className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-xl transition"
              >
                Submit Official Victory Photo &rarr;
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <span>Post Community Announcement</span>
              </h3>
              <button onClick={() => setShowPostModal(false)} className="text-slate-400 hover:text-white text-lg font-bold">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Announcement Title</label>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="e.g. Annual Jampur Cricket Tournament Registration Open"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Category Type</label>
                <select
                  value={newPostType}
                  onChange={(e) => setNewPostType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-xs"
                >
                  <option value="ANNOUNCEMENT">Official Announcement</option>
                  <option value="EVENT">Sports Tournament / Event</option>
                  <option value="HIGHLIGHT">Match Highlight / News</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Message Content</label>
                <textarea
                  rows={4}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Details of the announcement..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-xl transition"
              >
                Publish Announcement &rarr;
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Report Photo Modal */}
      {reportingPhotoId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl text-xs">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Flag className="w-4 h-4 text-rose-400" />
              <span>Report Photo to City Sports Board</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Please provide the reason for reporting this photo for moderation:
            </p>
            <textarea
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="e.g. Inappropriate content, not linked to official match..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setReportingPhotoId(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePhotoAction(reportingPhotoId, 'REPORT', reportReason)}
                className="px-4 py-2 bg-rose-500 text-white font-bold rounded-xl"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
