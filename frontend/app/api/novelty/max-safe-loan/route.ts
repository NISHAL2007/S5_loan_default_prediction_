import { NextRequest, NextResponse } from 'next/server';
import { tryForwardToBackend } from '@/lib/backendProxy';
import { runCanonicalInference, computeModelProbability, validateAndDefaultApplicant } from '@/lib/inference';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicant, threshold = 0.50 } = body;

    const backendRes = await tryForwardToBackend('/novelty/max-safe-loan', 'POST', body, 4000);
    if (backendRes.success && backendRes.data) {
      return NextResponse.json(backendRes.data);
    }

    const { clean } = validateAndDefaultApplicant(applicant);
    const origAmount = Number(clean.credit_amount);
    const baseProb = computeModelProbability(clean);

    let low = 250.0;
    let high = 25000.0;
    let maxSafe = low;

    for (let i = 0; i < 15; i++) {
      const mid = (low + high) / 2.0;
      const testCopy = { ...clean, credit_amount: mid };
      const prob = computeModelProbability(testCopy);

      if (prob < threshold) {
        maxSafe = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    const finalProb = computeModelProbability({ ...clean, credit_amount: maxSafe });

    return NextResponse.json({
      original_credit_amount: origAmount,
      baseline_default_prob: Math.round(baseProb * 10000) / 10000,
      max_recommended_safe_loan: Math.round(maxSafe * 100) / 100,
      max_safe_loan_default_prob: Math.round(finalProb * 10000) / 10000,
      decision_threshold: threshold,
      recommendation: `Maximum recommended safe loan amount for this borrower profile is $${Math.round(maxSafe).toLocaleString()} (maintains default risk at ${(finalProb * 100).toFixed(1)}% < threshold ${(threshold * 100).toFixed(0)}%).`
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: true, message: err.message || 'Safe loan computation failure' },
      { status: 422 }
    );
  }
}
