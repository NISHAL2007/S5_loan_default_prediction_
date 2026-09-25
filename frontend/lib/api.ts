const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function fetchModelInfo() {
  const res = await fetch(`${API_BASE_URL}/model-info`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch model info');
  return res.json();
}

export async function fetchSampleApplicants() {
  const res = await fetch(`${API_BASE_URL}/sample-applicants`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch sample applicants');
  return res.json();
}

export async function predictRisk(applicant: Record<string, any>, threshold = 0.50) {
  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant, threshold }),
  });
  if (!res.ok) throw new Error('Failed to compute risk prediction');
  return res.json();
}

export async function fetchGlobalShap() {
  const res = await fetch(`${API_BASE_URL}/explain/global`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant: {} }),
  });
  if (!res.ok) throw new Error('Failed to fetch global SHAP data');
  return res.json();
}

export async function fetchLocalShap(applicant: Record<string, any>) {
  const res = await fetch(`${API_BASE_URL}/explain/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant }),
  });
  if (!res.ok) throw new Error('Failed to fetch local SHAP data');
  return res.json();
}

export async function fetchStability(applicant: Record<string, any>) {
  const res = await fetch(`${API_BASE_URL}/stability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant }),
  });
  if (!res.ok) throw new Error('Failed to fetch stability analysis');
  return res.json();
}

export async function fetchCounterfactual(applicant: Record<string, any>, threshold = 0.50) {
  const res = await fetch(`${API_BASE_URL}/counterfactual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant, threshold }),
  });
  if (!res.ok) throw new Error('Failed to fetch counterfactual explanations');
  return res.json();
}

export async function fetchMaxSafeLoan(applicant: Record<string, any>, threshold = 0.50) {
  const res = await fetch(`${API_BASE_URL}/novelty/max-safe-loan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant, threshold }),
  });
  if (!res.ok) throw new Error('Failed to calculate max safe loan ceiling');
  return res.json();
}

export async function fetchStressMatrix(applicant: Record<string, any>) {
  const res = await fetch(`${API_BASE_URL}/novelty/stress-matrix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant }),
  });
  if (!res.ok) throw new Error('Failed to generate stress matrix');
  return res.json();
}
