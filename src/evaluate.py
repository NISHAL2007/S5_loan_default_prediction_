import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, precision_recall_curve, auc, confusion_matrix
)

def compute_metrics(y_true, y_pred, y_prob):
    """
    Computes comprehensive evaluation metrics for classification.
    
    Note on Metric Selection for Credit Risk / Loan Default Prediction:
    - Accuracy is misleading due to class imbalance (70% good / 30% default). A dummy model predicting all 'good' gets 70% accuracy.
    - Recall (Sensitivity) measures the percentage of actual defaulters correctly identified. A False Negative (approving a loan to a borrower who defaults) costs the lender significant financial capital.
    - False Positive (rejecting a good borrower) costs only lost interest income.
    - PR-AUC (Precision-Recall Area Under Curve) evaluates performance on the minority default class much better than standard ROC-AUC when imbalance exists.
    """
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_true, y_prob)
    
    # Calculate PR-AUC
    precision_curve, recall_curve, _ = precision_recall_curve(y_true, y_prob)
    pr_auc = auc(recall_curve, precision_curve)
    
    cm = confusion_matrix(y_true, y_pred).tolist()
    
    return {
        'Accuracy': round(acc, 4),
        'Precision': round(prec, 4),
        'Recall': round(rec, 4),
        'F1-Score': round(f1, 4),
        'ROC-AUC': round(roc_auc, 4),
        'PR-AUC': round(pr_auc, 4),
        'Confusion_Matrix': cm
    }

def print_evaluation_summary(metrics_dict):
    """
    Prints a clean comparison table of model evaluation metrics.
    """
    table_data = []
    for model_name, metrics in metrics_dict.items():
        table_data.append({
            'Model': model_name,
            'Accuracy': metrics['Accuracy'],
            'Precision': metrics['Precision'],
            'Recall': metrics['Recall'],
            'F1-Score': metrics['F1-Score'],
            'ROC-AUC': metrics['ROC-AUC'],
            'PR-AUC': metrics['PR-AUC']
        })
    df_results = pd.DataFrame(table_data)
    return df_results
