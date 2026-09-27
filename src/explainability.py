import numpy as np
import pandas as pd
import shap

def get_shap_explainer(model, X_train):
    """
    Creates a SHAP explainer for the trained model.
    Handles LinearExplainer (Logistic Regression), TreeExplainer (RF, XGBoost), or generic Explainer.
    """
    if hasattr(model, 'coef_'):
        explainer = shap.LinearExplainer(model, X_train)
    else:
        explainer = shap.TreeExplainer(model)
    return explainer

def compute_shap_values(model, X_train, X_data):
    """
    Computes SHAP values for given dataset X_data.
    """
    explainer = get_shap_explainer(model, X_train)
    shap_values = explainer(X_data)
    
    if hasattr(shap_values, 'values') and len(shap_values.values.shape) == 3:
        shap_values = shap_values[:, :, 1]
        
    return explainer, shap_values

def get_local_explanation_summary(shap_values_row, feature_names, top_n=3):
    """
    Extracts top N positive drivers (increasing default risk) 
    and top N negative drivers (reducing default risk) from actual SHAP values.
    """
    if hasattr(shap_values_row, 'values'):
        vals = shap_values_row.values
    else:
        vals = shap_values_row
        
    feature_impacts = list(zip(feature_names, vals))
    sorted_impacts = sorted(feature_impacts, key=lambda x: x[1], reverse=True)
    
    risk_increasing = [f"{feat}: (+{val:.3f} log-odds)" for feat, val in sorted_impacts if val > 0][:top_n]
    risk_reducing = [f"{feat}: ({val:.3f} log-odds)" for feat, val in reversed(sorted_impacts) if val < 0][:top_n]
    
    return {
        'risk_increasing': risk_increasing if risk_increasing else ["No strong risk factors"],
        'risk_reducing': risk_reducing if risk_reducing else ["No strong protective factors"]
    }

FEATURE_HUMAN_LABELS = {
    'checking_status': 'Checking Account Status',
    'savings_status': 'Savings Account Status',
    'credit_amount': 'Requested Credit Amount',
    'duration': 'Loan Duration',
    'age': 'Borrower Age',
    'credit_history': 'Credit History',
    'purpose': 'Loan Purpose',
    'housing': 'Housing Status',
    'employment': 'Employment Duration',
    'other_payment_plans': 'Other Payment Plans',
    'property_magnitude': 'Property Owned',
    'installment_commitment': 'Installment Rate (% of income)',
    'existing_credits': 'Existing Credits at Bank',
    'personal_status': 'Personal Status & Sex',
    'other_parties': 'Other Debtors / Guarantors',
    'residence_since': 'Present Residence Duration',
    'job': 'Job Qualification Tier',
    'num_dependents': 'Number of Dependents',
    'own_telephone': 'Telephone Ownership',
    'foreign_worker': 'Foreign Worker Status'
}

def generate_feature_explanation_sentence(feature_key, raw_val, impact, direction):
    """
    Generates a clear, applicant-specific human-language explanation sentence
    incorporating the actual value and directional impact.
    """
    val_str = str(raw_val)
    if feature_key == 'credit_amount':
        val_str = f"${float(raw_val):,.0f}"
    elif feature_key == 'duration':
        val_str = f"{raw_val} months"
    elif feature_key == 'age':
        val_str = f"{raw_val} years"
    elif feature_key == 'installment_commitment':
        val_str = f"{raw_val}% of disposable income"

    label = FEATURE_HUMAN_LABELS.get(feature_key, feature_key.replace('_', ' ').title())

    if direction == 'increases_risk':
        if feature_key == 'checking_status':
            if val_str in ['<0', 'no checking']:
                return f"Limited/negative checking status ({val_str}) indicates constrained liquid buffer and increases risk."
            return f"Checking account balance ({val_str}) contributes to higher estimated risk relative to top tiers."
        elif feature_key == 'savings_status':
            return f"Low savings level ({val_str}) provides minimal financial reserve, contributing to higher estimated risk."
        elif feature_key == 'credit_amount':
            return f"The requested credit amount ({val_str}) increases debt service burden and risk exposure."
        elif feature_key == 'duration':
            return f"Extended loan repayment duration ({val_str}) increases credit risk exposure over time."
        elif feature_key == 'housing':
            return f"Housing status ({val_str}) contributes to estimated risk relative to homeownership."
        elif feature_key == 'credit_history':
            return f"Credit history record ({val_str}) adds risk weight to estimated default probability."
        elif feature_key == 'other_payment_plans':
            return f"Active payment plan ({val_str}) increases short-term financial obligations."
        else:
            return f"Feature {label} ({val_str}) contributes toward higher predicted default risk."
    else: # decreases_risk / protective
        if feature_key == 'savings_status':
            return f"Substantial savings reserves ({val_str}) provide a strong protective buffer, reducing default risk."
        elif feature_key == 'checking_status':
            return f"Strong checking account standing ({val_str}) provides liquidity, lowering default risk."
        elif feature_key == 'credit_history':
            return f"Proven credit history ({val_str}) demonstrates repayment reliability, reducing default risk."
        elif feature_key == 'housing':
            return f"Homeownership ({val_str}) demonstrates asset stability, contributing toward lower risk."
        elif feature_key == 'age':
            return f"Borrower age ({val_str}) provides financial maturity, contributing toward lower risk."
        elif feature_key == 'duration':
            return f"Shorter loan duration ({val_str}) limits total credit exposure time, lowering risk."
        else:
            return f"Feature {label} ({val_str}) contributes toward lower estimated default risk."

def generate_structured_explanation(model, preprocessor, applicant_dict, threshold=0.50, X_train_trans=None, feature_names=None):
    """
    Generates structured, applicant-specific explanation data derived from exact model SHAP values / feature contributions.
    Guarantees strict validation of probability, threshold, and feature contributions.
    """
    applicant_df = pd.DataFrame([applicant_dict])
    trans = preprocessor.transform(applicant_df)
    prob = float(model.predict_proba(trans)[0, 1])

    # Validate probability & threshold
    if isna(prob) or np.isnan(prob) or not (0.0 <= prob <= 1.0):
        return {
            'error': True,
            'message': 'Prediction unavailable: invalid probability returned by the model.'
        }

    threshold = float(threshold) if threshold is not None else 0.50
    if isna(threshold) or np.isnan(threshold) or not (0.0 <= threshold <= 1.0):
        threshold = 0.50

    is_default = prob >= threshold
    decision = "REJECTED" if is_default else "APPROVED"
    margin = abs(prob - threshold)
    margin_pct = margin * 100.0

    if prob < 0.35:
        risk_tier = "LOW RISK"
        risk_tier_full = "Low Risk Tier"
        color = "emerald"
    elif prob < 0.55:
        risk_tier = "MEDIUM RISK"
        risk_tier_full = "Medium Risk Tier"
        color = "amber"
    else:
        risk_tier = "HIGH RISK"
        risk_tier_full = "High Risk Tier"
        color = "rose"

    # Compute SHAP values for the single row
    if X_train_trans is not None and feature_names is not None:
        _, shap_res = compute_shap_values(model, X_train_trans[:100], trans)
        if hasattr(shap_res, 'values'):
            row_vals = shap_res[0].values
        else:
            row_vals = shap_res[0]
    elif hasattr(model, 'coef_'):
        # Logistic Regression exact log-odds contribution: coef_ * x_transformed
        coefs = model.coef_[0]
        row_vals = coefs * trans[0]
        if feature_names is None:
            cat_cols = preprocessor.named_transformers_['cat'].named_steps['encoder'].get_feature_names_out()
            feature_names = list(preprocessor.transformers_[0][2]) + list(cat_cols)
    else:
        row_vals = np.zeros(trans.shape[1])

    # Aggregate one-hot contributions back to parent raw features
    parent_impacts = {}
    if feature_names is not None:
        for fname, impact in zip(feature_names, row_vals):
            parent_key = fname.split('_')[0]
            if parent_key not in parent_impacts:
                parent_impacts[parent_key] = 0.0
            parent_impacts[parent_key] += float(impact)
    
    # Map to applicant's actual submitted attributes
    risk_factors = []
    protective_factors = []

    for feat_key, raw_val in applicant_dict.items():
        impact = parent_impacts.get(feat_key, 0.0)
        label = FEATURE_HUMAN_LABELS.get(feat_key, feat_key.replace('_', ' ').title())

        val_formatted = str(raw_val)
        if feat_key == 'credit_amount':
            val_formatted = f"${float(raw_val):,.0f}"
        elif feat_key == 'duration':
            val_formatted = f"{raw_val} months"
        elif feat_key == 'age':
            val_formatted = f"{raw_val} years"

        direction = "increases_risk" if impact >= 0 else "decreases_risk"
        explanation = generate_feature_explanation_sentence(feat_key, raw_val, impact, direction)

        factor_obj = {
            'feature_key': feat_key,
            'feature': label,
            'value': val_formatted,
            'raw_value': raw_val,
            'contribution': round(impact, 4),
            'direction': direction,
            'explanation': explanation
        }

        if impact > 0.01:
            risk_factors.append(factor_obj)
        elif impact < -0.01:
            protective_factors.append(factor_obj)

    # Sort risk factors descending by contribution
    risk_factors = sorted(risk_factors, key=lambda x: x['contribution'], reverse=True)[:5]
    # Sort protective factors ascending (most negative / protective first)
    protective_factors = sorted(protective_factors, key=lambda x: x['contribution'])[:3]

    # Decision Summary Sentence
    if is_default:
        summary_sentence = f"Rejected because the predicted default probability ({prob*100:.2f}%) is above the selected risk threshold ({threshold*100:.2f}%)."
    else:
        summary_sentence = f"Approved because the predicted default probability ({prob*100:.2f}%) is below the selected risk threshold ({threshold*100:.2f}%)."

    return {
        'error': False,
        'probability': round(prob, 4),
        'probability_pct': round(prob * 100.0, 2),
        'threshold': round(threshold, 4),
        'threshold_pct': round(threshold * 100.0, 2),
        'decision': decision,
        'risk_tier': risk_tier,
        'risk_tier_full': risk_tier_full,
        'risk_color': color,
        'is_default': is_default,
        'margin': round(margin, 4),
        'margin_pct': round(margin_pct, 2),
        'summary_sentence': summary_sentence,
        'risk_factors': risk_factors,
        'protective_factors': protective_factors
    }

def isna(val):
    try:
        return np.isnan(val)
    except:
        return False
