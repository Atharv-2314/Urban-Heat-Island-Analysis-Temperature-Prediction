"""
UHI Project - Python FastAPI Microservice for Model Inference
python_api/main.py

Wraps the trained champion model (HistGradientBoosting) and the
CounterfactualSimulator to provide REST endpoints consumable by
the Node.js Express server.

Start: uvicorn python_api.main:app --port 8001 --reload
"""

from __future__ import annotations

import sys
import os
import json
from pathlib import Path
from typing import Optional
import logging

# Ensure project root is on path so src.* imports work
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import pandas as pd
import joblib
import numpy as np

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="UHI Inference API",
    description="Python FastAPI microservice — model inference & What-If simulator",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Global Resources ──────────────────────────────────────────────────────────
MODEL_PATH = PROJECT_ROOT / "models" / "champion_uhi_model.joblib"
FEATURES_PATH = PROJECT_ROOT / "models" / "feature_columns.json"
MONTHLY_PATH = PROJECT_ROOT / "data" / "processed" / "monthly_level" / "uhi_monthly_clean.parquet"

_model = None
_feature_cols: list[str] = []
_monthly_df: Optional[pd.DataFrame] = None
_simulator = None


def load_resources() -> None:
    global _model, _feature_cols, _monthly_df, _simulator

    logger.info("Loading champion model...")
    _model = joblib.load(MODEL_PATH)

    with open(FEATURES_PATH) as f:
        _feature_cols = json.load(f)
    logger.info(f"Feature columns loaded: {len(_feature_cols)} features")

    logger.info("Loading full monthly dataset...")
    _monthly_df = pd.read_parquet(MONTHLY_PATH)

    logger.info("Initialising CounterfactualSimulator...")
    from src.models.simulator import CounterfactualSimulator
    _simulator = CounterfactualSimulator()
    logger.info("All resources loaded ✓")


@app.on_event("startup")
async def startup_event() -> None:
    try:
        load_resources()
    except Exception as e:
        logger.error(f"Failed to load resources: {e}")


# ── Request / Response Schemas ────────────────────────────────────────────────
class SimulationRequest(BaseModel):
    delta_ndvi: float = Field(default=0.0, ge=-0.3, le=0.3)
    delta_ndbi: float = Field(default=0.0, ge=-0.3, le=0.3)
    delta_ndwi: float = Field(default=0.0, ge=-0.3, le=0.3)
    city: Optional[str] = Field(default=None)

    @field_validator("city")
    @classmethod
    def validate_city(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else None


class SimulationResultItem(BaseModel):
    city: str
    climate_group: str
    current_uhi: float
    simulated_uhi: float
    delta_uhi: float
    ndvi_change: float
    ndbi_change: float
    ndwi_change: float


class SimulationResponse(BaseModel):
    results: list[SimulationResultItem]
    summary: dict
    parameters: dict


class InferenceRequest(BaseModel):
    features: dict[str, float]


class InferenceResponse(BaseModel):
    predicted_uhi: float
    model: str = "Hist_Gradient_Boosting"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model_loaded": _model is not None,
        "simulator_ready": _simulator is not None,
        "monthly_rows": len(_monthly_df) if _monthly_df is not None else 0,
    }


@app.post("/simulate", response_model=SimulationResponse)
def simulate(req: SimulationRequest) -> SimulationResponse:
    if _simulator is None:
        raise HTTPException(status_code=503, detail="Simulator not ready")

    try:
        items = []

        if req.city:
            # Single city mode
            result = _simulator.simulate_city_intervention(
                city_name=req.city,
                delta_ndvi=req.delta_ndvi,
                delta_ndbi=req.delta_ndbi,
                delta_ndwi=req.delta_ndwi,
            )
            # Build a summary result row from city result
            monthly = result.get("monthly_breakdown", [])
            if monthly:
                current_avg = float(np.mean([m["baseline_uhi"] for m in monthly]))
                sim_avg = float(np.mean([m["counterfactual_uhi"] for m in monthly]))
            else:
                current_avg, sim_avg = 0.0, 0.0
            items.append(SimulationResultItem(
                city=result["city"],
                climate_group=result["climate_group"],
                current_uhi=round(current_avg, 4),
                simulated_uhi=round(sim_avg, 4),
                delta_uhi=round(sim_avg - current_avg, 4),
                ndvi_change=req.delta_ndvi,
                ndbi_change=req.delta_ndbi,
                ndwi_change=req.delta_ndwi,
            ))
        else:
            # All-cities mode
            df_results = _simulator.simulate_all_cities(
                delta_ndvi=req.delta_ndvi,
                delta_ndbi=req.delta_ndbi,
                delta_ndwi=req.delta_ndwi,
            )
            for _, row in df_results.iterrows():
                cooling = float(row.get("mean_cooling_celsius", 0.0))
                # delta_uhi is negative for cooling (cooling = -delta_uhi)
                items.append(SimulationResultItem(
                    city=str(row["city"]),
                    climate_group=str(row.get("climate_group", "")),
                    current_uhi=0.0,       # aggregate mode; use benchmark data for baseline
                    simulated_uhi=round(-cooling, 4),
                    delta_uhi=round(-cooling, 4),
                    ndvi_change=req.delta_ndvi,
                    ndbi_change=req.delta_ndbi,
                    ndwi_change=req.delta_ndwi,
                ))

        delta_values = [i.delta_uhi for i in items]
        summary = {
            "mean_delta_uhi": round(float(np.mean(delta_values)), 4) if delta_values else 0.0,
            "max_cooling": round(float(min(delta_values)), 4) if delta_values else 0.0,
            "max_warming": round(float(max(delta_values)), 4) if delta_values else 0.0,
            "cities_cooled": sum(1 for d in delta_values if d < 0),
            "cities_warmed": sum(1 for d in delta_values if d > 0),
            "total_cities": len(delta_values),
        }

        return SimulationResponse(
            results=items,
            summary=summary,
            parameters={
                "delta_ndvi": req.delta_ndvi,
                "delta_ndbi": req.delta_ndbi,
                "delta_ndwi": req.delta_ndwi,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Simulation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


@app.post("/predict", response_model=InferenceResponse)
def predict(req: InferenceRequest) -> InferenceResponse:
    """Single-row inference endpoint."""
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        df = pd.DataFrame([req.features])
        for col in _feature_cols:
            if col not in df.columns:
                df[col] = 0.0
        df = df[_feature_cols]
        pred = float(_model.predict(df)[0])
        return InferenceResponse(predicted_uhi=round(pred, 4))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {str(e)}")


@app.get("/cities")
def list_cities() -> dict:
    if _monthly_df is None:
        raise HTTPException(status_code=503, detail="Data not loaded")
    cities = sorted(_monthly_df["city"].unique().tolist())
    return {"cities": cities, "count": len(cities)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("python_api.main:app", host="0.0.0.0", port=8001, reload=True)
