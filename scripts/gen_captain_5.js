const fs = require('fs');

const part5 = `
      {activeTab === 'my-team' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h2 className="text-lg font-black text-white">Club Overview & Bio</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {team?.description || 'No biography or club statement has been entered yet. Navigate to Team Settings to add your club overview.'}
              </p>

              {team?.playerRequirements && (
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-1 text-xs">
                  <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">Recruitment Notice</span>
                  <p className="text-slate-200">{team.playerRequirements}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <span className="block text-2xl font-black text-white">{metrics.matchesPlayed}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Matches Played</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <span className="block text-2xl font-black text-emerald-400">{metrics.wins}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Wins</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <span className="block text-2xl font-black text-rose-400">{metrics.losses}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Losses</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <span className="block text-2xl font-black text-amber-400">{metrics.points}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">League Points</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Captain Credentials</h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-emerald-400">
                  {team?.captain?.fullName?.[0] || 'C'}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{team?.captain?.fullName}</h3>
                  <span className="text-xs text-emerald-400 font-medium">Head Team Captain</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 text-xs border-t border-slate-800">
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{team?.contactPhone || 'No contact phone set'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>{team?.contactEmail || 'No contact email set'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{team?.homeGround?.name || 'Municipal Ground'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'players' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">Active Squad Roster</h2>
              <p className="text-xs text-slate-400">Official registered athletes eligible for match scorebooks.</p>
            </div>
            <button
              onClick={() => setActiveTab('requests')}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Athlete</span>
            </button>
          </div>

          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Jersey</th>
                  <th className="p-4">Athlete Name</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {activeMembers.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono font-bold text-emerald-400">#{m.jerseyNumber || '-'}</td>
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-emerald-400 font-bold">
                        {m.player.fullName?.[0]}
                      </div>
                      <span>{m.player.fullName}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant={m.role === 'CAPTAIN' ? 'success' : 'neutral'}>{m.role}</Badge>
                    </td>
                    <td className="p-4 text-slate-400">{new Date(m.joinedAt).toLocaleDateString()}</td>
                    <td className="p-4"><Badge variant="success">ACTIVE</Badge></td>
                    <td className="p-4 text-right">
                      {m.role !== 'CAPTAIN' && (
                        <button
                          onClick={() => handleRemovePlayer(m.id, m.player.fullName)}
                          disabled={actionLoading}
                          className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Release to Alumni</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {formerMembers.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Historical Club Alumni (Preserved)</h3>
                <p className="text-xs text-slate-500">Historical records of former squad members are permanently retained.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {formerMembers.map((fm: any) => (
                  <div key={fm.id} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-300 block">{fm.player.fullName}</span>
                      <span className="text-[10px] text-slate-500">Left: {new Date(fm.leftAt).toLocaleDateString()}</span>
                    </div>
                    <Badge variant="neutral">FORMER</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
`;

fs.appendFileSync('src/app/captain/page.tsx', part5, 'utf8');
console.log('Appended part5');
