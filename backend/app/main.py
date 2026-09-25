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
    description="Backend API providing default predictions, SHAP explainability, stability analysis, and counterfactual recourse.",
    version="1.0.0"
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
X_train_raw = artifacts['X_train_raw']
X_test_raw = artifacts['X_test_raw']

with open(results_path, 'r') as f:
    eval_json = json.load(f)

# Precompute background SHAP values for global explainability
X_train_trans = preprocessor.transform(X_train_raw)
X_test_trans = preprocessor.transform(X_test_raw)
explainer, global_shap_vals = compute_shap_values(model, X_train_trans[:100], X_test_trans[:100])

# Global SHAP feature importance list
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

class SampleApplicantQuery(BaseModel):
    index: Optional[int] = 0

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Loan Default Prediction API Service Running"}

@app.get("/model-info")
def get_model_info():
    """Returns model name, total records, default rate, and real metrics table."""
    return eval_json

@app.get("/sample-applicants")
def get_sample_applicants():
    """Returns a list of 10 sample test set applicants for quick testing."""
    samples = []
    for idx in range(min(10, len(X_test_raw))):
        app_dict = X_test_raw.iloc[idx].to_dict()
        trans = preprocessor.transform(pd.DataFrame([app_dict]))
        prob = float(model.predict_proba(trans)[0, 1])
        samples.append({
            'index': idx,
            'applicant': app_dict,
            'default_prob': round(prob, 4),
            'label': f"Applicant {idx} (Age: {app_dict.get('age')}, Credit: ${app_dict.get('credit_amount')}, Risk Prob: {prob*100:.1f}%)"
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
        raise HTTPException(status_code=400, detail=f"Preprocessing or prediction error: {str(e)}")
        
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

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
