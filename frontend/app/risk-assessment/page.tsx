'use client';

import { useEffect, useState } from 'react';
import { fetchSampleApplicants, predictRisk } from '@/lib/api';
import sample30 from '../lib/sample_30_applicants.json';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  UserCheck, 
  FileEdit,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import ExplanationCard from '../components/ExplanationCard';

export default function RiskAssessmentPage() {
  const [samples, setSamples] = useState<any[]>(sample30);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Form State initialized with sample 0
  const [applicant, setApplicant] = useState<Record<string, any>>({ ...sample30[0].applicant });
  const [threshold, setThreshold] = useState<number>(0.50);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSampleApplicants()
      .then((data) => {
        if (Array.isArray(data) && data.length >= 30) {
          setSamples(data);
        }
      })
      .catch((err) => {
        console.warn("Using sample_30_applicants.json preset fallback:", err);
      });
  }, []);

  const handleSelectPreset = (idx: number) => {
    setSelectedIdx(idx);
    setIsManualMode(false);
    setErrorMessage(null);
    if (samples[idx]?.applicant) {
      const presetData = { ...samples[idx].applicant };
      setApplicant(presetData);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setIsManualMode(true);
    setApplicant((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Validation
  const validationErrors: string[] = [];
  const creditVal = Number(applicant.credit_amount);
  const ageVal = Number(applicant.age);
  const durationVal = Number(applicant.duration);

  if (isNaN(creditVal) || creditVal < 200 || creditVal > 100000) {
    validationErrors.push('Credit Amount must be between $200 and $100,000.');
  }
  if (isNaN(ageVal) || ageVal < 18 || ageVal > 100) {
    validationErrors.push('Age must be between 18 and 100 years.');
  }
  if (isNaN(durationVal) || durationVal < 4 || durationVal > 96) {
    validationErrors.push('Loan Duration must be between 4 and 96 months.');
  }

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (validationErrors.length > 0) {
      setErrorMessage(validationErrors[0]);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await predictRisk(applicant, threshold);
      setResult(res);
      // Persist current applicant and threshold for Explainability, Stability, and Counterfactual pages
      localStorage.setItem('current_applicant', JSON.stringify(res.submitted_applicant || applicant));
      localStorage.setItem('current_threshold', String(threshold));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to compute risk prediction.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic policy decision recalculation when slider moves
  const currentProb = result?.default_probability;
  const currentIsDefault = currentProb !== undefined ? currentProb >= threshold : false;
  const currentDecision = currentProb !== undefined
    ? (currentIsDefault ? "REJECTED (High Risk)" : "APPROVED (Acceptable Risk)")
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center space-x-2">
            <span>Individual Risk Assessment Engine</span>
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
              isManualMode 
                ? 'bg-amber-950/60 text-amber-300 border-amber-800/60' 
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
            }`}>
              {isManualMode ? 'Custom Manual Entry' : 'Preset Benchmark Profile'}
            </span>
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Compute calibrated default probability and evaluate threshold policy rules across all 20 German Credit model predictors.
          </p>
        </div>

        {isManualMode && (
          <button
            type="button"
            onClick={() => handleSelectPreset(selectedIdx)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/80 rounded-md text-xs font-mono transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Preset #{selectedIdx + 1}</span>
          </button>
        )}
      </div>

      {/* Preset Example Selector */}
      <div className="bg-[#141417] border border-zinc-800/80 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <label className="text-xs font-mono text-zinc-300 font-semibold flex items-center space-x-2">
          <UserCheck className="w-4 h-4 text-amber-400" />
          <span>Preset Test Borrower (30 Benchmark Profiles):</span>
        </label>
        <select
          value={isManualMode ? -1 : selectedIdx}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val >= 0) handleSelectPreset(val);
          }}
          className="bg-zinc-900 border border-zinc-700/80 text-zinc-200 text-xs font-mono rounded-md px-3 py-2 focus:outline-none focus:border-amber-400 w-full md:w-[32rem]"
        >
          {isManualMode && <option value={-1}>[Custom / Manually Configured Borrower Application]</option>}
          {samples.map((s, i) => (
            <option key={s.index ?? i} value={s.index ?? i}>
              {s.label || `Applicant #${i + 1} | Age ${s.applicant?.age} | $${Number(s.applicant?.credit_amount).toLocaleString()} | P(Default): ${(s.default_prob * 100).toFixed(1)}%`}
            </option>
          ))}
        </select>
      </div>

      {/* Error Alert Panel */}
      {errorMessage && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => handleAnalyze()}
            className="px-3 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/80 rounded text-xs transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Assessment Form */}
      <form onSubmit={handleAnalyze} noValidate className="bg-[#141417] border border-zinc-800/80 p-6 rounded-xl space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <h2 className="text-sm font-semibold text-zinc-200 font-mono flex items-center space-x-2">
            <FileEdit className="w-4 h-4 text-amber-400" />
            <span>Core Borrower Application Attributes (Primary 9 Features)</span>
          </h2>
          <span className="text-[11px] font-mono text-zinc-500">
            {isManualMode ? 'Modifications detected' : 'Standard preset loaded'}
          </span>
        </div>

        {/* Primary 9 Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs font-mono">
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-zinc-400">Borrower Age (Years)</label>
              {(isNaN(ageVal) || ageVal < 18 || ageVal > 100) && (
                <span className="text-rose-400 text-[10px]">18 - 100 yrs</span>
              )}
            </div>
            <input
              type="number"
              min="18"
              max="100"
              step="any"
              value={applicant.age ?? 35}
              onChange={(e) => handleFieldChange('age', Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-zinc-400">Credit Amount ($)</label>
              {(isNaN(creditVal) || creditVal < 200 || creditVal > 100000) && (
                <span className="text-rose-400 text-[10px]">$200 - $100k</span>
              )}
            </div>
            <input
              type="number"
              min="200"
              max="100000"
              step="any"
              value={applicant.credit_amount ?? 2500}
              onChange={(e) => handleFieldChange('credit_amount', Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-zinc-400">Loan Duration (Months)</label>
              {(isNaN(durationVal) || durationVal < 4 || durationVal > 96) && (
                <span className="text-rose-400 text-[10px]">4 - 96 mos</span>
              )}
            </div>
            <input
              type="number"
              min="4"
              max="96"
              step="any"
              value={applicant.duration ?? 24}
              onChange={(e) => handleFieldChange('duration', Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400">Checking Account Status</label>
            <select
              value={applicant.checking_status || 'no checking'}
              onChange={(e) => handleFieldChange('checking_status', e.target.value)}
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
              value={applicant.savings_status || '<100'}
              onChange={(e) => handleFieldChange('savings_status', e.target.value)}
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
              onChange={(e) => handleFieldChange('credit_history', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
            >
              {['critical/other existing credit', 'existing paid', 'delayed previously', 'no credits/all paid', 'all paid'].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400">Loan Purpose</label>
            <select
              value={applicant.purpose || 'radio/tv'}
              onChange={(e) => handleFieldChange('purpose', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
            >
              {[
                'radio/tv', 'education', 'furniture/equipment', 'new car', 
                'used car', 'business', 'repairs', 'domestic appliance', 'retraining', 'other'
              ].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400">Housing Status</label>
            <select
              value={applicant.housing || 'own'}
              onChange={(e) => handleFieldChange('housing', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
            >
              {['own', 'for free', 'rent'].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-zinc-400">Job Qualification Tier</label>
            <select
              value={applicant.job || 'skilled'}
              onChange={(e) => handleFieldChange('job', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
            >
              {['skilled', 'unskilled resident', 'high qualif/self emp/mgmt', 'unemp/unskilled non res'].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Collapsible Advanced 11 Features Section */}
        <div className="border border-zinc-800/80 rounded-lg overflow-hidden bg-zinc-900/40">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-800/40 transition font-mono"
          >
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-zinc-300">
                Additional German Credit Features (11 Advanced Parameters)
              </span>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700/60">
                {showAdvanced ? 'Visible & Editable' : 'Active (Documented Defaults Applied)'}
              </span>
            </div>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          {showAdvanced && (
            <div className="p-4 border-t border-zinc-800/80 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs font-mono bg-zinc-950/60">
              <div className="space-y-1">
                <label className="text-zinc-400">Installment Rate (% of income)</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  step="any"
                  value={applicant.installment_commitment ?? 3}
                  onChange={(e) => handleFieldChange('installment_commitment', Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Present Residence Duration (Yrs)</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  step="any"
                  value={applicant.residence_since ?? 3}
                  onChange={(e) => handleFieldChange('residence_since', Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Existing Credits at This Bank</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="any"
                  value={applicant.existing_credits ?? 1}
                  onChange={(e) => handleFieldChange('existing_credits', Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Number of Dependents</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="any"
                  value={applicant.num_dependents ?? 1}
                  onChange={(e) => handleFieldChange('num_dependents', Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Present Employment Duration</label>
                <select
                  value={applicant.employment || '1<=X<4'}
                  onChange={(e) => handleFieldChange('employment', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                >
                  {['<1', '1<=X<4', '4<=X<7', '>=7', 'unemployed'].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Personal Status & Sex</label>
                <select
                  value={applicant.personal_status || 'male single'}
                  onChange={(e) => handleFieldChange('personal_status', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                >
                  {['male single', 'female div/dep/mar', 'male div/sep', 'male mar/wid'].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Other Debtors / Guarantors</label>
                <select
                  value={applicant.other_parties || 'none'}
                  onChange={(e) => handleFieldChange('other_parties', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                >
                  {['none', 'co applicant', 'guarantor'].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Property Owned</label>
                <select
                  value={applicant.property_magnitude || 'car'}
                  onChange={(e) => handleFieldChange('property_magnitude', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                >
                  {['real estate', 'life insurance', 'car', 'no known property'].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Other Payment Plans</label>
                <select
                  value={applicant.other_payment_plans || 'none'}
                  onChange={(e) => handleFieldChange('other_payment_plans', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                >
                  {['none', 'bank', 'stores'].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Telephone Registered</label>
                <select
                  value={applicant.own_telephone || 'none'}
                  onChange={(e) => handleFieldChange('own_telephone', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                >
                  {['none', 'yes'].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Foreign Worker Status</label>
                <select
                  value={applicant.foreign_worker || 'yes'}
                  onChange={(e) => handleFieldChange('foreign_worker', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-400"
                >
                  {['yes', 'no'].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Threshold Policy Slider */}
        <div className="bg-zinc-900/60 p-4 rounded-lg border border-zinc-800/80 space-y-2 font-mono">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-semibold flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Credit Policy Risk Threshold (θ):</span>
            </span>
            <span className="text-amber-400 font-bold">{threshold.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.30"
            max="0.70"
            step="0.05"
            value={threshold}
            onChange={(e) => {
              const newThresh = Number(e.target.value);
              setThreshold(newThresh);
              localStorage.setItem('current_threshold', String(newThresh));
            }}
            className="w-full accent-amber-400 bg-zinc-800 cursor-pointer"
          />
          <p className="text-[11px] text-zinc-500">
            *The ML model computes probability P(Default); selecting the decision threshold is a separate underwriting policy risk-appetite decision. Moving the slider recalculates the policy decision on the current probability without changing the underlying model probability.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || validationErrors.length > 0}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs font-mono uppercase tracking-wider rounded-lg transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-950/30 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Output Results Panel */}
      {result && (
        <div className="bg-[#141417] border border-zinc-800/80 p-6 rounded-xl space-y-6 font-mono">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800/80 pb-3 gap-2">
            <h2 className="text-sm font-semibold text-zinc-200">
              Prediction Results & Policy Classification
            </h2>
            <div className="flex items-center space-x-2 text-[11px] text-zinc-400">
              <span>Model: <strong className="text-zinc-200">{result.model_name}</strong></span>
              <span>•</span>
              <span className="text-amber-400">Brier Score: 0.1562 (Calibrated)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Predicted Probability */}
            <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-lg">
              <p className="text-xs text-zinc-400">Predicted Default Probability</p>
              <p className="text-3xl font-bold text-zinc-100 mt-1 font-sans">
                {(result.default_probability * 100).toFixed(2)}%
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                Raw model probability (Independent of policy threshold)
              </p>
            </div>

            {/* Threshold Decision */}
            <div className={`p-4 rounded-lg border ${
              currentIsDefault
                ? 'bg-rose-950/30 border-rose-800/80 text-rose-300'
                : 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
            }`}>
              <div className="flex justify-between items-center">
                <p className="text-xs font-semibold uppercase">Credit Policy Decision</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900/60 border border-zinc-700/60">
                  θ = {threshold.toFixed(2)}
                </span>
              </div>
              <p className="text-lg font-bold mt-1 flex items-center space-x-2">
                {currentIsDefault ? <XCircle className="w-5 h-5 text-rose-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                <span>{currentDecision}</span>
              </p>
              <p className="text-[10px] text-zinc-400 mt-1">
                {currentIsDefault 
                  ? `Default probability ${(result.default_probability * 100).toFixed(1)}% ≥ threshold ${(threshold * 100).toFixed(0)}%` 
                  : `Default probability ${(result.default_probability * 100).toFixed(1)}% < threshold ${(threshold * 100).toFixed(0)}%`}
              </p>
            </div>

            {/* Risk Tier */}
            <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-lg">
              <p className="text-xs text-zinc-400">Risk Tier Classification</p>
              <p className="text-lg font-bold text-amber-400 mt-1 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>{result.risk_tier}</span>
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                {result.default_probability < 0.35 ? '< 35% Default Rate' : result.default_probability < 0.55 ? '35% - 55% Default Rate' : '> 55% Default Rate'}
              </p>
            </div>
          </div>

          {/* Analyzed Applicant Summary Verification Badge */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-xs font-mono space-y-2">
            <div className="flex items-center justify-between text-zinc-300 font-semibold border-b border-zinc-800/60 pb-2">
              <span className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Analyzed Application Parameters (Ground Truth Verification):</span>
              </span>
              <span className="text-zinc-500 font-normal">
                {result.has_defaults ? `${result.defaulted_features?.length} fields defaulted` : 'All 20 inputs validated'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-zinc-400">
              <div>Age: <strong className="text-zinc-200">{result.submitted_applicant?.age} yrs</strong></div>
              <div>Credit Amount: <strong className="text-zinc-200">${Number(result.submitted_applicant?.credit_amount).toLocaleString()}</strong></div>
              <div>Duration: <strong className="text-zinc-200">{result.submitted_applicant?.duration} mos</strong></div>
              <div>Checking: <strong className="text-zinc-200">{result.submitted_applicant?.checking_status}</strong></div>
              <div>Savings: <strong className="text-zinc-200">{result.submitted_applicant?.savings_status}</strong></div>
              <div>Credit History: <strong className="text-zinc-200">{result.submitted_applicant?.credit_history}</strong></div>
              <div>Purpose: <strong className="text-zinc-200">{result.submitted_applicant?.purpose}</strong></div>
              <div>Housing: <strong className="text-zinc-200">{result.submitted_applicant?.housing}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* Structured Decision Explanation Card */}
      {result?.explanation && (
        <ExplanationCard explanation={result.explanation} />
      )}
    </div>
  );
}
