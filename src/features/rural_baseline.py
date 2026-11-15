"""
Biome-stratified rural baseline auditor and validator.
Analyzes rural reference buffers, pixel counts, and climate-specific thermal baselines.
"""

from typing import Dict, Any
from pathlib import Path
import json
import pandas as pd
import numpy as np

from src.utils.logger import get_logger
from src.utils.config import load_config

logger = get_logger("rural_baseline")


class RuralBaselineAuditor:
    """Audits and validates rural baseline reference temperatures and UHI calculations."""

    def __init__(self, data_path: str = "data/processed/monthly_level/uhi_monthly_clean.parquet"):
        self.config = load_config()
        self.data_path = Path(data_path)
        if not self.data_path.exists():
            raise FileNotFoundError(f"Clean dataset not found at: {self.data_path}")
        self.df = pd.read_parquet(self.data_path)

    def audit_rural_buffers(self) -> Dict[str, Any]:
        """
        Verify rural buffer sampling properties:
        - Ratio of rural to urban pixel samples (~3:1 to 4:1 buffer ratio).
        - Rural coverage per climate group.
        - Physical validity and consistency of rural LST.
        """
        rural_pixels = self.df["Rural_Valid_LST_Pixel_Count"]
        urban_pixels = self.df["Urban_Valid_LST_Pixel_Count"]

        buffer_ratio = (rural_pixels.sum() / urban_pixels.sum()) if urban_pixels.sum() > 0 else 0.0

        climate_rural_stats = self.df.groupby("climate_group").agg(
            mean_rural_lst=("rural_lst", "mean"),
            std_rural_lst=("rural_lst", "std"),
            mean_urban_lst=("lst", "mean"),
            mean_uhi=("uhi", "mean"),
            mean_rural_pixels=("Rural_Valid_LST_Pixel_Count", "mean"),
            mean_urban_pixels=("Urban_Valid_LST_Pixel_Count", "mean"),
        ).reset_index().to_dict(orient="records")

        # Zero sample analysis (complete cloud cover scenes)
        zero_rural_scenes = int((rural_pixels == 0).sum())
        zero_urban_scenes = int((urban_pixels == 0).sum())

        return {
            "rural_to_urban_sample_ratio": float(buffer_ratio),
            "mean_rural_pixels_per_scene": float(rural_pixels.mean()),
            "mean_urban_pixels_per_scene": float(urban_pixels.mean()),
            "cloud_obscured_rural_scenes": zero_rural_scenes,
            "cloud_obscured_urban_scenes": zero_urban_scenes,
            "climate_rural_stats": climate_rural_stats,
        }

    def verify_uhi_target_equation(self, tolerance: float = 1e-4) -> Dict[str, Any]:
        """
        Verify that UHI == LST - Rural_LST across all valid observation pairs.
        Flags any mathematically inconsistent calculations.
        """
        valid_mask = (~self.df["lst"].isna()) & (~self.df["rural_lst"].isna()) & (~self.df["uhi"].isna())
        valid_df = self.df[valid_mask]

        diff = (valid_df["lst"] - valid_df["rural_lst"]) - valid_df["uhi"]
        max_discrepancy = float(diff.abs().max())
        inconsistent_count = int((diff.abs() > tolerance).sum())

        passed = inconsistent_count == 0
        return {
            "status": "PASSED" if passed else "FAILED",
            "checked_records": int(len(valid_df)),
            "max_discrepancy": max_discrepancy,
            "inconsistent_count": inconsistent_count,
            "message": (
                f"UHI = LST - Rural_LST strictly verified across all {len(valid_df)} records."
                if passed else f"Found {inconsistent_count} records where UHI deviates from equation."
            )
        }

    def generate_rural_audit_report(self, output_dir: str = "reports") -> Path:
        """Export comprehensive rural baseline audit results."""
        out_dir = Path(output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        report_file = out_dir / "rural_baseline_audit.json"

        buffer_audit = self.audit_rural_buffers()
        eq_audit = self.verify_uhi_target_equation()

        report_data = {
            "buffer_sampling_audit": buffer_audit,
            "target_equation_audit": eq_audit,
        }

        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2)

        logger.info(f"Rural baseline audit report saved to: {report_file}")
        return report_file
