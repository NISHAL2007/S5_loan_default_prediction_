import { NextRequest, NextResponse } from 'next/server';
import { tryForwardToBackend } from '@/lib/backendProxy';
import { computeModelProbability, validateAndDefaultApplicant } from '@/lib/inference';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicant } = body;

    const backendRes = await tryForwardToBackend('/novelty/stress-matrix', 'POST', body, 4000);
    if (backendRes.success && backendRes.data) {
      return NextResponse.json(backendRes.data);
    }

    const { clean } = validateAndDefaultApplicant(applicant);
    const origCredit = Number(clean.credit_amount);
    const origDuration = Number(clean.duration);

    const creditShifts = [-20, 0, 20];
    const durationShifts = [-20, 0, 20];

    const matrixCells = [];
    for (const cShift of creditShifts) {
      for (const dShift of durationShifts) {
        const newC = origCredit * (1 + cShift / 100);
        const newD = Math.max(4, origDuration * (1 + dShift / 100));

        const testCopy = { ...clean, credit_amount: newC, duration: newD };
        const prob = computeModelProbability(testCopy);

        matrixCells.push({
          credit_shift: `${cShift > 0 ? '+' : ''}${cShift}% ($${Math.round(newC).toLocaleString()})`,
          duration_shift: `${dShift > 0 ? '+' : ''}${dShift}% (${Math.round(newD)}m)`,
          credit_pct: cShift,
          duration_pct: dShift,
          default_probability: Math.round(prob * 10000) / 10000,
          risk_status: prob >= 0.50 ? "REJECTED" : "APPROVED"
        });
      }
    }

    return NextResponse.json({
      original_credit_amount: origCredit,
      original_duration: origDuration,
      stress_matrix: matrixCells
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: true, message: err.message || 'Stress matrix generation failure' },
      { status: 422 }
    );
  }
}
