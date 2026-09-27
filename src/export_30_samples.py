import os
import sys
sys.path.insert(0, os.path.abspath('src'))
import joblib
import json
import pandas as pd
from explainability import generate_structured_explanation

artifacts = joblib.load('models/best_model_pipeline.pkl')
preprocessor = artifacts['preprocessor']
model = artifacts['best_model']
X_test_raw = artifacts['X_test_raw']
feature_names = artifacts['feature_names']
X_train_trans = preprocessor.transform(artifacts['X_train_raw'])

samples = []
for idx in range(min(30, len(X_test_raw))):
    row = X_test_raw.iloc[idx].to_dict()
    trans = preprocessor.transform(X_test_raw.iloc[[idx]])
    prob = float(model.predict_proba(trans)[0, 1])
    status_label = "REJECTED" if prob >= 0.50 else "APPROVED"
    explanation = generate_structured_explanation(model, preprocessor, row, threshold=0.50, X_train_trans=X_train_trans, feature_names=feature_names)
    samples.append({
        'index': idx,
        'applicant': row,
        'default_prob': round(prob, 4),
        'status': status_label,
        'explanation': explanation,
        'label': f"Applicant #{idx+1:02d} | Age {row.get('age')} | ${row.get('credit_amount'):,} ({row.get('duration')}m) | Risk Prob: {prob*100:.1f}% [{status_label}]"
    })

os.makedirs('data', exist_ok=True)
with open('data/sample_30_applicants.json', 'w') as f:
    json.dump(samples, f, indent=2)

with open('frontend/lib/sample_30_applicants.json', 'w') as f:
    json.dump(samples, f, indent=2)

with open('frontend/app/lib/sample_30_applicants.json', 'w') as f:
    json.dump(samples, f, indent=2)

print("Saved 30 sample test applicants with explanations to data/ and frontend/lib!")
