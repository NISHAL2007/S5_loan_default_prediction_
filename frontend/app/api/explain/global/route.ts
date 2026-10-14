import { NextResponse } from 'next/server';
import { tryForwardToBackend } from '@/lib/backendProxy';
import pipelineSpec from '@/lib/pipeline_spec.json';

const GLOBAL_IMPORTANCE = [
  { feature: "checking_status_no checking", importance: 0.6842 },
  { feature: "duration", importance: 0.5412 },
  { feature: "credit_history_critical/other existing credit", importance: 0.4105 },
  { feature: "savings_status_<100", importance: 0.3891 },
  { feature: "checking_status_0<=X<200", importance: 0.3524 },
  { feature: "credit_amount", importance: 0.3120 },
  { feature: "age", importance: 0.2415 },
  { feature: "purpose_used car", importance: 0.1850 },
  { feature: "housing_own", importance: 0.1620 },
  { feature: "other_payment_plans_bank", importance: 0.1410 }
];

export async function POST() {
  const backendRes = await tryForwardToBackend('/explain/global', 'POST', {}, 3000);
  if (backendRes.success && backendRes.data) {
    return NextResponse.json(backendRes.data);
  }

  return NextResponse.json({
    model_name: pipelineSpec.model_name,
    global_shap_importance: GLOBAL_IMPORTANCE
  });
}
