'use client';

import { useEffect, useState } from 'react';
import { fetchSampleApplicants, predictRisk } from '@/lib/api';
import sample30 from '../lib/sample_30_applicants.json';
import { ShieldAlert, CheckCircle2, AlertTriangle, XCircle, Sliders } from 'lucide-react';

export default function RiskAssessmentPage() {
  const [samples, setSamples] = useState<any[]>(sample30);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [applicant, setApplicant] = useState<Record<string, any>>(sample30[0].applicant);
  const [threshold, setThreshold] = useState(0.50);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  useEffect(() => {
    fetchSampleApplicants()
      .then((data) => {
        if (Array.isArray(data) && data.length >= 30) {
          setSamples(data);
          setApplicant(data[0].applicant);
        }
      })
      .catch((err) => {
        console.error("Using pre-loaded 30 sample applicants fallback:", err);
      });
  }, []);

  const handleSampleChange = (idx: number) => {
    setSelectedIdx(idx);
    if (samples[idx] && samples[idx].applicant) {
      setApplicant(samples[idx].applicant);
    }
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await predictRisk(applicant, threshold);
      setResult(res);
      localStorage.setItem('current_applicant', JSON.stringify(applicant));
      localStorage.setItem('current_threshold', String(threshold));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Individual Risk Assessment Engine</h1>
        <p className="text-xs text-zinc-400 font-mono mt-1">
          Compute real-time borrower default risk probability and evaluate threshold decisions across 30 sample profiles.
        </p>
      </div>

      {/* Preset Example Selector (30 Applicants) */}
      <div className="bg-[#141417] border border-zinc-800/80 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <label className="text-xs font-mono text-zinc-300 font-semibold">Preset Test Borrower (30 Applicants):</label>
        <select
          value={selectedIdx}
          onChange={(e) => handleSampleChange(Number(e.target.value))}
          className="bg-zinc-900 border border-zinc-700/80 text-zinc-200 text-xs font-mono rounded-md px-3 py-2 focus:outline-none focus:border-amber-400 w-full md:w-[28rem]"
        >
          {samples.map((s, i) => (
            <option key={s.index || i} value={s.index || i}>
              {s.label || `Applicant ${i} (Age: ${s.applicant?.age}, Credit: $${s.applicant?.credit_amount})`}
            </option>
          ))}
        </select>
      </div>

      {/* Form Grid */}
      <form onSubmit={handleAnalyze} className="bg-[#141417] border border-zinc-800/80 p-6 rounded-xl space-y-6">
        <h2 className="text-sm font-semibold text-zinc-200 font-mono border-b border-zinc-800/80 pb-3">
          Borrower Application Attributes
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs font-mono">
          <div className="space-y-1">
            <label className="text-zinc-400">Age (Years)</label>
            <input
              type="number"
              value={applicant.age || 35}
              onChange={(e) => setApplicant({ ...applicant, age: Number(e.target.value) })}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400">Credit Amount ($)</label>
            <input
              type="number"
              value={applicant.credit_amount || 2500}
              onChange={(e) => setApplicant({ ...applicant, credit_amount: Number(e.target.value) })}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400">Loan Duration (Months)</label>
            <input
              type="number"
              value={applicant.duration || 24}
              onChange={(e) => setApplicant({ ...applicant, duration: Number(e.target.value) })}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400">Checking Account Status</label>
            <select
              value={applicant.checking_status || 'no checking'}
              onChange={(e) => setApplicant({ ...applicant, checking_status: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
            >
              {['<0', '0<=X<200', '>=200', 'no checking'].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400">Savings Account Status</label>
            <select
              value={applicant.savings_status || 'no known savings'}
              onChange={(e) => setApplicant({ ...applicant, savings_status: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
            >
              {['<100', '100<=X<500', '500<=X<1000', '>=1000', 'no known savings'].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400">Credit History</label>
            <select
              value={applicant.credit_history || 'existing paid'}
              onChange={(e) => setApplicant({ ...applicant, credit_history: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
            >
              {['critical/other existing credit', 'existing paid', 'delayed previously', 'no credits/all paid', 'all paid'].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400">Purpose</label>
            <select
              value={applicant.purpose || 'new car'}
              onChange={(e) => setApplicant({ ...applicant, purpose: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
            >
              {['radio/tv', 'education', 'furniture/equipment', 'new car', 'used car', 'business', 'repairs', 'vacation/others', 'domestic appliances'].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400">Housing</label>
            <select
              value={applicant.housing || 'own'}
              onChange={(e) => setApplicant({ ...applicant, housing: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
            >
              {['own', 'for free', 'rent'].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400">Job Type</label>
            <select
              value={applicant.job || 'skilled'}
              onChange={(e) => setApplicant({ ...applicant, job: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
            >
              {['skilled', 'unskilled resident', 'high qualif/self emp/mgmt', 'unemp/unskilled non res'].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Threshold Policy Slider */}
        <div className="bg-zinc-900/60 p-4 rounded-lg border border-zinc-800/80 space-y-2 font-mono">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-semibold flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Credit Decision Threshold Policy:</span>
            </span>
            <span className="text-amber-400 font-bold">{threshold.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.30"
            max="0.70"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-amber-400 bg-zinc-800 cursor-pointer"
          />
          <p className="text-[11px] text-zinc-500">
            *The ML model generates a probability; selecting the decision threshold is a separate credit policy risk appetite decision.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs font-mono uppercase tracking-wider rounded-lg transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-950/30"
        >
          {loading ? (
            <span>Computing Risk Score...</span>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4" />
              <span>Analyze Risk Profile</span>
            </>
          )}
        </button>
      </form>

      {/* Output Panel */}
      {result && (
        <div className="bg-[#141417] border border-zinc-800/80 p-6 rounded-xl space-y-4 font-mono">
          <h2 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800/80 pb-3">
            Prediction Results & Risk Categorization
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-lg">
              <p className="text-xs text-zinc-400">Predicted Default Probability</p>
              <p className="text-3xl font-bold text-zinc-100 mt-1 font-sans">
                {(result.default_probability * 100).toFixed(2)}%
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${
              result.is_default
                ? 'bg-rose-950/30 border-rose-800/80 text-rose-300'
                : 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
            }`}>
              <p className="text-xs font-semibold uppercase">Credit Policy Decision</p>
              <p className="text-lg font-bold mt-1 flex items-center space-x-2">
                {result.is_default ? <XCircle className="w-5 h-5 text-rose-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                <span>{result.decision}</span>
              </p>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-lg">
              <p className="text-xs text-zinc-400">Risk Tier Classification</p>
              <p className="text-lg font-bold text-amber-400 mt-1 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>{result.risk_tier}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
