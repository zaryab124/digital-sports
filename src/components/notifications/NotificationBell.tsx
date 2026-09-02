'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Check, ExternalLink, Sparkles, AlertCircle, Shield, Trophy, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export function NotificationBell({ userId }: { userId?: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();

    // Setup Real-Time Server-Sent Events (SSE) Stream
    const eventSource = new EventSource(`/api/realtime?userId=${userId}`);

    eventSource.addEventListener('NOTIFICATION', (event: any) => {
      try {
        const parsed = JSON.parse(event.data);
        const newNotif = parsed.payload;
        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadCount((prev) => prev + 1);
        setPulse(true);
        setTimeout(() => setPulse(false), 2000);
      } catch (e) {
        console.error('Failed to parse incoming notification event', e);
      }
    });

    eventSource.onerror = () => {
      // Reconnection handled automatically by browser EventSource
    };

    return () => {
      eventSource.close();
    };
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const markSingleRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  if (!userId) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition ${
          pulse ? 'animate-bounce text-amber-400 bg-amber-950/40' : ''
        }`}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] text-[10px] font-black bg-rose-500 text-white rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden text-xs">
          <div className="p-4 bg-slate-800/60 border-b border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="font-black text-white uppercase tracking-wider">Real-Time Alerts</span>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-bold text-emerald-400 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No notifications yet.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markSingleRead(n.id)}
                  className={`p-4 transition flex flex-col gap-1 cursor-pointer ${
                    !n.isRead ? 'bg-slate-800/40 hover:bg-slate-800/60' : 'hover:bg-slate-800/20 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                      {n.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">{n.message}</p>

                  <div className="pt-1 flex items-center justify-between">
                    <Badge
                      variant={
                        n.notificationType?.includes('APPROVED') || n.notificationType?.includes('VERIFIED')
                          ? 'green'
                          : n.notificationType?.includes('REJECTED') || n.notificationType?.includes('CANCELLED')
                          ? 'red'
                          : 'blue'
                      }
                    >
                      {n.notificationType || n.type}
                    </Badge>

                    {n.linkUrl && (
                      <Link
                        href={n.linkUrl}
                        onClick={() => setIsOpen(false)}
                        className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 hover:underline"
                      >
                        <span>View</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
