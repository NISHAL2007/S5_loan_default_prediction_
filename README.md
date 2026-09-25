# Loan Default Prediction with Explainability & Prediction Stability Analysis

A demonstrative, working machine learning application built for an individual **Semester-5 Computer Science Mini Project**.

## 📌 Project Overview
This project builds a credit risk assessment pipeline to predict loan default probabilities on the **German Credit Dataset** (1,000 records, 20 features). It compares three classifiers (**Logistic Regression**, **Random Forest**, and **XGBoost**) and implements:
1. **Model Explainability (SHAP)**: Global feature summary & local waterfall plots explaining individual credit decisions.
2. **Prediction Stability Analysis**: Stress-testing model robustness by perturbing numeric features (`credit_amount`, `duration`, `age`) by ±5% and calculating a transparent **Project-Level Stability Indicator**.
3. **Business Threshold Slider**: Interactive threshold adjustment demonstrating credit risk management decision-making.

---

## 🏗️ Folder Structure
```
credit-risk-project/
├── data/
│   └── german_credit.csv      # Raw dataset (1,000 rows, 21 columns)
├── src/
│   ├── preprocessing.py       # Scikit-learn ColumnTransformer pipeline & train/test splitting
│   ├── evaluate.py            # Evaluation metrics (Recall, ROC-AUC, PR-AUC, Confusion Matrix)
│   ├── train_models.py        # Model training script & artifact saving
│   ├── explainability.py      # SHAP global & local explanation generators
│   └── stability.py           # Feature perturbation simulator & Stability Indicator score
├── models/
│   ├── best_model_pipeline.pkl# Fitted preprocessor + best trained model
│   └── evaluation_results.json# Empirical model metrics matrix
├── app/
│   ├── Home.py                # Page 1: Overview KPIs & Performance Benchmark
│   └── pages/
│       ├── 2_Risk_Assessment.py # Page 2: Applicant Risk Form & Threshold Analysis
│       ├── 3_Explainability.py  # Page 3: Global & Local SHAP Visualizations
│       └── 4_Stability_Lab.py   # Page 4: Prediction Stability Simulator & Score
├── requirements.txt
└── README.md
```

---

## 🚀 How to Run the Project

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Train Models & Save Pipeline
```bash
python src/train_models.py
```

### 3. Launch Streamlit Dashboard
```bash
streamlit run app/Home.py
```

---

## 📊 Empirical Model Results Summary

| Model | Accuracy | Precision | Recall | F1-Score | ROC-AUC | PR-AUC |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression** | **0.7500** | **0.5581** | **0.8000** | **0.6575** | **0.8058** | **0.6215** |
| **Random Forest** | 0.7700 | 0.6167 | 0.6167 | 0.6167 | 0.8039 | 0.6212 |
| **XGBoost** | 0.7400 | 0.5690 | 0.5500 | 0.5593 | 0.7569 | 0.5926 |

*Selected Best Model*: **Logistic Regression** (selected based on Recall = 0.8000 and ROC-AUC = 0.8058 due to the high financial cost of missed defaulters / False Negatives).
