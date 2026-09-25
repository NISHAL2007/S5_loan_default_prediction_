'use client';

import { useEffect, useState } from 'react';
import { fetchStability, fetchSampleApplicants } from '@/lib/api';
import { FlaskConical, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function StabilityLabPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        let applicantDict = null;
        const stored = localStorage.getItem('current_applicant');
        if (stored) {
          applicantDict = JSON.parse(stored);
        } else {
          const samples = await fetchSampleApplicants();
          if (samples.length > 0) applicantDict = samples[0].applicant;
        }

        if (applicantDict) {
          const res = await fetchStability(applicantDict);
          setData(res);
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
        Running perturbation stability stress tests...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 font-mono text-sm">
        Error running stability analysis: {error}.
      </div>
    );
  }

  const chartData = data.perturbation_table.map((row: any) => ({
    scenario: row.Scenario,
    diff: row['Probability Difference'],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Prediction Stability Analysis Lab</h1>
        <p className="text-xs text-zinc-400 font-mono mt-1">
          Stress-test model sensitivity under ±5% numeric feature fluctuations (<code className="text-amber-400">credit_amount</code>, <code className="text-amber-400">duration</code>, <code className="text-amber-400">age</code>).
        </p>
      </div>

      {/* KPI Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-mono">
        <div className="bg-[#141417] border border-zinc-800/80 p-5 rounded-xl space-y-1">
          <p className="text-xs text-zinc-400">Base Default Probability</p>
          <p className="text-2xl font-bold text-zinc-100 font-sans">
            {(data.base_probability * 100).toFixed(2)}%
          </p>
        </div>

        <div className="bg-[#141417] border border-zinc-800/80 p-5 rounded-xl space-y-1">
          <p className="text-xs text-zinc-400">Average Abs Shift (Δ)</p>
          <p className="text-2xl font-bold text-amber-400 font-sans">
            {(data.average_abs_change * 100).toFixed(2)}%
          </p>
        </div>

        <div className={`p-5 rounded-xl border space-y-1 ${
          data.stability_score >= 85
            ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
            : data.stability_score >= 60
            ? 'bg-amber-950/30 border-amber-800/80 text-amber-300'
            : 'bg-rose-950/30 border-rose-800/80 text-rose-300'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span>Project-Level Stability Indicator</span>
            <FlaskConical className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold font-sans">
            {data.stability_score.toFixed(2)} / 100
          </p>
          <p className="text-[11px] font-semibold uppercase">{data.classification}</p>
        </div>
      </div>

      {/* Response Chart & Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#141417] border border-zinc-800/80 p-5 rounded-xl space-y-4 font-mono">
          <h2 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800/80 pb-3">
            Perturbation Probability Response Chart
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <XAxis dataKey="scenario" stroke="#71717a" fontSize={10} angle={-15} textAnchor="end" />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#f4f4f5' }} />
                <Bar dataKey="diff" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.diff >= 0 ? '#f43f5e' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Empirical Table */}
        <div className="bg-[#141417] border border-zinc-800/80 p-5 rounded-xl space-y-4 font-mono">
          <h2 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800/80 pb-3">
            Empirical Perturbation Table
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-2 px-3">Scenario</th>
                  <th className="py-2 px-3">Orig Val</th>
                  <th className="py-2 px-3">New Val</th>
                  <th className="py-2 px-3">New Prob</th>
                  <th className="py-2 px-3">Diff (Δ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {data.perturbation_table.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-zinc-900/40">
                    <td className="py-2 px-3 text-amber-400 font-semibold">{row.Scenario}</td>
                    <td className="py-2 px-3">{row['Original Value']}</td>
                    <td className="py-2 px-3">{row['New Value']}</td>
                    <td className="py-2 px-3">{(row['New Default Prob'] * 100).toFixed(2)}%</td>
                    <td className={`py-2 px-3 font-semibold ${row['Probability Difference'] >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {row['Probability Difference'] >= 0 ? '+' : ''}{(row['Probability Difference'] * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
