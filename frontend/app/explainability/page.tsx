'use client';

import { useEffect, useState } from 'react';
import { fetchGlobalShap, fetchLocalShap, fetchSampleApplicants } from '../lib/api';
import { BrainCircuit, AlertCircle, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ExplainabilityPage() {
  const [globalShap, setGlobalShap] = useState<any[]>([]);
  const [localShap, setLocalShap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const globalRes = await fetchGlobalShap();
        setGlobalShap(globalRes.global_shap_importance || []);

        let applicantDict = null;
        const stored = localStorage.getItem('current_applicant');
        if (stored) {
          applicantDict = JSON.parse(stored);
        } else {
          const samples = await fetchSampleApplicants();
          if (samples.length > 0) applicantDict = samples[0].applicant;
        }

        if (applicantDict) {
          const localRes = await fetchLocalShap(applicantDict);
          setLocalShap(localRes);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-zinc-400 font-mono text-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mr-3"></div>
        Calculating SHAP values...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 font-mono text-sm">
        Error loading SHAP explainability: {error}.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Model Explainability (SHAP Analysis)</h1>
        <p className="text-xs text-zinc-400 font-mono mt-1">
          Global feature importance and local SHAP log-odds breakdown based on cooperative game theory.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Global SHAP Chart */}
        <div className="bg-[#141417] border border-zinc-800/80 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <h2 className="text-sm font-semibold text-zinc-200 font-mono flex items-center space-x-2">
              <BrainCircuit className="w-4 h-4 text-amber-400" />
              <span>Global Feature Importance (SHAP)</span>
            </h2>
          </div>
          <p className="text-xs text-zinc-400 font-mono">
            Ranks features by average absolute SHAP impact across all background samples.
          </p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={globalShap} margin={{ top: 5, right: 10, left: 40, bottom: 5 }}>
                <XAxis type="number" stroke="#71717a" fontSize={11} />
                <YAxis dataKey="feature" type="category" stroke="#a1a1aa" fontSize={10} width={130} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#f4f4f5' }} />
                <Bar dataKey="importance" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Local Applicant Breakdown */}
        {localShap && (
          <div className="bg-[#141417] border border-zinc-800/80 p-5 rounded-xl space-y-4">
            <div className="border-b border-zinc-800/80 pb-3">
              <h2 className="text-sm font-semibold text-zinc-200 font-mono">
                Local Applicant SHAP Log-Odds Breakdown
              </h2>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={localShap.local_shap_breakdown} margin={{ top: 5, right: 10, left: 40, bottom: 5 }}>
                  <XAxis type="number" stroke="#71717a" fontSize={11} />
                  <YAxis dataKey="feature" type="category" stroke="#a1a1aa" fontSize={10} width={130} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#f4f4f5' }} />
                  <Bar dataKey="shap_value" radius={[0, 4, 4, 0]}>
                    {localShap.local_shap_breakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.shap_value > 0 ? '#f43f5e' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Plain Language Summary */}
      {localShap && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          <div className="bg-rose-950/20 border border-rose-900/60 p-5 rounded-xl space-y-3">
            <h3 className="font-semibold text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>Factors Increasing Default Risk (+)</span>
            </h3>
            <ul className="space-y-1.5 text-rose-200/90 list-disc list-inside">
              {localShap.risk_increasing_factors.map((f: string, i: number) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-900/60 p-5 rounded-xl space-y-3">
            <h3 className="font-semibold text-emerald-400 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Factors Reducing Default Risk (-)</span>
            </h3>
            <ul className="space-y-1.5 text-emerald-200/90 list-disc list-inside">
              {localShap.risk_reducing_factors.map((f: string, i: number) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
