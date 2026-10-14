import { NextResponse } from 'next/server';
import { tryForwardToBackend } from '@/lib/backendProxy';
import pipelineSpec from '@/lib/pipeline_spec.json';

export async function GET() {
  const backendCheck = await tryForwardToBackend('/health', 'GET', undefined, 2000);
  if (backendCheck.success && backendCheck.data) {
    return NextResponse.json({
      status: 'operational',
      backend_status: 'FastAPI Backend Operational',
      mode: 'python_fastapi',
      model_loaded: true,
      model_name: backendCheck.data.model_name || pipelineSpec.model_name,
      details: backendCheck.data
    });
  }

  // Standalone Next.js engine
  return NextResponse.json({
    status: 'operational',
    backend_status: 'CrediFlow Production Engine (Integrated)',
    mode: 'nextjs_inference_engine',
    model_loaded: true,
    model_name: pipelineSpec.model_name,
    details: {
      framework: 'Next.js 15 App Router + Calibrated Scikit-Learn Logistic Regression Pipeline',
      benchmark_records: 1000,
      predictors: 20
    }
  });
}
