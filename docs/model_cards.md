# Model Cards — Global UHI Analysis Project

This document describes every machine-learning model trained in the project: its purpose, architecture, training configuration, evaluation results, and known limitations.

**Chronological data split (all models):**
- **Train:** 2016 – 2023 (8 years)
- **Validation:** 2024 (held-out year)
- **Test:** 2025 (final, unseen year)

**Target variable:** `air_temperature` (near-surface, 2 m, Kelvin)

---

## Model 1 — Ridge Regression

| Field | Detail |
|---|---|
| **Purpose** | Linear baseline; interpretable benchmark for the non-linear models. |
| **Algorithm** | Ridge Regression (`sklearn.linear_model.Ridge`) |
| **Regularization** | L2 penalty; `alpha` tuned via 5-fold cross-validation on the training set. |
| **Feature set** | `LST`, `NDVI`, `NDBI`, `NDWI`, `population_density`, `relative_humidity`, `wind_speed`, `solar_radiation`, `total_precipitation`, `lag_1_air_temperature`, `lag_3_precipitation`, `climate_group` (one-hot). |
| **Training records** | ~40 320 city-month-cell records (2016–2023). |
| **Artifact** | `models/ridge_regression.joblib` |

### Performance

| Split | RMSE (K) | MAE (K) | R² |
|---|---|---|---|
| Validation 2024 | 2.5825 | 1.2470 | 0.159 |
| **Test 2025** | **1.5768** | **1.1139** | **0.369** |

---

## Model 2 — Random Forest Regressor

| Field | Detail |
|---|---|
| **Purpose** | Non-linear ensemble; captures feature interactions and non-monotonic relationships. |
| **Algorithm** | `sklearn.ensemble.RandomForestRegressor` |
| **Hyperparameters** | `n_estimators=200`, `max_depth=None`, `min_samples_leaf=2`, `n_jobs=-1`; tuned via RandomizedSearchCV. |
| **Feature set** | Same 12-feature set as Ridge. |
| **Training records** | ~40 320 city-month-cell records (2016–2023). |
| **Artifact** | `models/random_forest.joblib` |

### Performance

| Split | RMSE (K) | MAE (K) | R² |
|---|---|---|---|
| Validation 2024 | 2.3874 | 0.8973 | 0.281 |
| **Test 2025** | **1.3323** | **0.7848** | **0.550** |

---

## Model 3 — Histogram Gradient Boosting (Champion)

| Field | Detail |
|---|---|
| **Purpose** | Champion model; highest accuracy and native NaN support for cloud-gap pixels. |
| **Algorithm** | `sklearn.ensemble.HistGradientBoostingRegressor` |
| **Hyperparameters** | `max_iter=300`, `learning_rate=0.05`, `max_depth=6`, `l2_regularization=0.1`; early stopping with 20-round patience on validation loss. |
| **Feature set** | Same 12-feature set as above; native support for missing values avoids imputation bias. |
| **Training records** | ~40 320 city-month-cell records (2016–2023). |
| **Artifact** | `models/hist_gradient_boosting.joblib` / `models/champion_uhi_model.joblib` |

### Performance

| Split | RMSE (K) | MAE (K) | R² |
|---|---|---|---|
| Validation 2024 | 2.3704 | 0.8892 | 0.291 |
| **Test 2025** | **1.2794** | **0.7743** | **0.585** |

> This model is selected as the **champion** (`models/champion_uhi_model.joblib`) and is used by the Node.js API inference endpoint.

---

## Model 4 — Monthly Weather Forecaster

| Field | Detail |
|---|---|
| **Purpose** | Forecasts ERA5-Land weather variables one month ahead for use in the What-If cooling simulator. |
| **Algorithm** | `sklearn.ensemble.GradientBoostingRegressor` (one model per weather variable). |
| **Hyperparameters** | `n_estimators=100`, `learning_rate=0.1`, `max_depth=4`. |
| **Feature set** | 3-month rolling lags of each target weather variable + city + month-of-year. |
| **Training records** | 2016–2023 monthly city-level records. |
| **Artifact** | `models/weather_forecaster.joblib` |

### Performance (held-out 2024–2025)
Reported in `reports/weather_forecast_benchmarks.json`. Primary metric is MAE on each target variable (air temperature MAE ≈ 0.95 K).

---

## Shared Training Configuration

| Setting | Value |
|---|---|
| Random seed | `42` |
| Cross-validation | 5-fold temporal split (no data leakage across years) |
| Feature scaling | StandardScaler applied to all numeric features before Ridge; not applied for tree-based models. |
| SHAP explainability | `shap.TreeExplainer` applied to champion model; values stored in `data/processed/monthly_level/uhi_shap_values_2025.parquet`. |
| Climatology reference | Per-city, per-month mean LST (2016–2023) stored in `models/climatology_reference.parquet`. |

---

## Model 5 — 5-Year Rolling Window Cross-Validation Protocol (Phase 7)

| Field | Detail |
|---|---|
| **Purpose** | Evaluates temporal generalization stability and model rank invariance over non-overlapping chronological folds. |
| **Protocol** | Fixed-width 5-year rolling training window with 1-year validation window across 4 folds (2016–2024). |
| **Folds** | Fold 1 (2016–2020 $\rightarrow$ 2021), Fold 2 (2017–2021 $\rightarrow$ 2022), Fold 3 (2018–2022 $\rightarrow$ 2023), Fold 4 (2019–2023 $\rightarrow$ 2024). |
| **Holdout Preservation** | 2025 is strictly preserved as an untouched holdout test set (zero presence in rolling folds). |
| **Artifacts** | `models/rolling_folds/fold_1..4/`, `data/processed/rolling_results/`. |

### Cross-Fold Stability Summary

| Model | Mean RMSE (°C) | Std RMSE (°C) | Mean MAE (°C) | Mean R² | Mean MBE (°C) | % Folds > Baseline |
|---|---|---|---|---|---|---|
| **Hist Gradient Boosting** | **1.7404** | $\pm 0.5796$ | **0.8958** | **0.4251** | -0.0631 | **100.0%** |
| **Random Forest** | 1.7414 | $\pm 0.6092$ | 0.9022 | 0.4258 | -0.0445 | **100.0%** |
| **Ridge Regression** | 1.9520 | $\pm 0.5134$ | 1.2165 | 0.2688 | +0.0302 | Baseline Ref |

> **Rank Invariance Conclusion:** Hist Gradient Boosting ranks #1 across both the untouched 2025 holdout and the 4-fold rolling evaluation, demonstrating robust temporal generalization.

---

## Intended Use

These models are intended for **academic and research use only**. They are designed to quantify historical UHI patterns and explore hypothetical policy scenarios (urban greening, albedo modification). They are **not** validated for operational weather forecasting or life-safety decision-making.

---

## Ethical Considerations

- Model performance is uneven across climate groups; cities with sparser satellite coverage (cloud-prone tropical cities) have higher residuals.
- The rural-reference-area approach introduces sensitivity to rural land-use change, which is not controlled for in this version.
- Population-density data from GHSL is estimated and may misrepresent informal settlements.
