import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier

from preprocessing import prepare_data
from evaluate import compute_metrics, print_evaluation_summary

def train_and_evaluate():
    print("--- STEP 1 & 2: Preparing Dataset and Preprocessing Pipeline ---")
    data = prepare_data('data/german_credit.csv')
    
    X_train = data['X_train']
    X_test = data['X_test']
    y_train = data['y_train']
    y_test = data['y_test']
    
    # Define 3 Models with class balancing to handle ~30% minority default class
    models = {
        'Logistic Regression': LogisticRegression(
            class_weight='balanced', max_iter=1000, random_state=42
        ),
        'Random Forest': RandomForestClassifier(
            n_estimators=100, class_weight='balanced', random_state=42
        ),
        'XGBoost': XGBClassifier(
            n_estimators=100, scale_pos_weight=70/30, eval_metric='logloss', random_state=42
        )
    }
    
    results = {}
    fitted_models = {}
    
    print("\n--- STEP 3 & 4: Training Models and Computing Metrics ---")
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]
        
        metrics = compute_metrics(y_test, y_pred, y_prob)
        results[name] = metrics
        fitted_models[name] = model
        print(f"  {name} -> ROC-AUC: {metrics['ROC-AUC']}, Recall: {metrics['Recall']}, PR-AUC: {metrics['PR-AUC']}")
    
    summary_df = print_evaluation_summary(results)
    print("\nModel Comparison Table:")
    print(summary_df.to_string(index=False))
    
    # Model Selection: Prioritize Recall + ROC-AUC (Asymmetric cost of False Negatives)
    best_name = max(results, key=lambda k: 0.5 * results[k]['Recall'] + 0.5 * results[k]['ROC-AUC'])
    best_model = fitted_models[best_name]
    print(f"\n---> BEST SELECTED MODEL: {best_name} (Selection composite metric: Recall + ROC-AUC)")
    
    # Save artifacts
    os.makedirs('models', exist_ok=True)
    
    artifacts = {
        'best_model': best_model,
        'best_model_name': best_name,
        'preprocessor': data['preprocessor'],
        'feature_names': data['feature_names'],
        'num_cols': data['num_cols'],
        'cat_cols': data['cat_cols'],
        'X_test_raw': data['X_test_raw'],
        'X_train_raw': data['X_train_raw'],
        'y_test': y_test,
        'y_train': y_train
    }
    
    joblib.dump(artifacts, 'models/best_model_pipeline.pkl')
    
    # Save metrics JSON for Streamlit dashboard
    eval_json = {
        'models': results,
        'best_model_name': best_name,
        'total_records': len(data['X_train_raw']) + len(data['X_test_raw']),
        'default_rate': float(round((y_train.sum() + y_test.sum()) / (len(y_train) + len(y_test)), 4))
    }
    
    with open('models/evaluation_results.json', 'w') as f:
        json.dump(eval_json, f, indent=4)
        
    print("Saved trained model, preprocessor, and metrics to models/")
    return summary_df, best_name

if __name__ == '__main__':
    train_and_evaluate()
