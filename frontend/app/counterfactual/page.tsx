'use client';

import { useEffect, useState } from 'react';
import { fetchCounterfactual, fetchSampleApplicants } from '../lib/api';
import { Workflow, ArrowRight, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export default function CounterfactualPage() {
  const [data, setData] = useState<any>(null);
  const [applicant, setApplicant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        let applicantDict = null;
        let thresh = 0.50;

        const storedApp = localStorage.getItem('current_applicant');
        const storedThresh = localStorage.getItem('current_threshold');

        if (storedApp) {
          applicantDict = JSON.parse(storedApp);
        } else {
          const samples = await fetchSampleApplicants();
          if (samples.length > 0) {
            // Find a default sample applicant for demonstration
            const defSample = samples.find((s: any) => s.default_prob >= 0.50) || samples[0];
            applicantDict = defSample.applicant;
          }
        }

        if (storedThresh) {
          thresh = Number(storedThresh);
        }

        if (applicantDict) {
          setApplicant(applicantDict);
          const res = await fetchCounterfactual(applicantDict, thresh);
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
        Searching counterfactual recourse parameters...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 font-mono text-sm">
        Error computing counterfactual explanations: {error}.
      </div>
    );
  }

  const isDefault = data.original_decision === 'Default';
  const counterfactuals = data.counterfactuals || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Counterfactual Recourse Engine</h1>
        <p className="text-xs text-zinc-400 font-mono mt-1">
          Identifies minimal parameter adjustments required to flip a &quot;Default&quot; credit decision to &quot;APPROVED&quot;.
        </p>
      </div>

      {/* Baseline Status Card */}
      <div className="bg-[#141417] border border-zinc-800/80 p-5 rounded-xl space-y-3 font-mono">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isDefault ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Current Assessment: {data.original_decision}
              </h2>
              <p className="text-xs text-zinc-400">
                Original Default Probability: <span className="font-bold text-amber-400">{(data.original_prob * 100).toFixed(1)}%</span> (Decision Threshold: {(data.threshold * 100).toFixed(0)}%)
              </p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">
            {data.status}
          </span>
        </div>

        {/* Citation Notice */}
        <div className="flex items-center space-x-2 text-[11px] text-zinc-500">
          <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>{data.citation}</span>
        </div>
      </div>

      {/* Main Recourse Recommendations */}
      {!isDefault ? (
        <div className="p-6 bg-emerald-950/20 border border-emerald-800/60 rounded-xl text-emerald-300 font-mono text-xs space-y-2">
          <p className="font-semibold text-sm flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Borrower Already Classified as &quot;No Default&quot;</span>
          </p>
          <p className="text-zinc-400">
            The current default risk ({(data.original_prob * 100).toFixed(1)}%) is below the decision threshold ({(data.threshold * 100).toFixed(0)}%). No counterfactual recourse is needed.
          </p>
        </div>
      ) : counterfactuals.length === 0 ? (
        <div className="p-6 bg-amber-950/20 border border-amber-800/60 rounded-xl text-amber-300 font-mono text-xs space-y-2">
          <p className="font-semibold text-sm flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>No Simple Single/Dual Feature Recourse Found ($\le 50\%$)</span>
          </p>
          <p className="text-zinc-400">
            The applicant&apos;s baseline default risk ({(data.original_prob * 100).toFixed(1)}%) is significantly above the threshold. No single feature adjustment within realistic bounds ($\pm 50\%$) was sufficient to flip the decision.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200 font-mono tracking-wide">
            Actionable Recourse Scenarios (Ranked by Minimal Adjustment)
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {counterfactuals.map((cf: any, idx: number) => (
              <div key={idx} className="bg-[#141417] border border-zinc-800/80 p-5 rounded-xl space-y-4 font-mono">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-950/50 border border-amber-800/60 text-amber-300">
                    Option {idx + 1}: {cf.type} Recourse ({cf.feature_label})
                  </span>
                  <span className="text-xs text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Flips Decision to APPROVED</span>
                  </span>
                </div>

                <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                  {cf.summary}
                </p>

                {/* Before / After Metrics Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-zinc-900/80 p-3.5 rounded-lg border border-zinc-800">
                    <p className="text-zinc-400 text-[11px]">Original Parameter</p>
                    <p className="text-zinc-200 font-bold mt-0.5">{cf.original_value}</p>
                    <p className="text-rose-400 text-[11px] mt-2 font-semibold">
                      Baseline Risk: {(cf.original_prob * 100).toFixed(1)}% (REJECTED)
                    </p>
                  </div>

                  <div className="bg-emerald-950/20 p-3.5 rounded-lg border border-emerald-900/60">
                    <p className="text-emerald-400 text-[11px] font-semibold">Counterfactual Adjustment ({cf.pct_change > 0 ? '+' : ''}{cf.pct_change}%)</p>
                    <p className="text-emerald-200 font-bold mt-0.5">{cf.new_value}</p>
                    <p className="text-emerald-400 text-[11px] mt-2 font-bold">
                      New Risk: {(cf.new_prob * 100).toFixed(1)}% (APPROVED)
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
