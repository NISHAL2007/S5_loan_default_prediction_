import { NextRequest, NextResponse } from 'next/server';
import { tryForwardToBackend } from '@/lib/backendProxy';
import { runCanonicalInference } from '@/lib/inference';
import sample30 from '@/lib/sample_30_applicants.json';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const threshold = body?.threshold ?? 0.50;
    const rawList = body?.applicants && body.applicants.length > 0
      ? body.applicants
      : sample30.map((s: any) => s.applicant);

    const backendRes = await tryForwardToBackend('/workflow/batch-triage', 'POST', body, 5000);
    if (backendRes.success && backendRes.data) {
      return NextResponse.json(backendRes.data);
    }

    const startTime = Date.now();
    let approved = 0;
    let review = 0;
    let declined = 0;

    const queue = rawList.map((applicant: any, idx: number) => {
      const pred = runCanonicalInference(applicant, threshold);
      const prob = pred.default_probability;
      let decision = "APPROVED";
      let badge = "emerald";
      let tier = "Low Risk";

      if (prob < 0.35) {
        decision = "APPROVED";
        badge = "emerald";
        tier = "Low Risk";
        approved++;
      } else if (prob < threshold) {
        decision = "REVIEW";
        badge = "amber";
        tier = "Medium Risk";
        review++;
      } else if (prob < 0.65) {
        decision = "REVIEW";
        badge = "amber";
        tier = "Borderline / Restructure";
        review++;
      } else {
        decision = "DECLINE";
        badge = "rose";
        tier = "High Risk";
        declined++;
      }

      const creditAmt = Number(applicant.credit_amount || 0);
      const duration = Number(applicant.duration || 0);
      const age = Number(applicant.age || 0);

      return {
        queue_id: `APP-${String(idx + 1).padStart(3, '0')}`,
        index: idx,
        applicant,
        credit_amount: creditAmt,
        duration,
        age,
        default_probability: prob,
        risk_tier: tier,
        decision,
        badge_color: badge,
        summary_label: `#${String(idx + 1).padStart(2, '0')} | Age ${age} | $${creditAmt.toLocaleString()} (${duration}m) | P(Def): ${(prob * 100).toFixed(1)}%`
      };
    });

    const elapsedMs = Date.now() - startTime;
    const total = queue.length;
    const manualHours = Math.round(total * 0.75 * 10) / 10;
    const autoRate = Math.round(((approved + declined) / Math.max(1, total)) * 1000) / 10;

    return NextResponse.json({
      total_applicants: total,
      processing_time_ms: elapsedMs,
      metrics: {
        fast_track_approved: approved,
        underwriter_review_queue: review,
        high_risk_declined: declined,
        auto_triage_rate_pct: autoRate,
        estimated_manual_hours_saved: manualHours,
        throughput_applications_per_sec: Math.round(total / Math.max(0.001, elapsedMs / 1000))
      },
      queue
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: true, message: err.message || 'Batch triage failure' },
      { status: 422 }
    );
  }
}
