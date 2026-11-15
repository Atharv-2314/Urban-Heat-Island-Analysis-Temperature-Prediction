"""
Tests for schemas and data loader functions.
"""

import pytest
import pandas as pd
import numpy as np
from src.data.schemas import CityMonthRecord, PixelGridRecord
from src.data.loader import parse_geojson_coordinates, load_raw_monthly_data, load_city_pixel_data


def test_parse_geojson_coordinates():
    """Verify correct GeoJSON coordinate parsing (longitude, latitude -> latitude, longitude)."""
    geo_str = '{"geodesic":false,"type":"Point","coordinates":[72.543, 22.938]}'
    lat, lon = parse_geojson_coordinates(geo_str)
    assert pytest.approx(lat, 0.001) == 22.938
    assert pytest.approx(lon, 0.001) == 72.543

    # Invalid string handling
    bad_lat, bad_lon = parse_geojson_coordinates("invalid_json")
    assert np.isnan(bad_lat) and np.isnan(bad_lon)


def test_city_month_schema_validation():
    """Test CityMonthRecord validation logic."""
    sample_series = pd.Series({
        "city": "Ahmedabad",
        "year": 2020,
        "month": 5,
        "climate_group": "Hot_Desert_SemiArid",
        "latitude": 23.02,
        "longitude": 72.57,
        "Air_Temperature": 35.4,
        "LST": 42.1,
        "Rural_LST": 38.0,
        "UHI": 4.1,
        "NDVI": 0.22,
        "NDBI": 0.35,
        "NDWI": -0.15,
        "Population_Density": 12000,
        "Wind_Speed": 3.2,
        "Relative_Humidity_Approx": 45.0,
        "Solar_Radiation_MJ_m2": 24.5,
        "ERA5_Total_Precipitation_mm": 5.0,
        "CHIRPS_Rainfall_mm": 4.8,
        "split": "train",
    })

    record = CityMonthRecord.validate_row(sample_series)
    assert record.city == "Ahmedabad"
    assert record.year == 2020
    assert record.month == 5
    assert record.lst == 42.1
    assert record.uhi == 4.1


def test_city_month_schema_invalid_year():
    """Test that invalid year raises ValueError."""
    sample_series = pd.Series({
        "city": "Ahmedabad",
        "year": 1999,  # outside 2016-2025
        "month": 5,
        "climate_group": "Hot_Desert_SemiArid",
        "latitude": 23.02,
        "longitude": 72.57,
        "Air_Temperature": 35.4,
    })
    with pytest.raises(ValueError):
        CityMonthRecord.validate_row(sample_series)


def test_load_raw_monthly_data():
    """Verify that load_raw_monthly_data loads the dataset correctly."""
    df = load_raw_monthly_data()
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 5040
    assert "lst" in df.columns
    assert "rural_lst" in df.columns
    assert "uhi" in df.columns
    assert df["city"].nunique() == 42


def test_load_city_pixel_data():
    """Verify loading sampled ~1 km grid data for a single city."""
    df_pixel = load_city_pixel_data("Ahmedabad")
    assert isinstance(df_pixel, pd.DataFrame)
    assert len(df_pixel) > 0
    assert "latitude" in df_pixel.columns
    assert "longitude" in df_pixel.columns
    assert "lst" in df_pixel.columns
