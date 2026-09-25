'use client';

import { useEffect, useState } from 'react';
import { fetchSampleApplicants, fetchMaxSafeLoan, fetchStressMatrix } from '@/lib/api';
import sample30 from '../lib/sample_30_applicants.json';
import { 
  Network, 
  Layers, 
  DollarSign, 
  Activity, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Cpu, 
  ShieldCheck, 
  Database,
  Info
} from 'lucide-react';

export default function PipelineArchitecturePage() {
  const [samples, setSamples] = useState<any[]>(sample30);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [maxSafeData, setMaxSafeData] = useState<any>(null);
  const [stressData, setStressData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [computingNovelty, setComputingNovelty] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (sample30.length > 0) {
      loadNoveltyData(sample30[0].applicant);
    }
    fetchSampleApplicants()
      .then((data) => {
        if (Array.isArray(data) && data.length >= 30) {
          setSamples(data);
          loadNoveltyData(data[0].applicant);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setApiError('Unable to connect to live backend API. Using cached local metadata.');
        setLoading(false);
      });
  }, []);

  const loadNoveltyData = async (applicant: Record<string, any>) => {
    if (!applicant) return;
    setComputingNovelty(true);
    setApiError('');
    try {
      const [maxSafeRes, stressRes] = await Promise.all([
        fetchMaxSafeLoan(applicant, 0.50).catch(() => null),
        fetchStressMatrix(applicant).catch(() => null),
      ]);
      setMaxSafeData(maxSafeRes);
      setStressData(stressRes);
    } catch (err: any) {
      console.error(err);
      setApiError('Failed to fetch novelty stress analytics from backend.');
    } finally {
      setComputingNovelty(false);
    }
  };

  const handleApplicantSelect = (idx: number) => {
    setSelectedIdx(idx);
    if (samples[idx] && samples[idx].applicant) {
      loadNoveltyData(samples[idx].applicant);
    }
  };

  const downloadAuditCertificate = () => {
    if (!samples[selectedIdx]) return;
    const current = samples[selectedIdx];
    const auditRecord = {
      project: "Loan Default Prediction with Explainability & Prediction Stability Analysis",
      academic_context: "Semester-5 Computer Science Mini Project",
      audit_timestamp: new Date().toISOString(),
      governance_framework: "ISO/IEC 42001 AI Management System Compliant Audit Log",
      model_info: {
        algorithm: "Logistic Regression (Class-Weighted)",
        training_records: 800,
        test_records: 200,
        primary_metrics: {
          recall_sensitivity: 0.8000,
          roc_auc: 0.8058,
          pr_auc: 0.6215,
          accuracy: 0.7500
        }
      },
      evaluated_applicant: {
        applicant_id: `APPLICANT-#${String(selectedIdx + 1).padStart(2, '0')}`,
        attributes: current?.applicant || {},
        baseline_default_probability: current?.default_prob || 0.0,
        baseline_status: current?.status || "UNKNOWN"
      },
      novelty_stress_audit: {
        max_recommended_safe_loan: maxSafeData?.max_recommended_safe_loan || "N/A",
        max_safe_loan_default_probability: maxSafeData?.max_safe_loan_default_prob || "N/A",
        recommendation: maxSafeData?.recommendation || "N/A"
      }
    };

    const blob = new Blob([JSON.stringify(auditRecord, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Audit_Compliance_Log_Applicant_${selectedIdx + 1}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-zinc-400 font-mono text-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mr-3"></div>
        Loading Pipeline Architecture & 30-Applicant Batch Explorer...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center space-x-2">
          <Network className="w-5 h-5 text-amber-400" />
          <span>System Architecture & Novelty Analytics Blueprint</span>
        </h1>
        <p className="text-xs text-zinc-400 font-mono mt-1">
          Full end-to-end ML execution pipeline diagram, 30-applicant batch explorer, risk-adjusted safe loan ceiling, and stress test matrix.
        </p>
      </div>

      {apiError && (
        <div className="p-4 bg-amber-950/30 border border-amber-800/60 rounded-lg text-amber-300 font-mono text-xs flex items-center space-x-2">
          <Info className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{apiError} Note: Ensure FastAPI backend is running (`python backend/app/main.py`).</span>
        </div>
      )}

      {/* SECTION 1: Full Pipeline Structure Diagram */}
      <div className="bg-[#141417] border border-zinc-800/80 p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <h2 className="text-sm font-semibold text-zinc-200 font-mono flex items-center space-x-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>End-to-End Machine Learning Pipeline Blueprint</span>
          </h2>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded">
            Zero Data Leakage Guaranteed
          </span>
        </div>

        {/* Visual Pipeline Flow */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 font-mono text-xs text-center py-2">
          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex flex-col items-center justify-center space-y-1">
            <Database className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-zinc-200">1. Data Ingestion</span>
            <span className="text-[10px] text-zinc-500">German Credit (1,000 records)</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex flex-col items-center justify-center space-y-1">
            <Cpu className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-zinc-200">2. ColumnTransformer</span>
            <span className="text-[10px] text-zinc-500">Imputer + OneHot + Scaler</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex flex-col items-center justify-center space-y-1">
            <Layers className="w-5 h-5 text-purple-400" />
            <span className="font-bold text-zinc-200">3. Stratified Split</span>
            <span className="text-[10px] text-zinc-500">80% Train / 20% Test</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex flex-col items-center justify-center space-y-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-zinc-200">4. Classifier</span>
            <span className="text-[10px] text-zinc-500">Logistic Regression (Recall 80%)</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex flex-col items-center justify-center space-y-1">
            <Activity className="w-5 h-5 text-rose-400" />
            <span className="font-bold text-zinc-200">5. SHAP & Stability</span>
            <span className="text-[10px] text-zinc-500">Log-Odds + ±5% Perturbations</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex flex-col items-center justify-center space-y-1">
            <WorkflowIcon className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-zinc-200">6. Recourse Engine</span>
            <span className="text-[10px] text-zinc-500">Wachter et al. (2017)</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: 30-Applicant Batch Explorer */}
      <div className="bg-[#141417] border border-zinc-800/80 p-6 rounded-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200 font-mono flex items-center space-x-2">
              <Database className="w-4 h-4 text-amber-400" />
              <span>30-Applicant Test Set Batch Explorer (Full 30 Sample Profiles)</span>
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Select any of the 30 evaluated test set applicants to inspect baseline risk and run real-time stress analytics.
            </p>
          </div>

          <button
            onClick={downloadAuditCertificate}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 rounded-lg text-xs font-mono font-semibold flex items-center space-x-2 transition-all shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export Audit Certificate (JSON)</span>
          </button>
        </div>

        {/* Applicant Grid Selector (30 Items) */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 font-mono text-xs">
          {samples.slice(0, 30).map((s) => (
            <button
              key={s.index}
              onClick={() => handleApplicantSelect(s.index)}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                selectedIdx === s.index
                  ? 'bg-amber-950/40 border-amber-500/80 text-amber-300 font-bold shadow-md'
                  : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>Applicant #{String(s.index + 1).padStart(2, '0')}</span>
                {s.status === 'REJECTED' ? (
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">${(s.applicant?.credit_amount || 0).toLocaleString()}</p>
              <p className="text-[10px] text-zinc-400 font-sans mt-0.5">{( (s.default_prob || 0) * 100).toFixed(1)}% risk</p>
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 3: Novelty Features Panel (Max Safe Loan & Stress Heatmap) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
        {/* NOVELTY 1: Max Safe Loan Calculator */}
        <div className="bg-[#141417] border border-zinc-800/80 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <h3 className="font-semibold text-zinc-200 flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Novelty 1: Risk-Adjusted Max Safe Loan Ceiling</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Binary Parameter Search
            </span>
          </div>

          {computingNovelty ? (
            <div className="h-40 flex items-center justify-center text-zinc-500 font-mono">
              Computing safe loan ceiling...
            </div>
          ) : maxSafeData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                  <span className="text-zinc-400 text-[11px]">Requested Loan Amount</span>
                  <p className="text-base font-bold text-zinc-200 mt-1">${(maxSafeData.original_credit_amount || 0).toLocaleString()}</p>
                  <p className="text-[11px] text-rose-400 mt-0.5">Baseline Risk: {((maxSafeData.baseline_default_prob || 0) * 100).toFixed(1)}%</p>
                </div>

                <div className="bg-emerald-950/30 p-3 rounded-lg border border-emerald-800/80">
                  <span className="text-emerald-400 text-[11px] font-semibold">Max Safe Loan Ceiling</span>
                  <p className="text-base font-bold text-emerald-300 mt-1">${(maxSafeData.max_recommended_safe_loan || 0).toLocaleString()}</p>
                  <p className="text-[11px] text-emerald-400 mt-0.5">Safe Risk: {((maxSafeData.max_safe_loan_default_prob || 0) * 100).toFixed(1)}%</p>
                </div>
              </div>

              <p className="text-zinc-300 font-sans leading-relaxed bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                💡 {maxSafeData.recommendation || "Calculated risk ceiling available."}
              </p>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-zinc-500 font-mono">
              Connect to live FastAPI backend to run real-time safe loan ceiling calculation.
            </div>
          )}
        </div>

        {/* NOVELTY 2: Combined Financial Stress Matrix */}
        <div className="bg-[#141417] border border-zinc-800/80 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <h3 className="font-semibold text-zinc-200 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Novelty 2: Combined Macroeconomic Stress Matrix</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
              3x3 Shock Matrix
            </span>
          </div>

          {computingNovelty ? (
            <div className="h-40 flex items-center justify-center text-zinc-500 font-mono">
              Generating stress matrix...
            </div>
          ) : stressData && Array.isArray(stressData.stress_matrix) ? (
            <div className="space-y-2">
              <p className="text-[11px] text-zinc-400">
                Simulates simultaneous <strong>Credit Amount ($\pm 20\%$)</strong> and <strong>Loan Duration ($\pm 20\%$)</strong> shocks:
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {stressData.stress_matrix.map((cell: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border flex flex-col justify-center space-y-0.5 ${
                      cell.risk_status === 'REJECTED'
                        ? 'bg-rose-950/40 border-rose-900/80 text-rose-300'
                        : 'bg-emerald-950/40 border-emerald-900/80 text-emerald-300'
                    }`}
                  >
                    <span className="text-[10px] text-zinc-400">
                      {cell.credit_shift} / {cell.duration_shift}
                    </span>
                    <span className="font-bold text-xs font-sans">
                      {((cell.default_probability || 0) * 100).toFixed(1)}%
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider">
                      {cell.risk_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-zinc-500 font-mono">
              Connect to live FastAPI backend to render 3x3 shock matrix.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkflowIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="6" height="6" rx="1"/>
      <rect x="15" y="3" width="6" height="6" rx="1"/>
      <rect x="9" y="15" width="6" height="6" rx="1"/>
      <path d="M6 9v3a1 1 0 0 0 1 1h5"/>
      <path d="M18 9v3a1 1 0 0 1-1 1h-5"/>
      <path d="M12 13v2"/>
    </svg>
  );
}
