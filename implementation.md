# Urban Heat Island (UHI) Project: Implementation Checklist

> **Scope**: 42 Global Cities (24 Indian + 18 International) | 2016–2025 | 10-Year Study  
> **Target**: $\text{UHI Intensity} = \text{LST}_{\text{urban}} - \text{LST}_{\text{rural}}$  
> **Key Scientific Rules**:
> - Never impute missing cloud thermal values with zero (keep missing as NaN).
> - Chronological split only: Train (2016–2023) | Validation (2024) | Test (2025).
> - Never include LST as a predictor in UHI regression models (prevents target leakage).
> - Terminology: "Sampled ~1 km grid" (not native 30 m pixels); relationships are "associated with" (not "causes").
> - Use climate-stratified evaluation across Köppen zones.

---

## Phase 1: Repository Setup, Structure & Data Cleaning (Milestones 1–5)

- [x] **Milestone 1: Environment & Dependency Management**
  - [x] Audit existing Python environment and dependencies (`pandas`, `numpy`, `geopandas`, `pyarrow`, `scikit-learn`, `xgboost`, `shap`, `streamlit`, `plotly`, `pytest`, `pyyaml`).
  - [x] Create locked `requirements.txt` and `pyproject.toml`.
  - [x] Initialize master configuration file `config/config.yaml` (paths, city metadata, random seeds, climate zones).
  - [x] Verify test runner setup with initial `pytest` smoke test.

- [x] **Milestone 2: Production Directory Layout Reorganization**
  - [x] Create standardized folder structure:
    - [x] `config/` (YAML configurations and city registry)
    - [x] `src/data/` (ingestion, validation, cleaning pipelines)
    - [x] `src/features/` (lag generators, cyclical encodings, morphology ratios)
    - [x] `src/models/` (training, evaluation, forecasting, counterfactuals)
    - [x] `src/utils/` (logging, metrics, coordinate helpers)
    - [x] `dashboard/pages/` and `dashboard/components/` (Streamlit web app)
    - [x] `tests/` (automated pytest suite)
    - [x] `models/` (serialized model artifacts)
    - [x] `docs/` (data dictionary, methodology, model cards)
  - [x] Add `__init__.py` files across all modules for clean imports.

- [x] **Milestone 3: Data Ingestion & Pydantic Schema Contracts**
  - [x] Define Pydantic/dataclass schema contracts for City-Month dataset (5,040 rows).
  - [x] Define Pydantic/dataclass schema contracts for Sampled ~1 km Grid dataset.
  - [x] Standardize column naming and coordinate reference systems (WGS84 EPSG:4326).
  - [x] Write data loader functions with caching and robust error handling.

- [x] **Milestone 4: 10-Point Scientific Data Validation Pipeline**
  - [x] **Check 1**: Completeness check (42 cities × 10 years × 12 months = 5,040 rows).
  - [x] **Check 2**: Coordinate bounds validation for all 42 city centroids.
  - [x] **Check 3**: Physical LST temperature bounds ($-50^\circ\text{C} \le \text{LST} \le +70^\circ\text{C}$).
  - [x] **Check 4**: Cloud missingness verification (enforce zero-imputation ban; check for artificial zeros).
  - [x] **Check 5**: Spectral index bounds ($-1.0 \le \text{NDVI, NDBI, NDWI} \le 1.0$).
  - [x] **Check 6**: Precipitation non-negativity ($\text{Rainfall} \ge 0$).
  - [x] **Check 7**: Wind speed non-negativity ($\text{Wind Speed} \ge 0$).
  - [x] **Check 8**: Duplicate row and timestamp detection per city.
  - [x] **Check 9**: City name and climate group consistency across all years (2016–2025).
  - [x] **Check 10**: Temporal monotonicity check (months strictly sequential 1–12 per city-year).
  - [x] Generate automated validation audit report log.

- [x] **Milestone 5: Data Cleaning & Parquet Transformation**
  - [x] Clean identified anomalies and standardize missing value representations (NaN).
  - [x] Convert City-Month merged dataset to `data/processed/monthly_level/uhi_monthly_clean.parquet`.
  - [x] Convert Sampled ~1 km Grid datasets to optimized Parquet/GeoParquet in `data/processed/pixel_level/`.
  - [x] Validate Parquet round-trip integrity, row counts, and memory footprint.

---

## Phase 2: EDA, Rural Baselines & Leakage-Safe Feature Engineering (Milestones 6–9)

- [x] **Milestone 6: Geospatial & Temporal Exploratory Data Analysis (EDA)**
  - [x] Calculate global, regional, and seasonal summary statistics.
  - [x] Analyze diurnal and seasonal UHI cycle variations across 42 cities.
  - [x] Inspect monsoon anomalies, summer heatwave spikes, and winter inversions.
  - [x] Generate automated EDA charts (histograms, correlation matrices, box plots).

- [x] **Milestone 7: Biome-Stratified Rural Baselines**
  - [x] Audit rural buffer definition and verify rural LST baseline integrity ($\text{LST}_{\text{rural}}$).
  - [x] Account for elevation gradients and surrounding land-cover biomes.
  - [x] Validate $\text{UHI} = \text{LST}_{\text{urban}} - \text{LST}_{\text{rural}}$ distributions per city and climate group.

- [x] **Milestone 8: Leakage-Safe Feature Engineering Pipeline**
  - [x] Construct cyclical calendar features: $\sin(2\pi \cdot m / 12)$ and $\cos(2\pi \cdot m / 12)$.
  - [x] Construct strictly causal rolling weather lags (1-month, 3-month, 12-month forward-looking only).
  - [x] Engineer urban morphology proxies:
    - [x] Built-to-Vegetation ratio: $\text{NDBI} - \text{NDVI}$
    - [x] Moisture balance: $\text{NDWI}$
    - [x] Population density scaling and climate zone one-hot/ordinal encodings.
  - [x] Verify **strict exclusion of LST** from feature matrix $\mathbf{X}$ to prevent target leakage.

- [x] **Milestone 9: Chronological Dataset Partitioning**
  - [x] Split dataset chronologically:
    - [x] **Training Set**: 2016–2023 (8 years, 4,032 rows)
    - [x] **Validation Set**: 2024 (1 year, 504 rows - hyperparameter tuning & model selection)
    - [x] **Test Set**: 2025 (1 year, 504 rows - untouched holdout for final evaluation)
  - [x] Confirm zero temporal overlap, zero shuffle, and write frozen split files to `data/processed/splits/`.

---

## Phase 3: Machine Learning, Forecasting & Causal Simulation (Milestones 10–14)

- [x] **Milestone 10: Machine Learning UHI Regression Modeling**
  - [x] Build baseline linear model with regularization (Ridge / Lasso).
  - [x] Train ensemble tree model (Random Forest Regressor).
  - [x] Train Gradient Boosted Decision Trees (HistGradientBoosting / XGBoost Regressor).
  - [x] Tune hyperparameters on the 2024 Validation set.
  - [x] Evaluate predictions against the holdout 2025 Test set using RMSE, MAE, $R^2$, and MAPE.
  - [x] Save trained models to `models/` (.joblib / .json).

- [x] **Milestone 11: 1-Month-Ahead Weather & Temperature Forecasting**
  - [x] Develop autoregressive forecasting model predicting $t+1$ month conditions.
  - [x] Benchmark against:
    - [x] Persistence Baseline (last month's observed value)
    - [x] Climatological Baseline (historical 2016–2023 monthly mean for that city)
  - [x] Compute forecast skill score (improvement over climatology).

- [x] **Milestone 12: Climate-Stratified Performance & Risk Scoring**
  - [x] Compute stratified performance metrics across Köppen climate groups (Tropical, Arid, Temperate, Continental).
  - [x] Implement tiered/stratified UHI vulnerability risk scoring to avoid arid/polar bias.
  - [x] Quantify model uncertainty and error distributions per city.

- [x] **Milestone 13: SHAP Feature Attributions & Model Explainability**
  - [x] Compute TreeSHAP summary values across the test cohort.
  - [x] Generate SHAP beeswarm importance plots for global drivers.
  - [x] Compute SHAP interaction values (e.g., NDVI cooling effect conditioned on wind speed / humidity).
  - [x] Export explainability artifacts for dashboard integration.

- [x] **Milestone 14: Urban Planning Counterfactual "What-If" Simulator**
  - [x] Build simulation function: $\Delta\text{UHI} = f(\mathbf{X}_{\text{modified}}) - f(\mathbf{X}_{\text{current}})$.
  - [x] Implement parameter adjustments for greening ($\Delta\text{NDVI} \in [+0.05, +0.30]$), cool roofs ($\Delta\text{NDBI} \in [-0.30, -0.05]$), and water retention ($\Delta\text{NDWI}$).
  - [x] Enforce biophysical boundary constraints (indices cannot exceed $[-1.0, 1.0]$).

---

## UPDATED PHASE 4: FULL-STACK WEB APPLICATION & QUALITY ENGINEERING (Milestones 15–18)
TECH STACK SWAP: Streamlit -> React + Node.js + TypeScript + Tailwind + Anthropic UI Patterns

- [x] **Milestone 15: Node.js Backend API Architecture & Data Serving Layer**
  - [x] Initialize `server/` Node.js Express server to expose REST endpoints for processed Parquet datasets, model artifacts, and SHAP values.
  - [x] Implement caching and chunked data streaming for sub-second responses across the 42-city temporal datasets and ~1 km grid files.
  - [x] Build model inference endpoints in Python wrapped by Node.js child processes or lightweight FastAPI/Flask microservice for the What-If planning simulator.

- [x] **Milestone 16: React & TypeScript 6-Page Frontend Suite (Anthropic UI Styled)**
  - [x] Initialize frontend application using React, TypeScript, Vite, Tailwind CSS, and Lucide icons. Apply artifact-grade clean typographic hierarchy, muted cards, subtle borders, and high-density data tables.
  - [x] **Page 1: Global 42-City Overview Map** (Interactive Leaflet/Mapbox map with city markers, UHI intensity color scales, and climate group tags).
  - [x] **Page 2: City Deep-Dive & Temporal Heatwaves** (Recharts historical time-series, seasonal profiles, and multi-year anomaly heatmaps).
  - [x] **Page 3: Sampled ~1 km Grid Spatial Explorer** (Intra-urban spatial heat distribution, hot spots vs. cool parks breakdown).
  - [x] **Page 4: ML Model Performance & Climatology Benchmarks** (Model comparison cards, parity plots, residual analysis, and test scores).
  - [x] **Page 5: SHAP Interpretability & Biophysical Insights** (SHAP beeswarm visualization and individual city waterfall explanation cards).
  - [x] **Page 6: Interactive Urban Cooling Simulator** (Real-time slider controls for greening/albedo policies showing instant estimated UHI temperature drops).

- [x] **Milestone 17: Accessibility (WCAG 2.1), Usability & UI Polish**
  - [x] Ensure full keyboard tab navigation, visible focus rings, and Enter/Space activation for all interactive controls and sliders.
  - [x] Apply colorblind-safe palettes (Viridis, Cividis, Plasma) with distinct luminance curves across all charts.
  - [x] Add ARIA descriptive labels, tooltips, and clear text summaries for all map layers and charts.

- [x] **Milestone 18: Automated Testing Suite & CLI Pipeline Orchestration**
  - [x] Write backend unit tests (`pytest`) for schema validation, data cleaning, lag calculations, and metric computations.
  - [x] Write frontend component and smoke tests (Jest / Cypress) for React views and API integration.
  - [x] Build unified CLI pipeline runner: `python -m src.pipeline --stage [all|clean|features|train|eval]`.

---

## Phase 5: Documentation, Packaging & Final Release (Milestones 19–21)

- [ ] **Milestone 19: Comprehensive Documentation & Model Cards**
  - [ ] Write peer-review ready `README.md` with visual system architecture and results table.
  - [ ] Create `docs/data_dictionary.md` detailing every variable, unit, satellite source, and spatial scale.
  - [ ] Create `docs/model_cards.md` documenting model architecture, training data, metrics, and limitations.
  - [ ] Document known limitations (satellite overpass timing, cloud coverage gaps, rural boundary sensitivity).

- [ ] **Milestone 20: Dockerization & Reproducibility Harness**
  - [ ] Write multi-stage `Dockerfile` optimizing image size.
  - [ ] Write `docker-compose.yml` exposing dashboard on port 8501.
  - [ ] Verify reproducible single-command container build and execution.

- [ ] **Milestone 21: GitHub Repository Polish & Final Release**
  - [ ] Clean and structure git commit history.
  - [ ] Configure GitHub Actions workflow (`.github/workflows/ci.yml`) for automated testing and linting.
  - [ ] Tag official v1.0.0 release.
