const fs = require('fs');

let prof = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

// Add ArrowRightLeft, Shield, Clock, Calendar to imports if missing
prof = prof.replace(
  "import { User, Mail, Phone, MapPin, Shield, Trophy, Award, CheckCircle2, Save, Sparkles } from 'lucide-react';",
  "import { User, Mail, Phone, MapPin, Shield, Trophy, Award, CheckCircle2, Save, Sparkles, ArrowRightLeft, Clock, Calendar } from 'lucide-react';"
);

// Add TRANSFERS_CLUBS to tabs
prof = prof.replace(
  "<button\n          onClick={() => setTab('ROLE_DATA')}",
  `<button
          onClick={() => setTab('TRANSFERS_CLUBS')}
          className={\`px-5 py-2.5 rounded-xl transition \${tab === 'TRANSFERS_CLUBS' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}\`}
        >
          Squads & Transfers
        </button>
        <button
          onClick={() => setTab('ROLE_DATA')}`
);

// Add TRANSFERS_CLUBS content
const transferTabContent = `
          {tab === 'TRANSFERS_CLUBS' && (
            <div className="space-y-6">
              {/* Transfer Metrics Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 text-center">
                  <span className="block text-2xl font-black text-emerald-400">
                    {user.teamMemberships?.filter((m: any) => m.status === 'ACTIVE').length || 0}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Active Squads</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 text-center">
                  <span className="block text-2xl font-black text-amber-400">
                    {user.teamMemberships?.filter((m: any) => m.status === 'FORMER').length || 0}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Previous Clubs (Alumni)</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 text-center">
                  <span className="block text-2xl font-black text-purple-400">
                    {user.transfers?.filter((t: any) => t.status === 'COMPLETED').length || 0}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Career Transfers</span>
                </div>
              </div>

              {/* Current Active Squads */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Current Active Squads</span>
                </h3>
                {(!user.teamMemberships || user.teamMemberships.filter((m: any) => m.status === 'ACTIVE').length === 0) ? (
                  <p className="text-xs text-slate-500 p-4 bg-slate-800 rounded-2xl">Not actively rostered in any squad currently.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {user.teamMemberships.filter((m: any) => m.status === 'ACTIVE').map((m: any) => (
                      <div key={m.id} className="p-4 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-between">
                        <div className="space-y-1">
                          <Link href={\`/teams/\${m.teamId}\`} className="font-bold text-white hover:text-emerald-400 transition text-sm block">
                            {m.team.name}
                          </Link>
                          <span className="text-[11px] text-slate-400 block">{m.team.sport?.name} &bull; {m.team.city?.name}</span>
                          <span className="text-[10px] text-slate-500 block">Joined: {new Date(m.joinedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant="success">ACTIVE</Badge>
                          {m.jerseyNumber && <span className="block text-xs font-mono font-bold text-emerald-400">#{m.jerseyNumber}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Previous Clubs / Alumni Archives */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Previous Clubs & Alumni Archives (Permanent History)</span>
                </h3>
                {(!user.teamMemberships || user.teamMemberships.filter((m: any) => m.status === 'FORMER').length === 0) ? (
                  <p className="text-xs text-slate-500 p-4 bg-slate-800 rounded-2xl">No historical club releases on record.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {user.teamMemberships.filter((m: any) => m.status === 'FORMER').map((m: any) => (
                      <div key={m.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-300 text-sm block">{m.team.name}</span>
                          <span className="text-[11px] text-slate-400 block">{m.team.sport?.name} &bull; {m.team.city?.name}</span>
                          <span className="text-[10px] text-slate-500 block">
                            {new Date(m.joinedAt).toLocaleDateString()} &rarr; {m.leftAt ? new Date(m.leftAt).toLocaleDateString() : 'Transferred'}
                          </span>
                        </div>
                        <Badge variant="neutral">FORMER</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Transfer History Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowRightLeft className="w-4 h-4 text-purple-400" />
                    <span>Official Transfer History</span>
                  </h3>
                  <Link href="/transfers" className="text-xs text-emerald-400 hover:text-emerald-300 font-bold">
                    Go to Transfer Hub &rarr;
                  </Link>
                </div>
                {(!user.transfers || user.transfers.length === 0) ? (
                  <p className="text-xs text-slate-500 p-4 bg-slate-800 rounded-2xl">No transfer applications recorded.</p>
                ) : (
                  <div className="space-y-2.5">
                    {user.transfers.map((t: any) => (
                      <div key={t.id} className="p-4 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{t.oldTeam?.name}</span>
                            <span className="text-slate-500">&rarr;</span>
                            <span className="font-bold text-emerald-400">{t.newTeam?.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 block">
                            {t.sport?.name} &bull; Fee: PKR {t.fee} &bull; Requested: {new Date(t.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={t.status === 'COMPLETED' ? 'success' : t.status === 'REJECTED' ? 'danger' : 'gold'}>
                            {t.status}
                          </Badge>
                          {t.completedAt && (
                            <span className="text-[10px] text-slate-400">{new Date(t.completedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
`;

prof = prof.replace(
  "{tab === 'ROLE_DATA' && (",
  transferTabContent + "\n          {tab === 'ROLE_DATA' && ("
);

fs.writeFileSync('src/app/profile/page.tsx', prof, 'utf8');
console.log('[OK] Updated src/app/profile/page.tsx with Squads & Transfers tab');
