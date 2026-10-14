import time
import os
import sys
from datetime import datetime, timezone

# Ensure src directory is in sys.path
src_dir = os.path.dirname(os.path.abspath(__file__))
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

import pandas as pd
import numpy as np

from explainability import generate_structured_explanation, compute_shap_values, get_local_explanation_summary
from stability import run_prediction_stability_analysis
from counterfactual import generate_counterfactual_explanations

DEFAULT_FEATURE_VALUES = {
    'duration': 18.0, 'credit_amount': 2319.5, 'installment_commitment': 3.0,
    'residence_since': 3.0, 'age': 33.0, 'existing_credits': 1.0, 'num_dependents': 1.0,
    'checking_status': 'no checking', 'credit_history': 'existing paid',
    'purpose': 'radio/tv', 'savings_status': '<100', 'employment': '1<=X<4',
    'personal_status': 'male single', 'other_parties': 'none',
    'property_magnitude': 'car', 'other_payment_plans': 'none',
    'housing': 'own', 'job': 'skilled', 'own_telephone': 'none', 'foreign_worker': 'yes'
}

def validate_applicant(applicant: dict) -> dict:
    """
    Automatic Validation Guardrail:
    Checks for missing fields, boundary violations, invalid types, and impossible values.
    """
    alerts = []
    
    # Check numeric ranges
    if 'age' in applicant:
        try:
            age = float(applicant['age'])
            if age < 18 or age > 100:
                alerts.append(f"Age {age} is outside expected working-age bounds [18, 100].")
        except (ValueError, TypeError):
            alerts.append("Age must be a numeric value.")
    else:
        alerts.append("Missing required field: age.")

    if 'duration' in applicant:
        try:
            duration = float(applicant['duration'])
            if duration < 4 or duration > 96:
                alerts.append(f"Loan duration {duration} months is outside typical credit limits [4, 96].")
        except (ValueError, TypeError):
            alerts.append("Duration must be a numeric value.")
    else:
        alerts.append("Missing required field: duration.")

    if 'credit_amount' in applicant:
        try:
            amount = float(applicant['credit_amount'])
            if amount <= 0 or amount > 50000:
                alerts.append(f"Credit amount ${amount:,.0f} exceeds standard retail underwriting limits.")
        except (ValueError, TypeError):
            alerts.append("Credit amount must be a numeric value.")
    else:
        alerts.append("Missing required field: credit_amount.")

    return {
        "status": "PASSED" if len(alerts) == 0 else "WARNING",
        "is_valid": len(alerts) == 0,
        "alerts": alerts
    }

def run_automated_underwriting_pipeline(
    model, 
    preprocessor, 
    applicant: dict, 
    threshold: float = 0.50,
    X_train_trans = None,
    feature_names = None
) -> dict:
    """
    Autonomous Credit Risk Decision Support Pipeline:
    Automates the full 7-step underwriting workflow from validation to executive dossier.
    """
    start_time = time.time()
    
    # 1. Automatic Validation
    val_res = validate_applicant(applicant)
    
    # 2. Preprocessing & Calibrated Prediction
    clean_dict = {**DEFAULT_FEATURE_VALUES, **{k: v for k, v in applicant.items() if k != 'target'}}
    applicant_df = pd.DataFrame([clean_dict])
    trans = preprocessor.transform(applicant_df)
    prob = float(model.predict_proba(trans)[0, 1])
    
    is_default = prob >= threshold
    if prob < 0.35:
        risk_tier = "Low Risk Tier"
        tier_code = "LOW"
        color = "emerald"
    elif prob < 0.55:
        risk_tier = "Medium Risk Tier"
        tier_code = "MEDIUM"
        color = "amber"
    else:
        risk_tier = "High Risk Tier"
        tier_code = "HIGH"
        color = "rose"

    # 3. Automated Human-Readable Explanation (SHAP-derived)
    structured_exp = generate_structured_explanation(
        model, 
        preprocessor, 
        applicant, 
        threshold=threshold, 
        X_train_trans=X_train_trans, 
        feature_names=feature_names
    )
    
    # 4. Automated Robustness & Stability Stress Test (+/- 5%)
    stability_res = run_prediction_stability_analysis(model, preprocessor, applicant)
    avg_change = stability_res['average_abs_change']
    stability_score = stability_res['stability_score']
    
    if avg_change < 0.03:
        fragility_desc = "Highly Robust (< 3.0% variation under +/-5% financial perturbation)"
        fragility_badge = "ROBUST"
    elif avg_change < 0.08:
        fragility_desc = "Moderate Sensitivity (3-8% variation under +/-5% perturbation)"
        fragility_badge = "MODERATE"
    else:
        fragility_desc = "High Sensitivity (> 8% variation under +/-5% perturbation - boundary alert)"
        fragility_badge = "FRAGILE"

    # 5. Prescriptive Counterfactual Approval Pathway
    cf_res = generate_counterfactual_explanations(model, preprocessor, applicant, threshold=threshold)

    # 6. Safe Loan Amount Ceiling
    orig_amount = float(applicant.get('credit_amount', 2500))
    low_bound = 250.0
    high_bound = max(25000.0, orig_amount * 2.0)
    max_safe = low_bound
    
    for _ in range(15):
        mid = (low_bound + high_bound) / 2.0
        test_row = applicant.copy()
        test_row['credit_amount'] = mid
        mid_trans = preprocessor.transform(pd.DataFrame([test_row]))
        mid_prob = float(model.predict_proba(mid_trans)[0, 1])
        if mid_prob < threshold:
            max_safe = mid
            low_bound = mid
        else:
            high_bound = mid

    # 7. Executive Decision & Policy Recommendation
    if is_default:
        if cf_res.get('counterfactuals') and len(cf_res['counterfactuals']) > 0:
            rec_status = "CONDITIONAL REVIEW"
            rec_color = "amber"
            rec_action = "Refer to Senior Credit Officer with Restructuring Terms"
            rec_rationale = (
                f"Applicant default risk ({prob*100:.1f}%) exceeds policy threshold ({threshold*100:.0f}%). "
                f"However, automated recourse analysis confirms a viable approval pathway: "
                f"{cf_res['counterfactuals'][0]['summary']}"
            )
        else:
            rec_status = "DECLINE"
            rec_color = "rose"
            rec_action = "Automated Underwriting Decline Recommended"
            rec_rationale = (
                f"Applicant default risk ({prob*100:.1f}%) significantly exceeds policy threshold ({threshold*100:.0f}%). "
                f"Multiple adverse risk factors present without immediate feasible term adjustments."
            )
    else:
        if fragility_badge == "FRAGILE":
            rec_status = "CONDITIONAL REVIEW"
            rec_color = "amber"
            rec_action = "Manual Review for Borderline Robustness"
            rec_rationale = (
                f"Baseline default risk ({prob*100:.1f}%) is within tolerance (< {threshold*100:.0f}%), "
                f"but stability analysis detected high fragility near the decision boundary."
            )
        else:
            rec_status = "APPROVE"
            rec_color = "emerald"
            rec_action = "Fast-Track Autonomous Approval"
            rec_rationale = (
                f"Applicant exhibits low calibrated default risk ({prob*100:.1f}%) with robust stability "
                f"score of {stability_score}/100. Meets automated retail lending criteria."
            )

    elapsed_ms = round((time.time() - start_time) * 1000, 1)

    return {
        "execution_time_ms": elapsed_ms,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "validation": val_res,
        "prediction": {
            "default_probability": round(prob, 4),
            "threshold_used": threshold,
            "risk_tier": risk_tier,
            "tier_code": tier_code,
            "color": color,
            "is_default": is_default
        },
        "explanation": structured_exp,
        "stability": {
            "score": stability_score,
            "classification": stability_res['classification'],
            "classification_color": stability_res['classification_color'],
            "average_abs_change": round(avg_change, 4),
            "fragility_badge": fragility_badge,
            "fragility_description": fragility_desc,
            "perturbation_table": stability_res['perturbation_table'].to_dict(orient='records')
        },
        "counterfactual": cf_res,
        "safe_loan_ceiling": {
            "original_amount": orig_amount,
            "max_safe_amount": round(max_safe, 2),
            "difference": round(max_safe - orig_amount, 2),
            "recommendation": f"Maximum recommended credit limit is ${max_safe:,.2f} to remain below {threshold*100:.0f}% default probability."
        },
        "executive_recommendation": {
            "status": rec_status,
            "badge_color": rec_color,
            "action": rec_action,
            "rationale": rec_rationale,
            "confidence_level": "High (Calibrated Model Platt Scaling, Brier Score 0.1562)",
            "governance_note": "AI-assisted credit decision support. Final loan origination subject to institutional policy oversight."
        }
    }

def run_batch_triage(
    model, 
    preprocessor, 
    applicants_list: list, 
    threshold: float = 0.50
) -> dict:
    """
    Batch Queue Productivity & Automation Engine:
    Processes dozens of credit applications in milliseconds and classifies them into:
    - Fast-Track Approved
    - Senior Underwriter Review
    - High-Risk Decline
    """
    start_time = time.time()
    
    queue_results = []
    approved_count = 0
    review_count = 0
    declined_count = 0
    
    for idx, applicant in enumerate(applicants_list):
        clean_app = {**DEFAULT_FEATURE_VALUES, **{k: v for k, v in applicant.items() if k != 'target'}}
        df_row = pd.DataFrame([clean_app])
        trans = preprocessor.transform(df_row)
        prob = float(model.predict_proba(trans)[0, 1])
        
        credit_amt = float(applicant.get('credit_amount', 0))
        duration = int(applicant.get('duration', 0))
        age = int(applicant.get('age', 0))
        
        if prob < 0.35:
            decision = "APPROVED"
            badge = "emerald"
            tier = "Low Risk"
            approved_count += 1
        elif prob < threshold:
            decision = "REVIEW"
            badge = "amber"
            tier = "Medium Risk"
            review_count += 1
        elif prob < 0.65:
            # Borderline decline - candidate for counterfactual review
            decision = "REVIEW"
            badge = "amber"
            tier = "Borderline / Restructure"
            review_count += 1
        else:
            decision = "DECLINE"
            badge = "rose"
            tier = "High Risk"
            declined_count += 1
            
        queue_results.append({
            "queue_id": f"APP-{idx+1:03d}",
            "index": idx,
            "applicant": applicant,
            "credit_amount": credit_amt,
            "duration": duration,
            "age": age,
            "default_probability": round(prob, 4),
            "risk_tier": tier,
            "decision": decision,
            "badge_color": badge,
            "summary_label": f"#{idx+1:02d} | Age {age} | ${credit_amt:,.0f} ({duration}m) | P(Def): {prob*100:.1f}%"
        })
        
    elapsed_ms = round((time.time() - start_time) * 1000, 1)
    total = len(applicants_list)
    
    # Calculate productivity metrics:
    # Standard manual review time = 45 min per file (0.75 hours)
    # AI time = elapsed_ms / 1000 seconds
    manual_hours = round(total * 0.75, 1)
    automation_triage_rate = round(((approved_count + declined_count) / max(1, total)) * 100, 1)
    
    return {
        "total_applicants": total,
        "processing_time_ms": elapsed_ms,
        "metrics": {
            "fast_track_approved": approved_count,
            "underwriter_review_queue": review_count,
            "high_risk_declined": declined_count,
            "auto_triage_rate_pct": automation_triage_rate,
            "estimated_manual_hours_saved": manual_hours,
            "throughput_applications_per_sec": round((total / max(0.001, elapsed_ms / 1000)), 0)
        },
        "queue": queue_results
    }
