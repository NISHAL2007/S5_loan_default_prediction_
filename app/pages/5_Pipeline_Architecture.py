import os
import joblib
import pandas as pd
import numpy as np
import streamlit as st
import plotly.express as px

from stability import run_prediction_stability_analysis

st.set_page_config(page_title="Pipeline Architecture & Novelty Analytics", page_icon="🌐", layout="wide")

st.title("🌐 System Architecture & Novelty Analytics Blueprint")
st.markdown("Full end-to-end ML pipeline blueprint, 30-applicant batch explorer, risk-adjusted safe loan ceiling, and macroeconomic stress matrix.")

# Load model artifacts
model_path = os.path.join("models", "best_model_pipeline.pkl")
if not os.path.exists(model_path):
    st.error("Model artifacts not found! Run training script `python src/train_models.py` first.")
    st.stop()

artifacts = joblib.load(model_path)
model = artifacts['best_model']
preprocessor = artifacts['preprocessor']
X_test_raw = artifacts['X_test_raw']

# Section 1: End-to-End Pipeline Blueprint
st.subheader("🏗️ End-to-End ML Execution Pipeline Blueprint")
st.markdown("""
```
[German Credit Raw Dataset: 1,000 Records]
       │
       ▼
[ColumnTransformer Pipeline]
 ├── Categorical: SimpleImputer(most_frequent) ➔ OneHotEncoder
 └── Numerical: SimpleImputer(median) ➔ StandardScaler
       │
       ▼
[Stratified 80/20 Train/Test Split (No Data Leakage)]
       │
       ▼
[Class-Weighted Classifier]
 └── Selected: Logistic Regression (Recall: 80.0%, ROC-AUC: 0.8058)
       │
       ▼
[Explainability & Recourse Suite]
 ├── SHAP Log-Odds Breakdown (Cooperative Game Theory)
 ├── Prediction Stability Lab (±5% Numeric Perturbation Sensitivity)
 └── Counterfactual Recourse Engine (Wachter et al., 2017)
```
""")

st.divider()

# Section 2: 30-Applicant Batch Explorer
st.subheader("📊 30-Applicant Test Set Batch Explorer")
sample_idx = st.selectbox("Select Test Applicant (#01 - #30):", options=list(range(min(30, len(X_test_raw)))), 
                          format_func=lambda i: f"Applicant #{i+1:02d} | Age: {X_test_raw.iloc[i]['age']} | Credit: ${X_test_raw.iloc[i]['credit_amount']:,} | Duration: {X_test_raw.iloc[i]['duration']}m")

applicant_dict = X_test_raw.iloc[sample_idx].to_dict()
applicant_trans = preprocessor.transform(pd.DataFrame([applicant_dict]))
base_prob = float(model.predict_proba(applicant_trans)[0, 1])

col1, col2 = st.columns(2)
with col1:
    st.metric("Baseline Default Probability", f"{base_prob * 100:.2f}%")
with col2:
    status = "REJECTED (High Risk)" if base_prob >= 0.50 else "APPROVED (Acceptable Risk)"
    if base_prob >= 0.50:
        st.error(f"Baseline Outcome: {status}")
    else:
        st.success(f"Baseline Outcome: {status}")

st.divider()

# Section 3: Novelty Feature 1 - Max Safe Loan Calculator
st.subheader("💡 Novelty Feature 1: Risk-Adjusted Maximum Safe Loan Ceiling")
st.markdown("*Calculates the maximum recommended loan amount that maintains default risk strictly below threshold (0.50).*")

orig_credit = float(applicant_dict.get('credit_amount', 2500))
low, high, max_safe = 250.0, 25000.0, 250.0

for _ in range(15):
    mid = (low + high) / 2.0
    row_copy = applicant_dict.copy()
    row_copy['credit_amount'] = mid
    trans = preprocessor.transform(pd.DataFrame([row_copy]))
    prob = float(model.predict_proba(trans)[0, 1])
    if prob < 0.50:
        max_safe = mid
        low = mid
    else:
        high = mid

row_max = applicant_dict.copy()
row_max['credit_amount'] = max_safe
prob_max = float(model.predict_proba(preprocessor.transform(pd.DataFrame([row_max])))[0, 1])

m_col1, m_col2 = st.columns(2)
with m_col1:
    st.metric("Requested Credit Amount", f"${orig_credit:,.2f}")
with m_col2:
    st.metric("Max Recommended Safe Loan Ceiling", f"${max_safe:,.2f}", delta=f"Safe Risk: {prob_max*100:.1f}%")

st.info(f"💡 **Recommendation**: For this borrower profile, capping loan amount at **${max_safe:,.2f}** keeps default probability at **{prob_max*100:.1f}%** (safely below 50% threshold).")

st.divider()

# Section 4: Novelty Feature 2 - Macroeconomic Stress Matrix
st.subheader("⚡ Novelty Feature 2: Combined Financial Stress Matrix (Heatmap)")
st.markdown("*Simulates simultaneous Credit Amount ($\pm 20\%$) and Loan Duration ($\pm 20\%$) shocks.*")

credit_shifts = [-20.0, 0.0, +20.0]
duration_shifts = [-20.0, 0.0, +20.0]

matrix_rows = []
for c_shift in credit_shifts:
    row_data = {'Credit Shift': f"{c_shift:+.0f}%"}
    for d_shift in duration_shifts:
        new_c = orig_credit * (1.0 + c_shift / 100.0)
        new_d = max(4.0, float(applicant_dict.get('duration', 24)) * (1.0 + d_shift / 100.0))
        test_row = applicant_dict.copy()
        test_row['credit_amount'] = new_c
        test_row['duration'] = new_d
        prob = float(model.predict_proba(preprocessor.transform(pd.DataFrame([test_row])))[0, 1])
        row_data[f"Duration {d_shift:+.0f}%"] = f"{prob*100:.1f}% ({'REJ' if prob>=0.5 else 'APP'})"
    matrix_rows.append(row_data)

st.dataframe(pd.DataFrame(matrix_rows), use_container_width=True)
