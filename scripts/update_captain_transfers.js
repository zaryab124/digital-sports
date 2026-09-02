const fs = require('fs');

let cap = fs.readFileSync('src/app/captain/page.tsx', 'utf8');

// Add transfers state to captain page
cap = cap.replace(
  "const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);",
  `const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [teamTransfers, setTeamTransfers] = useState<any[]>([]);`
);

// Load transfers in loadTeamData
cap = cap.replace(
  "setTeamData(data);",
  `setTeamData(data);
        fetch(\`/api/transfers?teamId=\${teamId}\`)
          .then((r) => r.json())
          .then((trData) => setTeamTransfers(trData.transfers || []))
          .catch(() => {});`
);

// Replace transfers tab in captain page
const newTransfersTab = `      {activeTab === 'transfers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
                <span>Squad Player Transfers ({teamTransfers.length})</span>
              </h2>
              <p className="text-xs text-slate-400">Manage NOC releases for departing athletes and approve inbound squad transfers.</p>
            </div>
            <Link
              href="/transfers"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition border border-slate-700"
            >
              Open Transfer Market &rarr;
            </Link>
          </div>

          {teamTransfers.length === 0 ? (
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-500">
              No active transfer applications on record for this squad.
            </div>
          ) : (
            <div className="space-y-3">
              {teamTransfers.map((tr: any) => {
                const isOutbound = tr.oldTeamId === team?.id;
                const isInbound = tr.newTeamId === team?.id;

                return (
                  <div key={tr.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 text-xs">
                          {tr.player?.fullName?.[0]}
                        </div>
                        <div>
                          <span className="font-bold text-white text-sm block">{tr.player?.fullName}</span>
                          <span className="text-[11px] text-slate-400">
                            {isOutbound ? (
                              <span className="text-rose-400">Outbound: Leaving for {tr.newTeam?.name}</span>
                            ) : (
                              <span className="text-emerald-400">Inbound: Joining from {tr.oldTeam?.name}</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={tr.status === 'COMPLETED' ? 'success' : tr.status === 'REJECTED' ? 'danger' : 'gold'}>
                          {tr.status}
                        </Badge>
                        <span className="font-mono text-emerald-400 font-bold">Rs. {tr.fee}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
                      <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                        <span>NOC: <strong className={tr.releasingApproved ? 'text-emerald-400' : 'text-amber-400'}>{tr.releasingApproved ? 'Granted' : 'Pending'}</strong></span>
                        <span>&bull;</span>
                        <span>Acceptance: <strong className={tr.receivingApproved ? 'text-emerald-400' : 'text-amber-400'}>{tr.receivingApproved ? 'Accepted' : 'Pending'}</strong></span>
                      </div>

                      {tr.status !== 'COMPLETED' && tr.status !== 'REJECTED' && (
                        <div className="flex items-center gap-2">
                          {isOutbound && !tr.releasingApproved && (
                            <button
                              onClick={async () => {
                                await fetch(\`/api/transfers/\${tr.id}/approve\`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'RELEASE_APPROVE' }),
                                });
                                loadTeamData(team.id);
                              }}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
                            >
                              Grant NOC Release &rarr;
                            </button>
                          )}

                          {isInbound && !tr.receivingApproved && (
                            <button
                              onClick={async () => {
                                await fetch(\`/api/transfers/\${tr.id}/approve\`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'RECEIVING_APPROVE' }),
                                });
                                loadTeamData(team.id);
                              }}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
                            >
                              Accept Player &rarr;
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}`;

cap = cap.replace(
  /\{activeTab === 'transfers' && \([\s\S]*?\n      \}\)/m,
  newTransfersTab
);

fs.writeFileSync('src/app/captain/page.tsx', cap, 'utf8');
console.log('[OK] Updated src/app/captain/page.tsx with interactive transfers tab');
