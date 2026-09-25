import joblib
import pandas as pd
from counterfactual import generate_counterfactual_explanations

artifacts = joblib.load('models/best_model_pipeline.pkl')
model = artifacts['best_model']
preprocessor = artifacts['preprocessor']
X_test_raw = artifacts['X_test_raw']

print("Testing Counterfactual Explanations on first 20 test applicants:")
for idx in range(20):
    applicant = X_test_raw.iloc[idx].to_dict()
    trans = preprocessor.transform(pd.DataFrame([applicant]))
    prob = float(model.predict_proba(trans)[0, 1])
    res = generate_counterfactual_explanations(model, preprocessor, applicant, threshold=0.50)
    cfs = res.get('counterfactuals', [])
    print(f"Applicant {idx:2d} | P(Default): {prob:.4f} ({'DEFAULT' if prob >= 0.50 else 'APPROVED'}) | Recourses found: {len(cfs)}")
    for cf in cfs:
        print(f"   -> [{cf['type']}] {cf['summary']}")
