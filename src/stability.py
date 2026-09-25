import numpy as np
import pandas as pd

def run_prediction_stability_analysis(model, preprocessor, applicant_row, numeric_features=['credit_amount', 'duration', 'age']):
    """
    Performs Prediction Stability Analysis on a single applicant row.
    Perturbs selected numeric features by -5% and +5%, holding other features constant,
    and measures the change in predicted default probability.
    """
    # 1. Base prediction
    base_df = pd.DataFrame([applicant_row])
    base_trans = preprocessor.transform(base_df)
    base_prob = model.predict_proba(base_trans)[0, 1]
    
    perturbation_records = []
    abs_changes = []
    
    for feat in numeric_features:
        if feat not in applicant_row:
            continue
        orig_val = applicant_row[feat]
        
        # Perturbations: -5%, Original, +5%
        percentages = [-5.0, 0.0, 5.0]
        for p in percentages:
            if p == 0.0:
                continue # Original scenario reference
            
            perturbed_val = orig_val * (1.0 + p / 100.0)
            
            # Create perturbed copy
            row_copy = applicant_row.copy()
            row_copy[feat] = perturbed_val
            
            trans_copy = preprocessor.transform(pd.DataFrame([row_copy]))
            new_prob = model.predict_proba(trans_copy)[0, 1]
            diff = new_prob - base_prob
            abs_changes.append(abs(diff))
            
            scenario_name = f"{feat} ({p:+.0f}%)"
            perturbation_records.append({
                'Scenario': scenario_name,
                'Feature Changed': feat,
                'Perturbation (%)': f"{p:+.0f}%",
                'Original Value': round(orig_val, 2),
                'New Value': round(perturbed_val, 2),
                'Original Default Prob': round(base_prob, 4),
                'New Default Prob': round(new_prob, 4),
                'Probability Difference': round(diff, 4),
                'Abs Change': round(abs(diff), 4)
            })
            
    df_perturb = pd.DataFrame(perturbation_records)
    
    # Calculate Project-Level Stability Score
    if len(abs_changes) > 0:
        avg_abs_change = np.mean(abs_changes)
        raw_score = 100.0 - (avg_abs_change * 100.0)
        stability_score = max(0.0, min(100.0, round(raw_score, 2)))
    else:
        avg_abs_change = 0.0
        stability_score = 100.0
        
    if stability_score >= 85.0:
        classification = "Highly Stable"
        color = "green"
    elif stability_score >= 60.0:
        classification = "Stable"
        color = "orange"
    else:
        classification = "Sensitive"
        color = "red"
        
    return {
        'base_probability': round(base_prob, 4),
        'perturbation_table': df_perturb,
        'stability_score': stability_score,
        'average_abs_change': round(avg_abs_change, 4),
        'classification': classification,
        'classification_color': color
    }

if __name__ == '__main__':
    import joblib
    artifacts = joblib.load('models/best_model_pipeline.pkl')
    model = artifacts['best_model']
    preprocessor = artifacts['preprocessor']
    X_test_raw = artifacts['X_test_raw']
    
    sample_applicant = X_test_raw.iloc[0].to_dict()
    res = run_prediction_stability_analysis(model, preprocessor, sample_applicant)
    
    print("--- PREDICTION STABILITY ANALYSIS RESULTS ---")
    print("Base Default Probability:", res['base_probability'])
    print("Project-Level Stability Score:", res['stability_score'], f"({res['classification']})")
    print("Average Absolute Probability Change:", res['average_abs_change'])
    print("\nPerturbation Table:")
    print(res['perturbation_table'][['Scenario', 'Original Value', 'New Value', 'Original Default Prob', 'New Default Prob', 'Probability Difference']].to_string(index=False))
