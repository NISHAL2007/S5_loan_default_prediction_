import { NextResponse } from 'next/server';
import { tryForwardToBackend } from '@/lib/backendProxy';
import sample30 from '@/lib/sample_30_applicants.json';

export async function GET() {
  const backendRes = await tryForwardToBackend('/sample-applicants', 'GET', undefined, 3000);
  if (backendRes.success && backendRes.data) {
    return NextResponse.json(backendRes.data);
  }

  return NextResponse.json(sample30);
}
