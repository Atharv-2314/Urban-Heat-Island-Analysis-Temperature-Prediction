"""
Evaluation and Stability Analysis for Rolling Window Validation (Phase 7 - Milestone 26).

Computes:
- Fold-wise metrics per model: MAE, RMSE, R2, MBE (Mean Bias Error).
- Stability metrics across 4 folds: Mean RMSE, Std RMSE, Min/Max Fold RMSE.
- Benchmark outperformance: percentage of folds outperforming Ridge / Baseline.
- Avoids MAPE as primary metric due to zero-crossing and negative UHI values.
- Exports consolidated metrics to data/processed/rolling_results/rolling_evaluation_metrics.json and .csv.
"""

from typing import Dict, Any, List
from pathlib import Path
import json
import pandas as pd
import numpy as np
from sklearn.metrics import root_mean_squared_error, mean_absolute_error, r2_score

from src.utils.logger import get_logger
from src.utils.config import load_config

logger = get_logger("rolling_evaluation")


def compute_mbe(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Compute Mean Bias Error (MBE = mean(y_pred - y_true))."""
    return float(np.mean(y_pred - y_true))


class RollingWindowEvaluator:
    """Evaluates fold-wise models, computing accuracy, bias, and cross-fold stability metrics."""

    def __init__(
        self,
        config: Dict[str, Any] | None = None,
        results_dir: str | Path = "data/processed/rolling_results",
    ):
        self.config = config or load_config()
        self.results_dir = Path(results_dir)
        self.results_dir.mkdir(parents=True, exist_ok=True)
        self.model_columns = {
            "Ridge_Regression": "pred_ridge_regression",
            "Random_Forest": "pred_random_forest",
            "Hist_Gradient_Boosting": "pred_hist_gradient_boosting",
        }

    def evaluate_fold_predictions(self, val_df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        """
        Compute MAE, RMSE, R2, and MBE for each model within a single validation dataframe.
        """
        y_true = val_df["uhi_true"].to_numpy()
        metrics = {}

        for model_name, pred_col in self.model_columns.items():
            if pred_col not in val_df.columns:
                logger.warning(f"Prediction column {pred_col} not found in validation dataframe.")
                continue

            y_pred = val_df[pred_col].to_numpy()
            rmse = float(root_mean_squared_error(y_true, y_pred))
            mae = float(mean_absolute_error(y_true, y_pred))
            r2 = float(r2_score(y_true, y_pred))
            mbe = compute_mbe(y_true, y_pred)

            metrics[model_name] = {
                "rmse": round(rmse, 4),
                "mae": round(mae, 4),
                "r2": round(r2, 4),
                "mbe": round(mbe, 4),
                "sample_count": int(len(val_df)),
            }

        return metrics

    def run_comprehensive_evaluation(
        self,
        predictions_path: str | Path | None = None,
    ) -> Dict[str, Any]:
        """
        Load predictions across all folds and compute:
        1. Fold-wise performance breakdown.
        2. Overall cross-fold stability (mean & std of RMSE, MAE, R2, MBE).
        3. Best and worst performing validation years per model.
        4. Percentage of folds outperforming the baseline (Ridge Regression).
        """
        p_path = Path(predictions_path) if predictions_path else (self.results_dir / "all_folds_predictions.parquet")
        if not p_path.exists():
            raise FileNotFoundError(f"Predictions file not found: {p_path}. Please run Milestone 25 first.")

        df = pd.read_parquet(p_path)
        fold_ids = sorted(df["fold_id"].unique().tolist())
        validation_years_map = {
            fold_id: int(df[df["fold_id"] == fold_id]["year"].iloc[0])
            for fold_id in fold_ids
        }

        fold_results: Dict[str, Any] = {}
        tabular_rows: List[Dict[str, Any]] = []

        for fold_id in fold_ids:
            fold_df = df[df["fold_id"] == fold_id]
            val_year = validation_years_map[fold_id]
            f_metrics = self.evaluate_fold_predictions(fold_df)
            fold_results[f"fold_{fold_id}"] = {
                "fold_id": fold_id,
                "validation_year": val_year,
                "metrics": f_metrics,
            }

            for model_name, m_dict in f_metrics.items():
                tabular_rows.append({
                    "fold_id": fold_id,
                    "validation_year": val_year,
                    "model": model_name,
                    "rmse": m_dict["rmse"],
                    "mae": m_dict["mae"],
                    "r2": m_dict["r2"],
                    "mbe": m_dict["mbe"],
                    "sample_count": m_dict["sample_count"],
                })

        metrics_df = pd.DataFrame(tabular_rows)

        # Cross-fold model stability analysis
        stability_summary: Dict[str, Any] = {}
        baseline_model = "Ridge_Regression"

        for model_name in self.model_columns.keys():
            m_sub = metrics_df[metrics_df["model"] == model_name].copy()
            if m_sub.empty:
                continue

            rmse_vals = m_sub["rmse"].tolist()
            mae_vals = m_sub["mae"].tolist()
            r2_vals = m_sub["r2"].tolist()
            mbe_vals = m_sub["mbe"].tolist()

            best_fold_idx = int(np.argmin(rmse_vals))
            worst_fold_idx = int(np.argmax(rmse_vals))

            best_year = int(m_sub.iloc[best_fold_idx]["validation_year"])
            worst_year = int(m_sub.iloc[worst_fold_idx]["validation_year"])

            stability_summary[model_name] = {
                "mean_rmse": round(float(np.mean(rmse_vals)), 4),
                "std_rmse": round(float(np.std(rmse_vals, ddof=1)), 4) if len(rmse_vals) > 1 else 0.0,
                "mean_mae": round(float(np.mean(mae_vals)), 4),
                "std_mae": round(float(np.std(mae_vals, ddof=1)), 4) if len(mae_vals) > 1 else 0.0,
                "mean_r2": round(float(np.mean(r2_vals)), 4),
                "std_r2": round(float(np.std(r2_vals, ddof=1)), 4) if len(r2_vals) > 1 else 0.0,
                "mean_mbe": round(float(np.mean(mbe_vals)), 4),
                "std_mbe": round(float(np.std(mbe_vals, ddof=1)), 4) if len(mbe_vals) > 1 else 0.0,
                "best_validation_year": best_year,
                "best_fold_rmse": round(float(rmse_vals[best_fold_idx]), 4),
                "worst_validation_year": worst_year,
                "worst_fold_rmse": round(float(rmse_vals[worst_fold_idx]), 4),
            }

        # Outperformance vs baseline (percentage of folds outperforming Ridge)
        base_sub = metrics_df[metrics_df["model"] == baseline_model].sort_values("fold_id")
        base_rmse_series = base_sub.set_index("fold_id")["rmse"]

        for model_name in self.model_columns.keys():
            m_sub = metrics_df[metrics_df["model"] == model_name].sort_values("fold_id").set_index("fold_id")
            if model_name == baseline_model:
                stability_summary[model_name]["pct_folds_outperform_baseline"] = 0.0
                stability_summary[model_name]["baseline_reference"] = True
            else:
                outperformed = (m_sub["rmse"] < base_rmse_series).sum()
                pct_outperform = round((outperformed / len(fold_ids)) * 100.0, 1)
                stability_summary[model_name]["pct_folds_outperform_baseline"] = pct_outperform
                stability_summary[model_name]["baseline_reference"] = False

        consolidated_report = {
            "evaluation_strategy": "5-Year Rolling Window Cross-Validation (4 Chronological Folds)",
            "primary_metrics": ["RMSE", "MAE", "R2", "MBE"],
            "mape_excluded_reason": "UHI intensity crosses zero and includes negative values (urban cooler than rural baseline).",
            "folds_summary": fold_results,
            "stability_metrics": stability_summary,
            "best_overall_model": min(
                stability_summary.items(),
                key=lambda x: x[1]["mean_rmse"]
            )[0],
        }

        # Save to disk
        json_path = self.results_dir / "rolling_evaluation_metrics.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(consolidated_report, f, indent=2)

        csv_path = self.results_dir / "rolling_evaluation_metrics.csv"
        metrics_df.to_csv(csv_path, index=False)

        stability_df = pd.DataFrame.from_dict(stability_summary, orient="index").reset_index()
        stability_df.rename(columns={"index": "model"}, inplace=True)
        stability_csv = self.results_dir / "rolling_stability_summary.csv"
        stability_df.to_csv(stability_csv, index=False)

        logger.info(f"Consolidated rolling metrics saved to {json_path} and {csv_path}")
        return consolidated_report


def evaluate_rolling_results(
    predictions_path: str | Path | None = None,
    results_dir: str | Path = "data/processed/rolling_results",
) -> Dict[str, Any]:
    """Convenience runner for Milestone 26."""
    evaluator = RollingWindowEvaluator(results_dir=results_dir)
    return evaluator.run_comprehensive_evaluation(predictions_path=predictions_path)


if __name__ == "__main__":
    evaluate_rolling_results()
