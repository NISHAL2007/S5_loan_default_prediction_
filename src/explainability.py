import numpy as np
import pandas as pd
import shap
import matplotlib.pyplot as plt

def get_shap_explainer(model, X_train):
    """
    Creates a SHAP explainer for the trained model.
    Handles LinearExplainer (Logistic Regression), TreeExplainer (RF, XGBoost), or generic Explainer.
    """
    if hasattr(model, 'coef_'):
        # Logistic Regression
        explainer = shap.LinearExplainer(model, X_train)
    else:
        # Tree-based models
        explainer = shap.TreeExplainer(model)
    return explainer

def compute_shap_values(model, X_train, X_data):
    """
    Computes SHAP values for given dataset X_data.
    """
    explainer = get_shap_explainer(model, X_train)
    shap_values = explainer(X_data)
    
    # Handle multi-class / 2D output if necessary
    if hasattr(shap_values, 'values') and len(shap_values.values.shape) == 3:
        # Binary classification class 1 (default)
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

if __name__ == '__main__':
    import joblib
    artifacts = joblib.load('models/best_model_pipeline.pkl')
    model = artifacts['best_model']
    X_train = artifacts['preprocessor'].transform(artifacts['X_train_raw'])
    X_test = artifacts['preprocessor'].transform(artifacts['X_test_raw'])
    feature_names = artifacts['feature_names']
    
    explainer, shap_values = compute_shap_values(model, X_train, X_test[:10])
    print("SHAP values computed successfully!")
    print("SHAP values shape:", shap_values.shape)
    
    local_summary = get_local_explanation_summary(shap_values[0], feature_names)
    print("\nLocal SHAP Summary for Applicant 0:")
    print("Factors Increasing Default Risk:", local_summary['risk_increasing'])
    print("Factors Reducing Default Risk:", local_summary['risk_reducing'])
