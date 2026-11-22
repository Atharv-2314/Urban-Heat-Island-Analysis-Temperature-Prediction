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

- [x] **Milestone 19: Comprehensive Documentation & Model Cards**
  - [x] Write peer-review ready `README.md` with visual system architecture and results table.
  - [x] Create `docs/data_dictionary.md` detailing every variable, unit, satellite source, and spatial scale.
  - [x] Create `docs/model_cards.md` documenting model architecture, training data, metrics, and limitations.
  - [x] Document known limitations (satellite overpass timing, cloud coverage gaps, rural boundary sensitivity) in `docs/limitations.md`.

- [x] **Milestone 20: Dockerization & Reproducibility Harness**
  - [x] Write multi-stage `Dockerfile` optimizing image size.
  - [x] Write `docker-compose.yml` exposing dashboard on port 8000 (React SPA + API) with a `docker-compose.prod.yml` for single-command production launch.
  - [x] Verify reproducible single-command container build and execution.

- [x] **Milestone 21: GitHub Repository Polish & Final Release**
  - [x] Clean and structure git commit history.
  - [x] Configure GitHub Actions workflow (`.github/workflows/ci.yml`) for automated testing and linting (Python pytest, Node Jest, React Vitest + oxlint, Docker build smoke test).
  - [x] Tag official v1.0.0 release.

---

## Phase 6: Fixing

- [x] **Milestone 22: Map API Solution**
  - [x] Identify all Leaflet `<TileLayer>` components in `client/src/` that require an API key or render "API KEY REQUIRED" tiles.
  - [x] Replace `<TileLayer>` URL in `client/src/pages/OverviewMap.tsx` with CartoDB Dark Matter (free, no key required): `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`.
  - [x] Replace `<TileLayer>` URL in `client/src/pages/SpatialExplorer.tsx` with the same CartoDB Dark Matter URL.
  - [x] Update attribution string in both files to: `&copy; OpenStreetMap contributors &copy; CARTO`.
  - [x] Verify no other pages in `client/src/` contain a `<TileLayer>` with a keyed or broken provider.

- [x] **Milestone 23: Watermark-Free OpenStreetMap Dark Filter Solution**
  - [x] Replace TileLayer URL in `client/src/pages/OverviewMap.tsx` with standard OpenStreetMap: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`.
  - [x] Replace TileLayer URL in `client/src/pages/SpatialExplorer.tsx` with standard OpenStreetMap: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`.
  - [x] Update attribution in both files to: `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors`.
  - [x] Apply CSS dark-mode invert filter (`brightness(0.6) invert(1) contrast(3) hue-rotate(200deg)`) to map tile layers/container so tiles blend into the dark UI without watermarks or API requirements.
  - [x] Verify clean builds and check that markers/popups maintain accurate color perception.

---

## Phase 7: Time Split Rolling Window Validation (Milestones 24–29)

**Objective:** Extend the existing fixed chronological evaluation with a five-year rolling training window followed by a one-year validation window. Assess temporal robustness, model stability, and generalisation across 42 global cities and different Köppen climate groups.

**Core Evaluation Strategy:**
- Preserve the existing chronological split: Train (2016–2023) | Validation (2024) | Final Test (2025).
- Introduce an additional fixed-width rolling-window evaluation using five consecutive training years followed by the immediately succeeding validation year.
- Keep 2025 completely untouched during rolling-window development and model selection.
- Treat rolling-window validation as an additional robustness assessment, not a replacement for the original evaluation protocol.

---

- [x] **Milestone 24: Rolling Window Evaluation Design & Fold Generation**
  - [x] Define a fixed five-year training window followed by a one-year validation window.
  - [x] Generate four chronological folds:

    | Fold | Training Period | Validation Period |
    |---|---|---|
    | 1 | 2016–2020 | 2021 |
    | 2 | 2017–2021 | 2022 |
    | 3 | 2018–2022 | 2023 |
    | 4 | 2019–2023 | 2024 |

  - [x] Implement a reusable chronological fold generator in `src/models/rolling_validation.py`.
  - [x] Enforce strict temporal ordering and prevent future observations from entering training windows.
  - [x] Verify that 2025 is excluded from all rolling folds.
  - [x] Save fold configurations and metadata for reproducibility.

- [x] **Milestone 25: Leakage-Safe Fold-Wise Model Training**
  - [x] Integrate rolling-window evaluation with existing UHI regression models:
    - Ridge Regression
    - Random Forest Regressor
    - Gradient Boosting / XGBoost Regressor
  - [x] Train each model independently on the five-year training portion of every fold.
  - [x] Fit imputers, scalers, and preprocessing operations using only the respective training window.
  - [x] Reuse the existing leakage-safe feature engineering pipeline.
  - [x] Maintain consistent feature columns and model configurations across folds.
  - [x] Save fold-wise trained model artifacts and prediction outputs.

- [x] **Milestone 26: Fold-Wise Performance Evaluation & Stability Metrics**
  - [x] Evaluate predictions against the corresponding validation year for every fold.
  - [x] Calculate the following metrics:
    - Mean Absolute Error (MAE)
    - Root Mean Squared Error (RMSE)
    - Coefficient of Determination (R²)
    - Mean Bias Error (MBE)
  - [x] Calculate average and standard deviation of each model's RMSE across all four folds.
  - [x] Identify the best-performing and worst-performing validation years.
  - [x] Quantify the percentage of folds in which each model outperforms the selected baseline.
  - [x] Avoid using MAPE as a primary metric because UHI values can be negative or close to zero.
  - [x] Store consolidated metrics in `data/processed/rolling_results/`.

- [x] **Milestone 27: Global, Geographical & Climate-Stratified Robustness Analysis**
  - [x] Compare rolling-window performance across all 42 global cities.
  - [x] Analyse model stability across Köppen climate groups.
  - [x] Compare Indian and international city performance.
  - [x] Identify cities and climate groups with consistently high prediction errors.
  - [x] Examine seasonal performance differences across validation years.
  - [x] Analyse whether model performance deteriorates or improves as the validation year advances.
  - [x] Generate city-wise, regional, and climate-wise performance summaries.

- [x] **Milestone 28: Fixed Split vs Rolling Window Comparative Analysis**
  - [x] Compare the original fixed chronological evaluation against the four rolling-window folds.
  - [x] Compare model rankings under both evaluation strategies.
  - [x] Quantify differences in MAE, RMSE, R², and prediction bias.
  - [x] Examine whether a model performs well on the fixed validation year but inconsistently across rolling folds.
  - [x] Compare rolling-window average performance with the original 2024 validation results.
  - [x] Document temporal generalisation limitations and potential sources of performance variation.
  - [x] After completing all methodology and model-selection decisions, retain the original 2025 test set for its separate final evaluation.

- [x] **Milestone 29: Temporal Robustness Dashboard & Reproducibility**
  - [x] Create a dedicated **Temporal Robustness / Rolling Window Evaluation** dashboard page.
  - [x] Implement a fold-wise model performance comparison table.
  - [x] Add interactive charts for:
    - RMSE and MAE across validation years.
    - Model performance trends across the four folds.
    - Average RMSE and standard deviation comparison.
    - City-wise and climate-wise error distributions.
  - [x] Add a comparative view of fixed chronological split versus rolling-window evaluation.
  - [x] Display fold-specific training and validation periods.
  - [x] Export evaluation metrics and predictions as CSV files.
  - [x] Add automated tests for fold generation, temporal leakage prevention, metric calculations, and reproducibility.
  - [x] Document the rolling-window methodology, results, and limitations in the research report and project documentation.

---

**Expected Deliverables:**
1. Reusable five-year rolling-window validation pipeline.
2. Four fold-wise model training and prediction datasets.
3. Consolidated temporal performance and stability metrics.
4. Global and climate-stratified robustness analysis.
5. Fixed-split versus rolling-window comparative report.
6. Dedicated Temporal Robustness dashboard page.
7. Updated methodology and research documentation.

---

## Phase 8: City Deep Dive Page — Data Integrity & Visualization Repair (Milestones 30–35)

**Objective:** Resolve the data-flow and schema inconsistencies affecting the City Deep Dive page. Restore the 10-year surface temperature and UHI time series, the 10-year climatological seasonal cycle, and the heatwave anomaly matrix. Ensure that the backend data, frontend transformations, and visualization components use a consistent and validated data structure.

**Scope:**
- Repair the existing City Deep Dive implementation without rebuilding the page.
- Preserve the existing dataset, city coverage, historical period (2016–2025), and visualization layout wherever possible.
- Address the identified backend–frontend schema mismatch.
- Ensure missing and invalid observations are handled explicitly rather than silently converted into misleading values.
- Add tests to prevent the same issues from recurring.

---

- [x] **Milestone 30: Backend–Frontend Data Contract Alignment**
  - [x] Inspect the complete data flow from `data/processed/monthly_level/uhi_monthly_clean.parquet` to the City Deep Dive frontend.
  - [x] Verify the actual schema and data types of the monthly Parquet dataset.
  - [x] Inspect the response structure of `GET /api/monthly/city/:cityName`.
  - [x] Reconcile the backend response keys with the frontend `MonthlyDataRecord` interface.
  - [x] Resolve the identified naming inconsistencies:
    - `uhi` vs. `uhi_intensity`
    - `lst` vs. `lst_urban`
    - `rural_lst` vs. `lst_rural`
    - `air_temperature` vs. `temperature_2m`
  - [x] Verify that the API returns the expected fields for every supported city.
  - [x] Check that `year` and `month` are consistently represented as valid numeric values.
  - [x] Verify that missing values, nulls, and non-finite numeric values are handled consistently during serialization.
  - [x] Confirm that the frontend receives the expected records rather than falling back to mock data or an incompatible response structure.

- [x] **Milestone 31: Repair the 10-Year Surface Temperature and UHI Time Series**
  - [x] Inspect the `chartData` transformation in `CityDeepDive.tsx`.
  - [x] Ensure that UHI intensity and urban/rural land surface temperature values are mapped from the correct API fields.
  - [x] Verify that the time-series records are chronologically ordered by year and month.
  - [x] Check for duplicate months, missing months, and invalid observations.
  - [x] Verify that the chart receives valid numerical values for its configured data keys.
  - [x] Inspect the Recharts `LineChart`, `Line`, axes, and tooltip configurations.
  - [x] Ensure that missing observations do not cause the entire chart or unrelated series to disappear.
  - [x] Verify that urban LST, rural LST, and UHI intensity are represented using appropriate axes and units.
  - [x] Test the visualization using multiple cities, including cities with incomplete monthly observations.
  - [x] Confirm that the graph displays the expected historical time series across the available 10-year period.

- [x] **Milestone 32: Repair the 10-Year Climatological Seasonal Cycle**
  - [x] Inspect the `seasonalProfile` aggregation logic in `CityDeepDive.tsx`.
  - [x] Verify that all available years are grouped into the correct calendar-month buckets.
  - [x] Ensure that UHI, urban LST, and rural LST values are read from the correct fields.
  - [x] Investigate how null, undefined, and non-finite values affect monthly averages.
  - [x] Verify that monthly averages are calculated using valid observations rather than invalid values.
  - [x] Check that months with insufficient or unavailable observations are represented explicitly.
  - [x] Verify that the aggregation produces the expected 12 monthly seasonal entries.
  - [x] Inspect the Recharts `BarChart` and its configured data keys.
  - [x] Confirm that the seasonal cycle displays meaningful monthly averages for UHI and surface temperature.
  - [x] Validate the seasonal profile against independently calculated monthly summaries from the underlying dataset.

- [x] **Milestone 33: Repair the Heatwave Anomaly Matrix**
  - [x] Trace the anomaly calculation from the monthly API records to the rendered matrix.
  - [x] Resolve the incorrect UHI field access responsible for the invalid overall mean.
  - [x] Verify the calculation of the overall UHI baseline used by the anomaly matrix.
  - [x] Inspect the handling of missing monthly observations during baseline calculation.
  - [x] Verify that the anomaly for each year-month cell is calculated relative to the intended baseline.
  - [x] Check whether the baseline should be city-wide across the full study period or based on a different explicitly defined reference period; document the selected methodology.
  - [x] Investigate whether missing records, incomplete months, or invalid values are incorrectly converted into zero.
  - [x] Ensure that unavailable observations remain distinguishable from genuine zero anomalies.
  - [x] Verify that valid anomaly values remain finite throughout the calculation and formatting process.
  - [x] Inspect the matrix's colour-scale logic, cell formatting, and tooltip values.
  - [x] Confirm that positive, negative, zero, and missing anomalies are represented correctly.
  - [x] Validate selected anomaly cells against manually calculated values from the source dataset.

- [x] **Milestone 34: Frontend Rendering, Loading & Error-State Validation**
  - [x] Inspect the three visualization components for assumptions about non-empty datasets.
  - [x] Verify that Recharts receives the expected array structure and numerical data keys.
  - [x] Check whether chart rendering is affected by `undefined`, `null`, `NaN`, or infinite values.
  - [x] Verify the page's loading, API-error, empty-data, and partial-data states.
  - [x] Ensure that an unavailable metric does not unnecessarily hide other valid metrics.
  - [x] Verify that changing the selected city triggers the correct API request and refreshes all three visualizations.
  - [x] Check that stale data from a previously selected city is not displayed after a new request.
  - [x] Verify responsive rendering and chart dimensions across supported screen sizes.
  - [x] Confirm that the page does not silently display mock or stale data when the live API fails.

- [x] **Milestone 35: Regression Testing & City Deep Dive Release Validation**
  - [x] Add backend tests for the monthly city API response schema.
  - [x] Add data-validation tests for required columns, data types, date fields, and numeric values.
  - [x] Add tests for chronological sorting and monthly aggregation.
  - [x] Add tests for seasonal averages, including months with missing observations.
  - [x] Add tests for anomaly baseline calculations and missing-value handling.
  - [x] Add frontend tests verifying that the three visualizations receive valid datasets.
  - [x] Test the complete City Deep Dive data flow using representative cities:
    - Delhi
    - Ahmedabad
    - Bengaluru
    - At least one international city
  - [x] Verify that all three visualizations work for cities with complete and incomplete historical records.
  - [x] Compare displayed values with independently calculated summaries from the cleaned Parquet dataset.
  - [x] Run the existing application regression tests to ensure other dashboard pages remain unaffected.
  - [x] Update project documentation with the resolved schema contract and visualization data requirements.
  - [x] Record the validation results and mark the City Deep Dive repair as complete only after all three visualizations pass.

---

**Expected Deliverables:**
1. Consistent and validated backend–frontend monthly data contract.
2. Restored 10-year surface temperature and UHI time-series visualization.
3. Restored 10-year climatological seasonal-cycle visualization.
4. Correctly calculated and rendered heatwave anomaly matrix.
5. Explicit missing-data and invalid-value handling.
6. Automated backend, frontend, and data-validation tests.
7. Verified City Deep Dive page across representative Indian and international cities.
8. Updated technical documentation.


---

## Phase 9: Dynamic, City-Specific & Region-Aware SHAP Explainability (Milestones 36–41)

**Objective:** Upgrade the existing SHAP Interpretability page so that feature attributions dynamically respond to the selected city and geographical filters. Replace the current static global SHAP aggregation with context-aware SHAP analysis for individual cities, Indian cities, international cities, or the complete 42-city dataset.

**Core Requirement:**

The SHAP page must dynamically calculate and display feature importance based on the currently selected geographical scope. The same trained HistGradientBoosting champion model and TreeSHAP methodology should be used consistently across the different scopes.

---

- [x] **Milestone 36: SHAP Data Pipeline & Existing Implementation Audit**
  - [x] Inspect the existing SHAP calculation and visualization pipeline.
  - [x] Identify where SHAP values are generated, stored, aggregated, and passed to the frontend.
  - [x] Investigate why the Top 10 Global Drivers chart remains unchanged when the selected metro changes.
  - [x] Determine whether the current SHAP values are precomputed across all 504 test-month observations.
  - [x] Verify how city identifiers, country names, and geographical classifications are represented in the SHAP input dataset.
  - [x] Establish a reliable mapping of all 42 cities into Indian and international groups.
  - [x] Verify that the SHAP dataset and prediction dataset use consistent city identifiers and observation indices.

- [x] **Milestone 37: City-Specific SHAP Attribution**
  - [x] Make SHAP calculations responsive to the selected metro.
  - [x] When an individual city is selected, calculate feature attributions using observations belonging only to that city.
  - [x] Generate the Top 10 feature importance ranking using the selected city's mean absolute SHAP values.
  - [x] Update the SHAP waterfall attribution using the selected city's observations.
  - [x] Ensure the expected baseline value and final prediction correspond to the selected city and observation.
  - [x] Update the driver cards, feature rankings, and supporting biophysical insights based on the selected city.
  - [x] Ensure that changing the selected city refreshes all relevant SHAP visualizations.

- [x] **Milestone 38: India-Only SHAP Aggregation**
  - [x] Introduce a geographical scope for Indian cities.
  - [x] When the India-only scope is selected, aggregate SHAP values across the Indian cities in the dataset.
  - [x] Calculate mean absolute SHAP values for every feature using only the selected geographical subset.
  - [x] Generate a new Top 10 feature importance ranking for the Indian-city subset.
  - [x] Update meteorological, urban morphology, remote sensing, and green canopy driver summaries.
  - [x] Ensure that international-city observations are excluded from the India-only aggregation.

- [x] **Milestone 39: International-Only SHAP Aggregation**
  - [x] Introduce a geographical scope for international cities.
  - [x] When the international-only scope is selected, aggregate SHAP values across international cities in the dataset.
  - [x] Calculate mean absolute SHAP values using only international-city observations.
  - [x] Generate an independent Top 10 feature importance ranking for the international subset.
  - [x] Update the driver cards and biophysical interpretation based on international-city SHAP results.
  - [x] Ensure that Indian-city observations are excluded from the international-only aggregation.

- [x] **Milestone 40: Combined Global SHAP Aggregation**
  - [x] Support simultaneous selection of Indian and international cities.
  - [x] When both geographical groups are selected, aggregate SHAP values across all 42 cities.
  - [x] Reproduce the complete-dataset global SHAP ranking.
  - [x] Ensure that the global result uses the same observation population and aggregation methodology as the selected geographical scope.
  - [x] Allow the user to compare global, India-only, and international-only feature importance.
  - [x] Verify that the combined result is consistent with the global SHAP analysis when all cities are included.

- [x] **Milestone 41: Dynamic SHAP Dashboard Integration & Validation**
  - [x] Integrate geographical scope selection into the existing SHAP page.
  - [x] Ensure the selected metro and geographical scope are reflected in the visualization titles and labels.
  - [x] Update the Top 10 Global Drivers chart to display context-aware feature importance.
  - [x] Update the SHAP waterfall attribution and expected baseline according to the selected city or aggregation context.
  - [x] Dynamically update the driver ranking cards and biophysical insights.
  - [x] Display the number of cities and observations included in the current SHAP calculation.
  - [x] Add loading, empty-data, and calculation-error states.
  - [x] Prevent stale SHAP results from remaining visible after changing the geographical selection.
  - [x] Test city-specific SHAP calculations using representative Indian and international cities.
  - [x] Verify India-only, international-only, and combined 42-city results independently.
  - [x] Confirm that changing geographical scope genuinely changes the underlying SHAP aggregation rather than merely changing chart labels.
  - [x] Validate the SHAP outputs against independently calculated TreeSHAP values.
  - [x] Ensure that the existing SHAP page layout, accessibility, and responsive behaviour are preserved.

---

**Expected Deliverables:**
1. Dynamic city-specific SHAP explanations.
2. India-only aggregated SHAP feature importance.
3. International-only aggregated SHAP feature importance.
4. Combined global SHAP feature importance across all 42 cities.
5. Context-aware waterfall attribution and driver cards.
6. Dynamic geographical filtering and visualization updates.
7. Validated SHAP calculations and regression tests.
8. Updated biophysical interpretation based on the selected geographical scope.

---

## Phase 10: Production Deployment — PC & Mobile Readiness (Milestones 42–46)

**Objective:** Prepare, harden, and deploy the full-stack Global Urban Heat Island (UHI) platform (Python ML artifacts + Node.js Express API + React/TypeScript frontend) from `https://github.com/AvaniAgarwal-23/UrbanHeatIntelligence` for seamless usage across desktop/PC browsers and mobile devices, including installable Progressive Web App (PWA) support.

**Core Deployment Strategy:**
- Use `https://github.com/AvaniAgarwal-23/UrbanHeatIntelligence` as the single source of truth for CI/CD, Git-triggered cloud deployments, and release versioning.
- Externalize all environment-specific URLs and secrets while keeping required processed datasets and model artifacts reproducible in production.
- Ensure full responsive usability and touch-friendly interactions across mobile viewports alongside widescreen PC layouts.
- Package the frontend as an offline-capable PWA installable on both desktop and mobile devices.

---

- [x] **Milestone 42: Repository Hygiene, Build Hardening & Environment Configuration**
  - [x] Audit `.gitignore` in `AvaniAgarwal-23/UrbanHeatIntelligence` so `.env` secrets, `node_modules`, and cache files remain untracked while required processed artifacts (`data/processed/rolling_results/`, `data/processed/monthly_level/`, and SHAP matrices) load cleanly in production.
  - [x] Externalize all hardcoded `localhost` API endpoints into `VITE_API_BASE_URL` and commit `.env.example` templates.
  - [x] Configure Express production middleware (`helmet`, `compression`, strict `CORS` origin allowlist, `NODE_ENV=production`, and sanitized error handling).
  - [x] Implement `GET /api/health` verifying backend uptime and confirming that all required Parquet/JSON datasets and model artifacts load without path errors.
  - [x] Enable Vite route-level lazy loading (Rolling Validation, City Deep Dive, SHAP Explainability) to minimize initial mobile bundle size.

- [x] **Milestone 43: PC (Desktop/Laptop) Layout & Widescreen Optimization**
  - [x] Audit all dashboard views across standard desktop viewports (`1280×720`, `1440×900`, `1920×1080`, and ultrawide).
  - [x] Verify that Leaflet maps, Recharts containers, the 10-year heatwave anomaly matrix, and SHAP waterfall plots scale cleanly without horizontal overflow or clipped tooltips.
  - [x] Verify keyboard navigation, focus states, and desktop CSV export workflows across Chrome, Edge, Opera GX, and Safari.
  - [x] Confirm zero console errors or memory leaks when switching rapidly across all 42 cities.

- [ ] **Milestone 44: Mobile Responsiveness & Touch Interaction Adaptation**
  - [ ] Adapt CSS Grid/Flexbox layouts for mobile and tablet breakpoints (`360×800`, `390×844`, `768×1024`).
  - [ ] Ensure tap-friendly touch targets (>= 44×44 px) for Leaflet map markers, Recharts tooltips, and Heatwave Anomaly Matrix cells, replacing hover-only interactions.
  - [ ] Add smooth horizontal scroll wrappers with sticky year/label columns for wide data tables (Rolling Fold comparison table and 12-month Anomaly Matrix) on narrow screens.
  - [ ] Collapse multi-control filter toolbars (city selector, India/International scope toggle, model picker) into a compact mobile filter drawer or stacked controls.

- [ ] **Milestone 45: Mobile & Desktop PWA (Installable App) Packaging**
  - [ ] Configure `vite-plugin-pwa` with `manifest.webmanifest` (app name, `standalone` display mode, theme colors, and `192×192` + `512×512` maskable icons) so users can install UrbanHeatIntelligence on iOS/Android home screens and desktop docks.
  - [ ] Configure Workbox runtime caching (`NetworkFirst` with short TTL for `/api/*` endpoints and `CacheFirst` for static assets and map tiles) so recently viewed cities remain accessible on unstable mobile networks.
  - [ ] Add a service-worker update prompt ("New version available — Reload") and an offline status indicator banner.
  - [ ] Commit SPA rewrite rules (`vercel.json` / `_redirects`) to `AvaniAgarwal-23/UrbanHeatIntelligence` so direct refreshes on sub-routes never return 404.

- [ ] **Milestone 46: GitHub CI/CD & Cross-Device Cloud Deployment**
  - [ ] Add `.github/workflows/ci.yml` with least-privilege permissions (`contents: read`) to automatically run Python/Node tests, schema checks, and Vite production builds on pull requests and pushes to `main`.
  - [ ] Connect `AvaniAgarwal-23/UrbanHeatIntelligence` directly to the backend host (Render / Railway / Fly.io) and frontend host (Vercel / Netlify / Cloudflare Pages) for automated HTTPS deployments.
  - [ ] Run Lighthouse audits targeting >= 90 across Performance, Accessibility, Best Practices, and PWA on both Desktop and Mobile profiles.
  - [ ] Perform end-to-end live verification on a physical PC browser and a mobile phone against the deployed URLs, then tag release `v1.0.0` in `AvaniAgarwal-23/UrbanHeatIntelligence`.

---

**Expected Deliverables:**
1. Production-hardened Express backend with `/api/health` and environment-based configuration.
2. Widescreen-verified PC layout across all 42 cities and interactive visualizations.
3. Touch-friendly mobile and tablet responsive UI with sticky-column data matrices.
4. Installable, offline-capable PWA for both desktop and mobile platforms.
5. Automated GitHub Actions CI workflow and live HTTPS deployment linked to `AvaniAgarwal-23/UrbanHeatIntelligence`.

