import { NextRequest, NextResponse } from 'next/server';
import { tryForwardToBackend } from '@/lib/backendProxy';
import { runCounterfactualAnalysis } from '@/lib/inference';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicant, threshold } = body;

    const backendRes = await tryForwardToBackend('/counterfactual', 'POST', body, 4000);
    if (backendRes.success && backendRes.data) {
      return NextResponse.json(backendRes.data);
    }

    const result = runCounterfactualAnalysis(applicant, threshold ?? 0.50);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: true, message: err.message || 'Counterfactual calculation failure' },
      { status: 422 }
    );
  }
}
