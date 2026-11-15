"""
Chronological Dataset Partitioning module.

Strict Temporal Partitioning Rules:
- Training Set:   2016-2023 (8 years, 4,032 rows = 42 cities * 8 years * 12 months)
- Validation Set: 2024      (1 year, 504 rows  = 42 cities * 1 year * 12 months)
- Test Set:       2025      (1 year, 504 rows  = 42 cities * 1 year * 12 months)

Zero random shuffle. Zero temporal overlap.
"""

from typing import Dict, Any, Tuple
from pathlib import Path
import json
import pandas as pd

from src.utils.logger import get_logger
from src.utils.config import load_config

logger = get_logger("data_splitter")


class ChronologicalSplitter:
    """Partitions time-series UHI dataset strictly by calendar year."""

    def __init__(self, config: Dict[str, Any] | None = None):
        self.config = config or load_config()
        temporal = self.config.get("splits", {}).get("temporal", {})
        self.train_years = temporal.get("train_years", list(range(2016, 2024)))
        self.val_years = temporal.get("val_years", [2024])
        self.test_years = temporal.get("test_years", [2025])

    def split_data(
        self,
        df: pd.DataFrame
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Partition dataframe into Train, Validation, and Test subsets chronologically.
        Enforces that years are strictly disjoint and no shuffling occurs.
        """
        logger.info("Executing chronological temporal partitioning...")

        train_df = df[df["year"].isin(self.train_years)].copy()
        val_df = df[df["year"].isin(self.val_years)].copy()
        test_df = df[df["year"].isin(self.test_years)].copy()

        # Update the split indicator column
        train_df["split"] = "train"
        val_df["split"] = "val"
        test_df["split"] = "test"

        logger.info(
            f"Chronological split sizes: "
            f"Train={len(train_df)} ({self.train_years[0]}-{self.train_years[-1]}), "
            f"Val={len(val_df)} ({self.val_years}), "
            f"Test={len(test_df)} ({self.test_years})"
        )

        return train_df, val_df, test_df

    def save_splits(
        self,
        input_parquet: str = "data/processed/monthly_level/uhi_monthly_features.parquet",
        output_dir: str = "data/processed/splits"
    ) -> Dict[str, Path]:
        """Load features, split chronologically, and save to frozen Parquet files."""
        in_path = Path(input_parquet)
        if not in_path.exists():
            raise FileNotFoundError(f"Features file not found at: {in_path}")

        df = pd.read_parquet(in_path)
        train_df, val_df, test_df = self.split_data(df)

        out_path = Path(output_dir)
        out_path.mkdir(parents=True, exist_ok=True)

        train_path = out_path / "train_2016_2023.parquet"
        val_path = out_path / "val_2024.parquet"
        test_path = out_path / "test_2025.parquet"

        train_df.to_parquet(train_path, index=False, engine="pyarrow", compression="snappy")
        val_df.to_parquet(val_path, index=False, engine="pyarrow", compression="snappy")
        test_df.to_parquet(test_path, index=False, engine="pyarrow", compression="snappy")

        # Save metadata summary
        meta_file = out_path / "splits_metadata.json"
        meta = {
            "train": {
                "years": self.train_years,
                "rows": len(train_df),
                "cities": int(train_df["city"].nunique()),
                "file": str(train_path.name),
            },
            "validation": {
                "years": self.val_years,
                "rows": len(val_df),
                "cities": int(val_df["city"].nunique()),
                "file": str(val_path.name),
            },
            "test": {
                "years": self.test_years,
                "rows": len(test_df),
                "cities": int(test_df["city"].nunique()),
                "file": str(test_path.name),
            },
            "total_rows": len(train_df) + len(val_df) + len(test_df),
        }
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

        logger.info(f"Splits and metadata successfully persisted to: {out_path}")
        return {
            "train": train_path,
            "val": val_path,
            "test": test_path,
            "metadata": meta_file,
        }
