"""
Tests for Rural Baseline Auditor and UHI Target Equation Verification.
"""

from pathlib import Path
import pytest
from src.features.rural_baseline import RuralBaselineAuditor


@pytest.fixture
def auditor():
    return RuralBaselineAuditor()


def test_rural_buffer_properties(auditor):
    """Verify that rural buffer has healthy sampling ratio (~3:1 rural to urban)."""
    audit = auditor.audit_rural_buffers()
    assert audit["rural_to_urban_sample_ratio"] > 2.5
    assert audit["mean_rural_pixels_per_scene"] > 500
    assert audit["mean_urban_pixels_per_scene"] > 200
    assert len(audit["climate_rural_stats"]) == 13


def test_target_equation_exact_match(auditor):
    """Verify UHI == LST - Rural_LST holds exactly across all records."""
    eq_res = auditor.verify_uhi_target_equation()
    assert eq_res["status"] == "PASSED"
    assert eq_res["inconsistent_count"] == 0
    assert eq_res["checked_records"] > 4700


def test_rural_audit_report_generation(auditor):
    """Verify rural audit JSON report file generation."""
    rep_path = auditor.generate_rural_audit_report()
    assert rep_path.exists()
