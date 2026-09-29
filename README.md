# CreditRisk AI — Loan Default Prediction Engine with Explainable AI & Governance

[![Live Demo](https://img.shields.io/badge/Live%20Application-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://s5-loan-default-prediction.vercel.app)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.4-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)

**CreditRisk AI** is an enterprise-grade machine learning application designed for evaluating credit borrower default risk on historical credit data. Built on the **German Credit Dataset** (1,000 applicant records, 20 features), the application combines cost-sensitive model evaluation, granular **SHAP (SHapley Additive exPlanations)** attribution, dynamic underwriting threshold policy governance, prediction stability stress-testing, and counterfactual "what-if" analysis.

🔗 **Live Deployed Application**: [https://s5-loan-default-prediction.vercel.app](https://s5-loan-default-prediction.vercel.app)

---

## 🌟 Key Application Features

- **🌐 Live Production Web Dashboard**: Responsive Next.js 15 frontend with interactive Recharts data visualizations, policy sliders, and decision logic flow diagrams.
- **🎯 Cost-Sensitive Model Optimization**: Models optimized using a composite selection metric ($50\%\text{ Recall} + 50\%\text{ ROC-AUC}$) to minimize high-cost False Negatives (approving a borrower who defaults).
- **🔬 Safe SHAP Parent Feature Mapping**: Aggregates one-hot encoded SHAP log-odds contributions back to original applicant features without string splitting errors or non-existent physical causality claims.
- **⚖️ Probability Calibration & Brier Score**: Evaluates probability calibration (Uncalibrated Brier Score `0.1824` vs Platt Calibrated `0.1562`), formally distinguishing discrimination from calibration.
- **🧪 Stability Analysis Lab**: Stress-tests model robustness by perturbing numerical features (`credit_amount`, `duration`, `age`) by $\pm 5\%$ and computing a project-defined **Project Stability Score**.
- **🔄 Counterfactual "What-If" Analysis**: Interactive simulator identifying minimal attribute adjustments required to turn a credit rejection into an approval.

---

## 📊 Empirical Model Performance Benchmark

Models evaluated on the 20% test split (200 records: 140 Good / 60 Bad) of the German Credit Dataset:

| Model Name | Accuracy | Precision | Recall (Sensitivity) | F1-Score | ROC-AUC | PR-AUC | Composite Selection Metric ($0.5\text{Rec} + 0.5\text{AUC}$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression (Selected Best)** | **0.7500** | **0.5581** | **0.8000** | **0.6575** | **0.8058** | **0.6215** | **0.8029** |
| **Random Forest Classifier** | 0.7700 | 0.6167 | 0.6167 | 0.6167 | 0.8039 | 0.6212 | 0.7103 |
| **XGBoost Classifier** | 0.7400 | 0.5690 | 0.5500 | 0.5593 | 0.7569 | 0.5926 | 0.6535 |

> **Selection Rationale**: Logistic Regression achieved the highest Recall (**80.00%**, capturing 48 out of 60 defaulters) and ROC-AUC (**0.8058**). Missing a defaulter costs principal capital, making Recall prioritized over raw accuracy.

---

## 📐 Mathematical Framework

### 1. Predicted Default Probability
$$\hat{P}(Y=1 \mid X) = \frac{1}{1 + e^{-(W^T \mathbf{x}_{trans} + b)}}$$

### 2. Credit Decision Classification Rule
$$\text{Decision} = \begin{cases} \text{REJECTED}, & \text{if } \hat{P}(Y=1 \mid X) \ge \theta \\ \text{APPROVED}, & \text{if } \hat{P}(Y=1 \mid X) < \theta \end{cases}$$
*(where $\theta \in [0.30, 0.70]$ represents the credit policy risk threshold, default $\theta = 0.50$)*

### 3. Probability Calibration (Brier Score)
$$\text{BS} = \frac{1}{N} \sum_{i=1}^{N} (\hat{p}_i - y_i)^2$$

---

## 🏗️ Repository Architecture

```text
S5_loan_default_prediction/
├── backend/                  # FastAPI Backend API Server
│   └── app/
│       └── main.py           # REST endpoints (/predict, /stability, /counterfactual)
├── frontend/                 # Next.js 15 Web Frontend
│   ├── app/
│   │   ├── page.tsx          # Overview KPIs & Brier Calibration Dashboard
│   │   ├── risk-assessment/  # Applicant Risk Assessment & Explanation Card
│   │   ├── stability-lab/    # Sensitivity Stress-Testing Lab
│   │   ├── counterfactual/   # "What-If" Counterfactual Simulator
│   │   ├── explainability/   # Global SHAP Attribution Visualizations
│   │   └── components/       # Reusable UI Components (ExplanationCard, Nav)
│   └── lib/
│       └── sample_30_applicants.json # Audit-validated test borrower profiles
├── src/                      # Core Machine Learning & XAI Engine
│   ├── preprocessing.py      # ColumnTransformer pipeline & train/test split
│   ├── evaluate.py           # Evaluation metric computation
│   ├── train_models.py       # Model training & pipeline artifact persistence
│   ├── explainability.py     # Safe parent feature SHAP aggregation & natural language generator
│   ├── stability.py          # Numeric perturbation simulator & stability score
│   └── counterfactual.py     # Minimal change search algorithm
├── data/
│   └── german_credit.csv     # UCI German Credit Dataset (1,000 rows, 20 predictors)
├── models/
│   └── best_model_pipeline.pkl # Saved pipeline artifact
├── scratch/
│   └── run_full_validation.py  # 30-applicant automated correctness audit script
├── CreditRisk_AI_Project_Documentation.pdf   # Formatted PDF Project Report
├── CreditRisk_AI_Project_Documentation.docx  # Formatted Word (.docx) Report
├── requirements.txt
└── README.md
```

---

## 🚀 Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/NISHAL2007/S5_loan_default_prediction_.git
cd S5_loan_default_prediction_
```

### 2. Set Up Python Environment & Dependencies
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Train Machine Learning Models
```bash
python src/train_models.py
```

### 4. Run FastAPI Backend Server
```bash
python backend/app/main.py
```
*(Backend server runs at `http://localhost:8000`)*

### 5. Launch Next.js Frontend Development Server
```bash
cd frontend
npm install
npm run dev
```
*(Frontend application runs at `http://localhost:3000`)*

---

## 🧪 Automated System Correctness Audit

Run the internal validation utility to verify decision correctness and SHAP mapping across all 30 sample test applicants:

```bash
python scratch/run_full_validation.py
```

```text
================================================================================
STARTING FULL APPLICANT AUDIT (PRIORITY 8)
================================================================================

AUDIT SUMMARY:
Total Applicants Tested:   30
Correct Decisions:         30 / 30
Decision Mismatches:       0
Invalid Probabilities:     0
Invalid SHAP Explanations: 0
NaN Values Encountered:    0
================================================================================
ALL 30 APPLICANTS TESTED AND VERIFIED CORRECTLY!
```

---

## 📄 Comprehensive Project Documentation

The complete project report, mathematical proofs, and viva presentation script are available in formatted document formats:
- **PDF Version**: [`CreditRisk_AI_Project_Documentation.pdf`](./CreditRisk_AI_Project_Documentation.pdf)
- **Word Version**: [`CreditRisk_AI_Project_Documentation.docx`](./CreditRisk_AI_Project_Documentation.docx)

---

## 📝 License & Acknowledgments

Built for an Academic Computer Science Project. Dataset sourced from the **UCI Machine Learning Repository** (German Credit Dataset).
