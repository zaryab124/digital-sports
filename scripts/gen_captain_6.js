const fs = require('fs');

const part6 = `
      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form onSubmit={handleInvitePlayer} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              <span>Invite Athlete to Squad</span>
            </h2>
            <p className="text-xs text-slate-400">Enter player email address to transmit an official roster invitation.</p>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Player Email Address</label>
              <input
                type="email"
                required
                placeholder="athlete@domain.pk"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Custom Invitation Message</label>
              <textarea
                rows={2}
                placeholder="e.g. We would like you to join as our leading fast bowler for the upcoming Municipal Championship."
                value={inviteMsg}
                onChange={(e) => setInviteMsg(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition"
            >
              Send Invitation &rarr;
            </button>
          </form>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>Inbound Join Requests ({(team?.requests || []).length})</span>
            </h2>

            {(team?.requests || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No pending join requests from athletes.</p>
            ) : (
              <div className="space-y-3">
                {team.requests.map((r: any) => (
                  <div key={r.id} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{r.player.fullName}</span>
                      <span className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    {r.message && <p className="text-xs text-slate-300 italic">&ldquo;{r.message}&rdquo;</p>}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleRespondRequest(r.id, 'ACCEPT')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs transition"
                      >
                        Accept to Roster
                      </button>
                      <button
                        onClick={() => handleRespondRequest(r.id, 'DECLINE')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-lg text-xs transition"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={handleProposeMatch} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>Propose Match Challenge</span>
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Opponent Squad</label>
              <select
                value={opponentTeamId}
                onChange={(e) => setOpponentTeamId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              >
                {availableOpponents.map((opp) => (
                  <option key={opp.id} value={opp.id}>{opp.name} ({opp.city?.name})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Designated Venue Ground</label>
              <select
                value={matchGroundId}
                onChange={(e) => setMatchGroundId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              >
                <option value="">Team Home Ground / Public Ground</option>
                {grounds.map((g) => (
                  <option key={g.id} value={g.id}>{g.name} ({g.city?.name})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Scheduled Date & Time</label>
              <input
                type="datetime-local"
                required
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition"
            >
              Submit Challenge &rarr;
            </button>
          </form>

          <div className="md:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-base font-black text-white">Scheduled Fixtures ({matches.length})</h2>
            {matches.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No fixtures scheduled.</p>
            ) : (
              <div className="space-y-3">
                {matches.map((m: any) => (
                  <div key={m.id} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white text-sm">
                        {m.homeTeam?.name} <span className="text-slate-500">vs</span> {m.awayTeam?.name}
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        {new Date(m.scheduledAt).toLocaleString()} &bull; {m.ground?.name || 'Local Ground'}
                      </div>
                    </div>
                    <Badge variant={m.status === 'OFFICIAL_VERIFIED' ? 'success' : 'neutral'}>
                      {m.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {(activeTab === 'results' || activeTab === 'scorebook') && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h2 className="text-base font-black text-white">Match Results & Verified Scorebooks</h2>
          {matches.filter((m: any) => m.scorebook).length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No completed scorebooks on record yet.</p>
          ) : (
            <div className="space-y-3">
              {matches.filter((m: any) => m.scorebook).map((m: any) => (
                <div key={m.id} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white text-sm">{m.homeTeam?.name} vs {m.awayTeam?.name}</span>
                    <span className="text-slate-400 block mt-0.5">{m.scorebook.summaryNotes || 'Scorebook verified'}</span>
                  </div>
                  <Badge variant="success">VERIFIED SCOREBOOK</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-3xl font-black text-white block">{metrics.matchesPlayed}</span>
              <span className="text-xs uppercase font-bold text-slate-400">Total Played</span>
            </div>
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-3xl font-black text-emerald-400 block">{metrics.wins}</span>
              <span className="text-xs uppercase font-bold text-slate-400">Total Wins</span>
            </div>
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-3xl font-black text-rose-400 block">{metrics.losses}</span>
              <span className="text-xs uppercase font-bold text-slate-400">Losses</span>
            </div>
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-3xl font-black text-amber-400 block">{metrics.points}</span>
              <span className="text-xs uppercase font-bold text-slate-400">Standings Points</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Yearly Club Registration Payments</span>
            </h2>

            <div className="space-y-3">
              {(team?.payments || []).map((p: any) => (
                <div key={p.id} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white text-sm">PKR {p.amount} ({p.paymentType})</span>
                    <span className="text-slate-400 block mt-0.5">Order ID: {p.id}</span>
                  </div>
                  <Badge variant={p.status === 'VERIFIED' ? 'success' : p.status === 'SUBMITTED' ? 'gold' : 'neutral'}>
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>

            {(team?.status === 'DRAFT' || team?.status === 'PENDING_PAYMENT') && (
              <form onSubmit={handlePayFee} className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-4 pt-4 mt-4">
                <h3 className="font-bold text-white text-xs">Submit Annual Registration Fee Payment Proof</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CASH'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={\`p-2 rounded-xl text-xs font-bold border transition \${
                        paymentMethod === m ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-300'
                      }\`}
                    >
                      {m.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  required
                  placeholder="Transaction Reference Number"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono font-bold"
                />

                <input
                  type="url"
                  placeholder="Proof Receipt Image URL (Optional)"
                  value={txProof}
                  onChange={(e) => setTxProof(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition"
                >
                  Submit Payment Proof &rarr;
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {activeTab === 'transfers' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl text-center py-10">
          <ArrowRightLeft className="w-10 h-10 text-emerald-400 mx-auto" />
          <h2 className="text-base font-black text-white">Player Transfer Requests</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Official inter-club transfer window requests for South Punjab leagues. Transfers must be authorized by both club captains.
          </p>
        </div>
      )}

      {activeTab === 'settings' && (
        <form onSubmit={handleUpdateSettings} className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl max-w-3xl">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <span>Squad Profile Settings</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Designated Home Ground</label>
              <select
                value={editGround}
                onChange={(e) => setEditGround(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              >
                <option value="">None / Public Municipal Ground</option>
                {grounds.map((g) => (
                  <option key={g.id} value={g.id}>{g.name} ({g.address})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Club Logo Image URL</label>
              <input
                type="url"
                value={editLogo}
                onChange={(e) => setEditLogo(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Contact Phone</label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Contact Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Team Description & History</label>
            <textarea
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Player Requirements Notice</label>
            <textarea
              rows={2}
              value={editReqs}
              onChange={(e) => setEditReqs(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={actionLoading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition"
          >
            Save Squad Settings &rarr;
          </button>
        </form>
      )}
    </div>
  );
}

export default function CaptainDashboardPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400">Loading Captain Console...</div>}>
      <CaptainDashboardContent />
    </Suspense>
  );
}
`;

fs.appendFileSync('src/app/captain/page.tsx', part6, 'utf8');
console.log('Appended part6. Finished captain/page.tsx');
