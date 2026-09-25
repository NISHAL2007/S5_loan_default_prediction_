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
import streamlit as st

st.set_page_config(page_title="Risk Assessment - Loan Default Prediction", page_icon="📋", layout="wide")

st.title("📋 Individual Applicant Risk Assessment")
st.markdown("Enter borrower attributes to compute default probability and assess credit risk.")

# Load model pipeline
model_path = os.path.join(project_root, "models", "best_model_pipeline.pkl")
if not os.path.exists(model_path):
    st.error("Model artifacts not found! Run training script `python src/train_models.py` first.")
    st.stop()

artifacts = joblib.load(model_path)
model = artifacts['best_model']
best_model_name = artifacts['best_model_name']
preprocessor = artifacts['preprocessor']
X_test_raw = artifacts['X_test_raw']

st.sidebar.markdown(f"**Loaded Model:** `{best_model_name}`")

st.subheader("👤 Applicant Attributes")

# Option to pre-fill from sample test borrower
sample_idx = st.selectbox("Preset Example Borrower (from test set):", options=list(range(min(10, len(X_test_raw)))), index=0)
sample_data = X_test_raw.iloc[sample_idx].to_dict()

def safe_idx(options, val):
    str_val = str(val)
    options_str = [str(o) for o in options]
    if str_val in options_str:
        return options_str.index(str_val)
    return 0

with st.form("risk_form"):
    col1, col2, col3 = st.columns(3)
    
    # Categorical options extracted from X_test_raw
    checking_opts = sorted(list(X_test_raw['checking_status'].dropna().unique()))
    savings_opts = sorted(list(X_test_raw['savings_status'].dropna().unique()))
    purpose_opts = sorted(list(X_test_raw['purpose'].dropna().unique()))
    credit_hist_opts = sorted(list(X_test_raw['credit_history'].dropna().unique()))
    employment_opts = sorted(list(X_test_raw['employment'].dropna().unique()))
    job_opts = sorted(list(X_test_raw['job'].dropna().unique()))
    housing_opts = sorted(list(X_test_raw['housing'].dropna().unique()))
    personal_status_opts = sorted(list(X_test_raw['personal_status'].dropna().unique()))
    other_parties_opts = sorted(list(X_test_raw['other_parties'].dropna().unique()))
    other_plans_opts = sorted(list(X_test_raw['other_payment_plans'].dropna().unique()))
    property_opts = sorted(list(X_test_raw['property_magnitude'].dropna().unique()))
    telephone_opts = sorted(list(X_test_raw['own_telephone'].dropna().unique()))
    foreign_opts = sorted(list(X_test_raw['foreign_worker'].dropna().unique()))

    with col1:
        age = st.number_input("Age (Years)", min_value=18, max_value=100, value=int(sample_data.get('age', 35)))
        checking_status = st.selectbox("Checking Account Status", options=checking_opts, index=safe_idx(checking_opts, sample_data.get('checking_status')))
        credit_history = st.selectbox("Credit History", options=credit_hist_opts, index=safe_idx(credit_hist_opts, sample_data.get('credit_history')))
        purpose = st.selectbox("Purpose", options=purpose_opts, index=safe_idx(purpose_opts, sample_data.get('purpose')))
        savings_status = st.selectbox("Savings Account Status", options=savings_opts, index=safe_idx(savings_opts, sample_data.get('savings_status')))
        employment = st.selectbox("Employment Duration", options=employment_opts, index=safe_idx(employment_opts, sample_data.get('employment')))

    with col2:
        credit_amount = st.number_input("Credit Amount ($)", min_value=250, max_value=25000, value=int(sample_data.get('credit_amount', 2500)))
        duration = st.number_input("Loan Duration (Months)", min_value=4, max_value=72, value=int(sample_data.get('duration', 24)))
        personal_status = st.selectbox("Personal Status / Sex", options=personal_status_opts, index=safe_idx(personal_status_opts, sample_data.get('personal_status')))
        other_parties = st.selectbox("Other Parties / Guarantors", options=other_parties_opts, index=safe_idx(other_parties_opts, sample_data.get('other_parties')))
        housing = st.selectbox("Housing", options=housing_opts, index=safe_idx(housing_opts, sample_data.get('housing')))
        job = st.selectbox("Job Type", options=job_opts, index=safe_idx(job_opts, sample_data.get('job')))

    with col3:
        installment_commitment = st.slider("Installment Rate (% of income)", 1, 4, int(sample_data.get('installment_commitment', 2)))
        residence_since = st.slider("Years at Present Residence", 1, 4, int(sample_data.get('residence_since', 2)))
        existing_credits = st.slider("Number of Existing Credits", 1, 4, int(sample_data.get('existing_credits', 1)))
        num_dependents = st.slider("Number of Dependents", 1, 2, int(sample_data.get('num_dependents', 1)))
        other_payment_plans = st.selectbox("Other Payment Plans", options=other_plans_opts, index=safe_idx(other_plans_opts, sample_data.get('other_payment_plans')))
        property_magnitude = st.selectbox("Property Type", options=property_opts, index=safe_idx(property_opts, sample_data.get('property_magnitude')))
        own_telephone = st.selectbox("Telephone", options=telephone_opts, index=safe_idx(telephone_opts, sample_data.get('own_telephone')))
        foreign_worker = st.selectbox("Foreign Worker", options=foreign_opts, index=safe_idx(foreign_opts, sample_data.get('foreign_worker')))

    # Submit button MUST be inside with st.form block!
    submit_btn = st.form_submit_button("🔍 Analyze Risk")

# Construct applicant data row
input_dict = sample_data.copy()
input_dict.update({
    'checking_status': checking_status,
    'duration': duration,
    'credit_history': credit_history,
    'purpose': purpose,
    'credit_amount': credit_amount,
    'savings_status': savings_status,
    'employment': employment,
    'installment_commitment': installment_commitment,
    'personal_status': personal_status,
    'other_parties': other_parties,
    'residence_since': residence_since,
    'property_magnitude': property_magnitude,
    'age': age,
    'other_payment_plans': other_payment_plans,
    'housing': housing,
    'existing_credits': existing_credits,
    'job': job,
    'num_dependents': num_dependents,
    'own_telephone': own_telephone,
    'foreign_worker': foreign_worker
})

# Business Decision Threshold Section
st.divider()
st.subheader("⚙️ Business Decision Threshold Analysis")
st.markdown("*The ML model provides a probability; selecting the decision threshold is a separate credit policy decision.*")
threshold = st.select_slider("Select Classification Threshold:", options=[0.30, 0.40, 0.50, 0.60, 0.70], value=0.50)

if submit_btn or 'current_applicant' not in st.session_state:
    st.session_state['current_applicant'] = input_dict

applicant_df = pd.DataFrame([st.session_state['current_applicant']])
applicant_trans = preprocessor.transform(applicant_df)
default_prob = float(model.predict_proba(applicant_trans)[0, 1])
st.session_state['current_prob'] = default_prob

# Render Results
st.markdown("---")
st.subheader("🎯 Prediction Output & Risk Categorization")

res_col1, res_col2, res_col3 = st.columns(3)

with res_col1:
    st.metric("Predicted Default Probability", f"{default_prob * 100:.2f}%")

with res_col2:
    if default_prob >= threshold:
        decision = "REJECTED (High Default Risk)"
        st.error(f"Decision @ Threshold ({threshold:.2f}): {decision}")
    else:
        decision = "APPROVED (Low/Acceptable Default Risk)"
        st.success(f"Decision @ Threshold ({threshold:.2f}): {decision}")

with res_col3:
    if default_prob < 0.35:
        risk_tier = "🟢 Low Risk Tier"
    elif default_prob < 0.55:
        risk_tier = "🟡 Medium Risk Tier"
    else:
        risk_tier = "🔴 High Risk Tier"
    st.info(f"Risk Tier Category: {risk_tier}")

st.caption(f"Model used for prediction: **{best_model_name}**")
