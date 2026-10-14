import { NextRequest, NextResponse } from 'next/server';
import { tryForwardToBackend } from '@/lib/backendProxy';
import { computeFeatureContributions, FEATURE_DEFAULTS } from '@/lib/inference';
import pipelineSpec from '@/lib/pipeline_spec.json';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicant } = body;

    const backendRes = await tryForwardToBackend('/explain/local', 'POST', body, 4000);
    if (backendRes.success && backendRes.data) {
      return NextResponse.json(backendRes.data);
    }

    const impacts = computeFeatureContributions(applicant);
    const breakdown = Object.entries(impacts)
      .map(([feature, val]) => ({
        feature,
        shap_value: Math.round(val * 10000) / 10000
      }))
      .filter((x) => Math.abs(x.shap_value) > 0.01)
      .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
      .slice(0, 12);

    const increasing = breakdown.filter((x) => x.shap_value > 0).map((x) => `${x.feature}: (+${x.shap_value.toFixed(3)} log-odds)`).slice(0, 4);
    const reducing = breakdown.filter((x) => x.shap_value < 0).map((x) => `${x.feature}: (${x.shap_value.toFixed(3)} log-odds)`).slice(0, 4);

    return NextResponse.json({
      local_shap_breakdown: breakdown,
      risk_increasing_factors: increasing.length > 0 ? increasing : ["No major adverse risk factors detected"],
      risk_reducing_factors: reducing.length > 0 ? reducing : ["No major mitigating protective factors detected"]
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: true, message: err.message || 'SHAP computation failure' },
      { status: 422 }
    );
  }
}
