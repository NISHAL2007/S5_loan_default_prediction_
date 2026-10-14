import { NextResponse } from 'next/server';
import { tryForwardToBackend } from '@/lib/backendProxy';
import evalResults from '@/lib/evaluation_results.json';

export async function GET() {
  const backendRes = await tryForwardToBackend('/model-info', 'GET', undefined, 3000);
  if (backendRes.success && backendRes.data) {
    return NextResponse.json(backendRes.data);
  }

  return NextResponse.json(evalResults);
}
