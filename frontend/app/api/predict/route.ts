import { NextRequest, NextResponse } from 'next/server';
import { tryForwardToBackend } from '@/lib/backendProxy';
import { runCanonicalInference } from '@/lib/inference';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicant, threshold } = body;

    // Try Python backend first
    const backendRes = await tryForwardToBackend('/predict', 'POST', body, 4000);
    if (backendRes.success && backendRes.data) {
      return NextResponse.json(backendRes.data);
    }

    // Canonical TypeScript engine fallback (identical mathematical result)
    const result = runCanonicalInference(applicant, threshold ?? 0.50);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: true, message: err.message || 'Prediction execution error' },
      { status: 422 }
    );
  }
}
