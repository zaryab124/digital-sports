const fs = require('fs');

const part3 = `
  const handleInvitePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(\`/api/teams/\${selectedTeamId}/invitations\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerEmail: inviteEmail, message: inviteMsg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation');

      setMessage({ type: 'success', text: \`Invitation sent to \${inviteEmail}!\` });
      setInviteEmail('');
      setInviteMsg('');
      loadTeamDetails(selectedTeamId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespondRequest = async (reqId: string, action: 'ACCEPT' | 'DECLINE') => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(\`/api/teams/\${selectedTeamId}/requests/\${reqId}/respond\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process request');

      setMessage({ type: 'success', text: action === 'ACCEPT' ? 'Athlete added to squad!' : 'Request declined.' });
      loadTeamDetails(selectedTeamId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemovePlayer = async (memberId: string, playerName: string) => {
    if (!confirm(\`Are you sure you want to remove \${playerName} from active squad? Their historical club record will be preserved in alumni archives.\`)) return;

    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(\`/api/teams/\${selectedTeamId}/members/\${memberId}\`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove member');

      setMessage({ type: 'success', text: \`\${playerName} moved to historical alumni roster.\` });
      loadTeamDetails(selectedTeamId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleProposeMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sportId: teamData.team.sportId,
          homeTeamId: selectedTeamId,
          awayTeamId: opponentTeamId,
          groundId: matchGroundId || undefined,
          scheduledAt: new Date(matchDate).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule match');

      setMessage({ type: 'success', text: 'Match fixture proposed successfully!' });
      setMatchDate('');
      loadTeamDetails(selectedTeamId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(\`/api/teams/\${selectedTeamId}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editDesc,
          logoUrl: editLogo || undefined,
          homeGroundId: editGround || null,
          contactPhone: editPhone,
          contactEmail: editEmail,
          playerRequirements: editReqs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');

      setMessage({ type: 'success', text: 'Squad profile settings saved!' });
      loadTeamDetails(selectedTeamId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      const paymentId = teamData.team.payments?.[0]?.id;
      if (!paymentId) throw new Error('No pending registration payment found');

      const res = await fetch(\`/api/teams/\${selectedTeamId}/pay\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          paymentMethod,
          transactionReference: txRef,
          proofImageUrl: txProof || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit payment');

      setMessage({ type: 'success', text: 'Payment submitted! Status is now PENDING_APPROVAL.' });
      loadTeamDetails(selectedTeamId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };
`;

fs.appendFileSync('src/app/captain/page.tsx', part3, 'utf8');
console.log('Appended part3');
