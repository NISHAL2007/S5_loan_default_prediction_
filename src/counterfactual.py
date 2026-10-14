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
    # Ensure all 20 required features exist before transformation
    default_vals = {
        'duration': 18.0, 'credit_amount': 2319.5, 'installment_commitment': 3.0,
        'residence_since': 3.0, 'age': 33.0, 'existing_credits': 1.0, 'num_dependents': 1.0,
        'checking_status': 'no checking', 'credit_history': 'existing paid',
        'purpose': 'radio/tv', 'savings_status': '<100', 'employment': '1<=X<4',
        'personal_status': 'male single', 'other_parties': 'none',
        'property_magnitude': 'car', 'other_payment_plans': 'none',
        'housing': 'own', 'job': 'skilled', 'own_telephone': 'none', 'foreign_worker': 'yes'
    }
    clean_dict = {**default_vals, **{k: v for k, v in applicant_dict.items() if k != 'target'}}
    
    base_df = pd.DataFrame([clean_dict])
    base_trans = preprocessor.transform(base_df)
    base_prob = float(model.predict_proba(base_trans)[0, 1])
    is_default = base_prob >= threshold
    
    if not is_default:
        return {
            'original_prob': round(base_prob, 4),
            'original_decision': 'APPROVED',
            'threshold': threshold,
            'status': 'Already Approved',
            'message': f"Borrower default probability ({base_prob*100:.1f}%) is already below policy threshold ({threshold*100:.0f}%). No counterfactual recourse needed.",
            'citation': 'Based on counterfactual explanations (Wachter et al., 2017) using single/dual feature parameter search.',
            'counterfactuals': []
        }
        
    # Actionable financial candidates (age excluded as immutable protected attribute)
    candidates = [
        {'feature': 'credit_amount', 'direction': -1, 'label': 'Credit Amount'},
        {'feature': 'duration', 'direction': -1, 'label': 'Loan Duration (Months)'}
    ]
    
    counterfactual_results = []
    
    # 1. Numeric Feature Search (Credit Amount, Duration)
    for cand in candidates:
        feat = cand['feature']
        orig_val = float(clean_dict[feat])
        direction = cand['direction']
        
        steps = np.arange(step_pct, max_pct_change + step_pct / 2, step_pct)
        for pct in steps:
            adj_factor = 1.0 + (direction * (pct / 100.0))
            new_val = orig_val * adj_factor
            
            if new_val <= 0:
                continue
                
            test_row = clean_dict.copy()
            test_row[feat] = new_val
            
            test_trans = preprocessor.transform(pd.DataFrame([test_row]))
            new_prob = float(model.predict_proba(test_trans)[0, 1])
            
            if new_prob < threshold:
                action_str = "Reducing" if direction < 0 else "Increasing"
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
                    'summary': f"{action_str} {cand['label']} by {pct:.1f}% (from {orig_val:,.0f} to {new_val:,.0f}) reduces default risk from {base_prob*100:.1f}% to {new_prob*100:.1f}% (Flips decision to APPROVED)."
                })
                break

    # 2. Actionable Categorical Recourse (Savings Status / Checking Status improvement)
    if clean_dict.get('savings_status') in ['<100', '100<=X<500', 'no known savings']:
        for better_savings in ['>=1000', '500<=X<1000']:
            test_row = clean_dict.copy()
            test_row['savings_status'] = better_savings
            test_trans = preprocessor.transform(pd.DataFrame([test_row]))
            new_prob = float(model.predict_proba(test_trans)[0, 1])
            if new_prob < threshold:
                orig_s = clean_dict.get('savings_status', '<100')
                counterfactual_results.append({
                    'type': 'Single Feature (Categorical)',
                    'feature': 'savings_status',
                    'feature_label': 'Savings Account Balance',
                    'pct_change': 0,
                    'original_value': f"savings_status: {orig_s}",
                    'new_value': f"savings_status: {better_savings}",
                    'original_prob': round(base_prob, 4),
                    'new_prob': round(new_prob, 4),
                    'flipped': True,
                    'summary': f"Increasing verified liquid savings buffer to {better_savings} reduces default risk from {base_prob*100:.1f}% to {new_prob*100:.1f}% (Flips decision to APPROVED)."
                })
                break

    # 3. Dual Feature Search (Joint reduction of credit_amount AND duration)
    orig_credit = float(clean_dict['credit_amount'])
    orig_duration = float(clean_dict['duration'])
    
    steps = np.arange(step_pct, max_pct_change + step_pct / 2, step_pct)
    for pct in steps:
        new_credit = orig_credit * (1.0 - (pct / 100.0))
        new_duration = max(4.0, orig_duration * (1.0 - (pct / 100.0)))
        
        test_row = clean_dict.copy()
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
                'original_value': f"Credit: ${orig_credit:,.0f}, Duration: {orig_duration:.0f}m",
                'new_value': f"Credit: ${new_credit:,.0f}, Duration: {new_duration:.0f}m",
                'original_prob': round(base_prob, 4),
                'new_prob': round(new_prob, 4),
                'flipped': True,
                'summary': f"Jointly restructuring Credit Amount and Loan Duration by -{pct:.1f}% reduces default probability from {base_prob*100:.1f}% to {new_prob*100:.1f}% (Flips decision to APPROVED)."
            })
            break

    status_msg = "Recourse found" if len(counterfactual_results) > 0 else "No single or dual feature adjustment within reasonable bounds flipped the decision."
    
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
