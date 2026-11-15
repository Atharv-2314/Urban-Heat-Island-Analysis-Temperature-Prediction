"""
Tests for directory structure and package module initializations.
"""

from pathlib import Path
from src.utils.config import load_config
from src.utils.logger import get_logger


def test_directory_structure_exists():
    """Verify that all core project directories exist."""
    required_dirs = [
        "config",
        "data/raw",
        "data/interim",
        "data/processed",
        "src/data",
        "src/features",
        "src/models",
        "src/utils",
        "dashboard/pages",
        "dashboard/components",
        "models",
        "docs",
        "reports",
        "tests",
    ]

    for d in required_dirs:
        p = Path(d)
        assert p.exists() and p.is_dir(), f"Required directory missing: {d}"


def test_module_inits_exist():
    """Verify that package __init__.py files are present."""
    required_inits = [
        "src/__init__.py",
        "src/data/__init__.py",
        "src/features/__init__.py",
        "src/models/__init__.py",
        "src/utils/__init__.py",
        "dashboard/__init__.py",
        "dashboard/pages/__init__.py",
        "dashboard/components/__init__.py",
        "tests/__init__.py",
    ]

    for init_file in required_inits:
        p = Path(init_file)
        assert p.exists() and p.is_file(), f"Missing init file: {init_file}"


def test_utils_import_and_function():
    """Verify logger and config loader utilities work as expected."""
    logger = get_logger("test_logger")
    assert logger is not None

    config = load_config()
    assert isinstance(config, dict)
    assert "project" in config
    assert "cities" in config
