# Data Dictionary — Global UHI Analysis Project

This document catalogs every variable present in the processed datasets, together with its units, source, and spatial/temporal context.

**Spatial resolution:** ~1 km grid (Landsat 30 m pixels aggregated)
**Temporal resolution:** Monthly aggregates, January 2016 – December 2025
**Coverage:** 42 cities (24 Indian, 18 international)

---

## 1. Spatial & Temporal Identifiers

| Variable | Type | Description |
|---|---|---|
| `city` | string | City name (e.g., `delhi`, `london`). |
| `year` | int | Calendar year (2016–2025). |
| `month` | int (1–12) | Calendar month. |
| `latitude` | float (°) | Latitude of the grid-cell centre (WGS-84). |
| `longitude` | float (°) | Longitude of the grid-cell centre (WGS-84). |
| `climate_group` | categorical | Köppen-Geiger-derived climate zone: `tropical`, `arid`, `temperate`, `continental`, `polar`. |

---

## 2. Satellite-Derived Surface Variables (Landsat 8/9)

| Variable | Units | Source | Description |
|---|---|---|---|
| `LST` | Kelvin (K) | Landsat 8/9 — TIRS Band 10/11 | Land Surface Temperature (daytime overpass, cloud-masked). |
| `NDVI` | dimensionless (−1 to 1) | Landsat 8/9 — Bands 4, 5 (OLI) | Normalized Difference Vegetation Index; proxy for vegetation density. |
| `NDBI` | dimensionless (−1 to 1) | Landsat 8/9 — Bands 5, 6 (OLI) | Normalized Difference Built-up Index; indicator of impervious/urban surface. |
| `NDWI` | dimensionless (−1 to 1) | Landsat 8/9 — Bands 3, 5 (OLI) | Normalized Difference Water Index; presence of surface water. |
| `rural_LST` | Kelvin (K) | Landsat 8/9 (rural buffer) | Mean LST in a 10 km rural reference ring surrounding each city. |
| `uhi_intensity` | Kelvin (K) | Derived | `LST − rural_LST`; direct measure of urban heat island intensity. |

---

## 3. Climate Reanalysis Variables (ERA5-Land)

| Variable | Units | Source | Description |
|---|---|---|---|
| `air_temperature` | Kelvin (K) | ERA5-Land, 0.1° × 0.1° grid | Near-surface air temperature at 2 m; monthly mean. |
| `relative_humidity` | % | ERA5-Land | Monthly mean relative humidity at 2 m. |
| `wind_speed` | m s⁻¹ | ERA5-Land | Monthly mean wind speed at 10 m. |
| `total_precipitation` | mm month⁻¹ | ERA5-Land | Total accumulated precipitation. |
| `solar_radiation` | MJ m⁻² | ERA5-Land | Surface downwelling shortwave solar radiation; monthly total. |
| `soil_moisture` | m³ m⁻³ | ERA5-Land | Volumetric soil water content (layer 1, 0–7 cm). |

---

## 4. Socioeconomic / Demographic Variables

| Variable | Units | Source | Description |
|---|---|---|---|
| `population_density` | persons km⁻² | GHSL R2023 (Global Human Settlement Layer) | Estimated residential population per km² grid cell. |
| `built_up_fraction` | dimensionless (0–1) | GHSL Built-up Surface Layer | Fraction of the grid cell covered by built-up land. |
| `elevation` | m | SRTM 30 m DEM | Terrain elevation; used for lapse-rate corrections. |

---

## 5. Engineered / Derived Features

| Variable | Units | Description |
|---|---|---|
| `lag_1_air_temperature` | K | Air temperature from the previous month. |
| `lag_3_precipitation` | mm | Cumulative precipitation over the previous 3 months. |
| `uhi_risk_score` | dimensionless (0–1) | Composite risk score combining UHI intensity, population density, and climate-group normalisation. |
| `seasonal_anomaly` | K | Deviation from the long-run monthly city climatology. |

---

## 6. Model Output Variables

| Variable | Units | Description |
|---|---|---|
| `predicted_air_temperature` | K | Near-surface air temperature predicted by the regression ensemble. |
| `shap_values_{feature}` | K | SHAP contribution of each feature to a given prediction. Stored in `data/processed/monthly_level/uhi_shap_values_2025.parquet`. |

---

> **Unit note:** All temperature variables are stored in Kelvin. To convert to °C: `T_celsius = T_kelvin − 273.15`.
