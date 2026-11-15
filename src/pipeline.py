"""
Unified CLI Pipeline Runner for UHI Observatory
src/pipeline.py

Usage:
    python -m src.pipeline --stage [all|clean|features|train|eval]
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path
from typing import Literal

from src.utils.logger import get_logger
from src.utils.config import load_config

logger = get_logger("pipeline")


def run_clean_stage(config: dict) -> None:
    """Stage 1: Validation and cleaning of raw monthly and pixel level datasets."""
    logger.info("=== [STAGE: CLEAN] Starting Data Validation & Cleaning ===")
    from src.data.validator import DataValidator
    from src.data.cleaner import DataCleaner

    validator = DataValidator(config)
    all_passed, results = validator.run_all_checks()
    if not all_passed:
        logger.warning("Validation found warnings. Proceeding to cleaning.")

    cleaner = DataCleaner(config)
    monthly_out = cleaner.save_monthly_parquet()
    pixel_count = cleaner.process_all_pixel_data()
    logger.info(f"Cleaned datasets written: {monthly_out}, {pixel_count} pixel grids.")


def run_features_stage(config: dict) -> None:
    """Stage 2: Rural baselines, morphology features, lags, and chronological splits."""
    logger.info("=== [STAGE: FEATURES] Feature Engineering & Chronological Partitioning ===")
    from src.features.rural_baseline import RuralBaselineAuditor
    from src.features.engineering import FeatureEngineer
    from src.data.splitter import ChronologicalSplitter

    auditor = RuralBaselineAuditor(config)
    auditor.audit_rural_baseline()

    fe = FeatureEngineer(config)
    fe_df = fe.generate_and_save_feature_dataset()
    logger.info(f"Feature engineering dataset generated: {fe_df.shape}")

    splitter = ChronologicalSplitter(config)
    splits = splitter.partition_and_save()
    logger.info(f"Chronological splits saved: train={len(splits['train'])}, val={len(splits['val'])}, test={len(splits['test'])}")


def run_train_stage(config: dict) -> None:
    """Stage 3: Training regression models (Ridge, RF, HistGB) and 1-month-ahead weather forecaster."""
    logger.info("=== [STAGE: TRAIN] Training ML Models & Forecaster ===")
    from src.models.train_regression import ModelTrainer
    from src.models.forecaster import WeatherForecaster

    trainer = ModelTrainer(config)
    trainer.train_and_evaluate_all()

    forecaster = WeatherForecaster(config)
    forecaster.train_and_benchmark()
    logger.info("Models trained and serialized successfully.")


def run_eval_stage(config: dict) -> None:
    """Stage 4: Stratified risk scoring, TreeSHAP attributions, and What-If counterfactual simulations."""
    logger.info("=== [STAGE: EVAL] Risk Scoring, SHAP Attributions & What-If Simulations ===")
    from src.models.risk_scoring import RiskScorer
    from src.models.shap_explainer import ShapExplainer
    from src.models.simulator import CounterfactualSimulator

    scorer = RiskScorer(config)
    scorer.generate_risk_report()

    explainer = ShapExplainer(config)
    explainer.explain_test_predictions()

    sim = CounterfactualSimulator(config)
    sim.generate_simulation_report()
    logger.info("Evaluation, risk scoring, explainability, and simulations completed.")


def run_pipeline(stage: Literal["all", "clean", "features", "train", "eval"]) -> None:
    """Execute stages of the pipeline orchestrator."""
    start_time = time.time()
    config = load_config()
    logger.info(f"Initiating UHI Unified Pipeline with stage='{stage}'")

    if stage in ["all", "clean"]:
        run_clean_stage(config)
    if stage in ["all", "features"]:
        run_features_stage(config)
    if stage in ["all", "train"]:
        run_train_stage(config)
    if stage in ["all", "eval"]:
        run_eval_stage(config)

    elapsed = time.time() - start_time
    logger.info(f"Pipeline stage '{stage}' finished successfully in {elapsed:.2f}s.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Unified UHI Pipeline Runner for Data Cleaning, Features, Training, and Evaluation."
    )
    parser.add_argument(
        "--stage",
        choices=["all", "clean", "features", "train", "eval"],
        default="all",
        help="Pipeline stage to execute (default: all)",
    )
    args = parser.parse_args()
    try:
        run_pipeline(args.stage)
    except Exception as e:
        logger.error(f"Pipeline failed at stage '{args.stage}': {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
