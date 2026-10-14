import pipelineSpec from './pipeline_spec.json';

export interface ApplicantInput {
  [key: string]: any;
}

export interface PredictionResult {
  default_probability: number;
  decision: string;
  is_default: boolean;
  threshold_used: number;
  risk_tier: string;
  risk_color: string;
  model_name: string;
  explanation: any;
  submitted_applicant: Record<string, any>;
  defaulted_features: string[];
  has_defaults: boolean;
}

export const FEATURE_DEFAULTS: Record<string, any> = {
  duration: 18.0,
  credit_amount: 2319.5,
  installment_commitment: 3.0,
  residence_since: 3.0,
  age: 33.0,
  existing_credits: 1.0,
  num_dependents: 1.0,
  checking_status: 'no checking',
  credit_history: 'existing paid',
  purpose: 'radio/tv',
  savings_status: '<100',
  employment: '1<=X<4',
  personal_status: 'male single',
  other_parties: 'none',
  property_magnitude: 'car',
  other_payment_plans: 'none',
  housing: 'own',
  job: 'skilled',
  own_telephone: 'none',
  foreign_worker: 'yes'
};

export const ALLOWED_CATEGORIES: Record<string, string[]> = {
  checking_status: ['0<=X<200', '<0', '>=200', 'no checking'],
  credit_history: ['all paid', 'critical/other existing credit', 'delayed previously', 'existing paid', 'no credits/all paid'],
  purpose: ['business', 'domestic appliance', 'education', 'furniture/equipment', 'new car', 'other', 'radio/tv', 'repairs', 'retraining', 'used car'],
  savings_status: ['100<=X<500', '500<=X<1000', '<100', '>=1000', 'no known savings'],
  employment: ['1<=X<4', '4<=X<7', '<1', '>=7', 'unemployed'],
  personal_status: ['female div/dep/mar', 'male div/sep', 'male mar/wid', 'male single'],
  other_parties: ['co applicant', 'guarantor', 'none'],
  property_magnitude: ['car', 'life insurance', 'no known property', 'real estate'],
  other_payment_plans: ['bank', 'none', 'stores'],
  housing: ['for free', 'own', 'rent'],
  job: ['high qualif/self emp/mgmt', 'skilled', 'unemp/unskilled non res', 'unskilled resident'],
  own_telephone: ['none', 'yes'],
  foreign_worker: ['no', 'yes']
};

export const NUMERIC_BOUNDS: Record<string, [number, number, string]> = {
  duration: [4.0, 96.0, "Loan duration must be between 4 and 96 months."],
  credit_amount: [200.0, 100000.0, "Credit amount must be between $200 and $100,000."],
  installment_commitment: [1.0, 4.0, "Installment rate must be between 1 and 4."],
  residence_since: [1.0, 4.0, "Residence since must be between 1 and 4 years."],
  age: [18.0, 100.0, "Borrower age must be between 18 and 100 years."],
  existing_credits: [1.0, 10.0, "Existing credits must be between 1 and 10."],
  num_dependents: [1.0, 10.0, "Number of dependents must be between 1 and 10."]
};

const FEATURE_HUMAN_LABELS: Record<string, string> = {
  checking_status: 'Checking Account Status',
  savings_status: 'Savings Account Status',
  credit_amount: 'Credit Amount',
  duration: 'Loan Duration',
  age: 'Borrower Age',
  credit_history: 'Credit History',
  purpose: 'Loan Purpose',
  housing: 'Housing Status',
  employment: 'Employment Duration',
  other_payment_plans: 'Other Payment Plans',
  property_magnitude: 'Property Owned',
  installment_commitment: 'Installment Rate (% of income)',
  existing_credits: 'Existing Credits at Bank',
  personal_status: 'Personal Status & Sex',
  other_parties: 'Other Debtors / Guarantors',
  residence_since: 'Present Residence Duration',
  job: 'Job Qualification Tier',
  num_dependents: 'Number of Dependents',
  own_telephone: 'Telephone Ownership',
  foreign_worker: 'Foreign Worker Status'
};

export function validateAndDefaultApplicant(raw: Record<string, any>): {
  clean: Record<string, any>;
  defaulted: string[];
} {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Applicant payload must be a non-empty JSON object.');
  }

  // Reject target/leakage fields
  const forbidden = ['target', 'is_default', 'default', 'y', 'outcome', 'label', 'approved'];
  for (const k of Object.keys(raw)) {
    if (forbidden.includes(k.toLowerCase())) {
      throw new Error(`Data leakage guardrail: Target or outcome variables (${k}) cannot be passed as inputs.`);
    }
  }

  const clean: Record<string, any> = {};
  const defaulted: string[] = [];

  // Numerical validation & defaults
  for (const col of pipelineSpec.num_cols) {
    if (raw[col] !== undefined && raw[col] !== null && raw[col] !== '') {
      const val = Number(raw[col]);
      if (isNaN(val) || !isFinite(val)) {
        throw new Error(`Field '${col}' must be a valid numeric value, received: ${raw[col]}`);
      }
      const [minV, maxV, msg] = NUMERIC_BOUNDS[col];
      if (val < minV || val > maxV) {
        throw new Error(`Boundary violation for '${col}': ${msg} (received ${val})`);
      }
      clean[col] = val;
    } else {
      clean[col] = FEATURE_DEFAULTS[col];
      defaulted.push(col);
    }
  }

  // Categorical validation & defaults
  for (const col of pipelineSpec.cat_cols) {
    if (raw[col] !== undefined && raw[col] !== null && raw[col] !== '') {
      const strVal = String(raw[col]).trim();
      const allowed = ALLOWED_CATEGORIES[col];
      if (!allowed || !allowed.includes(strVal)) {
        throw new Error(`Invalid category for '${col}': '${strVal}'. Allowed: ${allowed?.join(', ')}`);
      }
      clean[col] = strVal;
    } else {
      clean[col] = FEATURE_DEFAULTS[col];
      defaulted.push(col);
    }
  }

  return { clean, defaulted };
}

export function computeModelProbability(applicant: Record<string, any>): number {
  const { clean } = validateAndDefaultApplicant(applicant);

  // 1. Numerical scaling
  const numVals: number[] = [];
  for (const col of pipelineSpec.num_cols) {
    const v = Number(clean[col]);
    const mean = (pipelineSpec.num_scaler_means as any)[col];
    const scale = (pipelineSpec.num_scaler_scales as any)[col];
    numVals.push((v - mean) / scale);
  }

  // 2. Categorical One-Hot Encoding
  const catVals: number[] = [];
  for (const col of pipelineSpec.cat_cols) {
    const val = String(clean[col]);
    const categories: string[] = (pipelineSpec.cat_categories as any)[col];
    for (const c of categories) {
      catVals.push(val === c ? 1.0 : 0.0);
    }
  }

  const features = [...numVals, ...catVals];
  const z = pipelineSpec.intercept + pipelineSpec.coef.reduce((acc, w, i) => acc + w * features[i], 0);
  const prob = 1.0 / (1.0 + Math.exp(-z));
  return Math.min(1.0, Math.max(0.0, prob));
}

export function computeFeatureContributions(applicant: Record<string, any>): Record<string, number> {
  const { clean } = validateAndDefaultApplicant(applicant);
  const parentImpacts: Record<string, number> = {};

  let featIdx = 0;
  for (const col of pipelineSpec.num_cols) {
    const v = Number(clean[col]);
    const mean = (pipelineSpec.num_scaler_means as any)[col];
    const scale = (pipelineSpec.num_scaler_scales as any)[col];
    const scaled = (v - mean) / scale;
    const impact = pipelineSpec.coef[featIdx] * scaled;
    parentImpacts[col] = (parentImpacts[col] || 0) + impact;
    featIdx++;
  }

  for (const col of pipelineSpec.cat_cols) {
    const val = String(clean[col]);
    const categories: string[] = (pipelineSpec.cat_categories as any)[col];
    for (const c of categories) {
      const ohe = val === c ? 1.0 : 0.0;
      const impact = pipelineSpec.coef[featIdx] * ohe;
      parentImpacts[col] = (parentImpacts[col] || 0) + impact;
      featIdx++;
    }
  }

  return parentImpacts;
}

export function generateStructuredExplanation(
  applicant: Record<string, any>,
  prob: number,
  threshold: number = 0.50
): any {
  const isDefault = prob >= threshold;
  const decision = isDefault ? "REJECTED" : "APPROVED";
  const margin = Math.abs(prob - threshold);

  const parentImpacts = computeFeatureContributions(applicant);
  const riskFactors: any[] = [];
  const protectiveFactors: any[] = [];

  for (const [featKey, rawVal] of Object.entries(applicant)) {
    const impact = parentImpacts[featKey] || 0;
    const label = FEATURE_HUMAN_LABELS[featKey] || featKey.replace('_', ' ');

    let valFormatted = String(rawVal);
    if (featKey === 'credit_amount') valFormatted = `$${Number(rawVal).toLocaleString()}`;
    else if (featKey === 'duration') valFormatted = `${rawVal} months`;
    else if (featKey === 'age') valFormatted = `${rawVal} years`;

    const direction = impact >= 0 ? "increases_risk" : "decreases_risk";
    let explanationText = "";
    if (impact >= 0) {
      explanationText = featKey === 'credit_amount'
        ? `Higher requested credit (${valFormatted}) increases total financial loss exposure.`
        : featKey === 'duration'
        ? `Longer loan duration (${valFormatted}) extends exposure to adverse financial events.`
        : `Borrower ${label} (${valFormatted}) contributed toward higher estimated default risk.`;
    } else {
      explanationText = featKey === 'savings_status'
        ? `Verified savings balance provides an emergency financial cushion.`
        : featKey === 'credit_history'
        ? `Established credit history demonstrates past repayment adherence.`
        : `Borrower ${label} (${valFormatted}) contributed toward lower estimated default risk.`;
    }

    const factor = {
      feature_key: featKey,
      feature: label,
      value: valFormatted,
      raw_value: rawVal,
      contribution: Math.round(impact * 10000) / 10000,
      direction,
      explanation: explanationText
    };

    if (impact > 0.01) riskFactors.push(factor);
    else if (impact < -0.01) protectiveFactors.push(factor);
  }

  riskFactors.sort((a, b) => b.contribution - a.contribution);
  protectiveFactors.sort((a, b) => a.contribution - b.contribution);

  const summary = isDefault
    ? `Rejected because the model-estimated default probability (${(prob * 100).toFixed(2)}%) is above the selected risk threshold (${(threshold * 100).toFixed(2)}%).`
    : `Approved because the model-estimated default probability (${(prob * 100).toFixed(2)}%) is below the selected risk threshold (${(threshold * 100).toFixed(2)}%).`;

  return {
    error: false,
    probability: Math.round(prob * 10000) / 10000,
    probability_pct: Math.round(prob * 10000) / 100,
    threshold: Math.round(threshold * 10000) / 10000,
    threshold_pct: Math.round(threshold * 10000) / 100,
    decision,
    risk_tier: prob < 0.35 ? "LOW RISK" : prob < 0.55 ? "MEDIUM RISK" : "HIGH RISK",
    risk_tier_full: prob < 0.35 ? "Low Risk Tier" : prob < 0.55 ? "Medium Risk Tier" : "High Risk Tier",
    risk_color: prob < 0.35 ? "emerald" : prob < 0.55 ? "amber" : "rose",
    is_default: isDefault,
    margin: Math.round(margin * 10000) / 10000,
    margin_pct: Math.round(margin * 10000) / 100,
    summary_sentence: summary,
    risk_factors: riskFactors.slice(0, 5),
    protective_factors: protectiveFactors.slice(0, 3)
  };
}

export function runCanonicalInference(
  applicant: Record<string, any>,
  threshold = 0.50
): PredictionResult {
  const { clean, defaulted } = validateAndDefaultApplicant(applicant);
  const prob = computeModelProbability(clean);
  const isDefault = prob >= threshold;

  const riskTier = prob < 0.35 ? "Low Risk Tier" : prob < 0.55 ? "Medium Risk Tier" : "High Risk Tier";
  const riskColor = prob < 0.35 ? "emerald" : prob < 0.55 ? "amber" : "rose";
  const decision = isDefault ? "REJECTED (High Risk)" : "APPROVED (Acceptable Risk)";

  const explanation = generateStructuredExplanation(clean, prob, threshold);

  return {
    default_probability: Math.round(prob * 10000) / 10000,
    decision,
    is_default: isDefault,
    threshold_used: threshold,
    risk_tier: riskTier,
    risk_color: riskColor,
    model_name: pipelineSpec.model_name,
    explanation,
    submitted_applicant: clean,
    defaulted_features: defaulted,
    has_defaults: defaulted.length > 0
  };
}

export function runStabilityAnalysis(applicant: Record<string, any>) {
  const { clean } = validateAndDefaultApplicant(applicant);
  const baseProb = computeModelProbability(clean);

  const numericFeatures = ['credit_amount', 'duration', 'age'];
  const perturbationRecords: any[] = [];
  const absChanges: number[] = [];

  for (const feat of numericFeatures) {
    const origVal = Number(clean[feat]);
    for (const p of [-5.0, 5.0]) {
      const perturbedVal = origVal * (1.0 + p / 100.0);
      const copy = { ...clean, [feat]: perturbedVal };
      const newProb = computeModelProbability(copy);
      const diff = newProb - baseProb;
      absChanges.push(Math.abs(diff));

      perturbationRecords.push({
        Scenario: `${feat} (${p > 0 ? '+' : ''}${p.toFixed(0)}%)`,
        'Feature Changed': feat,
        'Perturbation (%)': `${p > 0 ? '+' : ''}${p.toFixed(0)}%`,
        'Original Value': Math.round(origVal * 100) / 100,
        'New Value': Math.round(perturbedVal * 100) / 100,
        'Original Default Prob': Math.round(baseProb * 10000) / 10000,
        'New Default Prob': Math.round(newProb * 10000) / 10000,
        'Probability Difference': Math.round(diff * 10000) / 10000,
        'Abs Change': Math.round(Math.abs(diff) * 10000) / 10000
      });
    }
  }

  const avgAbsChange = absChanges.length > 0 ? absChanges.reduce((a, b) => a + b, 0) / absChanges.length : 0;
  const stabilityScore = Math.max(0, Math.min(100, Math.round((100.0 - (avgAbsChange * 100.0)) * 100) / 100));

  let classification = "Highly Stable";
  let color = "emerald";
  if (stabilityScore < 60) {
    classification = "Sensitive";
    color = "rose";
  } else if (stabilityScore < 85) {
    classification = "Stable";
    color = "amber";
  }

  return {
    base_probability: Math.round(baseProb * 10000) / 10000,
    stability_score: stabilityScore,
    classification,
    classification_color: color,
    average_abs_change: Math.round(avgAbsChange * 10000) / 10000,
    perturbation_table: perturbationRecords
  };
}

export function runCounterfactualAnalysis(applicant: Record<string, any>, threshold = 0.50) {
  const { clean } = validateAndDefaultApplicant(applicant);
  const baseProb = computeModelProbability(clean);
  const isDefault = baseProb >= threshold;

  if (!isDefault) {
    return {
      original_prob: Math.round(baseProb * 10000) / 10000,
      original_decision: 'APPROVED',
      threshold,
      status: 'Already Approved',
      message: `Borrower default probability (${(baseProb * 100).toFixed(1)}%) is below policy threshold (${(threshold * 100).toFixed(0)}%). No recourse needed.`,
      citation: 'Based on counterfactual explanations (Wachter et al., 2017) using single/dual feature parameter search.',
      counterfactuals: []
    };
  }

  const results: any[] = [];
  const origCredit = Number(clean.credit_amount);
  const origDuration = Number(clean.duration);

  // 1. Credit amount reduction search
  for (let pct = 1; pct <= 50; pct += 1) {
    const newCredit = origCredit * (1 - pct / 100);
    const testCopy = { ...clean, credit_amount: newCredit };
    const newProb = computeModelProbability(testCopy);
    if (newProb < threshold) {
      results.push({
        type: 'Single Feature',
        feature: 'credit_amount',
        feature_label: 'Credit Amount',
        pct_change: pct,
        original_value: Math.round(origCredit),
        new_value: Math.round(newCredit),
        original_prob: Math.round(baseProb * 10000) / 10000,
        new_prob: Math.round(newProb * 10000) / 10000,
        flipped: true,
        summary: `Reducing Credit Amount by ${pct}% (from $${origCredit.toLocaleString()} to $${Math.round(newCredit).toLocaleString()}) reduces default risk to ${(newProb * 100).toFixed(1)}% (Flips decision to APPROVED).`
      });
      break;
    }
  }

  // 2. Duration reduction search
  for (let pct = 1; pct <= 50; pct += 1) {
    const newDuration = Math.max(4, Math.round(origDuration * (1 - pct / 100)));
    const testCopy = { ...clean, duration: newDuration };
    const newProb = computeModelProbability(testCopy);
    if (newProb < threshold) {
      results.push({
        type: 'Single Feature',
        feature: 'duration',
        feature_label: 'Loan Duration (Months)',
        pct_change: pct,
        original_value: origDuration,
        new_value: newDuration,
        original_prob: Math.round(baseProb * 10000) / 10000,
        new_prob: Math.round(newProb * 10000) / 10000,
        flipped: true,
        summary: `Shortening Loan Duration by ${pct}% (from ${origDuration}m to ${newDuration}m) reduces default risk to ${(newProb * 100).toFixed(1)}% (Flips decision to APPROVED).`
      });
      break;
    }
  }

  // 3. Actionable Categorical Recourse (Savings balance buffer)
  if (['<100', '100<=X<500', 'no known savings'].includes(clean.savings_status)) {
    for (const betterSavings of ['>=1000', '500<=X<1000']) {
      const testCopy = { ...clean, savings_status: betterSavings };
      const newProb = computeModelProbability(testCopy);
      if (newProb < threshold) {
        results.push({
          type: 'Single Feature (Categorical)',
          feature: 'savings_status',
          feature_label: 'Savings Account Balance',
          pct_change: 0,
          original_value: `savings_status: ${clean.savings_status}`,
          new_value: `savings_status: ${betterSavings}`,
          original_prob: Math.round(baseProb * 10000) / 10000,
          new_prob: Math.round(newProb * 10000) / 10000,
          flipped: true,
          summary: `Increasing verified liquid savings buffer to ${betterSavings} reduces default risk to ${(newProb * 100).toFixed(1)}% (Flips decision to APPROVED).`
        });
        break;
      }
    }
  }

  // 4. Dual feature joint reduction
  for (let pct = 1; pct <= 50; pct += 1) {
    const newCredit = origCredit * (1 - pct / 100);
    const newDuration = Math.max(4, Math.round(origDuration * (1 - pct / 100)));
    const testCopy = { ...clean, credit_amount: newCredit, duration: newDuration };
    const newProb = computeModelProbability(testCopy);
    if (newProb < threshold) {
      results.push({
        type: 'Dual Feature',
        feature: 'credit_amount + duration',
        feature_label: 'Credit Amount & Loan Duration',
        pct_change: pct,
        original_value: `Credit: $${origCredit.toLocaleString()}, Duration: ${origDuration}m`,
        new_value: `Credit: $${Math.round(newCredit).toLocaleString()}, Duration: ${newDuration}m`,
        original_prob: Math.round(baseProb * 10000) / 10000,
        new_prob: Math.round(newProb * 10000) / 10000,
        flipped: true,
        summary: `Jointly restructuring Credit Amount and Duration by -${pct}% reduces default risk to ${(newProb * 100).toFixed(1)}% (Flips decision to APPROVED).`
      });
      break;
    }
  }

  return {
    original_prob: Math.round(baseProb * 10000) / 10000,
    original_decision: 'Default',
    threshold,
    status: results.length > 0 ? 'Recourse found' : 'No recourse found within allowed bounds',
    citation: 'Based on counterfactual explanations (Wachter et al., 2017) using single/dual feature parameter search.',
    counterfactuals: results
  };
}
