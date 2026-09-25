import numpy as np
import pandas as pd

def generate_counterfactual_explanations(model, preprocessor, applicant_dict, threshold=0.50, max_pct_change=50.0, step_pct=1.0):
    """
    Computes Counterfactual Explanations based on Wachter et al. (2017).
    Performs a single and dual-feature parameter search over realistic numeric attributes 
    (credit_amount, duration, age) to find the minimum percentage adjustment 
    required to flip a 'Default' prediction to 'No Default'.
    
    Returns:
    - original_prob: Base default probability
    - original_decision: Original classification outcome (Default vs No Default)
    - counterfactuals: List of actionable recourse suggestions
    """
    base_df = pd.DataFrame([applicant_dict])
    base_trans = preprocessor.transform(base_df)
    base_prob = float(model.predict_proba(base_trans)[0, 1])
    is_default = base_prob >= threshold
    
    if not is_default:
        return {
            'original_prob': round(base_prob, 4),
            'original_decision': 'No Default',
            'threshold': threshold,
            'status': 'Already Approved',
            'message': f"Borrower is already classified as 'No Default' (Probability: {base_prob*100:.1f}% < Threshold {threshold*100:.0f}%). No counterfactual recourse needed.",
            'counterfactuals': []
        }
        
    candidates = [
        {'feature': 'credit_amount', 'direction': -1, 'label': 'Credit Amount ($)'},
        {'feature': 'duration', 'direction': -1, 'label': 'Loan Duration (Months)'},
        {'feature': 'age', 'direction': 1, 'label': 'Age (Years)'}
    ]
    
    counterfactual_results = []
    
    # 1. Single Feature Search
    for cand in candidates:
        feat = cand['feature']
        if feat not in applicant_dict:
            continue
            
        orig_val = float(applicant_dict[feat])
        direction = cand['direction']
        
        steps = np.arange(step_pct, max_pct_change + step_pct / 2, step_pct)
        for pct in steps:
            adj_factor = 1.0 + (direction * (pct / 100.0))
            new_val = orig_val * adj_factor
            
            if new_val <= 0:
                continue
                
            test_row = applicant_dict.copy()
            test_row[feat] = new_val
            
            test_trans = preprocessor.transform(pd.DataFrame([test_row]))
            new_prob = float(model.predict_proba(test_trans)[0, 1])
            
            if new_prob < threshold:
                action_str = "Decreasing" if direction < 0 else "Increasing"
                counterfactual_results.append({
                    'type': 'Single Feature',
                    'feature': feat,
                    'feature_label': cand['label'],
                    'pct_change': round(pct, 1),
                    'original_value': round(orig_val, 2),
                    'new_value': round(new_val, 2),
                    'original_prob': round(base_prob, 4),
                    'new_prob': round(new_prob, 4),
                    'flipped': True,
                    'summary': f"{action_str} {cand['label']} by {pct:.1f}% (from {orig_val:.0f} to {new_val:.0f}) reduces default risk from {base_prob*100:.1f}% to {new_prob*100:.1f}% (Flips decision to APPROVED)."
                })
                break
                
    # 2. Dual Feature Search (e.g. credit_amount AND duration)
    if 'credit_amount' in applicant_dict and 'duration' in applicant_dict:
        orig_credit = float(applicant_dict['credit_amount'])
        orig_duration = float(applicant_dict['duration'])
        
        steps = np.arange(step_pct, max_pct_change + step_pct / 2, step_pct)
        for pct in steps:
            new_credit = orig_credit * (1.0 - (pct / 100.0))
            new_duration = orig_duration * (1.0 - (pct / 100.0))
            
            test_row = applicant_dict.copy()
            test_row['credit_amount'] = new_credit
            test_row['duration'] = new_duration
            
            test_trans = preprocessor.transform(pd.DataFrame([test_row]))
            new_prob = float(model.predict_proba(test_trans)[0, 1])
            
            if new_prob < threshold:
                counterfactual_results.append({
                    'type': 'Dual Feature',
                    'feature': 'credit_amount + duration',
                    'feature_label': 'Credit Amount & Loan Duration',
                    'pct_change': round(pct, 1),
                    'original_value': f"Credit: ${orig_credit:.0f}, Duration: {orig_duration:.0f}m",
                    'new_value': f"Credit: ${new_credit:.0f}, Duration: {new_duration:.0f}m",
                    'original_prob': round(base_prob, 4),
                    'new_prob': round(new_prob, 4),
                    'flipped': True,
                    'summary': f"Jointly reducing Credit Amount and Loan Duration by {pct:.1f}% reduces default probability from {base_prob*100:.1f}% to {new_prob*100:.1f}% (Flips decision to APPROVED)."
                })
                break

    status_msg = "Recourse found" if len(counterfactual_results) > 0 else "No single or dual feature change within bounds flipped the decision."
    
    return {
        'original_prob': round(base_prob, 4),
        'original_decision': 'Default',
        'threshold': threshold,
        'status': status_msg,
        'citation': 'Based on counterfactual explanations (Wachter et al., 2017) using single/dual feature parameter search.',
        'counterfactuals': counterfactual_results
    }

if __name__ == '__main__':
    import joblib
    artifacts = joblib.load('models/best_model_pipeline.pkl')
    model = artifacts['best_model']
    preprocessor = artifacts['preprocessor']
    X_test_raw = artifacts['X_test_raw']
    
    print("Testing counterfactual engine across test set applicants:")
    found_count = 0
    for idx in range(len(X_test_raw)):
        applicant = X_test_raw.iloc[idx].to_dict()
        res = generate_counterfactual_explanations(model, preprocessor, applicant)
        if res['original_decision'] == 'Default' and len(res['counterfactuals']) > 0:
            found_count += 1
            print(f"\nApplicant Index {idx} | Base Prob: {res['original_prob']*100:.1f}% | Recourse Found:")
            for cf in res['counterfactuals']:
                print(f"   [{cf['type']}] {cf['summary']}")
            if found_count >= 3:
                break
