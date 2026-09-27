'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Info, ShieldAlert, TrendingUp, HelpCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Factor {
  feature_key: string;
  feature: string;
  value: string;
  raw_value: any;
  contribution: number;
  direction: string;
  explanation: string;
}

interface ExplanationProps {
  explanation: {
    error?: boolean;
    message?: string;
    probability?: number;
    probability_pct?: number;
    threshold?: number;
    threshold_pct?: number;
    decision?: string;
    risk_tier?: string;
    risk_tier_full?: string;
    risk_color?: string;
    is_default?: boolean;
    margin?: number;
    margin_pct?: number;
    summary_sentence?: string;
    risk_factors?: Factor[];
    protective_factors?: Factor[];
  };
}

export default function ExplanationCard({ explanation }: ExplanationProps) {
  if (!explanation) return null;

  // Strict Validation Boundaries
  const prob = explanation.probability ?? explanation.probability_pct ? explanation.probability_pct! / 100 : NaN;
  const thresh = explanation.threshold ?? explanation.threshold_pct ? explanation.threshold_pct! / 100 : NaN;

  const isValidProb = !isNaN(prob) && isFinite(prob) && prob >= 0.0 && prob <= 1.0;
  const isValidThresh = !isNaN(thresh) && isFinite(thresh) && thresh >= 0.0 && thresh <= 1.0;

  if (explanation.error || !isValidProb || !isValidThresh) {
    return (
      <div className="p-5 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 font-mono text-xs space-y-2 shadow-lg">
        <div className="flex items-center space-x-2 font-bold text-sm text-rose-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Prediction unavailable: invalid probability returned by the model.</span>
        </div>
        <p className="text-zinc-400 text-[11px]">
          The prediction engine received invalid or non-finite parameters (Probability: {String(explanation?.probability)}, Threshold: {String(explanation?.threshold)}). Classification decisions and explanations are suppressed when risk probabilities are non-finite.
        </p>
      </div>
    );
  }

  const probPct = (prob * 100).toFixed(2);
  const threshPct = (thresh * 100).toFixed(2);
  const isDefault = prob >= thresh;
  const marginPct = Math.abs(prob * 100 - thresh * 100).toFixed(2);
  const riskFactors = explanation.risk_factors || [];
  const protectiveFactors = explanation.protective_factors || [];

  // Combine top factors for horizontal contribution bar chart
  const chartFactors = [
    ...riskFactors.map(f => ({ name: f.feature, val: f.contribution, dir: 'risk', displayVal: f.value })),
    ...protectiveFactors.map(f => ({ name: f.feature, val: f.contribution, dir: 'protective', displayVal: f.value }))
  ].sort((a, b) => Math.abs(b.val) - Math.abs(a.val)).slice(0, 6);

  return (
    <div className="bg-[#141417] border border-zinc-800/80 p-6 rounded-xl space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800/80 pb-4 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-950/60 border border-amber-800/60 rounded-lg text-amber-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100 tracking-tight flex items-center space-x-2">
              <span>Why Was This Application {isDefault ? 'Rejected' : 'Approved'}?</span>
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Applicant-specific model explainability derived from exact SHAP log-odds feature contributions.
            </p>
          </div>
        </div>

        <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center space-x-2 shrink-0 ${
          isDefault ? 'bg-rose-950/50 border-rose-800 text-rose-300' : 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
        }`}>
          {isDefault ? <XCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{isDefault ? 'REJECTED / HIGH RISK' : 'APPROVED / ACCEPTABLE RISK'}</span>
        </div>
      </div>

      {/* 1. Decision Summary */}
      <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
        isDefault ? 'bg-rose-950/20 border-rose-900/60 text-rose-200' : 'bg-emerald-950/20 border-emerald-900/60 text-emerald-200'
      }`}>
        <p className="font-semibold text-sm mb-1 flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Decision Summary</span>
        </p>
        <p className="text-zinc-300 font-sans">
          {explanation.summary_sentence || (
            isDefault 
              ? `Rejected because the model-estimated default probability (${probPct}%) is above the selected risk threshold (${threshPct}%).`
              : `Approved because the model-estimated default probability (${probPct}%) is below the selected risk threshold (${threshPct}%).`
          )}
        </p>
        <div className="mt-3 pt-3 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400 font-mono">
          <span>Model-estimated default probability: <strong className="text-amber-400">{probPct}%</strong></span>
          <span>Decision threshold: <strong className="text-zinc-200">{threshPct}%</strong></span>
          <span>Margin: <strong className={isDefault ? 'text-rose-400' : 'text-emerald-400'}>{isDefault ? '+' : '-'}{marginPct} percentage points</strong></span>
        </div>
      </div>

      {/* Goal 7: Visual Decision Logic Flow */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl space-y-3 font-mono">
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center space-x-2">
          <Info className="w-4 h-4 text-amber-400" />
          <span>Decision Logic Flow</span>
        </h3>
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 py-2 text-center text-xs font-bold">
          <div className="bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-lg text-amber-400">
            {probPct}% {isDefault ? '≥' : '<'} {threshPct}%
          </div>
          <span className="text-zinc-500 font-sans text-lg">↓</span>
          <div className={`px-4 py-2 rounded-lg border uppercase tracking-wider ${
            isDefault ? 'bg-rose-950/80 border-rose-800 text-rose-300' : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
          }`}>
            {isDefault ? 'REJECTED' : 'APPROVED'}
          </div>
          <span className="text-zinc-500 font-sans text-lg">↓</span>
          <div className="bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-lg text-amber-400">
            {explanation.risk_tier || (prob < 0.35 ? 'LOW RISK' : prob < 0.55 ? 'MEDIUM RISK' : 'HIGH RISK')}
          </div>
        </div>
      </div>

      {/* 2 & 3 & 4. Main Factors Increasing & Reducing Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        {/* Risk Factors */}
        <div className="bg-rose-950/10 border border-rose-900/50 p-4 rounded-xl space-y-3">
          <h3 className="font-bold text-rose-400 text-xs flex items-center space-x-2 border-b border-rose-900/40 pb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Main Factors Increasing Risk (+Log-Odds)</span>
          </h3>
          {riskFactors.length === 0 ? (
            <p className="text-zinc-500 italic text-[11px]">No significant risk-increasing factors detected for this borrower profile.</p>
          ) : (
            <div className="space-y-3">
              {riskFactors.map((f, i) => (
                <div key={i} className="bg-zinc-900/80 p-3 rounded-lg border border-rose-950/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200">• {f.feature}: <span className="text-amber-400">{f.value}</span></span>
                    <span className="text-[10px] text-rose-400 font-bold">+{f.contribution.toFixed(3)}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    → {f.explanation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Protective Factors */}
        <div className="bg-emerald-950/10 border border-emerald-900/50 p-4 rounded-xl space-y-3">
          <h3 className="font-bold text-emerald-400 text-xs flex items-center space-x-2 border-b border-emerald-900/40 pb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Factors Reducing Risk (-Log-Odds)</span>
          </h3>
          {protectiveFactors.length === 0 ? (
            <p className="text-zinc-500 italic text-[11px]">No strong protective factors detected for this borrower profile.</p>
          ) : (
            <div className="space-y-3">
              {protectiveFactors.map((f, i) => (
                <div key={i} className="bg-zinc-900/80 p-3 rounded-lg border border-emerald-950/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200">• {f.feature}: <span className="text-amber-400">{f.value}</span></span>
                    <span className="text-[10px] text-emerald-400 font-bold">{f.contribution.toFixed(3)}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    → {f.explanation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Decision Logic & Margin */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <span className="text-[11px] text-zinc-500 uppercase font-semibold">Decision Logic Equation</span>
          <p className="font-bold text-zinc-200 text-sm">
            {probPct}% predicted risk {isDefault ? '≥' : '<'} {threshPct}% threshold
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-zinc-500 uppercase font-semibold">Policy Status</span>
          <p className={`font-bold text-sm ${isDefault ? 'text-rose-400' : 'text-emerald-400'}`}>
            → {isDefault ? 'REJECTED / HIGH RISK' : 'APPROVED / ACCEPTABLE RISK'}
          </p>
        </div>
      </div>

      {/* Feature Contribution Ranked Chart */}
      {chartFactors.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800/80 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-200 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Top Factors Influencing This Prediction (SHAP Contribution Weights)</span>
            </h3>
            <span className="text-[10px] text-zinc-500">Ranked by absolute impact</span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={chartFactors} margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                <XAxis type="number" stroke="#71717a" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={10} width={130} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#f4f4f5', fontSize: '11px' }} 
                  formatter={(val: any) => [`${Number(val) > 0 ? '+' : ''}${Number(val).toFixed(3)} log-odds`, 'Contribution']}
                />
                <Bar dataKey="val" radius={[0, 4, 4, 0]}>
                  {chartFactors.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.val > 0 ? '#f43f5e' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
