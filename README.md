# CrediFlow AI — Enterprise Credit Risk Decision-Support & Underwriting Automation Engine

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.4-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**CrediFlow AI** is an institutional-grade credit risk intelligence and automated underwriting decision-support platform. Built on the **German Credit Dataset** (1,000 applicant records, 20 predictors), the platform combines cost-sensitive machine learning, Platt probability calibration, explainable AI (SHAP), financial sensitivity stress-testing, and prescriptive counterfactual approval recourse into a unified executive underwriting workflow.

🔗 **Live Production Deployment**: [https://s5-loan-default-prediction.vercel.app](https://s5-loan-default-prediction.vercel.app)

---

## 📌 Executive Overview

Traditional retail banking credit underwriting typically requires **30 to 60 minutes per applicant**. Credit officers manually cross-reference dozens of applicant variables, interpret uncalibrated credit scores, stress-test borrower stability, evaluate restructuring scenarios, and compose formal risk memos for credit committees.

**CrediFlow AI** solves this operational bottleneck by providing an end-to-end **Autonomous Underwriting Engine** that processes complete multi-parameter assessments in **under 250 milliseconds**:

$$\text{Data Ingestion} \longrightarrow \text{Automated Validation} \longrightarrow \text{Calibrated Scoring} \longrightarrow \text{SHAP Rationale} \longrightarrow \text{Robustness Stress-Test} \longrightarrow \text{Prescriptive Recourse} \longrightarrow \text{Executive Dossier}$$

### ⏱️ Operational Impact
- **Single-Applicant Underwriting**: Accelerates comprehensive assessment from **45 minutes to < 250 milliseconds** (over 99% turnaround reduction).
- **High-Throughput Batch Triage**: Ingests and triages batches of **30 loan applications in ~380 ms** (~78–165 applications/sec throughput), saving **22.5 hours of manual underwriting labor** per batch.
- **Autonomous Triage Rate**: Categorizes **80%+ of incoming files** into *Fast-Track Approved* or *Declined*, escalating only boundary cases for senior underwriter review.
- **Prescriptive Counterfactual Recourse**: Automatically computes viable restructuring pathways (e.g. tenure or credit amount reductions) that transform borderline rejections into approved loans.

---

## 🏗️ System Architecture

```
                                  [ APPLICANT INGESTION ]
                       (Single Entry, Preset, or Batch Queue CSV)
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │    1. AUTOMATIC VALIDATION GUARD      │
                      │  Range, Schema & Anomaly Enforcement  │
                      └───────────────────┬───────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │    2. CORE INFERENCE & CALIBRATION    │
                      │  Platt Scaling (Brier Score: 0.1562)  │
                      └───────────────────┬───────────────────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            ▼                             ▼                             ▼
┌───────────────────────┐     ┌───────────────────────┐     ┌───────────────────────┐
│ 3. SHAP NARRATIVE     │     │ 4. FRAGILITY ENGINE   │     │ 5. COUNTERFACTUAL     │
│ Plain-English Driver  │     │ ±5% Perturbation      │     │ Minimum Viable Terms  │
│ Synthesis (Non-Causal)│     │ Sensitivity Testing   │     │ Approval Pathway      │
└───────────┬───────────┘     └───────────┬───────────┘     └───────────┬───────────┘
            │                             │                             │
            └─────────────────────────────┼─────────────────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │      6. SAFE LOAN CEILING SEARCH      │
                      │ Binary Optimization for Max Capacity  │
                      └───────────────────┬───────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │     7. EXECUTIVE UNDERWRITING MEMO    │
                      │  Audit-Ready Dossier & 1-Click Export │
                      └───────────────────────────────────────┘
```

---

## 🎯 Platform Capabilities

### 1. Autonomous Underwriting Cockpit (`/underwriting-cockpit`)
- **Single-Click Assessment**: Automates the full 7-step analysis in under a quarter of a second.
- **Preset Borrower Profiles**: Instant validation across diverse borrower segments (Prime Low-Risk, Borderline Restructure, High-Risk Overleveraged).
- **Dynamic Policy Risk Slider**: Real-time adjustment of underwriting risk tolerance ($\theta \in [0.30, 0.70]$).
- **Executive Audit Dossier**: Generates complete decision rationales, risk tier classifications, and exportable credit committee memos.

### 2. High-Throughput Batch Queue Triage (`/batch-triage`)
- Ingests bulk portfolios and triages applicants into:
  - 🟢 **Fast-Track Approved**: Low calibrated default probability ($< 35\%$).
  - 🟡 **Senior Officer Review Required**: Boundary condition or elevated fragility index.
  - 🔴 **Declined**: Severe multi-factor risk exposure.
- Real-time productivity indicators: Execution latency, manual hours saved, throughput rate, and filterable queue table with 1-click drilldown.

### 3. Prescriptive Counterfactual Recourse (Wachter et al., 2017)
- Rather than a binary denial, the system calculates the **minimum viable parameter adjustment** (e.g., tenure reduction from 27m to 14m or joint $32\%$ balance reduction) to cross below the approval threshold.

### 4. Natural Language SHAP Explainability
- Translates high-dimensional SHAP log-odds feature attributions into natural language sentences, identifying the top adverse risk drivers and mitigating strengths without confusing non-technical stakeholders.

### 5. Prediction Robustness & Fragility Index
- Simulates financial volatility by perturbing numerical features (`credit_amount`, `duration`, `age`) by $\pm 5\%$. Assigns a quantifiable **Stability Score** (0–100) and badges profiles as `ROBUST`, `MODERATE`, or `FRAGILE`.

---

## 📊 Empirical Model Performance Benchmark

Models evaluated on the 20% test split (200 records: 140 Good / 60 Bad) of the UCI German Credit Dataset using leak-free preprocessing (Median + StandardScaler for numericals, Most-frequent + OneHotEncoder with `handle_unknown='ignore'` for categoricals, fitted strictly on training data).

Model selection utilizes a **Cost-Sensitive Composite Metric** ($50\%\text{ Recall} + 50\%\text{ ROC-AUC}$) to prioritize default detection (avoiding capital loss):

| Model Name | Accuracy | Precision | Recall (Sensitivity) | F1-Score | ROC-AUC | PR-AUC | Composite Metric ($0.5\text{Rec} + 0.5\text{AUC}$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression (Selected)** | **0.7500** | **0.5581** | **0.8000** | **0.6575** | **0.8058** | **0.6215** | **0.8029** |
| **Random Forest Classifier** | 0.7700 | 0.6167 | 0.6167 | 0.6167 | 0.8039 | 0.6212 | 0.7103 |
| **XGBoost Classifier** | 0.7400 | 0.5690 | 0.5500 | 0.5593 | 0.7569 | 0.5926 | 0.6535 |

### ⚖️ Probability Calibration
- **Uncalibrated Brier Score**: `0.1824`
- **Platt Calibrated Brier Score**: `0.1562` (Lower is better; confirms predicted default probabilities reflect empirical default frequencies).

---

## 🛡️ Responsible AI & Governance Framework

1. **AI-Assisted Decision Support**: CrediFlow AI assists and accelerates human underwriters; it does not claim to make unilateral, unmonitored lending decisions.
2. **Non-Causal Interpretability**: SHapley Additive exPlanations (SHAP) represent statistical feature attribution within the model's decision surface; they are never misconstrued as physical real-world causation.
3. **No 100% Certainty Claims**: The system predicts statistical risk probabilities based on historical patterns, strictly acknowledging data uncertainty.

---

## 🛠️ Tech Stack

- **Backend & ML Engine**: Python 3.11+, FastAPI, Uvicorn, scikit-learn, SHAP, NumPy, Pandas, Joblib.
- **Frontend & Dashboard**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
- **Data Benchmark**: UCI German Credit Dataset (1,000 applicants, 20 predictors).

---

## 🚀 Quickstart & Local Setup

### 1. Clone & Prerequisites
```bash
git clone https://github.com/NISHAL2007/S5_loan_default_prediction_.git
cd S5_loan_default_prediction_
```

### 2. Start Backend Engine
```bash
# Install Python dependencies
pip install -r requirements.txt

# Launch FastAPI engine on port 8000
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

### 3. Start Frontend Dashboard
```bash
cd frontend

# Install Node dependencies
npm install

# Run Next.js dev server on port 3000
npm run dev
```

Visit **`http://localhost:3000`** in your browser.
