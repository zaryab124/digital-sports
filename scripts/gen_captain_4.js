const fs = require('fs');

const part4 = `
  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading Captain Command Console...</div>;
  }

  if (captainTeams.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400">
          <Shield className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white">Captain Command Center</h1>
          <p className="text-slate-400 text-xs max-w-md mx-auto">
            You do not currently lead an active squad. Register your club in DRAFT status, pay the annual registration dues, and invite your athletes.
          </p>
        </div>
        <Link
          href="/teams/create"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs transition shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Squad &rarr;</span>
        </Link>
      </div>
    );
  }

  const team = teamData?.team;
  const metrics = teamData?.metrics || { matchesPlayed: 0, wins: 0, losses: 0, draws: 0, points: 0, rankingPosition: null };
  const activeMembers = teamData?.activeMembers || [];
  const formerMembers = teamData?.formerMembers || [];
  const matches = teamData?.matches || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 overflow-hidden font-black text-lg">
            {team?.logoUrl ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" /> : team?.code || 'TM'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">{team?.name}</h1>
              <Badge
                variant={
                  team?.status === 'ACTIVE'
                    ? 'success'
                    : team?.status === 'PENDING_APPROVAL' || team?.status === 'PAYMENT_SUBMITTED'
                    ? 'gold'
                    : team?.status === 'REJECTED'
                    ? 'danger'
                    : 'neutral'
                }
              >
                {team?.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
              <span>{team?.city?.name}</span>
              <span>&bull;</span>
              <span>{team?.sport?.name}</span>
              {team?.homeGround && (
                <>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    {team.homeGround.name}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {captainTeams.length > 1 && (
            <select
              value={selectedTeamId}
              onChange={(e) => handleSelectTeam(e.target.value)}
              className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold"
            >
              {captainTeams.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.sport?.name})</option>
              ))}
            </select>
          )}

          <Link
            href={\`/teams/\${selectedTeamId}\`}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
          >
            Public Profile &rarr;
          </Link>
          <Link
            href="/teams/create"
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Squad</span>
          </Link>
        </div>
      </div>

      {message && (
        <div
          className={\`p-4 rounded-2xl text-xs font-bold flex items-center justify-between \${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }\`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">&times;</button>
        </div>
      )}

      {team?.status !== 'ACTIVE' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-amber-300">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>
              {team?.status === 'DRAFT' || team?.status === 'PENDING_PAYMENT'
                ? 'Your squad registration is currently in DRAFT status. Please submit the yearly registration fee to enable administrative approval.'
                : team?.status === 'PAYMENT_SUBMITTED' || team?.status === 'PENDING_APPROVAL'
                ? 'Payment proof submitted. Squad registration is undergoing City Sports Officer verification.'
                : 'Registration rejected. Please verify your team credentials and re-submit.'}
            </span>
          </div>
          {(team?.status === 'DRAFT' || team?.status === 'PENDING_PAYMENT') && (
            <button
              onClick={() => setActiveTab('payments')}
              className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg text-xs transition"
            >
              Pay Dues Now
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 text-xs font-bold scrollbar-none">
        {[
          { id: 'my-team', label: 'My Team', icon: Shield },
          { id: 'players', label: \`Players (\${activeMembers.length})\`, icon: Users },
          { id: 'requests', label: \`Pending Requests (\${(team?.requests?.length || 0) + (team?.invitations?.length || 0)})\`, icon: UserPlus },
          { id: 'matches', label: 'Matches', icon: Calendar },
          { id: 'results', label: 'Results', icon: Trophy },
          { id: 'scorebook', label: 'Scorebook', icon: FileText },
          { id: 'performance', label: 'Performance', icon: Trophy },
          { id: 'payments', label: 'Payments', icon: DollarSign },
          { id: 'transfers', label: 'Transfer Requests', icon: ArrowRightLeft },
          { id: 'settings', label: 'Team Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as CaptainTab)}
              className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition \${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
              }\`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
`;

fs.appendFileSync('src/app/captain/page.tsx', part4, 'utf8');
console.log('Appended part4');
