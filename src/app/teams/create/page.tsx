'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Trophy, MapPin, DollarSign, CheckCircle2, ArrowRight, Upload, Phone, Mail, FileText, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

const FALLBACK_CITIES = [
  { id: 'jampur-city', name: 'Jampur', slug: 'jampur', code: 'JAM' },
  { id: 'dgk-city', name: 'Dera Ghazi Khan', slug: 'dera-ghazi-khan', code: 'DGK' },
  { id: 'rajanpur-city', name: 'Rajanpur', slug: 'rajanpur', code: 'RAJ' },
  { id: 'taunsa-city', name: 'Taunsa', slug: 'taunsa', code: 'TAU' },
  { id: 'multan-city', name: 'Multan', slug: 'multan', code: 'MUL' },
  { id: 'muzaffargarh-city', name: 'Muzaffargarh', slug: 'muzaffargarh', code: 'MZG' },
  { id: 'layyah-city', name: 'Layyah', slug: 'layyah', code: 'LAY' },
];

const FALLBACK_SPORTS = [
  { id: 'cricket-sport', name: 'Cricket', slug: 'cricket', code: 'CRICKET', registrationFee: 1500 },
  { id: 'football-sport', name: 'Football', slug: 'football', code: 'FOOTBALL', registrationFee: 1500 },
  { id: 'volleyball-sport', name: 'Volleyball', slug: 'volleyball', code: 'VOLLEYBALL', registrationFee: 1000 },
  { id: 'badminton-sport', name: 'Badminton', slug: 'badminton', code: 'BADMINTON', registrationFee: 500 },
  { id: 'table-tennis-sport', name: 'Table Tennis', slug: 'table-tennis', code: 'TABLE_TENNIS', registrationFee: 500 },
  { id: 'snooker-sport', name: 'Snooker', slug: 'snooker', code: 'SNOOKER', registrationFee: 500 },
];

export default function CreateTeamPage() {
  const router = useRouter();
  const [step, setStep] = useState<'DETAILS' | 'PAYMENT' | 'SUCCESS'>('DETAILS');

  const [cities, setCities] = useState<any[]>(FALLBACK_CITIES);
  const [sports, setSports] = useState<any[]>(FALLBACK_SPORTS);
  const [grounds, setGrounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [cityId, setCityId] = useState('');
  const [sportId, setSportId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [homeGroundId, setHomeGroundId] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [playerRequirements, setPlayerRequirements] = useState('');

  // Created team & payment data
  const [createdTeam, setCreatedTeam] = useState<any>(null);
  const [createdPayment, setCreatedPayment] = useState<any>(null);

  // Payment Form fields
  const [paymentMethod, setPaymentMethod] = useState<'EASYPAISA' | 'JAZZCASH' | 'BANK_TRANSFER' | 'CASH'>('EASYPAISA');
  const [transactionRef, setTransactionRef] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/cities').then((r) => r.json()),
      fetch('/api/sports').then((r) => r.json()),
    ])
      .then(([cityData, sportData]) => {
        setCities(cityData.cities || []);
        setSports(sportData.sports || []);
        if (cityData.cities?.length) setCityId(cityData.cities[0].id);
        if (sportData.sports?.length) setSportId(sportData.sports[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (cityId) {
      fetch('/api/grounds')
        .then((r) => r.json())
        .then((d) => {
          const cityGrounds = (d.grounds || []).filter((g: any) => g.cityId === cityId);
          setGrounds(cityGrounds);
          if (cityGrounds.length) setHomeGroundId(cityGrounds[0].id);
          else setHomeGroundId('');
        });
    }
  }, [cityId]);

  const selectedSport = sports.find((s) => s.id === sportId);
  const registrationFee = selectedSport?.registrationFee || 1000;

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityId,
          sportId,
          name,
          code: code.toUpperCase(),
          logoUrl: logoUrl || undefined,
          description: description || undefined,
          homeGroundId: homeGroundId || undefined,
          contactPhone: contactPhone || undefined,
          contactEmail: contactEmail || undefined,
          playerRequirements: playerRequirements || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create team');

      setCreatedTeam(data.team);
      setCreatedPayment(data.payment);
      setStep('PAYMENT');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/teams/${createdTeam.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: createdPayment.id,
          paymentMethod,
          transactionReference: transactionRef,
          proofImageUrl: proofUrl || undefined,
          remarks: paymentRemarks || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit payment proof');

      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-400">Loading Team Registration Portal...</div>;

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-8">
      {/* Step Indicator */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold">
        <div className={`flex items-center space-x-2 ${step === 'DETAILS' ? 'text-emerald-400' : 'text-slate-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'DETAILS' ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>1</span>
          <span>Team Details (DRAFT)</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-600" />
        <div className={`flex items-center space-x-2 ${step === 'PAYMENT' ? 'text-emerald-400' : 'text-slate-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'PAYMENT' ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>2</span>
          <span>Registration Fee (PKR {registrationFee})</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-600" />
        <div className={`flex items-center space-x-2 ${step === 'SUCCESS' ? 'text-emerald-400' : 'text-slate-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 'SUCCESS' ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>3</span>
          <span>Admin Review</span>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-medium">{error}</div>}

      {/* STEP 1: TEAM DETAILS */}
      {step === 'DETAILS' && (
        <form onSubmit={handleCreateTeam} className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-emerald-400" />
              Register New Sports Squad
            </h1>
            <p className="text-xs text-slate-400">
              Initialize your official club profile in DRAFT status. You will become the founding Team Captain.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Official Home City</label>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              >
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Sport</label>
              <select
                value={sportId}
                onChange={(e) => setSportId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              >
                {sports.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.registrationType} - PKR {s.registrationFee || 1000})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Official Team Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Jampur Tigers Cricket Club"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!code) {
                    const initials = e.target.value.split(' ').map((w) => w[0]).join('').slice(0, 5).toUpperCase();
                    setCode(initials);
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Team Code</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="e.g. JTCC"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono uppercase font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Designated Home Ground</label>
              <select
                value={homeGroundId}
                onChange={(e) => setHomeGroundId(e.target.value)}
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
                placeholder="https://..."
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Contact Phone</label>
              <input
                type="text"
                placeholder="+92 300 1234567"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Contact Email</label>
              <input
                type="email"
                placeholder="captain@club.pk"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Team Bio & History</label>
            <textarea
              rows={3}
              placeholder="Describe your squad founding, athletic ambitions, and tournament history..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Player Recruitment Requirements</label>
            <textarea
              rows={2}
              placeholder="e.g. Seeking middle-order batsman and wicket-keeper. Minimum age 16 with club experience."
              value={playerRequirements}
              onChange={(e) => setPlayerRequirements(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg"
          >
            <span>Proceed to Yearly Registration Fee Payment (PKR {registrationFee}) &rarr;</span>
          </button>
        </form>
      )}

      {/* STEP 2: REGISTRATION PAYMENT CHECKOUT */}
      {step === 'PAYMENT' && (
        <form onSubmit={handlePaymentSubmit} className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
          <div className="space-y-1">
            <Badge variant="gold">REAL TRANSACTION REQUIRED</Badge>
            <h1 className="text-2xl font-black text-white">Squad Registration Fee Payment</h1>
            <p className="text-xs text-slate-400">
              To activate <span className="text-emerald-400 font-bold">{createdTeam?.name}</span>, please deposit the standard yearly club registration fee of <span className="text-white font-bold">PKR {createdPayment?.amount || 1000}</span>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Invoice Order ID:</span>
              <span className="font-mono font-bold text-white">{createdPayment?.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Applicable Dues:</span>
              <span className="font-bold text-emerald-400">PKR {createdPayment?.amount || 1000} / Year</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Official Receiver Account:</span>
              <span className="font-bold text-white">0300-1234567 (South Punjab Sports Board)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Payment Gateway Method</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CASH'] as const).map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`p-3 rounded-xl border text-xs font-bold transition text-center ${
                    paymentMethod === method
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {method.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Transaction / Reference Number</label>
            <input
              type="text"
              required
              placeholder="e.g. TRX-99824158 or Deposit Slip Ref"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Proof Screenshot / Receipt Image URL</label>
            <input
              type="url"
              placeholder="https://..."
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Payment Remarks / Notes</label>
            <textarea
              rows={2}
              placeholder="Add any relevant details regarding your payment deposit..."
              value={paymentRemarks}
              onChange={(e) => setPaymentRemarks(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg"
          >
            <span>Submit Payment Proof & Send for Administrative Approval &rarr;</span>
          </button>
        </form>
      )}

      {/* STEP 3: SUCCESS & PENDING APPROVAL */}
      {step === 'SUCCESS' && (
        <div className="p-10 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 text-center shadow-2xl">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
          <div className="space-y-2">
            <Badge variant="gold">STATUS: PENDING APPROVAL</Badge>
            <h2 className="text-2xl font-black text-white">Team Registration Submitted!</h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              Your squad <span className="text-emerald-400 font-bold">{createdTeam?.name}</span> and payment proof of <span className="text-white font-bold">PKR {createdPayment?.amount || 1000}</span> have been sent to the City Sports Officer for verification.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/captain"
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              Go to Captain Command Hub &rarr;
            </Link>
            <Link
              href={`/teams/${createdTeam?.id}`}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition"
            >
              View Squad Profile
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
