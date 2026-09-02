const fs = require('fs');

const p1 = `'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Shield, Trophy, MapPin, Calendar, Users, Phone, Mail,
  CheckCircle2, Plus, ArrowLeft, Image as ImageIcon,
  Flame, Award, Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function TeamProfilePage() {
  const params = useParams();
  const teamId = params.id as string;

  const [teamData, setTeamData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'roster' | 'alumni' | 'matches' | 'photos' | 'about'>('roster');
  const [loading, setLoading] = useState(true);

  // Join request state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMsg, setJoinMsg] = useState('');
  const [submittingJoin, setSubmittingJoin] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [joinError, setJoinError] = useState('');

  const loadProfile = async () => {
    try {
      const [teamRes, userRes] = await Promise.all([
        fetch(\`/api/teams/\${teamId}\`),
        fetch('/api/users/profile'),
      ]);

      if (teamRes.ok) {
        const d = await teamRes.json();
        setTeamData(d);
      }
      if (userRes.ok) {
        const u = await userRes.json();
        setCurrentUser(u.user);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) loadProfile();
  }, [teamId]);

  const handleSendJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    setSubmittingJoin(true);
    try {
      const res = await fetch(\`/api/teams/\${teamId}/requests\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: joinMsg }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to submit join request');

      setJoinSuccess(true);
      setTimeout(() => {
        setShowJoinModal(false);
        setJoinSuccess(false);
        setJoinMsg('');
      }, 2500);
    } catch (err: any) {
      setJoinError(err.message);
    } finally {
      setSubmittingJoin(false);
    }
  };
`;

fs.writeFileSync('src/app/teams/[id]/page.tsx', p1, 'utf8');
console.log('Wrote p1 of team profile');
