import joblib
import json

artifacts = joblib.load('models/best_model_pipeline.pkl')
preprocessor = artifacts['preprocessor']
model = artifacts['best_model']
X_test_raw = artifacts['X_test_raw']

samples = []
for idx in range(min(30, len(X_test_raw))):
    row = X_test_raw.iloc[idx].to_dict()
    trans = preprocessor.transform(X_test_raw.iloc[[idx]])
    prob = float(model.predict_proba(trans)[0, 1])
    samples.append({
        'index': idx,
        'applicant': row,
        'default_prob': round(prob, 4),
        'label': f"Applicant {idx} (Age: {row.get('age')}, Credit: ${row.get('credit_amount')}, Risk Prob: {prob*100:.1f}%)"
    })

with open('data/sample_30_applicants.json', 'w') as f:
    json.dump(samples, f, indent=2)

print("Saved 30 sample test applicants to data/sample_30_applicants.json")
