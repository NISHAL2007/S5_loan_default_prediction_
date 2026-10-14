const API_PREFIX = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_PREFIX}/health`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Health check failed with HTTP ${res.status}`);
  return await res.json();
}

export async function fetchModelInfo() {
  const res = await fetch(`${API_PREFIX}/model-info`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch model info (HTTP ${res.status})`);
  return await res.json();
}

export async function fetchSampleApplicants() {
  const res = await fetch(`${API_PREFIX}/sample-applicants`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch sample applicants (HTTP ${res.status})`);
  return await res.json();
}

export async function predictRisk(applicant: Record<string, any>, threshold = 0.50) {
  const res = await fetch(`${API_PREFIX}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant, threshold }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.message || errBody?.detail || `Inference API returned HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchGlobalShap() {
  const res = await fetch(`${API_PREFIX}/explain/global`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Failed to fetch global SHAP data (HTTP ${res.status})`);
  return await res.json();
}

export async function fetchLocalShap(applicant: Record<string, any>) {
  const res = await fetch(`${API_PREFIX}/explain/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant }),
  });
  if (!res.ok) throw new Error(`Failed to fetch local SHAP explanation (HTTP ${res.status})`);
  return await res.json();
}

export async function fetchStability(applicant: Record<string, any>) {
  const res = await fetch(`${API_PREFIX}/stability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant }),
  });
  if (!res.ok) throw new Error(`Failed to fetch stability analysis (HTTP ${res.status})`);
  return await res.json();
}

export async function fetchCounterfactual(applicant: Record<string, any>, threshold = 0.50) {
  const res = await fetch(`${API_PREFIX}/counterfactual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant, threshold }),
  });
  if (!res.ok) throw new Error(`Failed to fetch counterfactual recourse (HTTP ${res.status})`);
  return await res.json();
}

export async function fetchMaxSafeLoan(applicant: Record<string, any>, threshold = 0.50) {
  const res = await fetch(`${API_PREFIX}/novelty/max-safe-loan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant, threshold }),
  });
  if (!res.ok) throw new Error(`Failed to compute maximum safe loan (HTTP ${res.status})`);
  return await res.json();
}

export async function fetchStressMatrix(applicant: Record<string, any>) {
  const res = await fetch(`${API_PREFIX}/novelty/stress-matrix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant }),
  });
  if (!res.ok) throw new Error(`Failed to compute stress matrix (HTTP ${res.status})`);
  return await res.json();
}

export async function auditApplicantWorkflow(applicant: Record<string, any>, threshold = 0.50) {
  const res = await fetch(`${API_PREFIX}/workflow/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant, threshold }),
  });
  if (!res.ok) throw new Error(`Failed to run automated underwriting workflow (HTTP ${res.status})`);
  return await res.json();
}

export async function runBatchTriageWorkflow(applicants?: any[], threshold = 0.50) {
  const res = await fetch(`${API_PREFIX}/workflow/batch-triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicants, threshold }),
  });
  if (!res.ok) throw new Error(`Failed to run batch triage workflow (HTTP ${res.status})`);
  return await res.json();
}

export const fetchBatchTriage = runBatchTriageWorkflow;

