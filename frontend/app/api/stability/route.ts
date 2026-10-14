import { NextRequest, NextResponse } from 'next/server';
import { tryForwardToBackend } from '@/lib/backendProxy';
import { runStabilityAnalysis } from '@/lib/inference';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicant } = body;

    const backendRes = await tryForwardToBackend('/stability', 'POST', body, 4000);
    if (backendRes.success && backendRes.data) {
      return NextResponse.json(backendRes.data);
    }

    const result = runStabilityAnalysis(applicant);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: true, message: err.message || 'Stability calculation failure' },
      { status: 422 }
    );
  }
}
