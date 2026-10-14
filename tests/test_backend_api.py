import pytest
import os
import sys

# Ensure project root is in path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["backend_reachable"] is True
    assert data["model_loaded"] is True
    assert data["model_name"] == "Logistic Regression"
    assert data["inference_ready"] is True

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data

def test_model_info():
    response = client.get("/model-info")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert "Logistic Regression" in data["models"]

def test_sample_applicants_has_30_records():
    response = client.get("/sample-applicants")
    assert response.status_code == 200
    samples = response.json()
    assert len(samples) == 30
    for s in samples:
        assert "applicant" in s
        assert "default_prob" in s
        assert 0.0 <= s["default_prob"] <= 1.0
        assert s["status"] in ["APPROVED", "REJECTED"]
        assert "explanation" in s

def test_predict_full_20_features():
    applicant = {
        'duration': 24,
        'credit_amount': 2500,
        'installment_commitment': 3,
        'residence_since': 3,
        'age': 35,
        'existing_credits': 1,
        'num_dependents': 1,
        'checking_status': 'no checking',
        'credit_history': 'existing paid',
        'purpose': 'new car',
        'savings_status': 'no known savings',
        'employment': '1<=X<4',
        'personal_status': 'male single',
        'other_parties': 'none',
        'property_magnitude': 'car',
        'other_payment_plans': 'none',
        'housing': 'own',
        'job': 'skilled',
        'own_telephone': 'none',
        'foreign_worker': 'yes'
    }
    response = client.post("/predict", json={"applicant": applicant, "threshold": 0.50})
    assert response.status_code == 200
    data = response.json()
    assert "default_probability" in data
    assert 0.0 <= data["default_probability"] <= 1.0
    assert data["decision"] in ["APPROVED (Acceptable Risk)", "REJECTED (High Risk)"]
    assert data["threshold_used"] == 0.50
    assert "explanation" in data
    assert data["explanation"]["error"] is False

def test_predict_partial_manual_input_with_documented_defaults():
    # Only 9 fields entered by user
    partial_applicant = {
        'age': 45,
        'credit_amount': 15000,
        'duration': 48,
        'checking_status': '<0',
        'savings_status': '<100',
        'credit_history': 'critical/other existing credit',
        'purpose': 'used car',
        'housing': 'rent',
        'job': 'skilled'
    }
    response = client.post("/predict", json={"applicant": partial_applicant, "threshold": 0.50})
    assert response.status_code == 200
    data = response.json()
    assert data["has_defaults"] is True
    assert len(data["defaulted_features"]) == 11
    # Check that high risk profile results in higher probability
    assert data["default_probability"] > 0.45
    assert data["decision"] == "REJECTED (High Risk)"

def test_predict_threshold_slider_recalculation():
    # Testing that threshold policy parameter changes the decision without altering underlying probability
    applicant = {
        'age': 35,
        'credit_amount': 2500,
        'duration': 24,
        'checking_status': 'no checking',
        'savings_status': '<100'
    }
    # Predict with threshold 0.30
    res1 = client.post("/predict", json={"applicant": applicant, "threshold": 0.30}).json()
    # Predict with threshold 0.70
    res2 = client.post("/predict", json={"applicant": applicant, "threshold": 0.70}).json()
    
    assert res1["default_probability"] == res2["default_probability"]
    assert res1["threshold_used"] == 0.30
    assert res2["threshold_used"] == 0.70

def test_reject_target_leakage():
    leak_applicant = {
        'age': 35,
        'credit_amount': 2500,
        'duration': 24,
        'target': 1
    }
    response = client.post("/predict", json={"applicant": leak_applicant})
    assert response.status_code == 422
    assert "Data leakage guardrail" in response.json()["detail"]

def test_reject_out_of_bounds_and_invalid_types():
    # Negative credit amount
    res1 = client.post("/predict", json={"applicant": {"credit_amount": -500, "age": 30, "duration": 12}})
    assert res1.status_code == 422
    
    # Invalid age
    res2 = client.post("/predict", json={"applicant": {"credit_amount": 2000, "age": 12, "duration": 12}})
    assert res2.status_code == 422

    # Invalid categorical value
    res3 = client.post("/predict", json={"applicant": {"credit_amount": 2000, "age": 30, "duration": 12, "checking_status": "super_rich"}})
    assert res3.status_code == 422

def test_stability_endpoint_partial_and_preset():
    applicant = {
        'age': 36,
        'credit_amount': 1913,
        'duration': 18,
        'checking_status': '0<=X<200'
    }
    response = client.post("/stability", json={"applicant": applicant})
    assert response.status_code == 200
    data = response.json()
    assert 0.0 <= data["base_probability"] <= 1.0
    assert 0.0 <= data["stability_score"] <= 100.0
    assert len(data["perturbation_table"]) == 6
    for row in data["perturbation_table"]:
        assert not row["Scenario"].startswith("NaN")
        assert not row["Scenario"].endswith("NaN")
        assert 0.0 <= row["New Default Prob"] <= 1.0

def test_counterfactual_endpoint_actionable():
    # Borderline / High Risk applicant that needs recourse
    high_risk_applicant = {
        'age': 22,
        'credit_amount': 8500,
        'duration': 48,
        'checking_status': '<0',
        'savings_status': '<100'
    }
    response = client.post("/counterfactual", json={"applicant": high_risk_applicant, "threshold": 0.50})
    assert response.status_code == 200
    data = response.json()
    assert "original_prob" in data
    assert data["original_prob"] >= 0.50
    assert "counterfactuals" in data
    # Verify no recourse proposes changing age
    for cf in data["counterfactuals"]:
        assert cf["feature"] != "age"
        assert 0.0 <= cf["new_prob"] <= 1.0
        assert cf["new_prob"] < 0.50

def test_batch_triage():
    response = client.post("/workflow/batch-triage", json={"threshold": 0.50})
    assert response.status_code == 200
    data = response.json()
    assert data["total_applicants"] == 30
    assert len(data["queue"]) == 30
    metrics = data["metrics"]
    total_triaged = metrics["fast_track_approved"] + metrics["underwriter_review_queue"] + metrics["high_risk_declined"]
    assert total_triaged == 30
