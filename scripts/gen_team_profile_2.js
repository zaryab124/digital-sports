const fs = require('fs');

const p2 = `
  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading Squad Profile...</div>;
  }

  if (!teamData?.team) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <h1 className="text-xl font-bold text-white">Squad Not Found</h1>
        <p className="text-xs text-slate-400">The requested team profile does not exist or has been removed.</p>
        <Link href="/teams" className="inline-block px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl">
          &larr; Back to Teams Directory
        </Link>
      </div>
    );
  }

  const team = teamData.team;
  const metrics = teamData.metrics || { matchesPlayed: 0, wins: 0, losses: 0, draws: 0, points: 0, rankingPosition: null };
  const activeMembers = teamData.activeMembers || [];
  const formerMembers = teamData.formerMembers || [];
  const matches = teamData.matches || [];
  const matchPhotos = team.matchPhotos || [];

  const isCaptain = currentUser?.id === team.captainId;
  const isMember = activeMembers.some((m: any) => m.playerId === currentUser?.id);

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6">
      {/* Top Breadcrumb */}
      <Link href="/teams" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition font-bold">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Squads Directory</span>
      </Link>

      {/* Main Squad Header Banner */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-emerald-400 font-black text-2xl overflow-hidden shadow-inner flex-shrink-0">
              {team.logoUrl ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" /> : team.code}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{team.name}</h1>
                <Badge
                  variant={
                    team.status === 'ACTIVE'
                      ? 'success'
                      : team.status === 'PENDING_APPROVAL' || team.status === 'PAYMENT_SUBMITTED'
                      ? 'gold'
                      : team.status === 'REJECTED'
                      ? 'danger'
                      : 'neutral'
                  }
                >
                  {team.status}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <Link href={\`/cities/\${team.city?.slug || team.cityId}\`} className="hover:text-emerald-400 font-bold transition flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{team.city?.name}</span>
                </Link>
                <span>&bull;</span>
                <Link href={\`/sports/\${team.sport?.slug || team.sportId}\`} className="hover:text-emerald-400 font-bold transition flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{team.sport?.name}</span>
                </Link>
                {team.homeGround && (
                  <>
                    <span>&bull;</span>
                    <span className="text-slate-300 flex items-center gap-1">
                      <span>Ground:</span>
                      <span className="font-bold text-white">{team.homeGround.name}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isCaptain ? (
              <Link
                href="/captain"
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs transition shadow-lg flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                <span>Captain Dashboard &rarr;</span>
              </Link>
            ) : isMember ? (
              <div className="px-5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Active Squad Member</span>
              </div>
            ) : (
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs transition shadow-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Request to Join Squad</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-8 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-slate-800/50 text-center">
            <span className="block text-xl font-black text-white">{metrics.matchesPlayed}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Played</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-800/50 text-center">
            <span className="block text-xl font-black text-emerald-400">{metrics.wins}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Wins</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-800/50 text-center">
            <span className="block text-xl font-black text-rose-400">{metrics.losses}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Losses</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-800/50 text-center">
            <span className="block text-xl font-black text-slate-300">{metrics.draws}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Draws</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-800/50 text-center">
            <span className="block text-xl font-black text-amber-400">{metrics.points}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Points</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-800/50 text-center">
            <span className="block text-xl font-black text-purple-400">
              {metrics.rankingPosition ? \`#\${metrics.rankingPosition}\` : 'Unranked'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">City Rank</span>
          </div>
        </div>
      </div>
`;

fs.appendFileSync('src/app/teams/[id]/page.tsx', p2, 'utf8');
console.log('Appended p2 of team profile');
