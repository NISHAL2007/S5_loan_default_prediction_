import os
import sys

# Ensure src/ and project root are in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
src_dir = os.path.join(project_root, 'src')
if project_root not in sys.path:
    sys.path.insert(0, project_root)
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

import json
import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List

from explainability import compute_shap_values, get_local_explanation_summary
from stability import run_prediction_stability_analysis
from counterfactual import generate_counterfactual_explanations

app = FastAPI(
    title="Loan Default Prediction API",
    description="Backend API providing default predictions, SHAP explainability, stability analysis, counterfactual recourse, and novelty stress analysis.",
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

# Pydantic Schemas
class BorrowerInput(BaseModel):
    applicant: Dict[str, Any]
    threshold: Optional[float] = 0.50

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Loan Default Prediction API v2.0 Operational"}

@app.get("/model-info")
def get_model_info():
    """Returns model name, total records, default rate, and real metrics table."""
    return eval_json

@app.get("/sample-applicants")
def get_sample_applicants():
    """Returns a list of 30 sample test set applicants for quick testing."""
    samples = []
    limit = min(30, len(X_test_raw))
    for idx in range(limit):
        app_dict = X_test_raw.iloc[idx].to_dict()
        trans = preprocessor.transform(pd.DataFrame([app_dict]))
        prob = float(model.predict_proba(trans)[0, 1])
        status_label = "REJECTED" if prob >= 0.50 else "APPROVED"
        samples.append({
            'index': idx,
            'applicant': app_dict,
            'default_prob': round(prob, 4),
            'status': status_label,
            'label': f"Applicant #{idx+1:02d} | Age {app_dict.get('age')} | ${app_dict.get('credit_amount'):,} ({app_dict.get('duration')}m) | P(Default): {prob*100:.1f}% [{status_label}]"
        })
    return samples

@app.post("/predict")
def predict_risk(data: BorrowerInput):
    """Calculates default probability, risk tier, and threshold decision."""
    applicant_df = pd.DataFrame([data.applicant])
    try:
        trans = preprocessor.transform(applicant_df)
        prob = float(model.predict_proba(trans)[0, 1])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")
        
    threshold = data.threshold or 0.50
    is_default = prob >= threshold
    
    if prob < 0.35:
        risk_tier = "Low Risk Tier"
        color = "emerald"
    elif prob < 0.55:
        risk_tier = "Medium Risk Tier"
        color = "amber"
    else:
        risk_tier = "High Risk Tier"
        color = "rose"
        
    return {
        'default_probability': round(prob, 4),
        'decision': "REJECTED (High Risk)" if is_default else "APPROVED (Acceptable Risk)",
        'is_default': is_default,
        'threshold_used': threshold,
        'risk_tier': risk_tier,
        'risk_color': color,
        'model_name': best_model_name
    }

@app.post("/explain/global")
def explain_global():
    """Returns precomputed top global SHAP feature importances."""
    return {
        'model_name': best_model_name,
        'global_shap_importance': global_shap_list
    }

@app.post("/explain/local")
def explain_local(data: BorrowerInput):
    """Calculates local SHAP feature breakdown for a single applicant."""
    applicant_df = pd.DataFrame([data.applicant])
    try:
        trans = preprocessor.transform(applicant_df)
        _, applicant_shap = compute_shap_values(model, X_train_trans[:100], trans)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SHAP computation error: {str(e)}")
        
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
    try:
        res = run_prediction_stability_analysis(model, preprocessor, data.applicant)
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
        raise HTTPException(status_code=400, detail=f"Stability analysis error: {str(e)}")

@app.post("/counterfactual")
def get_counterfactual(data: BorrowerInput):
    """Computes Counterfactual Explanations (Wachter et al., 2017)."""
    try:
        threshold = data.threshold or 0.50
        res = generate_counterfactual_explanations(model, preprocessor, data.applicant, threshold=threshold)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Counterfactual calculation error: {str(e)}")

# NOVELTY FEATURE 1: Risk-Adjusted Maximum Recommended Safe Loan Amount Calculator
@app.post("/novelty/max-safe-loan")
def compute_max_safe_loan(data: BorrowerInput):
    """
    Novelty Feature: Performs binary parameter search to find the maximum safe loan amount 
    that maintains default probability below the decision threshold (e.g. 0.50).
    """
    applicant = data.applicant
    threshold = data.threshold or 0.50
    orig_amount = float(applicant.get('credit_amount', 2500))
    
    # Check baseline probability
    base_trans = preprocessor.transform(pd.DataFrame([applicant]))
    base_prob = float(model.predict_proba(base_trans)[0, 1])
    
    # Binary search for max safe amount between $250 and $25,000
    low = 250.0
    high = 25000.0
    max_safe = low
    
    for _ in range(15):  # 15 iterations binary search precision
        mid = (low + high) / 2.0
        test_row = applicant.copy()
        test_row['credit_amount'] = mid
        trans = preprocessor.transform(pd.DataFrame([test_row]))
        prob = float(model.predict_proba(trans)[0, 1])
        
        if prob < threshold:
            max_safe = mid
            low = mid  # Try higher loan amount
        else:
            high = mid  # Exceeded risk threshold, lower amount
            
    # Calculate recommended safe ceiling
    test_max = applicant.copy()
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

# NOVELTY FEATURE 2: Borrower Combined Stress Matrix (Macroeconomic Shock Heatmap)
@app.post("/novelty/stress-matrix")
def compute_stress_matrix(data: BorrowerInput):
    """
    Novelty Feature: Generates a 3x3 combined financial shock matrix 
    (Credit Amount perturbation vs Loan Duration perturbation).
    """
    applicant = data.applicant
    orig_credit = float(applicant.get('credit_amount', 2500))
    orig_duration = float(applicant.get('duration', 24))
    
    credit_shifts = [-20.0, 0.0, +20.0]
    duration_shifts = [-20.0, 0.0, +20.0]
    
    matrix_cells = []
    for c_shift in credit_shifts:
        for d_shift in duration_shifts:
            new_c = orig_credit * (1.0 + c_shift / 100.0)
            new_d = max(4.0, orig_duration * (1.0 + d_shift / 100.0))
            
            test_row = applicant.copy()
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

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
