import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List, Tuple

# Ensure src/ and project root are in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
src_dir = os.path.join(project_root, 'src')
if project_root not in sys.path:
    sys.path.insert(0, project_root)
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

from explainability import compute_shap_values, get_local_explanation_summary, generate_structured_explanation
from stability import run_prediction_stability_analysis
from counterfactual import generate_counterfactual_explanations
from workflow import run_automated_underwriting_pipeline, run_batch_triage

app = FastAPI(
    title="CrediFlow AI Underwriting Engine API",
    description="Enterprise Credit Risk Decision-Support and Underwriting Automation Engine with calibrated scoring and SHAP explainability.",
    version="2.0.0"
)

# Enable CORS for Next.js frontend (Vercel & localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load artifacts at startup
model_path = os.path.join(project_root, "models", "best_model_pipeline.pkl")
results_path = os.path.join(project_root, "models", "evaluation_results.json")

if not os.path.exists(model_path) or not os.path.exists(results_path):
    raise RuntimeError("Model artifacts not found! Run python src/train_models.py first.")

artifacts = joblib.load(model_path)
model = artifacts['best_model']
best_model_name = artifacts['best_model_name']
preprocessor = artifacts['preprocessor']
feature_names = artifacts['feature_names']
num_cols = artifacts['num_cols']
cat_cols = artifacts['cat_cols']
X_train_raw = artifacts['X_train_raw']
X_test_raw = artifacts['X_test_raw']

with open(results_path, 'r') as f:
    eval_json = json.load(f)

# Precompute background SHAP values for global explainability
X_train_trans = preprocessor.transform(X_train_raw)
X_test_trans = preprocessor.transform(X_test_raw)
explainer, global_shap_vals = compute_shap_values(model, X_train_trans[:100], X_test_trans[:100])

if hasattr(global_shap_vals, 'values'):
    mean_abs_shap = np.abs(global_shap_vals.values).mean(axis=0)
else:
    mean_abs_shap = np.abs(global_shap_vals).mean(axis=0)

global_shap_list = []
for fname, val in sorted(zip(feature_names, mean_abs_shap), key=lambda x: x[1], reverse=True)[:15]:
    global_shap_list.append({
        'feature': fname,
        'importance': round(float(val), 4)
    })

# Documented Training Baseline Defaults & Categories for German Credit (20 Features)
FEATURE_DEFAULTS = {
    'duration': 18.0,
    'credit_amount': 2319.5,
    'installment_commitment': 3.0,
    'residence_since': 3.0,
    'age': 33.0,
    'existing_credits': 1.0,
    'num_dependents': 1.0,
    'checking_status': 'no checking',
    'credit_history': 'existing paid',
    'purpose': 'radio/tv',
    'savings_status': '<100',
    'employment': '1<=X<4',
    'personal_status': 'male single',
    'other_parties': 'none',
    'property_magnitude': 'car',
    'other_payment_plans': 'none',
    'housing': 'own',
    'job': 'skilled',
    'own_telephone': 'none',
    'foreign_worker': 'yes'
}

ALLOWED_CATEGORIES = {
    'checking_status': {'0<=X<200', '<0', '>=200', 'no checking'},
    'credit_history': {'all paid', 'critical/other existing credit', 'delayed previously', 'existing paid', 'no credits/all paid'},
    'purpose': {'business', 'domestic appliance', 'education', 'furniture/equipment', 'new car', 'other', 'radio/tv', 'repairs', 'retraining', 'used car'},
    'savings_status': {'100<=X<500', '500<=X<1000', '<100', '>=1000', 'no known savings'},
    'employment': {'1<=X<4', '4<=X<7', '<1', '>=7', 'unemployed'},
    'personal_status': {'female div/dep/mar', 'male div/sep', 'male mar/wid', 'male single'},
    'other_parties': {'co applicant', 'guarantor', 'none'},
    'property_magnitude': {'car', 'life insurance', 'no known property', 'real estate'},
    'other_payment_plans': {'bank', 'none', 'stores'},
    'housing': {'for free', 'own', 'rent'},
    'job': {'high qualif/self emp/mgmt', 'skilled', 'unemp/unskilled non res', 'unskilled resident'},
    'own_telephone': {'none', 'yes'},
    'foreign_worker': {'no', 'yes'}
}

NUMERIC_BOUNDS = {
    'duration': (4.0, 96.0, "Loan duration must be between 4 and 96 months."),
    'credit_amount': (200.0, 100000.0, "Credit amount must be between $200 and $100,000."),
    'installment_commitment': (1.0, 4.0, "Installment rate must be between 1 and 4 (% of disposable income)."),
    'residence_since': (1.0, 4.0, "Residence since must be between 1 and 4 years."),
    'age': (18.0, 100.0, "Borrower age must be between 18 and 100 years."),
    'existing_credits': (1.0, 10.0, "Existing credits must be between 1 and 10."),
    'num_dependents': (1.0, 10.0, "Number of dependents must be between 1 and 10.")
}

# Canonical Validation & Data Preparation Service
def prepare_and_validate_applicant(raw_applicant: Dict[str, Any]) -> Tuple[Dict[str, Any], pd.DataFrame, List[str]]:
    """
    Validates and normalizes incoming applicant features against the 20-predictor German Credit schema.
    - Rejects target labels (data leakage protection)
    - Validates numeric boundaries and coerces strings to valid numeric types
    - Validates categorical fields against pipeline-fitted categories
    - Provides explicit documented defaults for omitted features, returning a list of defaulted fields
    - Constructs the exact DataFrame structure required by preprocessor.transform()
    """
    if not isinstance(raw_applicant, dict) or len(raw_applicant) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Applicant payload must be a non-empty JSON object."
        )

    # 1. Reject Target or Outcome Variables
    forbidden_targets = {'target', 'is_default', 'default', 'y', 'outcome', 'label', 'approved'}
    found_targets = forbidden_targets.intersection(set(k.lower() for k in raw_applicant.keys()))
    if found_targets:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Data leakage guardrail: Target or outcome variables ({list(found_targets)}) cannot be passed as inputs."
        )

    clean_dict: Dict[str, Any] = {}
    defaulted_fields: List[str] = []

    # 2. Process Numerical Features
    for col in num_cols:
        if col in raw_applicant and raw_applicant[col] not in (None, "", "null"):
            try:
                val = float(raw_applicant[col])
                if np.isnan(val) or np.isinf(val):
                    raise ValueError("Non-finite number")
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Field '{col}' must be a valid numeric value, received: {raw_applicant[col]}"
                )

            min_val, max_val, err_msg = NUMERIC_BOUNDS[col]
            if val < min_val or val > max_val:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Boundary violation for '{col}': {err_msg} (received {val})"
                )
            clean_dict[col] = val
        else:
            clean_dict[col] = FEATURE_DEFAULTS[col]
            defaulted_fields.append(col)

    # 3. Process Categorical Features
    for col in cat_cols:
        if col in raw_applicant and raw_applicant[col] not in (None, "", "null"):
            val_str = str(raw_applicant[col]).strip()
            allowed = ALLOWED_CATEGORIES[col]
            if val_str not in allowed:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid category for '{col}': '{val_str}'. Allowed options are: {sorted(list(allowed))}"
                )
            clean_dict[col] = val_str
        else:
            clean_dict[col] = FEATURE_DEFAULTS[col]
            defaulted_fields.append(col)

    # 4. Construct single-row DataFrame with strict column order
    ordered_cols = num_cols + cat_cols
    ordered_data = {col: [clean_dict[col]] for col in ordered_cols}
    applicant_df = pd.DataFrame(ordered_data)

    return clean_dict, applicant_df, defaulted_fields

def run_canonical_inference(
    clean_dict: Dict[str, Any],
    applicant_df: pd.DataFrame,
    threshold: float = 0.50
) -> Dict[str, Any]:
    """
    Executes the canonical inference pipeline:
    - Preprocessing transformation via fitted ColumnTransformer
    - Calibrated Logistic Regression scoring
    - Threshold-based decision evaluation
    - Structured SHAP-derived plain-language rationale synthesis
    """
    # Validate threshold policy
    if threshold is None or np.isnan(threshold) or not (0.0 <= threshold <= 1.0):
        threshold = 0.50

    try:
        trans = preprocessor.transform(applicant_df)
        prob = float(model.predict_proba(trans)[0, 1])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference pipeline execution failure: {str(e)}"
        )

    if not np.isfinite(prob) or not (0.0 <= prob <= 1.0):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model produced invalid non-finite probability: {prob}"
        )

    # Evaluate decision: class 1 is default/bad credit
    is_default = prob >= threshold
    decision = "REJECTED (High Risk)" if is_default else "APPROVED (Acceptable Risk)"

    if prob < 0.35:
        risk_tier = "Low Risk Tier"
        color = "emerald"
    elif prob < 0.55:
        risk_tier = "Medium Risk Tier"
        color = "amber"
    else:
        risk_tier = "High Risk Tier"
        color = "rose"

    explanation = generate_structured_explanation(
        model, 
        preprocessor, 
        clean_dict, 
        threshold=threshold, 
        X_train_trans=X_train_trans, 
        feature_names=feature_names
    )

    return {
        'default_probability': round(prob, 4),
        'decision': decision,
        'is_default': is_default,
        'threshold_used': round(threshold, 4),
        'risk_tier': risk_tier,
        'risk_color': color,
        'model_name': best_model_name,
        'explanation': explanation
    }

# Pydantic Schemas
class BorrowerInput(BaseModel):
    applicant: Dict[str, Any] = Field(..., description="Dictionary of applicant features")
    threshold: Optional[float] = Field(0.50, ge=0.0, le=1.0, description="Decision threshold policy parameter")

class BatchInput(BaseModel):
    applicants: Optional[List[Dict[str, Any]]] = None
    threshold: Optional[float] = Field(0.50, ge=0.0, le=1.0)

# Endpoints
@app.get("/")
def read_root():
    return {
        "status": "ok",
        "service": "CrediFlow AI Underwriting Automation API",
        "version": "2.0.0",
        "model": best_model_name
    }

@app.get("/health")
def health_check():
    """
    Genuine health status endpoint reporting backend reachability and model availability.
    """
    is_ready = model is not None and preprocessor is not None
    return {
        "status": "healthy" if is_ready else "degraded",
        "backend_reachable": True,
        "model_loaded": is_ready,
        "model_name": best_model_name,
        "inference_ready": is_ready,
        "calibrated": True,
        "total_benchmark_records": 1000,
        "version": "2.0.0"
    }

@app.get("/model-info")
def get_model_info():
    """Returns model name, total records, default rate, and real metrics table."""
    return eval_json

@app.get("/sample-applicants")
def get_sample_applicants():
    """Returns a list of 30 sample test set applicants for instant preset loading."""
    samples = []
    limit = min(30, len(X_test_raw))
    for idx in range(limit):
        app_dict = X_test_raw.iloc[idx].to_dict()
        clean_dict, applicant_df, _ = prepare_and_validate_applicant(app_dict)
        res = run_canonical_inference(clean_dict, applicant_df, threshold=0.50)
        prob = res['default_probability']
        status_label = "REJECTED" if res['is_default'] else "APPROVED"
        samples.append({
            'index': idx,
            'applicant': clean_dict,
            'default_prob': prob,
            'status': status_label,
            'explanation': res['explanation'],
            'label': f"Applicant #{idx+1:02d} | Age {clean_dict.get('age'):.0f} | ${clean_dict.get('credit_amount'):,.0f} ({clean_dict.get('duration'):.0f}m) | P(Default): {prob*100:.1f}% [{status_label}]"
        })
    return samples

@app.post("/predict")
def predict_risk(data: BorrowerInput):
    """
    Canonical prediction endpoint for both manual form entries and preset profiles.
    """
    clean_dict, applicant_df, defaulted = prepare_and_validate_applicant(data.applicant)
    threshold = data.threshold if data.threshold is not None else 0.50
    result = run_canonical_inference(clean_dict, applicant_df, threshold=threshold)
    result['submitted_applicant'] = clean_dict
    result['defaulted_features'] = defaulted
    result['has_defaults'] = len(defaulted) > 0
    return result

@app.post("/explain/global")
def explain_global():
    """Returns precomputed top global SHAP feature importances."""
    return {
        'model_name': best_model_name,
        'global_shap_importance': global_shap_list
    }

@app.post("/explain/local")
def explain_local(data: BorrowerInput):
    """Calculates local SHAP feature breakdown for the given applicant."""
    clean_dict, applicant_df, _ = prepare_and_validate_applicant(data.applicant)
    try:
        trans = preprocessor.transform(applicant_df)
        _, applicant_shap = compute_shap_values(model, X_train_trans[:100], trans)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"SHAP computation error: {str(e)}")
        
    if hasattr(applicant_shap, 'values'):
        vals = applicant_shap[0].values
    else:
        vals = applicant_shap[0]
        
    local_shap = []
    for fname, val in zip(feature_names, vals):
        if abs(val) > 0.01:
            local_shap.append({
                'feature': fname,
                'shap_value': round(float(val), 4)
            })
            
    local_shap = sorted(local_shap, key=lambda x: abs(x['shap_value']), reverse=True)[:12]
    local_summary = get_local_explanation_summary(vals, feature_names, top_n=4)
    
    return {
        'local_shap_breakdown': local_shap,
        'risk_increasing_factors': local_summary['risk_increasing'],
        'risk_reducing_factors': local_summary['risk_reducing']
    }

@app.post("/stability")
def analyze_stability(data: BorrowerInput):
    """Runs Prediction Stability Analysis (+/- 5% perturbations on numeric features)."""
    clean_dict, _, _ = prepare_and_validate_applicant(data.applicant)
    try:
        res = run_prediction_stability_analysis(model, preprocessor, clean_dict)
        df_table = res['perturbation_table']
        table_records = df_table.to_dict(orient='records')
        
        return {
            'base_probability': res['base_probability'],
            'stability_score': res['stability_score'],
            'classification': res['classification'],
            'classification_color': res['classification_color'],
            'average_abs_change': res['average_abs_change'],
            'perturbation_table': table_records
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Stability analysis error: {str(e)}")

@app.post("/counterfactual")
def get_counterfactual(data: BorrowerInput):
    """Computes Counterfactual Explanations (Wachter et al., 2017) over actionable features."""
    clean_dict, _, _ = prepare_and_validate_applicant(data.applicant)
    try:
        threshold = data.threshold if data.threshold is not None else 0.50
        res = generate_counterfactual_explanations(model, preprocessor, clean_dict, threshold=threshold)
        return res
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Counterfactual calculation error: {str(e)}")

@app.post("/novelty/max-safe-loan")
def compute_max_safe_loan(data: BorrowerInput):
    """
    Novelty Feature: Performs binary parameter search to find the maximum safe loan amount 
    that maintains default probability below the decision threshold.
    """
    clean_dict, _, _ = prepare_and_validate_applicant(data.applicant)
    threshold = data.threshold if data.threshold is not None else 0.50
    orig_amount = float(clean_dict['credit_amount'])
    
    base_trans = preprocessor.transform(pd.DataFrame([clean_dict]))
    base_prob = float(model.predict_proba(base_trans)[0, 1])
    
    low = 250.0
    high = 25000.0
    max_safe = low
    
    for _ in range(15):
        mid = (low + high) / 2.0
        test_row = clean_dict.copy()
        test_row['credit_amount'] = mid
        trans = preprocessor.transform(pd.DataFrame([test_row]))
        prob = float(model.predict_proba(trans)[0, 1])
        
        if prob < threshold:
            max_safe = mid
            low = mid
        else:
            high = mid
            
    test_max = clean_dict.copy()
    test_max['credit_amount'] = max_safe
    trans_max = preprocessor.transform(pd.DataFrame([test_max]))
    prob_max = float(model.predict_proba(trans_max)[0, 1])
    
    return {
        'original_credit_amount': orig_amount,
        'baseline_default_prob': round(base_prob, 4),
        'max_recommended_safe_loan': round(max_safe, 2),
        'max_safe_loan_default_prob': round(prob_max, 4),
        'decision_threshold': threshold,
        'recommendation': f"Maximum recommended safe loan amount for this borrower profile is ${max_safe:,.2f} (maintains default risk at {prob_max*100:.1f}% < threshold {threshold*100:.0f}%)."
    }

@app.post("/novelty/stress-matrix")
def compute_stress_matrix(data: BorrowerInput):
    """
    Novelty Feature: Generates a 3x3 combined financial shock matrix 
    (Credit Amount perturbation vs Loan Duration perturbation).
    """
    clean_dict, _, _ = prepare_and_validate_applicant(data.applicant)
    orig_credit = float(clean_dict['credit_amount'])
    orig_duration = float(clean_dict['duration'])
    
    credit_shifts = [-20.0, 0.0, +20.0]
    duration_shifts = [-20.0, 0.0, +20.0]
    
    matrix_cells = []
    for c_shift in credit_shifts:
        for d_shift in duration_shifts:
            new_c = orig_credit * (1.0 + c_shift / 100.0)
            new_d = max(4.0, orig_duration * (1.0 + d_shift / 100.0))
            
            test_row = clean_dict.copy()
            test_row['credit_amount'] = new_c
            test_row['duration'] = new_d
            
            trans = preprocessor.transform(pd.DataFrame([test_row]))
            prob = float(model.predict_proba(trans)[0, 1])
            
            matrix_cells.append({
                'credit_shift': f"{c_shift:+.0f}% (${new_c:,.0f})",
                'duration_shift': f"{d_shift:+.0f}% ({new_d:.0f}m)",
                'credit_pct': c_shift,
                'duration_pct': d_shift,
                'default_probability': round(prob, 4),
                'risk_status': "REJECTED" if prob >= 0.50 else "APPROVED"
            })
            
    return {
        'original_credit_amount': orig_credit,
        'original_duration': orig_duration,
        'stress_matrix': matrix_cells
    }

@app.post("/workflow/audit")
def audit_applicant(data: BorrowerInput):
    """
    Automates the full 7-step credit decision-support workflow:
    Validation -> Preprocessing -> Scoring -> SHAP Rationale -> Fragility Testing -> Counterfactual Recourse -> Safe Limit -> Executive Dossier.
    """
    clean_dict, _, _ = prepare_and_validate_applicant(data.applicant)
    try:
        threshold = data.threshold if data.threshold is not None else 0.50
        res = run_automated_underwriting_pipeline(
            model=model,
            preprocessor=preprocessor,
            applicant=clean_dict,
            threshold=threshold,
            X_train_trans=X_train_trans,
            feature_names=feature_names
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Autonomous pipeline error: {str(e)}")

@app.post("/workflow/batch-triage")
def batch_triage(data: Optional[BatchInput] = None):
    """
    Batch Queue Productivity & Automation Engine:
    Processes applicant queues in milliseconds and triages into Fast-Track Approved, Senior Review, and Declined.
    """
    try:
        threshold = 0.50
        raw_list = []
        if data and data.threshold is not None:
            threshold = data.threshold
        if data and data.applicants and len(data.applicants) > 0:
            raw_list = data.applicants
        else:
            limit = min(30, len(X_test_raw))
            raw_list = [X_test_raw.iloc[i].to_dict() for i in range(limit)]
            
        validated_applicants = []
        for raw in raw_list:
            clean_app, _, _ = prepare_and_validate_applicant(raw)
            validated_applicants.append(clean_app)

        res = run_batch_triage(
            model=model,
            preprocessor=preprocessor,
            applicants_list=validated_applicants,
            threshold=threshold
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Batch triage error: {str(e)}")

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
