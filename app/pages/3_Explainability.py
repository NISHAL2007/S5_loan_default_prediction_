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
import matplotlib.pyplot as plt
import shap

from explainability import compute_shap_values, get_local_explanation_summary

st.set_page_config(page_title="Explainability (SHAP) - Loan Default Prediction", page_icon="🔍", layout="wide")

st.title("🔍 Model Explainability (SHAP)")
st.markdown("Global and Local feature impact breakdown using **SHAP (SHapley Additive exPlanations)** values.")

# Load model artifacts
model_path = os.path.join(project_root, "models", "best_model_pipeline.pkl")
if not os.path.exists(model_path):
    st.error("Model artifacts not found! Run training script `python src/train_models.py` first.")
    st.stop()

artifacts = joblib.load(model_path)
model = artifacts['best_model']
preprocessor = artifacts['preprocessor']
feature_names = artifacts['feature_names']
X_train_raw = artifacts['X_train_raw']
X_test_raw = artifacts['X_test_raw']

X_train_trans = preprocessor.transform(X_train_raw)
X_test_trans = preprocessor.transform(X_test_raw)

# Compute SHAP values for test set background
@st.cache_data
def load_shap():
    explainer, shap_vals = compute_shap_values(model, X_train_trans[:100], X_test_trans[:100])
    return explainer, shap_vals

explainer, shap_values = load_shap()

tab1, tab2 = st.tabs(["🌐 Global Explainability", "🎯 Local Applicant Explanation"])

with tab1:
    st.subheader("Global Feature Importance (SHAP Summary Plot)")
    st.markdown("Shows the top features driving credit risk predictions across the entire dataset.")
    
    fig, ax = plt.subplots(figsize=(10, 6))
    if hasattr(shap_values, 'values'):
        shap.summary_plot(shap_values.values, X_test_trans[:100], feature_names=feature_names, show=False, max_display=15)
    else:
        shap.summary_plot(shap_values, X_test_trans[:100], feature_names=feature_names, show=False, max_display=15)
    st.pyplot(fig)
    plt.close(fig)

with tab2:
    st.subheader("Local Applicant Explainability")
    
    if 'current_applicant' in st.session_state:
        st.info("Using applicant currently assessed in Page 2 (Risk Assessment).")
        applicant_dict = st.session_state['current_applicant']
    else:
        st.warning("No applicant assessed on Page 2 yet! Using default applicant from test set.")
        applicant_dict = X_test_raw.iloc[0].to_dict()
        
    applicant_df = pd.DataFrame([applicant_dict])
    applicant_trans = preprocessor.transform(applicant_df)
    
    # Compute SHAP for single applicant
    _, applicant_shap = compute_shap_values(model, X_train_trans[:100], applicant_trans)
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader("Waterfall / Impact Plot")
        fig_local, ax_local = plt.subplots(figsize=(8, 6))
        if hasattr(applicant_shap, 'values'):
            shap.plots.bar(applicant_shap[0], max_display=10, show=False)
        else:
            feat_imp = pd.Series(applicant_shap[0], index=feature_names).abs().sort_values(ascending=False).head(10)
            feat_imp.plot(kind='barh', ax=ax_local)
            ax_local.invert_yaxis()
        st.pyplot(fig_local)
        plt.close(fig_local)
        
    with col2:
        st.subheader("Plain-Language Risk Factor Summary")
        local_summary = get_local_explanation_summary(applicant_shap[0], feature_names, top_n=4)
        
        st.markdown("#### 🚨 Key Factors Increasing Risk:")
        for item in local_summary['risk_increasing']:
            st.write(f"- {item}")
            
        st.markdown("#### 🛡️ Key Factors Reducing Risk:")
        for item in local_summary['risk_reducing']:
            st.write(f"- {item}")
