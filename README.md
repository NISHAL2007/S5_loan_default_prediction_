# CrediFlow AI — Autonomous Credit Risk Decision-Support & Underwriting Automation Engine

[![HORIZON X 2K26](https://img.shields.io/badge/Hackathon-HORIZON%20X%202K26-FFB800?style=for-the-badge)](https://unstop.com/p/horizon-x-2k26-global-hackathon-2k26-innovation-hacks-1757170)
[![Track 05](https://img.shields.io/badge/Track%2005-AI%20for%20Productivity%20%26%20Automation-blue?style=for-the-badge)](#)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.4-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)

> **Track 05 Problem Statement**: *AI for Productivity & Automation — Build AI agents or intelligent automation systems that solve real-world workflow and productivity challenges.*

---

## 📌 Executive Summary

In traditional retail banking and microfinance institutions, evaluating a single borrower's credit application takes an experienced underwriter **30 to 60 minutes**. Loan officers must manually cross-reference 20+ disparate financial attributes, interpret black-box statistical scores, test sensitivity to financial shocks, explore restructuring alternatives, and draft formal risk memos for credit committees.

**CrediFlow AI** transforms this manual, fragmented process into an **Autonomous Underwriting Workflow Engine**. Built upon leak-free, cost-sensitive machine learning on the German Credit benchmark dataset, the system executes an end-to-end 7-step decision-support pipeline in **under 250 milliseconds**:

$$\text{Data Ingestion} \longrightarrow \text{Automated Validation} \longrightarrow \text{Calibrated Scoring} \longrightarrow \text{SHAP Rationale Synthesis} \longrightarrow \text{Robustness Stress-Test} \longrightarrow \text{Prescriptive Counterfactuals} \longrightarrow \text{Executive Dossier}$$

### ⏱️ Measurable Productivity & Automation Impact
- **Single-File Underwriting**: Compresses analysis time from **45 minutes to < 250 milliseconds** (over 99% latency reduction).
- **Batch Queue Triage**: Ingests and triages batches of **30 loan files in ~380 ms** (~78–165 applications/sec throughput), saving **22.5 hours of manual underwriting effort** per batch.
- **Autonomous Triage Rate**: Autonomously resolves **80%+ of applications** into *Fast-Track Approval* or *Decline*, escalating only genuine boundary cases for senior underwriter review.
- **Actionable Recourse**: Instead of a binary rejection, the counterfactual engine automatically derives prescriptive terms (e.g. tenure or loan amount reduction) to help borderline borrowers qualify for financing.

---

## 🏗️ System Workflow Architecture

```
                                  [ LOAN APPLICANT(S) ]
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

## 🎯 Key Capabilities & Technical Features

### 1. Autonomous Underwriting Cockpit (`/underwriting-cockpit`)
- **3 One-Click Demo Profiles**:
  - 🟢 **Prime Borrower (Low Risk)**: Demonstrates fast-track automated approval ($P(\text{Default}) \approx 12.5\%$, Highly Robust).
  - 🟡 **Borderline Applicant (Restructure Scenario)**: Demonstrates counterfactual recourse ($P(\text{Default}) \approx 58.3\%$, automatically restructured to $< 50\%$ approval via tenure adjustment).
  - 🔴 **High-Risk Overleveraged**: Demonstrates automated adverse risk mitigation ($P(\text{Default}) \approx 78.4\%$).
- **Dynamic Policy Risk Slider**: Adjust bank risk appetite ($\theta \in [0.30, 0.70]$) with instant real-time re-triage.
- **7-Stage Live Execution Visualization**: Provides clear observability for credit officers and compliance auditors.

### 2. Batch Queue Underwriting & Triage Engine (`/batch-triage`)
- Ingests 30 applicants simultaneously and categorizes them into:
  - 🟢 **Fast-Track Approved**: Low calibrated default risk ($< 35\%$).
  - 🟡 **Senior Officer Review Required**: Borderline threshold condition or high fragility boundary.
  - 🔴 **Declined**: Severe multi-factor risk drivers.
- Real-time productivity indicators: Execution latency, manual hours saved, throughput rate, and filterable queue table with 1-click drilldown into individual dossiers.

### 3. Prescriptive Counterfactual Recourse (Wachter et al., 2017)
- Rather than leaving rejected borrowers stranded, the engine calculates the **minimum viable parameter adjustment** (e.g., tenure reduction from 27m to 14m or joint $32\%$ balance reduction) to cross below the approval threshold.

### 4. Automated Plain-English SHAP Narrative
- Translates high-dimensional SHAP log-odds feature attributions into natural language sentences, identifying the top adverse risk drivers and top mitigating strengths without confusing non-technical credit committees.

### 5. Prediction Robustness & Fragility Index
- Simulates real-world financial volatility by perturbing numerical features (`credit_amount`, `duration`, `age`) by $\pm 5\%$. Assigns a quantifiable **Stability Score** (0–100) and badges profiles as `ROBUST`, `MODERATE`, or `FRAGILE`.

### 6. One-Click Credit Committee Memo Export
- Built-in standardized printable layout allowing immediate PDF/paper export for regulatory compliance and audit logs.

---

## 📊 Empirical Model Selection & Benchmark

The core machine learning engine is trained on the UCI German Credit Dataset (1,000 records, 20 features) using leak-free preprocessing (Median + StandardScaler for numericals, Most-frequent + OneHotEncoder with `handle_unknown='ignore'` for categoricals, fitted strictly on training data).

Because failing to detect a defaulting borrower costs significant principal capital, model selection uses a **Cost-Sensitive Composite Metric** ($50\%\text{ Recall} + 50\%\text{ ROC-AUC}$):

| Model Name | Accuracy | Precision | Recall (Sensitivity) | F1-Score | ROC-AUC | PR-AUC | Composite Metric ($0.5\text{Rec} + 0.5\text{AUC}$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression (Selected)** | **0.7500** | **0.5581** | **0.8000** | **0.6575** | **0.8058** | **0.6215** | **0.8029** |
| **Random Forest Classifier** | 0.7700 | 0.6167 | 0.6167 | 0.6167 | 0.8039 | 0.6212 | 0.7103 |
| **XGBoost Classifier** | 0.7400 | 0.5690 | 0.5500 | 0.5593 | 0.7569 | 0.5926 | 0.6535 |

### ⚖️ Probability Calibration
- **Uncalibrated Brier Score**: `0.1824`
- **Platt Calibrated Brier Score**: `0.1562` (Lower is better; confirms predicted default probabilities reflect empirical default frequencies).

---

## 🛡️ Responsible AI & Governance Principles

1. **AI-Assisted Decision Support**: CrediFlow AI assists and accelerates human underwriters; it does not claim to make unilateral, unmonitored lending decisions.
2. **Non-Causal Interpretability**: SHapley Additive exPlanations (SHAP) represent statistical feature attribution within the model's decision surface; they are never misconstrued as physical real-world causation.
3. **No 100% Certainty Claims**: The system predicts statistical risk probabilities based on historical patterns, strictly acknowledging data uncertainty.

---

## 🛠️ Tech Stack

- **Backend & ML Engine**: Python 3.11+, FastAPI, Uvicorn, scikit-learn, SHAP, NumPy, Pandas, Joblib.
- **Frontend & Dashboard**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
- **Data & Benchmark**: UCI German Credit Dataset (1,000 applicants, 20 predictors).

---

## 🚀 Quickstart & Local Setup

### 1. Clone & Prerequisites
```bash
git clone https://github.com/NISHAL2007/S5_loan_default_prediction_.git
cd S5_loan_default_prediction_
```

### 2. Start Backend Server
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

---

## 🏆 HORIZON X 2K26 Submission Details

- **Project Title**: CrediFlow AI: Autonomous Credit Risk Decision-Support & Underwriting Automation Engine
- **Track**: Track 05 — AI for Productivity & Automation
- **Author**: Nishal (Solo Builder), 3rd Year B.E. Computer Science and Engineering, Bannari Amman Institute of Technology
- **Repository**: [https://github.com/NISHAL2007/S5_loan_default_prediction_](https://github.com/NISHAL2007/S5_loan_default_prediction_)
- **Live Demo**: [https://s5-loan-default-prediction.vercel.app](https://s5-loan-default-prediction.vercel.app)
