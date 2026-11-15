"""Smoke tests for UHI project environment and configuration."""

from pathlib import Path
import yaml
import pandas as pd
import numpy as np


def test_core_dependencies():
    """Verify that core data processing and scientific libraries import successfully."""
    assert pd is not None
    assert np is not None


def test_config_yaml_validity():
    """Verify that config.yaml exists and contains all 42 required cities and bounds."""
    config_path = Path("config/config.yaml")
    assert config_path.exists(), "config/config.yaml does not exist!"

    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    # Check study scope
    assert config["study_scope"]["total_cities"] == 42
    assert config["study_scope"]["total_years"] == 10
    assert config["study_scope"]["expected_city_month_rows"] == 5040

    # Check cities count
    assert len(config["cities"]) == 42

    # Check temporal split definitions
    temporal = config["splits"]["temporal"]
    assert len(temporal["train_years"]) == 8  # 2016-2023
    assert temporal["val_years"] == [2024]
    assert temporal["test_years"] == [2025]

    # Verify no overlap in temporal splits
    train_set = set(temporal["train_years"])
    val_set = set(temporal["val_years"])
    test_set = set(temporal["test_years"])
    assert train_set.isdisjoint(val_set)
    assert train_set.isdisjoint(test_set)
    assert val_set.isdisjoint(test_set)


def test_scientific_bounds_configured():
    """Ensure scientific bounds are strictly defined."""
    with open("config/config.yaml", "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    bounds = config["scientific_bounds"]
    assert bounds["strict_no_zero_imputation"] is True
    assert bounds["lst_min_celsius"] < bounds["lst_max_celsius"]
    assert bounds["ndvi_min"] == -1.0 and bounds["ndvi_max"] == 1.0
