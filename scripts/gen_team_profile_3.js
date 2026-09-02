const fs = require('fs');

const p3 = `
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs font-bold">
        {[
          { id: 'roster', label: \`Active Roster (\${activeMembers.length})\`, icon: Users },
          { id: 'alumni', label: \`Club Alumni (\${formerMembers.length})\`, icon: Award },
          { id: 'matches', label: \`Fixtures & Results (\${matches.length})\`, icon: Calendar },
          { id: 'photos', label: \`Winning Photos (\${matchPhotos.length})\`, icon: ImageIcon },
          { id: 'about', label: 'Club History & Bio', icon: Shield },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={\`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition \${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
              }\`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: ACTIVE ROSTER */}
      {activeTab === 'roster' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Jersey</th>
                  <th className="p-4">Athlete Name</th>
                  <th className="p-4">Position / Role</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {activeMembers.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono font-bold text-emerald-400">#{m.jerseyNumber || '-'}</td>
                    <td className="p-4 font-bold text-white flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 text-xs">
                        {m.player?.fullName?.[0]}
                      </div>
                      <span>{m.player?.fullName}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant={m.role === 'CAPTAIN' ? 'success' : 'neutral'}>{m.role}</Badge>
                    </td>
                    <td className="p-4 text-slate-400">{new Date(m.joinedAt).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <Badge variant="success">ACTIVE</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Captain Contact Widget */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Captain Contact</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-emerald-400">
                  {team.captain?.fullName?.[0]}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{team.captain?.fullName}</h4>
                  <span className="text-xs text-emerald-400 font-medium">Head Team Captain</span>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
                {team.contactPhone && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{team.contactPhone}</span>
                  </div>
                )}
                {team.contactEmail && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{team.contactEmail}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CLUB ALUMNI (HISTORICAL PRESERVATION) */}
      {activeTab === 'alumni' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
            <h2 className="text-lg font-black text-white">Historical Club Alumni</h2>
            <p className="text-xs text-slate-400">
              In accordance with Sports Community rules, historical squad membership records are permanently retained.
            </p>
          </div>

          {formerMembers.length === 0 ? (
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-500">
              No historical alumni transfers on record. All founding athletes remain active.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {formerMembers.map((fm: any) => (
                <div key={fm.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white text-sm block">{fm.player.fullName}</span>
                    <span className="text-[10px] text-slate-400">Joined: {new Date(fm.joinedAt).toLocaleDateString()}</span>
                    <span className="text-[10px] text-slate-500 block">Departed: {new Date(fm.leftAt).toLocaleDateString()}</span>
                  </div>
                  <Badge variant="neutral">FORMER</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: MATCHES & FIXTURES */}
      {activeTab === 'matches' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h2 className="text-lg font-black text-white">Club Fixtures & Box Scores</h2>
          {matches.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No matches currently scheduled or recorded.</p>
          ) : (
            <div className="space-y-3">
              {matches.map((m: any) => (
                <div key={m.id} className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-white text-sm block">
                      {m.homeTeam?.name} <span className="text-slate-500">vs</span> {m.awayTeam?.name}
                    </span>
                    <span className="text-slate-400 text-[11px] block">
                      {new Date(m.scheduledAt).toLocaleString()} &bull; {m.ground?.name || 'Local Ground'}
                    </span>
                  </div>
                  <Badge variant={m.status === 'OFFICIAL_VERIFIED' ? 'success' : 'neutral'}>
                    {m.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: WINNING PHOTOS */}
      {activeTab === 'photos' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h2 className="text-lg font-black text-white">Match Photos & Championship Moments</h2>
          {matchPhotos.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No winning photos uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {matchPhotos.map((photo: any) => (
                <div key={photo.id} className="rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 space-y-1">
                  <img src={photo.photoUrl} alt={photo.caption || 'Match photo'} className="w-full h-36 object-cover" />
                  {photo.caption && <p className="p-2 text-[11px] text-slate-300 truncate">{photo.caption}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: ABOUT & RECRUITMENT */}
      {activeTab === 'about' && (
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl max-w-3xl">
          <div className="space-y-2">
            <h2 className="text-lg font-black text-white">Club Biography & Athletic Ambition</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {team.description || 'No biography entered for this squad.'}
            </p>
          </div>

          {team.playerRequirements && (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1 text-xs">
              <span className="font-black text-emerald-400 uppercase text-[10px] tracking-wider">Recruitment Requirements</span>
              <p className="text-slate-200">{team.playerRequirements}</p>
            </div>
          )}
        </div>
      )}

      {/* Join Request Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Request to Join {team.name}</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-slate-400 hover:text-white">&times;</button>
            </div>

            {joinSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 text-xs font-bold text-center">
                Join request sent to Captain {team.captain?.fullName}!
              </div>
            ) : (
              <form onSubmit={handleSendJoinRequest} className="space-y-4">
                {joinError && <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs">{joinError}</div>}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Note to Captain</label>
                  <textarea
                    rows={3}
                    placeholder="Introduce yourself, your primary playing position, and athletic experience..."
                    value={joinMsg}
                    onChange={(e) => setJoinMsg(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingJoin}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition"
                >
                  Send Join Request &rarr;
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.appendFileSync('src/app/teams/[id]/page.tsx', p3, 'utf8');
console.log('Appended p3. Finished teams/[id]/page.tsx');
