"""
Tests for Chronological Dataset Partitioning.
"""

from pathlib import Path
import json
import pytest
import pandas as pd

from src.data.splitter import ChronologicalSplitter


@pytest.fixture
def splitter():
    return ChronologicalSplitter()


@pytest.fixture
def features_df():
    return pd.read_parquet("data/processed/monthly_level/uhi_monthly_features.parquet")


def test_split_temporal_disjointness(splitter, features_df):
    """Verify that train, validation, and test years have zero overlap."""
    train_df, val_df, test_df = splitter.split_data(features_df)

    train_years = set(train_df["year"].unique())
    val_years = set(val_df["year"].unique())
    test_years = set(test_df["year"].unique())

    assert train_years.isdisjoint(val_years), "Train and Val years overlap!"
    assert train_years.isdisjoint(test_years), "Train and Test years overlap!"
    assert val_years.isdisjoint(test_years), "Val and Test years overlap!"


def test_split_row_counts_and_completeness(splitter, features_df):
    """Verify exact row counts: Train=4,032, Val=504, Test=504 (Sum=5,040)."""
    train_df, val_df, test_df = splitter.split_data(features_df)

    assert len(train_df) == 4032  # 42 cities * 8 years * 12 months
    assert len(val_df) == 504     # 42 cities * 1 year * 12 months
    assert len(test_df) == 504    # 42 cities * 1 year * 12 months
    assert len(train_df) + len(val_df) + len(test_df) == 5040


def test_split_all_42_cities_represented(splitter, features_df):
    """Verify all 42 cities are present in every single temporal split."""
    train_df, val_df, test_df = splitter.split_data(features_df)

    assert train_df["city"].nunique() == 42
    assert val_df["city"].nunique() == 42
    assert test_df["city"].nunique() == 42


def test_saved_split_files_and_metadata(splitter):
    """Verify split parquet files and JSON metadata exist on disk."""
    split_paths = splitter.save_splits()

    for key in ["train", "val", "test", "metadata"]:
        assert split_paths[key].exists(), f"Split file missing: {split_paths[key]}"

    with open(split_paths["metadata"], "r", encoding="utf-8") as f:
        meta = json.load(f)

    assert meta["train"]["rows"] == 4032
    assert meta["validation"]["rows"] == 504
    assert meta["test"]["rows"] == 504
    assert meta["total_rows"] == 5040
