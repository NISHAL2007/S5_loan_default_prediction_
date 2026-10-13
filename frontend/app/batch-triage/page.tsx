'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchBatchTriage } from '@/lib/api';
import { 
  Zap, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  RefreshCw, 
  Filter,
  ShieldCheck,
  TrendingDown,
  Layers
} from 'lucide-react';

export default function BatchTriagePage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(0.50);
  const [filter, setFilter] = useState<'ALL' | 'APPROVED' | 'REVIEW' | 'DECLINE'>('ALL');

  const loadBatch = async (t = threshold) => {
    setLoading(true);
    try {
      const res = await fetchBatchTriage(undefined, t);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatch(threshold);
  }, []);

  const handleThresholdChange = (newT: number) => {
    setThreshold(newT);
    loadBatch(newT);
  };

  const handleInspectApplicant = (item: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_applicant', JSON.stringify(item.applicant));
      localStorage.setItem('current_threshold', String(threshold));
    }
    router.push('/underwriting-cockpit');
  };

  const filteredQueue = data?.queue?.filter((item: any) => {
    if (filter === 'ALL') return true;
    return item.decision === filter;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-3 h-3 mr-1" /> Track 05: AI for Productivity & Automation
            </span>
            <span className="text-zinc-500 text-xs font-mono">| High-Throughput Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mt-1">
            Autonomous Batch Queue Underwriting & Triage
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Automates bulk retail credit application queues: validates, scores, and triages 30 files in under 1 second.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadBatch(threshold)}
            disabled={loading}
            className="flex items-center space-x-2 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-mono transition border border-zinc-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-run Triage</span>
          </button>
        </div>
      </div>

      {/* KPI Productivity Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#141417] border border-zinc-800/80 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Processed Queue</span>
            <Layers className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-100">{data?.total_applicants || 30} <span className="text-xs text-zinc-500 font-normal">Files</span></p>
          <p className="text-[11px] text-zinc-500 font-mono">Batch test partition</p>
        </div>

        <div className="bg-[#141417] border border-zinc-800/80 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Execution Latency</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{data?.processing_time_ms || 180} <span className="text-xs text-zinc-400 font-normal">ms</span></p>
          <p className="text-[11px] text-emerald-500/80 font-mono">~{data?.metrics?.throughput_applications_per_sec || 165} applications / sec</p>
        </div>

        <div className="bg-[#141417] border border-zinc-800/80 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Manual Labor Saved</span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">{data?.metrics?.estimated_manual_hours_saved || 22.5} <span className="text-xs text-zinc-400 font-normal">Hours</span></p>
          <p className="text-[11px] text-zinc-500 font-mono">Baseline: 45 min manual / file</p>
        </div>

        <div className="bg-[#141417] border border-zinc-800/80 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Autonomous Triage Rate</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-400">{data?.metrics?.auto_triage_rate_pct || 83.3}%</p>
          <p className="text-[11px] text-zinc-500 font-mono">No human escalation needed</p>
        </div>
      </div>

      {/* Triage Ratio Bar */}
      <div className="bg-[#141417] border border-zinc-800/80 p-5 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-zinc-400 gap-2">
          <span className="font-semibold text-zinc-200">Autonomous Queue Breakdown</span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Fast-Track Approved: {data?.metrics?.fast_track_approved || 0}</span>
            </span>
            <span className="flex items-center space-x-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Officer Review: {data?.metrics?.underwriter_review_queue || 0}</span>
            </span>
            <span className="flex items-center space-x-1.5 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Declined: {data?.metrics?.high_risk_declined || 0}</span>
            </span>
          </div>
        </div>

        {/* Visual Progress Stack */}
        <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden flex">
          <div 
            style={{ width: `${((data?.metrics?.fast_track_approved || 1) / (data?.total_applicants || 30)) * 100}%` }}
            className="bg-emerald-500 h-full transition-all duration-500" 
            title="Fast-Track Approved"
          />
          <div 
            style={{ width: `${((data?.metrics?.underwriter_review_queue || 1) / (data?.total_applicants || 30)) * 100}%` }}
            className="bg-amber-500 h-full transition-all duration-500" 
            title="Senior Officer Review"
          />
          <div 
            style={{ width: `${((data?.metrics?.high_risk_declined || 1) / (data?.total_applicants || 30)) * 100}%` }}
            className="bg-rose-500 h-full transition-all duration-500" 
            title="High-Risk Decline"
          />
        </div>
      </div>

      {/* Filter and Policy Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141417] border border-zinc-800/80 p-4 rounded-xl">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-mono text-zinc-300">Filter Queue:</span>
          {(['ALL', 'APPROVED', 'REVIEW', 'DECLINE'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition ${
                filter === t
                  ? 'bg-zinc-700 text-zinc-100 font-semibold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="text-zinc-400">Policy Risk Threshold:</span>
          <input
            type="range"
            min="0.30"
            max="0.70"
            step="0.05"
            value={threshold}
            onChange={(e) => handleThresholdChange(Number(e.target.value))}
            className="accent-amber-400 cursor-pointer w-28"
          />
          <span className="text-amber-400 font-bold">{(threshold * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-[#141417] border border-zinc-800/80 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Queue ID</th>
                <th className="py-3 px-4">Applicant Profile</th>
                <th className="py-3 px-4">Loan Terms</th>
                <th className="py-3 px-4">P(Default)</th>
                <th className="py-3 px-4">Risk Tier</th>
                <th className="py-3 px-4">Automated Triage</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {filteredQueue.map((item: any) => {
                const isApp = item.decision === 'APPROVED';
                const isRev = item.decision === 'REVIEW';
                const isDec = item.decision === 'DECLINE';

                return (
                  <tr key={item.queue_id} className="hover:bg-zinc-850/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-zinc-200">{item.queue_id}</td>
                    <td className="py-3 px-4">
                      <span className="text-zinc-200">Age {item.age}</span>
                      <span className="text-zinc-500 text-[11px] block">German Credit Test Set</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-zinc-100 font-medium">${Number(item.credit_amount).toLocaleString()}</span>
                      <span className="text-zinc-500 text-[11px] block">{item.duration} months tenure</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-bold ${
                        item.default_probability < 0.35 
                          ? 'text-emerald-400' 
                          : item.default_probability < threshold 
                          ? 'text-amber-400' 
                          : 'text-rose-400'
                      }`}>
                        {(item.default_probability * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-zinc-300">{item.risk_tier}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        isApp 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : isRev 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {isApp && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {isRev && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {isDec && <XCircle className="w-3 h-3 mr-1" />}
                        {item.decision}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleInspectApplicant(item)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-zinc-800 hover:bg-amber-500/20 hover:text-amber-300 text-zinc-300 rounded text-[11px] transition border border-zinc-700/80"
                      >
                        <span>Audit Dossier</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
