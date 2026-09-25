import os
import sys

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
src_dir = os.path.join(project_root, 'src')
if project_root not in sys.path:
    sys.path.insert(0, project_root)
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

import joblib
import pandas as pd
import numpy as np
import streamlit as st
import plotly.express as px

from stability import run_prediction_stability_analysis

st.set_page_config(page_title="Prediction Stability Lab - Loan Default Prediction", page_icon="🧪", layout="wide")

st.title("🧪 Prediction Stability Analysis Lab")
st.markdown("Tests model robustness by applying **±5% perturbations** to key numeric features (`credit_amount`, `duration`, `age`) while keeping other borrower attributes fixed.")

# Load model artifacts
model_path = os.path.join(project_root, "models", "best_model_pipeline.pkl")
if not os.path.exists(model_path):
    st.error("Model artifacts not found! Run training script `python src/train_models.py` first.")
    st.stop()

artifacts = joblib.load(model_path)
model = artifacts['best_model']
preprocessor = artifacts['preprocessor']
X_test_raw = artifacts['X_test_raw']

# Select applicant
if 'current_applicant' in st.session_state:
    st.info("Loaded applicant assessed on Page 2 (Risk Assessment).")
    applicant_dict = st.session_state['current_applicant']
else:
    st.info("Using sample applicant from test set.")
    applicant_dict = X_test_raw.iloc[0].to_dict()

# Select numeric features to perturb
numeric_feats = ['credit_amount', 'duration', 'age']

# Run stability analysis
stability_res = run_prediction_stability_analysis(model, preprocessor, applicant_dict, numeric_features=numeric_feats)

base_prob = stability_res['base_probability']
score = stability_res['stability_score']
status = stability_res['classification']
avg_change = stability_res['average_abs_change']
df_perturb = stability_res['perturbation_table']

# KPI Header
st.subheader("📌 Stability Analysis Overview")
col1, col2, col3 = st.columns(3)

with col1:
    st.metric("Base Default Probability", f"{base_prob * 100:.2f}%")

with col2:
    st.metric("Avg Abs Probability Shift", f"{avg_change * 100:.2f}%")

with col3:
    st.metric("Project-Level Stability Indicator", f"{score:.2f} / 100", delta=status)

# Score Classification Card
if status == "Highly Stable":
    st.success(f"🟢 **Classification: {status}** (Score >= 85). Model default probability remains steady under minor feature perturbations.")
elif status == "Stable":
    st.warning(f"🟠 **Classification: {status}** (Score 60 - 84). Model exhibits moderate sensitivity to feature fluctuations.")
else:
    st.error(f"🔴 **Classification: {status}** (Score < 60). Model is highly sensitive to minor feature perturbations.")

st.caption("*Note: The Prediction Stability Indicator is a transparent project-level metric supporting the empirical perturbation table below.*")

st.divider()

# Layout: Perturbation Table & Interactive Plot
tab_col1, tab_col2 = st.columns([1, 1])

with tab_col1:
    st.subheader("📋 Empirical Perturbation Results Table")
    st.dataframe(
        df_perturb[['Scenario', 'Original Value', 'New Value', 'Original Default Prob', 'New Default Prob', 'Probability Difference']],
        use_container_width=True
    )

with tab_col2:
    st.subheader("📈 Default Probability Response Chart")
    fig_line = px.bar(
        df_perturb,
        x="Scenario",
        y="Probability Difference",
        color="Feature Changed",
        text_auto=".4f",
        title="Impact of ±5% Feature Perturbations on Predicted Default Risk",
        color_discrete_sequence=px.colors.qualitative.Bold
    )
    fig_line.update_layout(yaxis_title="Change in Predicted Probability (Δ)")
    st.plotly_chart(fig_line, use_container_width=True)

st.divider()
st.markdown("### 💡 Why Prediction Stability Matters in Credit Scoring")
st.markdown("""
- **Financial Fair Lending**: A borrower whose credit score or income fluctuates by 1-5% should not experience a drastic jump in loan rejection probability.
- **Model Auditing**: Sudden probability jumps reveal underlying model brittleness or sharp decision boundaries, which could cause unfair loan rejections.
""")
