const fs = require('fs');

const part2 = `
function CaptainDashboardContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as CaptainTab) || 'my-team';
  const [activeTab, setActiveTab] = useState<CaptainTab>(initialTab);

  const [captainTeams, setCaptainTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamData, setTeamData] = useState<any>(null);
  const [grounds, setGrounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [opponentTeamId, setOpponentTeamId] = useState('');
  const [matchGroundId, setMatchGroundId] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [availableOpponents, setAvailableOpponents] = useState<any[]>([]);

  const [editDesc, setEditDesc] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editGround, setEditGround] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editReqs, setEditReqs] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'EASYPAISA' | 'JAZZCASH' | 'BANK_TRANSFER' | 'CASH'>('EASYPAISA');
  const [txRef, setTxRef] = useState('');
  const [txProof, setTxProof] = useState('');

  const loadCaptainTeams = async () => {
    try {
      const userRes = await fetch('/api/users/profile');
      if (!userRes.ok) return;
      const userData = await userRes.json();
      const userId = userData.user?.id;
      if (!userId) return;

      const teamsRes = await fetch(\`/api/teams?captainId=\${userId}\`);
      const teamsData = await teamsRes.json();
      const squads = teamsData.teams || [];
      setCaptainTeams(squads);

      if (squads.length > 0) {
        const tId = selectedTeamId || squads[0].id;
        setSelectedTeamId(tId);
        await loadTeamDetails(tId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamDetails = async (id: string) => {
    try {
      const res = await fetch(\`/api/teams/\${id}\`);
      if (!res.ok) return;
      const data = await res.json();
      setTeamData(data);

      setEditDesc(data.team.description || '');
      setEditLogo(data.team.logoUrl || '');
      setEditGround(data.team.homeGroundId || '');
      setEditPhone(data.team.contactPhone || '');
      setEditEmail(data.team.contactEmail || '');
      setEditReqs(data.team.playerRequirements || '');

      if (data.team?.sportId) {
        fetch(\`/api/teams?sportId=\${data.team.sportId}\`)
          .then((r) => r.json())
          .then((d) => {
            const opps = (d.teams || []).filter((t: any) => t.id !== id && t.status === 'ACTIVE');
            setAvailableOpponents(opps);
            if (opps.length) setOpponentTeamId(opps[0].id);
          });
      }

      fetch('/api/grounds')
        .then((r) => r.json())
        .then((d) => setGrounds(d.grounds || []));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCaptainTeams();
  }, []);

  const handleSelectTeam = (id: string) => {
    setSelectedTeamId(id);
    loadTeamDetails(id);
  };
`;

fs.appendFileSync('src/app/captain/page.tsx', part2, 'utf8');
console.log('Appended part2');
