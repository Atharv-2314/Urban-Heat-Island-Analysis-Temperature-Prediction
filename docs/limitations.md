# Known Limitations

This document describes the scientific, methodological, and technical limitations of the Global Urban Heat Island (UHI) Analysis project.

---

## 1. Cloud Coverage & Satellite Data Gaps

Landsat 8/9 operates in the optical-thermal spectrum and **cannot observe through clouds**. For tropical cities (e.g., Mumbai, Chennai, Kochi, Dhaka, Nairobi) during monsoon months, cloud coverage can exceed 80 %, leaving significant monthly gaps. Our processing pipeline:

- Composites all cloud-free scenes within a calendar month.
- Marks months with fewer than 2 valid scenes as `NaN`.
- Uses ERA5-Land air temperature as a proxy for months with insufficient LST coverage.

**Impact:** Monthly LST values for high-cloud-cover periods are either missing or estimated from the ERA5 proxy, introducing additional uncertainty in UHI intensity calculations for those months.

---

## 2. Rural Reference-Area Sensitivity

UHI intensity is defined as:

```
UHI_intensity = Urban_LST − Rural_LST
```

The rural reference ring (10 km annular buffer outside the urban boundary) is determined from GHSL built-up fraction thresholds. This introduces sensitivity to:

- **Urban sprawl**: As cities expand, previously "rural" cells are reclassified, potentially deflating measured UHI over time.
- **Agricultural seasonality**: Rural cropland NDVI and LST vary strongly with planting seasons, introducing spurious seasonal signals into the UHI baseline.
- **Buffer radius choice**: A 10 km buffer was selected empirically; smaller buffers may include peri-urban land, while larger buffers may include topographically different terrain.

---

## 3. LST vs. Near-Surface Air Temperature

Landsat LST measures **skin temperature** of the land surface, which can differ from **2 m near-surface air temperature** (the standard meteorological variable) by several degrees:

- In arid cities (e.g., Riyadh, Jodhpur), daytime surface temperatures can exceed air temperatures by 10–20 K.
- Nighttime LST is unavailable from daytime-only Landsat overpasses.
- The models predict air temperature using LST as a predictor; this introduces a systematic offset that is partially absorbed by the model's learned bias term but is not physically explicit.

---

## 4. Temporal Overpass Bias

Landsat 8/9 passes over each location approximately every **16 days** at a fixed local solar time (~10:30 AM). Therefore:

- Monthly LST composites represent mid-morning conditions, not daily maximum or daily mean temperatures.
- The diurnal UHI peak (typically late afternoon) is systematically underestimated.
- Interannual variability in overpass cloud-clearance means some months have more valid scenes than others, adding non-uniform temporal sampling noise.

---

## 5. Climate-Stratified Normalisation Constraints

Models are trained globally across five climate groups (tropical, arid, temperate, continental, polar). While this improves generalisability over a single global model, it has limitations:

- **Within-group heterogeneity**: Ahmedabad and Delhi are both "tropical semi-arid" but have very different urban morphologies.
- **Small climate-group sample sizes**: The polar group contains only one city (Helsinki), making cross-validation statistics for that group unreliable.
- **Static classification**: Climate groups are assigned once using the 2016–2023 training period; cities undergoing rapid climate shifts may be incorrectly grouped for the 2024–2025 test period.

---

## 6. Population Density Data Currency

GHSL population data is published at 5-year intervals. The 2020 edition is used throughout this project. For fast-growing cities (e.g., Dhaka, Bengaluru), 2025 population densities may be significantly underestimated, potentially reducing the model's ability to capture recent urbanisation-driven warming.

---

## 7. No Nighttime UHI

The analysis is restricted to **daytime** satellite overpasses. Nighttime UHI (driven by urban heat storage and reduced sky-view factors) is not directly measured. Night-time ERA5-Land air temperature is included as a predictor variable but is a reanalysis product, not a direct observation.

---

## 8. Model Leakage Safeguards

Data splitting is performed chronologically (train ≤ 2023, validation = 2024, test = 2025) to prevent temporal leakage. However:

- Lag features (e.g., `lag_1_air_temperature`) are computed from the full dataset before splitting; care has been taken to ensure no future-year lags appear in the training window, but this should be verified if the pipeline is re-run on updated data.
- Climatology reference values (`models/climatology_reference.parquet`) are computed on training years only.

---

## 9. Scope Limitations

- **42-city sample**: Global conclusions should be drawn cautiously; cities were selected to represent climate diversity but are not a statistically random sample of all urban areas worldwide.
- **No building-level resolution**: The ~1 km grid cannot resolve street-canyon effects or individual building heat loads.
- **Static land cover**: NDVI/NDBI are derived from Landsat but are not explicitly corrected for phenological changes within a year beyond monthly compositing.
