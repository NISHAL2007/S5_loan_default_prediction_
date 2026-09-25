import os
import sys

# Ensure src/ and project root are in sys.path for Streamlit sub-pages
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
src_dir = os.path.join(project_root, 'src')
if project_root not in sys.path:
    sys.path.insert(0, project_root)
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

import json
import joblib
import pandas as pd
import numpy as np
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go

# Set page config
st.set_page_config(
    page_title="Loan Default Prediction & Stability Analysis",
    page_icon="💳",
    layout="wide"
)

# Header
st.title("💳 Loan Default Prediction System")
st.markdown("### Semester-5 CS Mini Project: Explainability & Prediction Stability Analysis")

# Load saved metrics
results_path = os.path.join(project_root, "models", "evaluation_results.json")
if not os.path.exists(results_path):
    st.error("Evaluation results not found! Please run training script `python src/train_models.py` first.")
    st.stop()

with open(results_path, 'r') as f:
    eval_data = json.load(f)

best_model_name = eval_data['best_model_name']
best_metrics = eval_data['models'][best_model_name]
total_records = eval_data['total_records']
default_rate = eval_data['default_rate']

# Key Performance Indicators (KPIs)
col1, col2, col3, col4, col5 = st.columns(5)
with col1:
    st.metric(label="Total Records", value=f"{total_records:,}")
with col2:
    st.metric(label="Dataset Default Rate", value=f"{default_rate * 100:.1f}%")
with col3:
    st.metric(label="Selected Best Model", value=best_model_name)
with col4:
    st.metric(label="ROC-AUC Score", value=f"{best_metrics['ROC-AUC']:.4f}")
with col5:
    st.metric(label="Recall Score", value=f"{best_metrics['Recall']:.4f}")

st.divider()

# Layout: Two Charts Side by Side
chart_col1, chart_col2 = st.columns(2)

with chart_col1:
    st.subheader("📊 Class Distribution (Default vs Non-Default)")
    dist_df = pd.DataFrame({
        "Category": ["Non-Default (Good)", "Default (Bad)"],
        "Count": [int(total_records * (1 - default_rate)), int(total_records * default_rate)]
    })
    fig_dist = px.pie(
        dist_df, names="Category", values="Count",
        color="Category",
        color_discrete_map={"Non-Default (Good)": "#2ecc71", "Default (Bad)": "#e74c3c"},
        hole=0.4,
        title="German Credit Risk Target Class Ratio"
    )
    fig_dist.update_traces(textinfo="percent+label")
    st.plotly_chart(fig_dist, use_container_width=True)

with chart_col2:
    st.subheader("🏆 Model Performance Comparison Benchmark")
    models_dict = eval_data['models']
    comp_rows = []
    for m_name, m_val in models_dict.items():
        for metric_name in ['ROC-AUC', 'Recall', 'PR-AUC', 'Accuracy']:
            comp_rows.append({
                'Model': m_name,
                'Metric': metric_name,
                'Score': m_val[metric_name]
            })
    comp_df = pd.DataFrame(comp_rows)
    
    fig_comp = px.bar(
        comp_df, x="Metric", y="Score", color="Model", barmode="group",
        text_auto=".3f",
        title="Evaluation Metrics Across Models",
        color_discrete_sequence=px.colors.qualitative.Bold
    )
    fig_comp.update_layout(yaxis=dict(range=[0, 1.0]))
    st.plotly_chart(fig_comp, use_container_width=True)

st.divider()

# Detailed Table
st.subheader("📋 Empirical Model Comparison Matrix")
matrix_rows = []
for m_name, m_val in eval_data['models'].items():
    row = {'Model Name': m_name}
    row.update({k: v for k, v in m_val.items() if k != 'Confusion_Matrix'})
    matrix_rows.append(row)
df_matrix = pd.DataFrame(matrix_rows)
st.dataframe(df_matrix.style.highlight_max(axis=0, color="#d4edda", subset=['Recall', 'ROC-AUC', 'PR-AUC']), use_container_width=True)

st.info("💡 **Why Recall matters more than Accuracy**: In credit risk scoring, missing a borrower who defaults (False Negative) results in direct capital loss. Logistic Regression was selected because it achieves the highest Recall (80%) and ROC-AUC (0.8058).")
