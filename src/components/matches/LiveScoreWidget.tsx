'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Zap } from 'lucide-react';

interface LiveScoreProps {
  matchId: string;
  initialHomeScore?: number;
  initialAwayScore?: number;
  homeTeamName: string;
  awayTeamName: string;
}

export function LiveScoreWidget({
  matchId,
  initialHomeScore = 0,
  initialAwayScore = 0,
  homeTeamName,
  awayTeamName,
}: LiveScoreProps) {
  const [homeScore, setHomeScore] = useState(initialHomeScore);
  const [awayScore, setAwayScore] = useState(initialAwayScore);
  const [isLive, setIsLive] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(`/api/realtime?matchId=${matchId}`);

    eventSource.addEventListener('MATCH_SCORE_UPDATE', (event: any) => {
      try {
        const parsed = JSON.parse(event.data);
        const payload = parsed.payload;
        if (payload.matchId === matchId) {
          setHomeScore(payload.homeScore ?? homeScore);
          setAwayScore(payload.awayScore ?? awayScore);
          setLastEvent(payload.latestEvent);
          setIsLive(true);
          setFlash(true);
          setTimeout(() => setFlash(false), 1500);
        }
      } catch (e) {
        console.error('Failed to parse score update', e);
      }
    });

    eventSource.addEventListener('MATCH_STATUS_UPDATE', (event: any) => {
      try {
        const parsed = JSON.parse(event.data);
        const payload = parsed.payload;
        if (payload.matchId === matchId) {
          if (payload.status === 'OFFICIAL' || payload.isLocked) {
            setIsLive(false);
          }
        }
      } catch (e) {
        console.error('Failed to parse status update', e);
      }
    });

    eventSource.onopen = () => setIsLive(true);
    eventSource.onerror = () => {
      // Browser will auto-reconnect
    };

    return () => eventSource.close();
  }, [matchId]);

  return (
    <div className={`rounded-2xl border p-4 transition-all duration-300 ${
      flash ? 'border-emerald-400 bg-emerald-950/30 shadow-lg shadow-emerald-500/20' : 'border-slate-700 bg-slate-800/60'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isLive ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">LIVE</span>
            </>
          ) : (
            <>
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Connected</span>
            </>
          )}
        </div>
        {flash && <Zap className="w-4 h-4 text-amber-400 animate-bounce" />}
      </div>

      <div className="flex items-center justify-center gap-6">
        <div className="text-center">
          <div className="text-xs font-bold text-slate-300 mb-1 truncate max-w-[100px]">{homeTeamName}</div>
          <div className={`text-3xl font-black transition-all duration-300 ${
            flash ? 'text-emerald-400 scale-110' : 'text-white'
          }`}>{homeScore}</div>
        </div>
        <div className="text-lg font-bold text-slate-600">vs</div>
        <div className="text-center">
          <div className="text-xs font-bold text-slate-300 mb-1 truncate max-w-[100px]">{awayTeamName}</div>
          <div className={`text-3xl font-black transition-all duration-300 ${
            flash ? 'text-emerald-400 scale-110' : 'text-white'
          }`}>{awayScore}</div>
        </div>
      </div>

      {lastEvent && (
        <div className="mt-3 p-2 rounded-lg bg-slate-900/60 border border-slate-700/50">
          <div className="text-[10px] text-slate-400">
            <span className="font-bold text-emerald-400">{lastEvent.eventType}</span>
            {lastEvent.player && <span> — {lastEvent.player.fullName}</span>}
            {lastEvent.team && <span className="text-slate-500"> ({lastEvent.team.name})</span>}
          </div>
        </div>
      )}
    </div>
  );
}
